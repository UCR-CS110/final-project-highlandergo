document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab, btn));
});

document.getElementById('users-body').addEventListener('change', e => {
    const sel = e.target.closest('[data-action="role"]');
    if (sel) updateUser(sel.dataset.id, sel.value, sel.dataset.banned === 'true');
});
document.getElementById('users-body').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="ban"]');
    if (btn) updateUser(btn.dataset.id, btn.dataset.role, btn.dataset.banned === 'true');
});

document.getElementById('spots-body').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="delete"]');
    if (btn) deleteSpot(btn.dataset.id);
});

async function loadStats() {
    const res = await fetch('/api/admin/stats', { credentials: 'include' });
    if (res.status === 403) {
        document.body.innerHTML = '<h2 style="text-align:center;margin-top:100px;">Access Denied</h2>';
        return;
    }
    const data = await res.json();
    document.getElementById('stats-bar').innerHTML = `
        <div class="stat-card"><span class="stat-num">${data.totalUsers}</span><span class="stat-label">Total Users</span></div>
        <div class="stat-card"><span class="stat-num">${data.totalSpots}</span><span class="stat-label">Total Spots</span></div>
        <div class="stat-card">
            <span class="stat-label">Recent Signups</span>
            ${data.recentSignups.map(u => `<div class="recent-user">${u.username} <span>${new Date(u.createdAt).toLocaleDateString()}</span></div>`).join('')}
        </div>
    `;
}

async function loadUsers() {
    const res = await fetch('/api/admin/users', { credentials: 'include' });
    const users = await res.json();
    document.getElementById('users-body').innerHTML = users.map(u => `
        <tr>
            <td>${u.username}</td>
            <td>${u.email}</td>
            <td>
                <select data-action="role" data-id="${u._id}" data-banned="${u.banned || false}">
                    <option ${u.role === 'user' ? 'selected' : ''}>user</option>
                    <option ${u.role === 'admin' ? 'selected' : ''}>admin</option>
                </select>
            </td>
            <td>${new Date(u.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn-ban" data-action="ban" data-id="${u._id}" data-role="${u.role}" data-banned="${!u.banned}">
                    ${u.banned ? 'Unban' : 'Ban'}
                </button>
            </td>
        </tr>
    `).join('');
}

async function updateUser(id, role, banned) {
    await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, banned })
    });
    loadUsers();
}

async function loadSpots() {
    const res = await fetch('/api/admin/spots', { credentials: 'include' });
    const spots = await res.json();
    document.getElementById('spots-body').innerHTML = spots.map(s => `
        <tr>
            <td>${s.title}</td>
            <td><span class="spot-category ${s.category}">${s.category}</span></td>
            <td>${s.author?.username || 'unknown'}</td>
            <td>${new Date(s.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn-delete" data-action="delete" data-id="${s._id}">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function deleteSpot(id) {
    if (!confirm('Delete this spot?')) return;
    await fetch(`/api/admin/spots/${id}`, {
        method: 'DELETE',
        credentials: 'include'
    });
    loadSpots();
}

function showTab(tab, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).style.display = 'block';
    btn.classList.add('active');
}

loadStats();
loadUsers();
loadSpots();
