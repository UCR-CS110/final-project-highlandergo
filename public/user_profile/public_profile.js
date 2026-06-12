let currentUsername = null;
let currentlyFollowing = false;

async function loadPublicProfile() {
  currentUsername = window.location.pathname.split('/').filter(Boolean).pop();

  try {
    const res = await fetch(`/api/user/public/${encodeURIComponent(currentUsername)}`, {
      credentials: 'include'
    });

    if (res.status === 404) {
      document.getElementById('profile-info').innerHTML = '<p class="bio">User not found.</p>';
      document.title = 'User Not Found - Highlander GO';
      return;
    }

    if (!res.ok) throw new Error('Server error');

    const profile = await res.json();
    currentlyFollowing = profile.isFollowing;

    document.title = `${profile.username} - Highlander GO`;

    const joinDate = new Date(profile.joinDate).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const avatarHtml = profile.avatar
      ? `<img src="${profile.avatar}" alt="avatar" class="avatar" />`
      : `<div class="avatar-placeholder">${profile.username.charAt(0).toUpperCase()}</div>`;

    let followHtml = '';
    if (profile.isSelf) {
      followHtml = '';
    } else if (profile.isFollowing) {
      followHtml = `<button class="follow-btn following" id="follow-btn">Following</button>`;
    } else {
      followHtml = `<button class="follow-btn" id="follow-btn">Follow</button>`;
    }

    document.getElementById('profile-info').innerHTML = `
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
      <div id="follow-error" class="follow-error" style="display:none;"></div>
      ${followHtml}
    `;

    const btn = document.getElementById('follow-btn');
    if (btn) btn.addEventListener('click', handleFollowClick);

  } catch (err) {
    console.error(err);
    document.getElementById('profile-info').textContent = 'Error loading profile.';
  }
}

async function handleFollowClick() {
  const btn = document.getElementById('follow-btn');
  const errorEl = document.getElementById('follow-error');
  errorEl.style.display = 'none';

  const method = currentlyFollowing ? 'DELETE' : 'POST';

  try {
    const res = await fetch(`/api/user/follow/${encodeURIComponent(currentUsername)}`, {
      method,
      credentials: 'include',
    });

    const data = await res.json();

    if (res.status === 401) {
      errorEl.innerHTML = 'You must be <a href="/auth/login">logged in</a> to follow users.';
      errorEl.style.display = 'block';
      return;
    }

    if (res.status === 400) {
      errorEl.textContent = data.error || 'Cannot follow this user.';
      errorEl.style.display = 'block';
      return;
    }

    if (!res.ok) {
      errorEl.textContent = data.error || 'Something went wrong.';
      errorEl.style.display = 'block';
      return;
    }

    currentlyFollowing = data.isFollowing;

    if (currentlyFollowing) {
      btn.textContent = 'Following';
      btn.classList.add('following');
    } else {
      btn.textContent = 'Follow';
      btn.classList.remove('following');
    }

  } catch (err) {
    errorEl.textContent = 'Network error. Please try again.';
    errorEl.style.display = 'block';
  }
}

loadPublicProfile();