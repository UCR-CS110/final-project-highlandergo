function showStatus(msg, type){
  const el = document.getElementById('admin-status');
  el.textContent = msg;
  el.className = `admin-status ${type}`;
  setTimeout(() => { el.className = 'admin-status hidden'; }, 3000);
}

function fmtDate(createdAt){
  return new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

async function loadSpots(){
  const wrap = document.getElementById('spots-table-wrap');
  try {
    const res = await fetch('/api/admin/spots', { credentials: 'include' });
    if(!res.ok) throw new Error('Failed to load spots');
    const spots = await res.json();

    document.getElementById('spot-count').textContent = `(${spots.length})`;

    if(spots.length === 0){
      wrap.innerHTML = '<p class="no-data-msg">No spots found.</p>';
      return;
    }

    wrap.innerHTML = `
      <table class="admin-table" id="spots-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Author</th>
            <th>Rating</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${spots.map(s => renderSpotRow(s)).join('')}
        </tbody>
      </table>
    `;

    attachSpotListeners(spots);
  } catch (err) {
    wrap.innerHTML = `<p class="admin-loading">Error loading spots: ${err.message}</p>`;
  }
}

function renderSpotRow(s){
  const rating = s.ratingCount > 0 ? `${s.ratingAvg.toFixed(1)} ★ (${s.ratingCount})` : 'No ratings';
  return `
    <tr id="spot-row-${s._id}">
      <td>
        <div class="admin-cell-wrap">${s.title}</div>
        <div class="admin-meta">${s.description || ''}</div>
      </td>
      <td>${s.category}</td>
      <td>${s.author?.username || '—'}</td>
      <td>${rating}</td>
      <td>${fmtDate(s.createdAt)}</td>
      <td>
        <div class="admin-actions">
          <button class="btn-admin-edit" data-id="${s._id}" data-type="spot">Edit</button>
          <button class="btn-admin-delete" data-id="${s._id}" data-type="spot">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function attachSpotListeners(spots){
  const spotMap = Object.fromEntries(spots.map(s => [s._id, s]));

  document.querySelectorAll('[data-type="spot"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if(btn.classList.contains('btn-admin-delete')){
        deleteSpot(id);
      } else {
        openSpotEdit(id, spotMap[id]);
      }
    });
  });
}

function openSpotEdit(id, spot){
  const row = document.getElementById(`spot-row-${id}`);
  row.outerHTML = `
    <tr id="spot-row-${id}" class="admin-edit-row">
      <td colspan="6">
        <div class="admin-edit-form">
          <input id="sedit-title-${id}" type="text" value="${spot.title}" placeholder="Title" />
          <textarea id="sedit-desc-${id}" placeholder="Description">${spot.description || ''}</textarea>
          <select id="sedit-cat-${id}">
            <option value="food"${spot.category === 'food' ? ' selected' : ''}>Food</option>
            <option value="study"${spot.category === 'study' ? ' selected' : ''}>Study</option>
            <option value="other"${spot.category === 'other' ? ' selected' : ''}>Other</option>
          </select>
          <div class="admin-edit-buttons">
            <button id="sedit-save-${id}" class="btn-admin-save">Save</button>
            <button id="sedit-cancel-${id}" class="btn-admin-cancel">Cancel</button>
          </div>
        </div>
      </td>
    </tr>
  `;
  document.getElementById(`sedit-save-${id}`).addEventListener('click', () => saveSpot(id));
  document.getElementById(`sedit-cancel-${id}`).addEventListener('click', () => loadSpots());
}

async function saveSpot(id){
  const title = document.getElementById(`sedit-title-${id}`).value.trim();
  const description = document.getElementById(`sedit-desc-${id}`).value.trim();
  const category = document.getElementById(`sedit-cat-${id}`).value;

  if (!title) { showStatus('Title is required.', 'error'); return; }

  try {
    const res = await fetch(`/api/admin/spots/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, category }),
    });
    if(!res.ok) throw new Error((await res.json()).error);
    showStatus('Spot updated.', 'success');
    loadSpots();
  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
  }
}

async function deleteSpot(id){
  if(!confirm('Delete this spot? This cannot be undone.')) return;
  try {
    const res = await fetch(`/api/admin/spots/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if(!res.ok) throw new Error((await res.json()).error);
    showStatus('Spot deleted.', 'success');
    document.getElementById(`spot-row-${id}`)?.remove();
    const count = document.querySelectorAll('#spots-table tbody tr').length;
    document.getElementById('spot-count').textContent = `(${count})`;
  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
  }
}

async function loadComments() {
  const wrap = document.getElementById('comments-table-wrap');
  try {
    const res = await fetch('/api/admin/comments', { credentials: 'include' });
    if(!res.ok) throw new Error('Failed to load comments');
    const comments = await res.json();

    document.getElementById('comment-count').textContent = `(${comments.length})`;

    if(comments.length === 0){
      wrap.innerHTML = '<p class="no-data-msg">No comments found.</p>';
      return;
    }

    wrap.innerHTML = `
      <table class="admin-table" id="comments-table">
        <thead>
          <tr>
            <th>Body</th>
            <th>Author</th>
            <th>Spot</th>
            <th>Rating</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${comments.map(c => renderCommentRow(c)).join('')}
        </tbody>
      </table>
    `;

    attachCommentListeners(comments);
  } catch (err) {
    wrap.innerHTML = `<p class="admin-loading">Error loading comments: ${err.message}</p>`;
  }
}

function renderCommentRow(c){
  const rating = c.rating !== null && c.rating !== undefined ? `${c.rating} ★` : '—';
  return `
    <tr id="comment-row-${c._id}">
      <td><div class="admin-cell-wrap">${c.body}</div></td>
      <td>${c.author?.username || '—'}</td>
      <td><div class="admin-cell-wrap">${c.spot?.title || '—'}</div></td>
      <td>${rating}</td>
      <td>${fmtDate(c.createdAt)}</td>
      <td>
        <div class="admin-actions">
          <button class="btn-admin-edit" data-id="${c._id}" data-type="comment">Edit</button>
          <button class="btn-admin-delete" data-id="${c._id}" data-type="comment">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function attachCommentListeners(comments){
  const commentMap = Object.fromEntries(comments.map(c => [c._id, c]));

  document.querySelectorAll('[data-type="comment"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if(btn.classList.contains('btn-admin-delete')){
        deleteComment(id);
      } else {
        openCommentEdit(id, commentMap[id]);
      }
    });
  });
}

function openCommentEdit(id, comment){
  const row = document.getElementById(`comment-row-${id}`);
  row.outerHTML = `
    <tr id="comment-row-${id}" class="admin-edit-row">
      <td colspan="6">
        <div class="admin-edit-form">
          <textarea id="cedit-body-${id}">${comment.body}</textarea>
          <div class="admin-edit-buttons">
            <button id="cedit-save-${id}" class="btn-admin-save">Save</button>
            <button id="cedit-cancel-${id}" class="btn-admin-cancel">Cancel</button>
          </div>
        </div>
      </td>
    </tr>
  `;
  document.getElementById(`cedit-save-${id}`).addEventListener('click', () => saveComment(id));
  document.getElementById(`cedit-cancel-${id}`).addEventListener('click', () => loadComments());
}

async function saveComment(id){
  const body = document.getElementById(`cedit-body-${id}`).value.trim();
  if (!body) { showStatus('Comment body cannot be empty.', 'error'); return; }

  try {
    const res = await fetch(`/api/admin/comments/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    if(!res.ok) throw new Error((await res.json()).error);
    showStatus('Comment updated.', 'success');
    loadComments();
  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
  }
}

async function deleteComment(id){
  if(!confirm('Delete this comment?')) return;
  try {
    const res = await fetch(`/api/admin/comments/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if(!res.ok) throw new Error((await res.json()).error);
    showStatus('Comment deleted.', 'success');
    document.getElementById(`comment-row-${id}`)?.remove();
    const count = document.querySelectorAll('#comments-table tbody tr').length;
    document.getElementById('comment-count').textContent = `(${count})`;
  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
  }
}

loadSpots();
loadComments();