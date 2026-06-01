const map = L.map("map", { zoomControl: true }).setView(
  [33.9737, -117.3281],
  18,
);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  referrerPolicy: "no-referrer-when-downgrade",
}).addTo(map);

let currentUserId = null;
const markerMap = {};
const spotDataMap = {};

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

async function loadCurrentUser() {
  try {
    const res = await fetchWithCsrf("/api/me");
    const data = await res.json();
    currentUserId = data.userId;
  } catch (err) {
    console.error("Could not load current user: ", err);
  }
}

function buildCreateForm() {
  return `
    <div class="create-spot-form">
      <h3>Add a Spot</h3>
        
      <div id="create-error" style="display:none;"></div>
      <label for="spot-title">Title <span class="required">*</span></label>

      <input type="text" id="spot-title" placeholder="e.g. Orbach Library" maxlength="100" />

      <label for="spot-rating">Your Rating (0-5, optional)</label>
      <input type="number" id="spot-rating" min="0" max="5" step="0.5" placeholder="e.g. 4.5" />

      <label for="spot-description">Description / Review</label>
      <textarea id="spot-description" rows="3"></textarea>

      <label for="spot-photos"> Photos (optional, up to 4)</label>
      <input type="file" id="spot-photos" accept="image/*" multiple />

      <label for="spot-category">Category</label>
      <select id="spot-category">
        <option value="food">Food</option>
        <option value="study" selected>Study</option>
        <option value="other">Other</option>
      </select>

      <button id="submit-spot">Add Spot</button>
    </div>
  `;
}

function buildViewPopup(spot) {
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

  let actionsHtml = "";
  if (currentUserId && String(spot.author._id) === String(currentUserId)) {
    actionsHtml = `
      <div class="spot-actions">
        <button id="edit-spot-${spot._id}" class="btn-edit">Edit</button>
        <button id="delete-spot-${spot._id}" class="btn-delete">Delete</button>
      </div>
    `;
  }

  return `
    <div class="spot-popup">
      <div class="popup-header">
        <h3 class="spot-title">${spot.title}</h3>
        <button id="new-review-${spot._id}" class="new-review-btn">Add</button>
      </div>
      <div class="spot-rating">${ratingDisplay}</div>
      <span class="spot-category ${spot.category}">${spot.category}</span>

      ${reviewHtml}
      ${actionsHtml}
      <button id="show-more-${spot._id}" class="show-more-btn">Show More</button>
    </div>
  `;
}

function openReviewSidebar(spotId) {
  const sidebar = document.getElementById("reviews-sidebar");
  const spot = spotDataMap[spotId];

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <h3 class="sidebar-title">${spot.title}</h3>
      <button class="add-review-btn" id = "add-review-btn"> Add Review </button>
    </div>

    <div class="sidebar-review-form" id="sidebar-review-form">
      <label for="sidebar-rating">Your Rating (0-5, optional)</label>
      <input type="number" id="sidebar-rating" min="0" max="5" step="0.5" placeholder="e.g. 4.5" />

      <label for="sidebar-body">Review <span class="required">*</span></label>
      <textarea id="sidebar-body" rows="4" placeholder="Share your experience..."></textarea>

      <label for="sidebar-photos">Photos (optional, up to 4)</label>
      <input type="file" id="sidebar-photos" accept="image/*" multiple />

      <div id="sidebar-form-error" class="sidebar-form-error"></div>

      <div class="sidebar-form-buttons">
        <button class="submit-review-btn" id="submit-review-btn">Submit</button>
        <button class="cancel-review-btn" id="cancel-review-btn">Cancel</button>
      </div>
    </div>

    <div class="reviews-list" id="sidebar-reviews-list">
      <p class="no-reviews-msg">Loading reviews...</p>
    </div>
  `;

  sidebar.spotId = spotId;
  sidebar.classList.remove("hidden");

  attachSidebarListeners(spotId);
  loadSidebarReviews(spotId);
}

function buildReviewRow(username, rating, body, date, commentId, isOwner, photos){
  let ratingHtml = "";
  if (rating !== null && rating !== undefined) {
    ratingHtml = `<div class="review-rating"> &#11088; ${parseFloat(rating).toFixed(1)}</div>`;
  }

  let bodyHtml = "";
  if (body != "") {
    bodyHtml = `<div class="review-body"> ${body} </div>`;
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
  if(photos && photos.length > 0){
    const imgTags = photos.map(url => `<img src="${url}" class="review-photo" alt="review photo" />`).join("");
    photosHtml = `<div class="review-photos">${imgTags}</div>`;
  }

  let photosHtml = "";
  if(photos && photos.length > 0){
    const imgTags = photos.map(url => `<img src="${url}" class="review-photo" alt="review photo" />`).join("");
    photosHtml = `<div class="review-photos">${imgTags}</div>`;
  }

  let actionsHtml = "";
  if (isOwner && commentId) {
    actionsHtml = `
      <div class="review-actions">
        <button id="delete-comment-${commentId}" class="review-delete-btn"> Delete </button>
      </div>
    `;
  }

  return `
    <div class="review-row">
      <div class="review-author-line">
        <span class="review-username"> ${username} </span>
        <span class="review-date">${formatDate}</span>
      </div>

      ${ratingHtml}
      ${bodyHtml}
      ${photosHtml}
      ${actionsHtml}
    </div>
  `;
}

async function loadSidebarReviews(spotId) {
  const listEl = document.getElementById("sidebar-reviews-list");
  if (!listEl) return;

  try {
    const res = await fetch(`/api/spots/${spotId}/comments`);
    if (!res.ok) {
      throw new Error("Failed to load reviews");
    }

    const comments = await res.json();
    const spot = spotDataMap[spotId];

    let reviewListHtml = "";
    if (spot.description) {
      reviewListHtml += buildReviewRow(
        spot.author.username,
        spot.rating,
        spot.description,
        spot.createdAt,
        null,
        false,
      );
    }

    comments.forEach((comment) => {
      const isOwner = !!(
        currentUserId && String(comment.author._id) === String(currentUserId)
      );
      reviewListHtml += buildReviewRow(
        comment.author.username,
        comment.rating,
        comment.body,
        comment.createdAt,
        comment._id,
        isOwner,
        comment.photos
      );
    });

    listEl.innerHTML =
      reviewListHtml || `<p class="no-reviews-msg"> No reviews yet. </p>`;
    attachReviewActionListeners(spotId);
  } catch (err) {
    listEl.innerHTML = `<p class="no-reviews-msg"> Could not load reviews. </p>`;
  }
}

function attachReviewActionListeners(spotId) {
  document.querySelectorAll(".review-delete-btn").forEach((btn) => {
    btn.onclick = () => {
      const commentId = btn.id.replace("delete-comment-", "");
      deleteReview(commentId, spotId);
    };
  });
}

async function deleteReview(commentId, spotId) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this review?",
  );
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/spots/comments/${commentId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Could not delete this review");
      return;
    }

    const spotRes = await fetch(`/api/spots/${spotId}`);
    if (spotRes.ok) {
      const updatedSpot = await spotRes.json();
      spotDataMap[spotId].ratingAvg = updatedSpot.ratingAvg;
      spotDataMap[spotId].ratingCount = updatedSpot.ratingCount;
    }

    loadSidebarReviews(spotId);
  } catch (err) {
    alert("Could not delete this review.");
  }
}

async function submitReview(spotId) {
  const body = document.getElementById("sidebar-body").value.trim();
  const ratingRaw = document.getElementById("sidebar-rating").value.trim();
  const errorEl = document.getElementById("sidebar-form-error");
  const photoFiles = document.getElementById("sidebar-photos").files;

  errorEl.style.display = "none";

  if (!body) {
    errorEl.textContent = "Review text is required.";
    errorEl.style.display = "block";
    return;
  }

  try {
    let photoUrls = [];
    if(photoFiles && photoFiles.length > 0){
      const formData = new FormData();
      Array.from(photoFiles).forEach(f => formData.append("photos", f));

      const {token} = await fetch("/api/csrf-token").then(r => r.json());
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": token },
        body: formData,
      });

      if(!uploadRes.ok){
        errorEl.textContent = "Image upload failed. Please try again.";
        errorEl.style.display = "block";
        return;
      }

      const uploadData = await uploadRes.json();
      photoUrls = uploadData.urls;
    }

    const res = await fetch(`/api/spots/${spotId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body,
        rating: ratingRaw !== "" ? parseFloat(ratingRaw) : null,
        photos: photoUrls,
      }),
    });

    if (res.status === 401) {
      errorEl.innerHTML =
        'Please <a href="/auth/login">log in</a> to leave a review.';
      errorEl.style.display = "block";
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      errorEl.textContent = data.error || "Something went wrong.";
      errorEl.style.display = "block";
      return;
    }

    const newComment = await res.json();

    if (newComment.rating !== null) {
      const spot = spotDataMap[spotId];
      spot.ratingCount += 1;
      spot.ratingAvg =
        (spot.ratingAvg * (spot.ratingCount - 1) + newComment.rating) /
        spot.ratingCount;
    }

    document.getElementById("sidebar-review-form").classList.remove("visible");
    document.getElementById("sidebar-body").value = "";
    document.getElementById("sidebar-rating").value = "";
    document.getElementById("sidebar-photos").value = "";

    loadSidebarReviews(spotId);
  } catch (err) {
    errorEl.textContent = "Network error. Please try again.";
    errorEl.style.display = "block";
  }
}

function attachSidebarListeners(spotId) {
  const addBtn = document.getElementById("add-review-btn");
  const cancelBtn = document.getElementById("cancel-review-btn");
  const submitBtn = document.getElementById("submit-review-btn");
  const form = document.getElementById("sidebar-review-form");

  if (addBtn) {
    addBtn.onclick = () => form.classList.toggle("visible");
  }

  if (cancelBtn) {
    cancelBtn.onclick = () => {
      form.classList.remove("visible");
      document.getElementById("sidebar-form-error").style.display = "none";
      document.getElementById("sidebar-photos").value = "";
    };
  }

  if (submitBtn) {
    submitBtn.onclick = () => submitReview(spotId);
  }
}

function closeReviewSidebar() {
  const sidebar = document.getElementById("reviews-sidebar");
  sidebar.classList.add("hidden");
  sidebar.dataset.spotId = "";
}

function attachViewListeners(spotId) {
  const editBtn = document.getElementById("edit-spot-" + spotId);
  const deleteBtn = document.getElementById("delete-spot-" + spotId);

  if(editBtn){
    editBtn.onclick = (e) => {
      e.stopPropagation();
      openEditForm(spotId);
    };
  }

  if(deleteBtn){
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteSpot(spotId);
    };
  }

  const showMoreBtn = document.getElementById("show-more-" + spotId);
    if(showMoreBtn){
      showMoreBtn.onclick = (e) => {
        e.stopPropagation();
        map.closePopup();         
        openReviewSidebar(spotId);
      };
    }

  const newReviewBtn = document.getElementById("new-review-" + spotId);
  if(newReviewBtn){
    newReviewBtn.onclick = (e) => {
      e.stopPropagation();
      map.closePopup();
      openReviewSidebar(spotId);
      document.getElementById("sidebar-review-form").classList.add("visible");
    };
  }
}

function addSpotMarker(spot) {
  spotDataMap[spot._id] = spot;

  const [lng, lat] = spot.location.coordinates;
  const marker = L.marker([lat, lng], {
    icon: getCategoryIcon(spot.category),
  }).addTo(map);

  markerMap[spot._id] = marker;

  marker.bindPopup(buildViewPopup(spot), { maxWidth: 200 });

  marker.on("popupopen", () => {
    attachViewListeners(spot._id);
  });

  marker.on("popupclose", () => {
    marker.setPopupContent(buildViewPopup(spotDataMap[spot._id]));
  });
}

async function loadSpots() {
  try {
    const res = await fetchWithCsrf("/api/spots");
    if (!res.ok) throw new Error("Failed to load spots");
    const spots = await res.json();
    spots.forEach(addSpotMarker);
  } catch (err) {
    console.error("Could not load spots:", err);
  }
}

async function submitSpot(lat, lng) {
  const title = document.getElementById("spot-title").value.trim();
  const description = document.getElementById("spot-description").value.trim();
  const category = document.getElementById("spot-category").value;
  const errorEl = document.getElementById("create-error");
  const ratingRaw = document.getElementById("spot-rating").value.trim();
  const photoFiles = document.getElementById("spot-photos").files;

  if (ratingRaw !== "") {
    const ratingVal = parseFloat(ratingRaw);
    if (isNaN(ratingVal) || ratingVal < 0 || ratingVal > 5) {
      errorEl.textContent = "Rating must be between 0 and 5.";
      errorEl.style.display = "block";
      return;
    }
  }

  if (!title) {
    errorEl.textContent = "Title is required.";
    errorEl.style.display = "block";
    return;
  }
  errorEl.style.display = "none";

  try {
    let photoUrls = [];
    if(photoFiles && photoFiles.length > 0){
      const formData = new FormData();
      Array.from(photoFiles).forEach(f => formData.append("photos", f));

      const {token} = await fetch("/api/csrf-token").then(r => r.json());
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": token },
        body: formData,
      });

      if(!uploadRes.ok){
        errorEl.textContent = "Image upload failed. Please try again.";
        errorEl.style.display = "block";
        return;
      }

      const uploadData = await uploadRes.json();
      photoUrls = uploadData.urls;
    }

    const res = await fetchWithCsrf("/api/spots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        category,
        lat,
        lng,
        rating: ratingRaw !== "" ? parseFloat(ratingRaw) : null,
      }),
    });

    if (res.status === 401) {
      errorEl.innerHTML =
        'Please <a href="/auth/login">log in</a> to add a spot.';
      errorEl.style.display = "block";
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      errorEl.textContent = data.error || "Something went wrong.";
      errorEl.style.display = "block";
      return;
    }

    const newSpot = await res.json();

    if(description || photoUrls.length > 0 || ratingRaw !== ""){
      await fetchWithCsrf(`/api/spots/${newSpot._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: description || "(no description)",
          rating: ratingRaw !== "" ? parseFloat(ratingRaw) : null,
          photos: photoUrls,
        }),
      });
    }

    newSpot.author = { _id: currentUserId };
    map.closePopup();
    addSpotMarker(newSpot);
  } catch (err) {
    errorEl.textContent = "Network error. Please try again.";
    errorEl.style.display = "block";
  }
}

function buildEditForm(spot) {
  return `
    <div class="edit-spot-form">
      <h3>Edit Spot</h3>

      <div id="edit-error-${spot._id}" style="display:none;"></div>

      <label for="edit-title-${spot._id}">Title <span class="required">*</span></label>
      <input type="text" id="edit-title-${spot._id}" value="${spot.title}" maxlength="100" />

      <label for="edit-rating-${spot._id}">Your Rating (0-5, optional)</label>
      <input type="number" id="edit-rating-${spot._id}" min="0" max="5" step="0.5" placeholder="e.g. 4.5" value="${spot.ratingAvg > 0 ? spot.ratingAvg : ""}" />

      <label for="edit-description-${spot._id}">Description / Review</label>
      <textarea id="edit-description-${spot._id}" rows="3">${spot.description || ""}</textarea>

      <label for="edit-category-${spot._id}">Category</label>
      <select id="edit-category-${spot._id}">
        <option value="food" ${spot.category === "food" ? "selected" : ""}>Food</option>
        <option value="study" ${spot.category === "study" ? "selected" : ""}>Study</option>
        <option value="other" ${spot.category === "other" ? "selected" : ""}>Other</option>
      </select>

      <div class="edit-form-buttons">
        <button id="save-spot-${spot._id}" class="btn-save">Save</button>
        <button id="cancel-edit-${spot._id}" class="btn-cancel">Cancel</button>
      </div>
    </div>
  `;
}

function openEditForm(spotId) {
  const spot = spotDataMap[spotId];
  const marker = markerMap[spotId];

  marker.setPopupContent(buildEditForm(spot));

  const saveBtn = document.getElementById("save-spot-" + spotId);
  const cancelBtn = document.getElementById("cancel-edit-" + spotId);

  if (saveBtn)
    saveBtn.onclick = (e) => {
      e.stopPropagation();
      submitEdit(spotId);
    };

  if (cancelBtn)
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      marker.setPopupContent(buildViewPopup(spotDataMap[spotId]));
      attachViewListeners(spotId);
    };
}

async function submitEdit(spotId) {
  const title = document.getElementById("edit-title-" + spotId).value.trim();
  const description = document
    .getElementById("edit-description-" + spotId)
    .value.trim();
  const category = document.getElementById("edit-category-" + spotId).value;
  const errorEl = document.getElementById("edit-error-" + spotId);
  const ratingRaw = document
    .getElementById("edit-rating-" + spotId)
    .value.trim();

  if (!title) {
    errorEl.textContent = "Title is required.";
    errorEl.style.display = "block";
    return;
  }

  if (ratingRaw !== "") {
    const ratingVal = parseFloat(ratingRaw);
    if (isNaN(ratingVal) || ratingVal < 0 || ratingVal > 5) {
      errorEl.textContent = "Rating must be a number between 0 and 5.";
      errorEl.style.display = "block";
      return;
    }
  }

  errorEl.style.display = "none";

  try {
    const res = await fetchWithCsrf("/api/spots/" + spotId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        category,
        rating: ratingRaw !== "" ? parseFloat(ratingRaw) : null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      errorEl.textContent = data.error || "Could not save changes.";
      errorEl.style.display = "block";
      return;
    }

    const updatedSpot = await res.json();
    updatedSpot.author = { _id: currentUserId };
    spotDataMap[spotId] = updatedSpot;
    markerMap[spotId].setPopupContent(buildViewPopup(updatedSpot));
    attachViewListeners(spotId);
  } catch (err) {
    errorEl.textContent = "Network error. Please try again.";
    errorEl.style.display = "block";
  }
}

async function deleteSpot(spotId) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this spot?",
  );
  if (!confirmed) return;

  try {
    const res = await fetchWithCsrf("/api/spots/" + spotId, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Could not delete this spot.");
      return;
    }

    map.closePopup();
    markerMap[spotId].remove();
    delete markerMap[spotId];
    delete spotDataMap[spotId];
  } catch (err) {
    alert("Network error. Could not delete this spot.");
  }
}

map.on("click", (e) => {
  const sidebar = document.getElementById("reviews-sidebar");
  if (!sidebar.classList.contains("hidden")) {
    closeReviewSidebar();
    return;
  }

  if (e.originalEvent.target.closest(".leaflet-popup")) return;

  const { lat, lng } = e.latlng;

  L.popup({ maxWidth: 300 })
    .setLatLng(e.latlng)
    .setContent(buildCreateForm())
    .openOn(map);

  document
    .getElementById("submit-spot")
    .addEventListener("click", () => submitSpot(lat, lng));
});

loadCurrentUser().then(() => {
  loadSpots();
});
