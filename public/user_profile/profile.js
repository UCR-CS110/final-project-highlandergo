async function loadProfile() {
    try {
        const [profileRes, meRes] = await Promise.all([
            fetch("/api/user/profile", { credentials: "include" }),
            fetch("/api/me", { credentials: "include" })
        ]);

        if (profileRes.status === 401) {
            document.getElementById("profile-info").innerHTML = `
                <p style="text-align:center; margin-top: 40px; font-size: 0.95rem; color: #666;">
                    You are not currently logged in, please login 
                    <a href="/auth/login" style="color: #003da5; font-weight: 600;">here</a>
                </p>
            `;
            return;
        }

        const profile = await profileRes.json();
        const me = await meRes.json();

        document.title = `${profile.username}'s Profile`;

        const isOwner = String(profile.userId) === String(me.userId);

        const editBtn = document.getElementById("edit-btn");
        if (isOwner) {
            editBtn.style.display = "inline-block";
            editBtn.onclick = () => openEditForm(profile);
        }

        const joinDate = new Date(profile.joinDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        const avatarHtml = profile.avatar
            ? `<img src="${profile.avatar}" alt="avatar" class="avatar" />`
            : `<div class="avatar-placeholder">${profile.username.charAt(0).toUpperCase()}</div>`;

        document.getElementById("profile-info").innerHTML = `
            ${avatarHtml}
            <h2 class="username">${profile.username}</h2>
            <p class="bio" id="bio-text">${profile.bio || 'No bio yet.'}</p>
            <div class="profile-stats">
                <div class="stat">
                    <span class="stat-value">${profile.postCount}</span>
                    <span class="stat-label">Posts</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${joinDate}</span>
                    <span class="stat-label">Joined</span>
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        document.getElementById("profile-info").textContent = "Error loading profile.";
    }
}

function openEditForm(profile) {
    document.getElementById("profile-info").innerHTML = `
        <div class="edit-form">
            <label>Username</label>
            <input type="text" id="edit-username" value="${profile.username}" />

            <label>Bio</label>
            <textarea id="edit-bio" rows="3">${profile.bio || ''}</textarea>

            <label>Avatar URL</label>
            <input type="text" id="edit-avatar" value="${profile.avatar || ''}" placeholder="Must be a direct image URL ending in .jpg, .png, etc." />
            <div id="edit-error" class="edit-error"></div>
            <div class="edit-form-buttons">
                <button id="save-btn">Save</button>
                <button id="cancel-btn">Cancel</button>
            </div>
        </div>
    `;

    document.getElementById("save-btn").onclick = () => saveProfile();
    document.getElementById("cancel-btn").onclick = () => loadProfile();
}

async function saveProfile() {
    const username = document.getElementById("edit-username").value.trim();
    const bio = document.getElementById("edit-bio").value.trim();
    const avatar = document.getElementById("edit-avatar").value.trim();
    const errorEl = document.getElementById("edit-error");

    if (!username) {
        errorEl.textContent = "Username is required.";
        return;
    }

    try {
        const res = await fetch("/api/user/profile", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, bio, avatar })
        });

        if (!res.ok) {
            const data = await res.json();
            errorEl.textContent = data.error || "Could not save changes.";
            return;
        }

        loadProfile();
    } catch (err) {
        errorEl.textContent = "Network error. Please try again.";
    }
}

loadProfile();