const form = document.querySelector('#task-form');
const titleInput = document.querySelector('#task-title');
const descriptionInput = document.querySelector('#task-description');
const list = document.querySelector('#task-list');
const statusMessage = document.querySelector('#status-message');
const submitButton = document.querySelector('#task-submit');
const cancelButton = document.querySelector('#cancel-edit');
const count = document.querySelector('#task-count');
let config;
let editingId = null;

async function initialize() {
  try {
    const response = await fetch('./config.json');
    if (!response.ok) throw new Error('Could not load config.json.');
    config = await response.json();
    if (!config.supabaseUrl?.startsWith('https://') || !config.supabasePublishableKey || !config.tableName) throw new Error('Add your Supabase URL and publishable key to config.json.');
    await loadTasks();
  } catch (error) { showError(error); }
}
function apiUrl(query = '') { return `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(config.tableName)}${query}`; }
async function api(path = '', options = {}) {
  const response = await fetch(apiUrl(path), { ...options, headers: { apikey: config.supabasePublishableKey, Authorization: `Bearer ${config.supabasePublishableKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (!response.ok) { let detail = ''; try { detail = (await response.json()).message || ''; } catch {} throw new Error(detail || `Database request failed (${response.status}).`); }
  return response.status === 204 ? null : response.json();
}
async function loadTasks() {
  statusMessage.classList.remove('error'); statusMessage.textContent = 'Loading tasks…';
  try { const tasks = await api('?select=*&order=id.desc'); renderTasks(Array.isArray(tasks) ? tasks : []); statusMessage.textContent = tasks.length ? '' : 'No tasks yet. Add one above to get started.'; }
  catch (error) { showError(error); }
}
function renderTasks(tasks) {
  list.replaceChildren(); count.textContent = String(tasks.length);
  for (const task of tasks) {
    const card = document.createElement('article'); card.className = 'task-item'; card.dataset.id = task.id;
    const content = document.createElement('div'); content.className = 'task-content';
    const title = document.createElement('h3'); title.className = 'task-title'; title.textContent = task.title;
    const description = document.createElement('p'); description.className = 'task-description'; description.textContent = task.description || 'No description';
    const status = document.createElement('span'); status.className = 'task-status'; status.textContent = task.completed ? 'Completed' : 'In progress'; status.classList.toggle('is-complete', Boolean(task.completed));
    content.append(title, description, status);
    const actions = document.createElement('div'); actions.className = 'task-actions';
    actions.append(makeButton(task.completed ? 'Mark active' : 'Complete', 'toggle-task', () => changeTask(task.id, { completed: !task.completed })), makeButton('Edit', 'edit-task', () => startEdit(task)), makeButton('Delete', 'delete-task', () => deleteTask(task.id), 'danger'));
    card.append(content, actions); list.append(card);
  }
}
function makeButton(label, className, action, extraClass = '') { const button = document.createElement('button'); button.type = 'button'; button.className = `${className} ${extraClass}`.trim(); button.textContent = label; button.addEventListener('click', action); return button; }
function startEdit(task) { editingId = task.id; titleInput.value = task.title; descriptionInput.value = task.description || ''; submitButton.textContent = 'Save changes'; document.querySelector('#form-heading').textContent = 'Edit task'; cancelButton.hidden = false; titleInput.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function resetForm() { editingId = null; form.reset(); submitButton.textContent = 'Add task'; document.querySelector('#form-heading').textContent = 'Create a task'; cancelButton.hidden = true; }
async function changeTask(id, changes) { try { await api(`?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(changes) }); await loadTasks(); } catch (error) { showError(error); } }
async function deleteTask(id) { try { await api(`?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); if (String(editingId) === String(id)) resetForm(); await loadTasks(); } catch (error) { showError(error); } }
form.addEventListener('submit', async (event) => {
  event.preventDefault(); const payload = { title: titleInput.value.trim(), description: descriptionInput.value.trim() }; if (!payload.title) return;
  submitButton.disabled = true;
  try { if (editingId === null) await api('', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) }); else await api(`?id=eq.${encodeURIComponent(editingId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) }); resetForm(); await loadTasks(); }
  catch (error) { showError(error); } finally { submitButton.disabled = false; }
});
cancelButton.addEventListener('click', resetForm);
function showError(error) { statusMessage.textContent = `Could not complete the request: ${error.message}`; statusMessage.classList.add('error'); }
initialize();

