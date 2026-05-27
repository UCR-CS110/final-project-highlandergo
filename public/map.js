const map = L.map("map", { zoomControl: true }).setView(
  [33.9737, -117.3281],
  18,
);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://www.flaticon.com/free-icons/restaurant" title="restaurant icons"> Food icon created by Setiawanap</a> | <a href="https://www.flaticon.com/free-icons/library" title="library icons">Study icons created by Fahrul Oktaviana</a> | <a href="https://www.flaticon.com/free-icons/pin" title="pin icons">Other pin created by Freepik</a>',
}).addTo(map);

let currentUserId = null;
const markerMap = {};
const spotDataMap = {};

var foodIcon = L.icon({
  iconUrl: "/mapPins/restaurant.png",
  iconSize: [40, 40],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

var studyIcon = L.icon({
  iconUrl: "/mapPins/library.png",
  iconSize: [40, 40],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

var otherIcon = L.icon({
  iconUrl: "/mapPins/maps-and-flags.png",
  iconSize: [40, 40],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

function getCategoryIcon(category){
  if(category === "food"){
    return foodIcon;
  } else if(category === "study"){
    return studyIcon;
  } else{
    return otherIcon;
  }
}

async function loadCurrentUser(){
  try{
    const res = await fetchWithCsrf("/api/me");
    const data = await res.json();
    currentUserId = data.userId;
  } catch(err) {
    console.error("Could not load current user: ", err);
  }
}

function buildCreateForm(){
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
  if(currentUserId && String(spot.author._id) === String(currentUserId)){
    actionsHtml = `
      <div class="spot-actions">
        <button id="edit-spot-${spot._id}" class="btn-edit">Edit</button>
        <button id="delete-spot-${spot._id}" class="btn-delete">Delete</button>
      </div>
    `;
  }

  return `
    <div class="spot-popup">
      <h3 class="spot-title">${spot.title}</h3>
      <div class="spot-rating">${ratingDisplay}</div>
      <span class="spot-category ${spot.category}">${spot.category}</span>

      ${reviewHtml}
      ${actionsHtml}
    </div>
  `;
}

function attachViewListeners(spotId) {
  const editBtn = document.getElementById("edit-spot-" + spotId);
  const deleteBtn = document.getElementById("delete-spot-" + spotId);

  if (editBtn) {
    editBtn.onclick = (e) => {
      e.stopPropagation();
      openEditForm(spotId);
    };
  }

  if (deleteBtn) {
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteSpot(spotId);
    };
  }
}

function addSpotMarker(spot){
  spotDataMap[spot._id] = spot;

  const [lng, lat] = spot.location.coordinates;
  const marker = L.marker([lat, lng], {icon: getCategoryIcon(spot.category)}).addTo(map);

  markerMap[spot._id] = marker;

  marker.bindPopup(buildViewPopup(spot), { maxWidth:200 });

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

  if(ratingRaw !== ""){
    const ratingVal = parseFloat(ratingRaw);
    if(isNaN(ratingVal) || ratingVal < 0 || ratingVal > 5){
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
    const res = await fetchWithCsrf("/api/spots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, category, lat, lng, rating: ratingRaw !== "" ? parseFloat(ratingRaw) : null }),
    });

    if (res.status === 401) {
      errorEl.innerHTML = 'Please <a href="/auth/login">log in</a> to add a spot.';
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
    newSpot.author = { _id: currentUserId };
    map.closePopup();
    addSpotMarker(newSpot);

  } catch (err) {
    errorEl.textContent = "Network error. Please try again.";
    errorEl.style.display = "block";
  }
}

function buildEditForm(spot){
  return`
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

function openEditForm(spotId){
  const spot = spotDataMap[spotId];
  const marker = markerMap[spotId];

  marker.setPopupContent(buildEditForm(spot));

  const saveBtn = document.getElementById("save-spot-" + spotId);
  const cancelBtn = document.getElementById("cancel-edit-" + spotId);

  if(saveBtn) saveBtn.onclick = (e) => {
    e.stopPropagation();
    submitEdit(spotId);
  };

  if(cancelBtn) cancelBtn.onclick = (e) => {
    e.stopPropagation();
    marker.setPopupContent(buildViewPopup(spotDataMap[spotId]));
    attachViewListeners(spotId);
  };
}

async function submitEdit(spotId){
  const title = document.getElementById("edit-title-" + spotId).value.trim();
  const description = document.getElementById("edit-description-" + spotId).value.trim();
  const category = document.getElementById("edit-category-" + spotId).value;
  const errorEl = document.getElementById("edit-error-" + spotId);
  const ratingRaw = document.getElementById("edit-rating-" + spotId).value.trim();

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
      body: JSON.stringify({ title, description, category, rating: ratingRaw !== "" ? parseFloat(ratingRaw) : null }),
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
  const confirmed = window.confirm("Are you sure you want to delete this spot?");
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
  if(e.originalEvent.target.closest(".leaflet-popup")) return;

  const { lat, lng } = e.latlng;

  L.popup({ maxWidth: 300 })
    .setLatLng(e.latlng)
    .setContent(buildCreateForm())
    .openOn(map);

  document.getElementById("submit-spot").addEventListener("click", () => submitSpot(lat, lng));
  
});

loadCurrentUser().then(() => {
  loadSpots();
});