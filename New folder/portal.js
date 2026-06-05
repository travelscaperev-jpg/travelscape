let token = localStorage.getItem('portal_token');
let userRole = localStorage.getItem('portal_role');

document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    showDashboard();
  }
});

async function login() {
  const role = document.getElementById('login-role').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, password })
    });
    
    if (res.ok) {
      const data = await res.json();
      token = data.token;
      userRole = data.role;
      localStorage.setItem('portal_token', token);
      localStorage.setItem('portal_role', userRole);
      showDashboard();
    } else {
      document.getElementById('login-error').style.display = 'block';
    }
  } catch (err) {
    console.error(err);
  }
}

function logout() {
  token = null;
  userRole = null;
  localStorage.removeItem('portal_token');
  localStorage.removeItem('portal_role');
  document.getElementById('login-section').classList.remove('hidden');
  document.getElementById('dashboard-section').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('dashboard-section').classList.remove('hidden');
  document.getElementById('user-role-display').innerText = userRole;
  loadBookings();
  loadContacts();
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#dashboard-section > div[id^="tab-"]').forEach(t => t.classList.add('hidden'));
  
  event.target.classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.remove('hidden');
}

async function loadBookings() {
  const res = await fetch('/api/bookings', { headers: { 'Authorization': `Bearer ${token}` }});
  if (res.ok) {
    const bookings = await res.json();
    const tbody = document.getElementById('bookings-table-body');
    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td>${b.bookingNo}</td>
        <td>${b.name}</td>
        <td>${b.email}</td>
        <td>${b.category}</td>
        <td>${new Date(b.date).toLocaleDateString()}</td>
        <td>${b.status}</td>
        <td>
          ${b.status === 'PENDING' ? `<button onclick="confirmBooking(${b.id})" style="padding:5px; background:green; font-size:12px;">Confirm</button>` : ''}
          ${userRole === 'ADMIN' ? `<button onclick="deleteBooking(${b.id})" style="padding:5px; background:red; font-size:12px;">Delete</button>` : ''}
        </td>
      </tr>
    `).join('');
  }
}

async function loadContacts() {
  const res = await fetch('/api/contacts', { headers: { 'Authorization': `Bearer ${token}` }});
  if (res.ok) {
    const contacts = await res.json();
    const tbody = document.getElementById('contacts-table-body');
    tbody.innerHTML = contacts.map(c => `
      <tr>
        <td>${c.name}</td>
        <td>${c.email}</td>
        <td>${c.message}</td>
        <td>
          ${userRole === 'ADMIN' ? `<button onclick="deleteContact(${c.id})" style="padding:5px; background:red; font-size:12px;">Delete</button>` : ''}
        </td>
      </tr>
    `).join('');
  }
}

async function confirmBooking(id) {
  await fetch(`/api/bookings/${id}/confirm`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` }});
  loadBookings();
}

async function deleteBooking(id) {
  if(confirm('Delete this booking?')) {
    await fetch(`/api/bookings/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
    loadBookings();
  }
}

async function deleteContact(id) {
  if(confirm('Delete this message?')) {
    await fetch(`/api/contacts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
    loadContacts();
  }
}
