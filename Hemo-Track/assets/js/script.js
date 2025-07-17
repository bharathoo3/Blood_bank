// Initialize Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Firestore collection names as constants
const COLLECTIONS = {
  USERS: 'users',
  DONORS: 'donors',
  BLOOD_REQUESTS: 'blood_requests',
  BLOOD_STOCK: 'blood_stock',
  DONATIONS: 'donations'
};

// Check user authentication and role
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.uid).get();
      if (userDoc.exists) {
        userDoc.data()?.role === 'admin' ? await loadAdminDashboard() : await loadUserDashboard(user.uid);
      } else {
        logoutUser();
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      alert('An error occurred while fetching your role.');
      logoutUser();
    }
  } else {
    window.location.href = 'login.html';
  }
});

// Load Admin Dashboard Data
async function loadAdminDashboard() {
  try {
    document.getElementById('loading-indicator').style.display = 'block';
    await Promise.all([
      fetchOverviewData(),
      renderBloodStockChart(),
      loadRecentRequests(),
      renderBloodStockPieChart()
    ]);
    document.getElementById('loading-indicator').style.display = 'none';
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
  }
}

// Fetch Overview Data for Admin Cards
async function fetchOverviewData() {
  try {
    const [donors, bloodStock, users, bloodRequests] = await Promise.all([
      db.collection(COLLECTIONS.DONORS).get(),
      db.collection(COLLECTIONS.BLOOD_STOCK).get(),
      db.collection(COLLECTIONS.USERS).get(),
      db.collection(COLLECTIONS.BLOOD_REQUESTS).get()
    ]);

    document.getElementById('total-donors').innerText = donors.size;
    document.getElementById('blood-stock').innerText = bloodStock.docs.reduce((acc, doc) => acc + (doc.data().units || 0), 0);
    document.getElementById('registered-users').innerText = users.size;
    document.getElementById('blood-requests').innerText = bloodRequests.size;
  } catch (error) {
    console.error('Error fetching overview data:', error);
  }
}

// Chart instances to prevent duplicates
let bloodStockChart = null;

// Render Blood Stock Chart for Admin
async function renderBloodStockChart() {
  try {
    if (bloodStockChart) bloodStockChart.destroy();

    const snapshot = await db.collection(COLLECTIONS.BLOOD_STOCK).get();
    const labels = snapshot.docs.map(doc => doc.id);
    const data = snapshot.docs.map(doc => doc.data().units || 0);

    const ctx = document.getElementById('bloodStockChart').getContext('2d');
    bloodStockChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Units Available', data, backgroundColor: 'rgba(220,53,69,0.6)' }] },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  } catch (error) {
    console.error('Error rendering blood stock chart:', error);
  }
}

// Load Recent Blood Requests for Admin
async function loadRecentRequests() {
  try {
    const snapshot = await db.collection(COLLECTIONS.BLOOD_REQUESTS).orderBy('timestamp', 'desc').limit(5).get();
    const tableBody = document.querySelector('#requests-table tbody');
    tableBody.innerHTML = '';

    for (const doc of snapshot.docs) {
      const request = doc.data();
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(request.user).get();
      const userEmail = userDoc.exists ? userDoc.data()?.email || 'Unknown' : 'Unknown';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${userEmail}</td>
        <td>${request.blood_group}</td>
        <td>${request.units}</td>
        <td>${request.status}</td>
        <td>
          ${request.status === 'Pending' ? `
            <button class="btn btn-success btn-sm" onclick="updateRequestStatus('${doc.id}', 'Accepted')">Accept</button>
            <button class="btn btn-danger btn-sm" onclick="updateRequestStatus('${doc.id}', 'Rejected')">Reject</button>
          ` : '—'}
        </td>
      `;
      tableBody.appendChild(row);
    }
  } catch (error) {
    console.error('Error loading recent requests:', error);
  }
}

// Update Request Status for Admin
async function updateRequestStatus(requestId, status) {
  try {
    await db.collection(COLLECTIONS.BLOOD_REQUESTS).doc(requestId).update({ status });
    alert(`Request ${status}`);
    await loadRecentRequests();
    await fetchOverviewData();
  } catch (error) {
    console.error('Error updating request:', error);
  }
}

// Load User Dashboard Data
async function loadUserDashboard(userId) {
  try {
    document.getElementById('loading-indicator').style.display = 'block';
    await Promise.all([
      fetchUserOverview(userId),
      renderUserRequestsChart(userId),
      loadAvailableDonors()
    ]);
    document.getElementById('loading-indicator').style.display = 'none';
  } catch (error) {
    console.error('Error loading user dashboard:', error);
  }
}

// Fetch Overview Data for User
async function fetchUserOverview(userId) {
  try {
    const [donors, bloodStock, userContributions, userRequests] = await Promise.all([
      db.collection(COLLECTIONS.DONORS).get(),
      db.collection(COLLECTIONS.BLOOD_STOCK).get(),
      db.collection(COLLECTIONS.DONATIONS).where('donor_id', '==', userId).get(),
      db.collection(COLLECTIONS.BLOOD_REQUESTS).where('user', '==', userId).get()
    ]);

    document.getElementById('total-donors').innerText = donors.size;
    document.getElementById('blood-stock').innerText = bloodStock.docs.reduce((acc, doc) => acc + (doc.data().units || 0), 0);
    document.getElementById('your-contributions').innerText = userContributions.size;
    document.getElementById('user-requests').innerText = userRequests.size;
  } catch (error) {
    console.error('Error fetching user overview:', error);
  }
}

// Load Available Donors for User
async function loadAvailableDonors(limit = 10) {
  try {
    const snapshot = await db.collection(COLLECTIONS.DONORS).limit(limit).get();
    const tableBody = document.querySelector('#donors-table tbody');
    tableBody.innerHTML = '';

    snapshot.forEach((doc) => {
      const donor = doc.data();
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${donor.name}</td>
        <td>${donor.blood_group}</td>
        <td>${donor.contact}</td>
        <td>${donor.available ? 'Yes' : 'No'}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading available donors:', error);
  }
}

// Logout Function
function logoutUser() {
  auth.signOut()
    .then(() => window.location.href = 'login.html')
    .catch(error => console.error('Logout error:', error));
}
