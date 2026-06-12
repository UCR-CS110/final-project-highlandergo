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

            <label>Avatar</label>
            <input type="file" id="edit-avatar-file" accept="image/*" />

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
    const fileInput = document.getElementById("edit-avatar-file");
    const errorEl = document.getElementById("edit-error");

    if (!username) {
        errorEl.textContent = "Username is required.";
        return;
    }

    let avatar = null;

    if (fileInput.files.length > 0) {
        try {
            const formData = new FormData();
            formData.append("photos", fileInput.files[0]);

            const { token } = await fetch("/api/csrf-token").then((r) => r.json());
            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                credentials: "include",
                headers: { "x-csrf-token": token },
                body: formData,
            });

            if (!uploadRes.ok) {
                errorEl.textContent = "Image upload failed.";
                return;
            }

            const uploadData = await uploadRes.json();
            avatar = uploadData.urls[0];
        } catch (err) {
            errorEl.textContent = "Image upload failed.";
            return;
        }
    }

    try {
        const body = { username, bio };
        if (avatar) body.avatar = avatar;

        const res = await fetch("/api/user/profile", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
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