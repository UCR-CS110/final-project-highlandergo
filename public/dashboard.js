const map = L.map("dash-map", { zoomControl: true }).setView(
  [33.9737, -117.3281],
  17,
);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  referrerPolicy: "no-referrer-when-downgrade",
}).addTo(map);

const dashMarkerMap = {};
const dashSpotDataMap = {};
const activeCategories = new Set(["food", "study", "other"]);
let searchDebounceTimer = null;

function applyFilter() {
  Object.keys(dashMarkerMap).forEach((spotId) => {
    const marker = dashMarkerMap[spotId];
    const spot = dashSpotDataMap[spotId];
    if (activeCategories.has(spot.category)) {
      if (!map.hasLayer(marker)) marker.addTo(map);
    } else {
      if (map.hasLayer(marker)) marker.remove();
    }
  });
}

var foodIcon = L.icon({
  iconUrl: "/mapPins/foodPin.png",
  iconSize: [45, 45],
  iconAnchor: [22.5, 45],
  popupAnchor: [0, -45],
});

var studyIcon = L.icon({
  iconUrl: "/mapPins/studyPin.png",
  iconSize: [45, 45],
  iconAnchor: [22.5, 45],
  popupAnchor: [0, -45],
});

var otherIcon = L.icon({
  iconUrl: "/mapPins/otherPin.png",
  iconSize: [45, 45],
  iconAnchor: [22.5, 45],
  popupAnchor: [0, -45],
});

function getCategoryIcon(category) {
  if (category === "food") {
    return foodIcon;
  } else if (category === "study") {
    return studyIcon;
  } else {
    return otherIcon;
  }
}

function buildFeedRow(comment){
  let spotName = "";
  if(comment.spot){
    spotName = comment.spot.title;
  }

  let username = "";
  if(comment.author){
    username = comment.author.username;
  }
  
  let ratingHtml = "";
  if (comment.rating != null && comment.rating !== undefined) {
    ratingHtml = `<div class="review-rating">&#11088; ${parseFloat(comment.rating).toFixed(1)}</div>`;
  }

  let bodyHtml = "";
  if(comment.body){
    bodyHtml = `<div class="review-body">${comment.body}</div>`;
  }

  let formatDate = "";
  if(comment.createdAt) {
    formatDate = new Date(comment.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  const spotId = comment.spot ? comment.spot._id : "";

  return `
    <div class="review-row" ${spotId ? `data-spot-id="${spotId}"` : ""}>
      <div class="feed-spot-name">${spotName}</div>
      <div class="review-author-line">
        <span class="review-username">${username}</span>
        <span class="review-date">${formatDate}</span>
      </div>
      ${ratingHtml}
      ${bodyHtml}
    </div>
  `;
}

function buildTopRatedRow(spot){
  let ratingHtml = "";
  if (spot.ratingCount > 0) {
    ratingHtml = `<div class="review-rating">&#11088; ${spot.ratingAvg.toFixed(1)} <span class="rating-count">(${spot.ratingCount})</span></div>`;
  } else{
    ratingHtml = `<div class="review-rating"><span class="no-rating">No ratings yet</span></div>`;
  }

  return `
    <div class="review-row" data-spot-id="${spot._id}">
      <div class="review-author-line">
        <span class="feed-spot-name">${spot.title}</span>
        <span class="spot-category ${spot.category}">${spot.category}</span>
      </div>
      ${ratingHtml}
    </div>
  `;
}

async function loadTopRatedSpots(skip){
  const listEl = document.getElementById("top-rated-list");
  if (!listEl) return;

  const existingShowMore = document.getElementById("top-rated-show-more");
  if (existingShowMore) existingShowMore.remove();

  try {
    const res = await fetch(`/api/feed/top-spots?limit=5&skip=${skip}`);
    if (!res.ok) throw new Error();
    const spots = await res.json();

    if (skip === 0 && spots.length === 0) {
      listEl.innerHTML = `<p class="no-reviews-msg">No spots yet.</p>`;
      return;
    }

    if (skip === 0) {
      listEl.innerHTML = "";
    }

    spots.forEach(spot => {
      listEl.insertAdjacentHTML("beforeend", buildTopRatedRow(spot));
    });

    listEl.querySelectorAll(".review-row[data-spot-id]").forEach(row => {
      row.onclick = () => {
        const spotId = row.dataset.spotId;
        const spot = dashSpotDataMap[spotId];
        if (!spot) return;

        const [lng, lat] = spot.location.coordinates;
        map.setView([lat, lng], 18);

        const marker = dashMarkerMap[spotId];
        if (marker) {
          if (!map.hasLayer(marker)) marker.addTo(map);
          marker.openPopup();
        }
      };
    });

    if (spots.length === 5) {
      listEl.insertAdjacentHTML("beforeend", `
        <button id="top-rated-show-more" class="show-more-btn">Show More</button>
      `);
      document.getElementById("top-rated-show-more").addEventListener("click", () => {
        loadTopRatedSpots(skip + 5);
      });
    }
  } catch (err) {
    if (skip === 0) {
      listEl.innerHTML = `<p class="no-reviews-msg">Could not load spots.</p>`;
    }
  }
}

function openFeedSidebar(){
  const reviewSidebar = document.getElementById("dash-reviews-sidebar");
  if(!reviewSidebar.classList.contains("hidden")){
    reviewSidebar.classList.add("hidden");
  }

  const sidebar = document.getElementById("dash-feed-sidebar");
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <h3 class="sidebar-title">Recent Reviews</h3>
    </div>
    <div class="reviews-list" id="feed-reviews-list">
      <p class="no-reviews-msg">Loading...</p>
    </div>
  `;

  sidebar.classList.remove("hidden");
  loadFeedComments(0);
}

async function loadFeedComments(skip){
  const listEl = document.getElementById("feed-reviews-list");
  if(!listEl) return;

  const existingShowMore = document.getElementById("feed-show-more");
  if(existingShowMore) existingShowMore.remove();

  try {
    const res = await fetch(`/api/feed/comments?limit=5&skip=${skip}`);
    if (!res.ok) throw new Error();

    const comments = await res.json();

    if (skip === 0 && comments.length === 0) {
      listEl.innerHTML = `<p class="no-reviews-msg">No reviews yet.</p>`;
      return;
    }

    if (skip === 0) {
      listEl.innerHTML = "";
    }

    comments.forEach(comment => {
      listEl.insertAdjacentHTML("beforeend", buildFeedRow(comment));
    });

    listEl.querySelectorAll(".review-row[data-spot-id]").forEach(row => {
      row.onclick = () => {
        const spotId = row.dataset.spotId;
        const spot = dashSpotDataMap[spotId];
        if(!spot) return;

        document.getElementById("dash-feed-sidebar").classList.add("hidden");

        const [lng, lat] = spot.location.coordinates;
        map.setView([lat, lng], 18);

        const marker = dashMarkerMap[spotId];
        if(marker){
          if(!map.hasLayer(marker)) marker.addTo(map);

          marker.openPopup();
        }
      };
    });

    if (comments.length === 5) {
      listEl.insertAdjacentHTML("beforeend", `
        <button id="feed-show-more" class="show-more-btn">Show More</button>
      `);
      document.getElementById("feed-show-more").addEventListener("click", () => {
        loadFeedComments(skip + 5);
      });
    }
  } catch (err) {
    if (skip === 0) {
      listEl.innerHTML = `<p class="no-reviews-msg">Could not load reviews.</p>`;
    }
  }
}

function buildDashPopup(spot) {
  let ratingDisplay = "";
  if (spot.ratingCount > 0) {
    let reviewWord;
    if (spot.ratingCount !== 1) {
      reviewWord = "s";
    } else {
      reviewWord = "";
    }
    ratingDisplay = `&#11088; ${spot.ratingAvg.toFixed(1)} <span class="rating-count">(${spot.ratingCount} review${reviewWord})</span>`;
  } else {
    ratingDisplay = `<span class="no-rating">No ratings yet</span>`;
  }

  let reviewHtml = "";
  if (spot.description) {
    reviewHtml = `<p class="spot-review">"${spot.description}"</p>`;
  } else {
    reviewHtml = "";
  }

  return `
		<div class="spot-popup">
			<div class="popup-header">
				<h3 class="spot-title">${spot.title}</h3>
			</div>
			<div class="spot-rating">${ratingDisplay}</div>
			<span class="spot-category ${spot.category}">${spot.category}</span>

			${reviewHtml}
			<button id="show-more-${spot._id}" class="show-more-btn">Show More</button>
		</div>
	`;
}

function addDashMarker(spot) {
  dashSpotDataMap[spot._id] = spot;

  const [lng, lat] = spot.location.coordinates;
  const marker = L.marker([lat, lng], {
    icon: getCategoryIcon(spot.category),
  });

  if (activeCategories.has(spot.category)) {
    marker.addTo(map);
  }

  dashMarkerMap[spot._id] = marker;

  marker.bindPopup(buildDashPopup(spot), { maxWidth: 200 });

  marker.on("popupopen", () => {
    const btn = document.getElementById("show-more-" + spot._id);
    if (btn) {
      btn.onclick = (e) => {
        e.stopPropagation();
        map.closePopup();
        openDashSidebar(spot._id);
      };
    }
  });
  marker.on("popupclose", () => {
    marker.setPopupContent(buildDashPopup(dashSpotDataMap[spot._id]));
  });
}

async function loadDashSpots() {
  try {
    const res = await fetch("/api/spots");
    if (!res.ok) throw new Error("Failed to load spots");
    const spots = await res.json();
    spots.forEach(addDashMarker);
  } catch (err) {
    console.error("Could not load spots:", err);
  }
}

function openDashSidebar(spotId) {
  const sidebar = document.getElementById("dash-reviews-sidebar");
  const spot = dashSpotDataMap[spotId];

  sidebar.innerHTML = `
		<div class="sidebar-header">
			<h3 class="sidebar-title">${spot.title}</h3>
		</div>
		<div class="reviews-list" id="dash-reviews-list">
			<p class="no-reviews-msg">Loading reviews...</p>
		</div>
	`;

  sidebar.classList.remove("hidden");
  loadDashReviews(spotId);
}

function buildDashReviewRow(username, rating, body, date, photos) {
  let ratingHtml = "";
  if (rating !== null && rating !== undefined) {
    ratingHtml = `<div class="review-rating">&#11088; ${parseFloat(rating).toFixed(1)}</div>`;
  }

  let bodyHtml = "";
  if (body) {
    bodyHtml = `<div class="review-body">${body}</div>`;
  }

  let formatDate = "";
  if (date) {
    formatDate = new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  let photosHtml = "";
  if (photos && photos.length > 0) {
    const imgTags = photos
      .map(
        (url) => `<img src="${url}" class="review-photo" alt="review photo" />`,
      )
      .join("");
    photosHtml = `<div class="review-photos">${imgTags}</div>`;
  }

  return `
		<div class="review-row">
			<div class="review-author-line">
				<span class="review-username">${username}</span>
				<span class="review-date">${formatDate}</span>
			</div>
			${ratingHtml}
			${bodyHtml}
			${photosHtml}
		</div>
	`;
}

async function loadDashReviews(spotId) {
  const listEl = document.getElementById("dash-reviews-list");
  if (!listEl) return;

  try {
    const res = await fetch(`/api/spots/${spotId}/comments`);
    if (!res.ok) {
      throw new Error("Failed to load reviews");
    }

    const comments = await res.json();

    let reviewListHtml = "";

    comments.forEach((comment) => {
      reviewListHtml += buildDashReviewRow(
        comment.author.username,
        comment.rating,
        comment.body,
        comment.createdAt,
        comment.photos,
      );
    });

    listEl.innerHTML =
      reviewListHtml || `<p class="no-reviews-msg">No reviews yet.</p>`;
  } catch (err) {
    listEl.innerHTML = `<p class="no-reviews-msg">Could not load reviews.</p>`;
  }
}

async function initUserDropdown() {
  const btn = document.getElementById("user-icon-btn");
  const dropdown = document.getElementById("user-dropdown");

  let res;
  try {
    res = await fetch("/api/me");
  } catch (e) {
    return;
  }

  const data = await res.json();

  if (data.userId) {
    dropdown.innerHTML = `
    	<div class="dropdown-username">Signed in</div>
    	<form method="POST" action="/auth/logout" class="logout-form">
      	<button type="submit" class="dropdown-item">Log Out</button>
    	</form>
  	`;
  } else {
    dropdown.innerHTML = `
			<a href="/auth/login" class="dropdown-item">Log In</a>
			<a href="/auth/register" class="dropdown-item">Register</a>
		`;
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    dropdown.classList.add("hidden");
  });
}

function clearSearchDropdown() {
  const dropdown = document.getElementById("search-dropdown");
  dropdown.innerHTML = "";
  dropdown.classList.add("hidden");
}

function renderSearchDropdown(spots) {
  const dropdown = document.getElementById("search-dropdown");

  if (!spots || spots.length === 0) {
    dropdown.innerHTML = `<div class="search-no-results">No spots found</div>`;
    dropdown.classList.remove("hidden");
    return;
  }

  const html = spots
    .map((spot) => {
      const category = spot.category || "other";
      return `
			<div class="search-result-item" data-spot-id="${spot._id}">
				<span class="search-result-title">${spot.title}</span>
				<span class="spot-category ${category}">${category}</span>
			</div>
		`;
    })
    .join("");

  dropdown.innerHTML = html;
  dropdown.classList.remove("hidden");

  dropdown.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", () => {
      const spotId = item.dataset.spotId;
      const spot = dashSpotDataMap[spotId];
      if (!spot) return;

      clearSearchDropdown();
      document.getElementById("search-input").value = "";

      const [lng, lat] = spot.location.coordinates;
      map.setView([lat, lng], 18);

      const marker = dashMarkerMap[spotId];
      if (marker) {
        if (!map.hasLayer(marker)) marker.addTo(map);
        marker.openPopup();
      }
    });
  });
}

async function runSearch(q) {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error();
    const spots = await res.json();
    renderSearchDropdown(spots);
  } catch (err) {
    clearSearchDropdown();
  }
}

map.on("click", () => {
  const reviewSidebar = document.getElementById("dash-reviews-sidebar");
  if (!reviewSidebar.classList.contains("hidden")) {
    reviewSidebar.classList.add("hidden");
  }

  const feedSidebar = document.getElementById("dash-feed-sidebar");
  if(!feedSidebar.classList.contains("hidden")){
    feedSidebar.classList.add("hidden");
  }
});

loadDashSpots();
initUserDropdown();
loadTopRatedSpots(0);

const searchInput = document.getElementById("search-input");

searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounceTimer);
  const q = searchInput.value.trim();
  if (q.length === 0) {
    clearSearchDropdown();
    return;
  }
  searchDebounceTimer = setTimeout(() => runSearch(q), 300);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("#dash-search")) {
    clearSearchDropdown();
  }
});

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const category = btn.dataset.category;
    if (activeCategories.has(category)) {
      activeCategories.delete(category);
      btn.classList.remove("active");
    } else {
      activeCategories.add(category);
      btn.classList.add("active");
    }
    applyFilter();
  });
});

document.getElementById("feed-nav-link").addEventListener("click", (e) => {
  e.preventDefault();
  openFeedSidebar();
});
