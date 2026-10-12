// Same origin as the backend. If you open index.html from another origin,
// change this to 'http://localhost:3000/api/opportunities'.
const API_URL = '/api/opportunities';

const FIELDS = [
  'title', 'description', 'research_area', 'faculty_name',
  'department', 'required_skills', 'positions', 'deadline', 'status',
];

let opportunities = [];

const tableBody = document.getElementById('tableBody');
const emptyMsg = document.getElementById('emptyMsg');
const alertBox = document.getElementById('alertBox');
const form = document.getElementById('oppForm');
const detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));
const formModal = new bootstrap.Modal(document.getElementById('formModal'));

/* ---------- Helpers ---------- */
function showAlert(message, type = 'success') {
  alertBox.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => { alertBox.innerHTML = ''; }, 5000);
}

function esc(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

function badge(status) {
  const cls = status === 'Open' ? 'badge-open' : 'badge-closed';
  return `<span class="badge ${cls}">${esc(status)}</span>`;
}

// Wrapper around fetch that throws readable errors
async function api(url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = data.details ? ': ' + data.details.join('; ') : '';
    throw new Error((data.error || `Request failed (${res.status})`) + details);
  }
  return data;
}

/* ---------- Read / render ---------- */
async function loadOpportunities() {
  try {
    opportunities = await api(API_URL);
    render();
  } catch (err) {
    showAlert(err.message, 'danger');
  }
}

function render() {
  const q = document.getElementById('searchBox').value.toLowerCase();
  const st = document.getElementById('statusFilter').value;

  const list = opportunities.filter((o) => {
    const text = [o.title, o.research_area, o.faculty_name, o.department]
      .join(' ').toLowerCase();
    return text.includes(q) && (!st || o.status === st);
  });

  emptyMsg.classList.toggle('d-none', list.length > 0);
  tableBody.innerHTML = list.map((o) => `
    <tr>
      <td>${o.id}</td>
      <td>${esc(o.title)}</td>
      <td>${esc(o.research_area)}</td>
      <td>${esc(o.faculty_name)}</td>
      <td>${o.positions}</td>
      <td>${esc(o.deadline)}</td>
      <td>${badge(o.status)}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-primary" onclick="viewOpportunity(${o.id})">View</button>
        <button class="btn btn-sm btn-outline-secondary" onclick="editOpportunity(${o.id})">Edit</button>
        ${o.status === 'Open'
          ? `<button class="btn btn-sm btn-outline-warning" onclick="closeOpportunity(${o.id})">Close</button>`
          : ''}
        <button class="btn btn-sm btn-outline-danger" onclick="deleteOpportunity(${o.id})">Delete</button>
      </td>
    </tr>`).join('');
}

/* ---------- View one ---------- */
async function viewOpportunity(id) {
  try {
    const o = await api(`${API_URL}/${id}`);
    document.getElementById('detailsBody').innerHTML = `
      <h4>${esc(o.title)} ${badge(o.status)}</h4>
      <p class="text-muted">${esc(o.research_area)}</p>
      <p>${esc(o.description)}</p>
      <hr />
      <div class="row">
        <div class="col-md-6"><span class="detail-label">Faculty:</span> ${esc(o.faculty_name)}</div>
        <div class="col-md-6"><span class="detail-label">Department:</span> ${esc(o.department)}</div>
        <div class="col-md-6"><span class="detail-label">Required skills:</span> ${esc(o.required_skills)}</div>
        <div class="col-md-3"><span class="detail-label">Positions:</span> ${o.positions}</div>
        <div class="col-md-3"><span class="detail-label">Deadline:</span> ${esc(o.deadline)}</div>
      </div>`;
    detailsModal.show();
  } catch (err) {
    showAlert(err.message, 'danger');
    loadOpportunities(); // item may have been removed
  }
}

/* ---------- Create / Edit ---------- */
function resetForm() {
  form.reset();
  form.classList.remove('was-validated');
  document.getElementById('oppId').value = '';
  document.getElementById('status').value = 'Open';
}

document.getElementById('btnNew').addEventListener('click', () => {
  resetForm();
  document.getElementById('formTitle').textContent = 'New Opportunity';
  formModal.show();
});

async function editOpportunity(id) {
  try {
    const o = await api(`${API_URL}/${id}`);
    resetForm();
    document.getElementById('formTitle').textContent = `Edit Opportunity #${o.id}`;
    document.getElementById('oppId').value = o.id;
    FIELDS.forEach((f) => { document.getElementById(f).value = o[f]; });
    formModal.show();
  } catch (err) {
    showAlert(err.message, 'danger');
    loadOpportunities();
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Client-side validation of required fields
  const positions = document.getElementById('positions');
  const posOk = positions.value !== '' && Number.isInteger(Number(positions.value)) && Number(positions.value) >= 0;
  positions.setCustomValidity(posOk ? '' : 'invalid');

  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const payload = {};
  FIELDS.forEach((f) => { payload[f] = document.getElementById(f).value.trim(); });
  payload.positions = Number(payload.positions);

  const id = document.getElementById('oppId').value;
  try {
    if (id) {
      await api(`${API_URL}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showAlert('Opportunity updated successfully.');
    } else {
      await api(API_URL, { method: 'POST', body: JSON.stringify(payload) });
      showAlert('Opportunity created successfully.');
    }
    formModal.hide();
    loadOpportunities();
  } catch (err) {
    showAlert(err.message, 'danger');
  }
});

/* ---------- Close (Open -> Closed) ---------- */
async function closeOpportunity(id) {
  if (!confirm('Close this opportunity? Students will no longer be able to apply.')) return;
  try {
    await api(`${API_URL}/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'Closed' }) });
    showAlert('Opportunity closed.');
    loadOpportunities();
  } catch (err) {
    showAlert(err.message, 'danger');
    loadOpportunities();
  }
}

/* ---------- Delete ---------- */
async function deleteOpportunity(id) {
  if (!confirm('Delete this opportunity permanently?')) return;
  try {
    await api(`${API_URL}/${id}`, { method: 'DELETE' });
    showAlert('Opportunity deleted.');
    loadOpportunities();
  } catch (err) {
    showAlert(err.message, 'danger');
    loadOpportunities();
  }
}

document.getElementById('searchBox').addEventListener('input', render);
document.getElementById('statusFilter').addEventListener('change', render);

loadOpportunities();
