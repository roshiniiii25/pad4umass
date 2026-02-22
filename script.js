const firebaseConfig = {
  apiKey: "AIzaSyAJ6dNZ0gcaRd16C-KAqpqFeb6s4I5AKKQ",
  authDomain: "pad4u-rna.firebaseapp.com",
  databaseURL: "https://pad4u-rna-default-rtdb.firebaseio.com",
  projectId: "pad4u-rna",
  storageBucket: "pad4u-rna.firebasestorage.app",
  messagingSenderId: "898817502893",
  appId: "1:898817502893:web:1fa268e8d325e8891aa024"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let allBuildings = [];
let currentFilter = "all";

// Load buildings from Firebase in real time
database.ref("buildings").on("value", (snapshot) => {
  allBuildings = [];
  const data = snapshot.val();
  if (data) {
    Object.keys(data).forEach((key) => {
      allBuildings.push({ id: key, ...data[key] });
    });
  }
  applyFilters();
  loadDashboardBuildings();
});

function renderBuildings(buildings) {
  const list = document.getElementById("buildingsList");
  if (buildings.length === 0) {
    list.innerHTML = '<p class="no-results">No restrooms match your search.</p>';
    return;
  }
  list.innerHTML = buildings.map(b => {
    const isAvailable = b.status === "Pads available";
    return `
      <div class="building-card" onclick="toggleDetails('${b.id}')">
        <div class="building-card-header">
          <div class="building-info">
            <h4>${b.name}</h4>
            <p>${b.floor}</p>
          </div>
          <span class="building-status ${isAvailable ? 'available' : 'empty'}">
            ${isAvailable ? '✅ Available' : '❌ Empty'}
          </span>
        </div>
        <div class="building-details" id="details-${b.id}">
          <p><strong>Location:</strong> ${b.floor}</p>
          <p class="big-status" style="color:${isAvailable ? '#27ae60' : '#c0392b'}">
            ${isAvailable ? '✅ Pads are available in this restroom' : '❌ No pads available in this restroom'}
          </p>
        </div>
      </div>
    `;
  }).join("");
}

function toggleDetails(id) {
  const details = document.getElementById("details-" + id);
  details.classList.toggle("open");
}

function filterBuildings(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  applyFilters();
}

function applyFilters() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  let filtered = allBuildings;

  if (currentFilter === "available") {
    filtered = filtered.filter(b => b.status === "Pads available");
  } else if (currentFilter === "empty") {
    filtered = filtered.filter(b => b.status !== "Pads available");
  }

  if (query) {
    filtered = filtered.filter(b =>
      b.name.toLowerCase().includes(query) ||
      b.floor.toLowerCase().includes(query)
    );
  }

  renderBuildings(filtered);
}

function loadDashboardBuildings() {
  const list = document.getElementById("dashboardBuildingsList");
  if (!list) return;

  if (allBuildings.length === 0) {
    list.innerHTML = '<p style="color:#888; text-align:center;">No buildings added yet.</p>';
    return;
  }

  list.innerHTML = allBuildings.map(b => {
    const isAvailable = b.status === "Pads available";
    return `
      <div style="background:#faf8f5; border-radius:16px; padding:16px 20px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <p style="font-weight:800; color:#1a1a1a;">${b.name}</p>
            <p style="font-size:13px; color:#888;">${b.floor}</p>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:13px; font-weight:700; padding:6px 14px; border-radius:20px; background:${isAvailable ? '#e8f8f0' : '#fde8e8'}; color:${isAvailable ? '#27ae60' : '#c0392b'};">
              ${isAvailable ? '✅ Available' : '❌ Empty'}
            </span>
            ${!isAvailable ? `<button onclick="restockBuilding('${b.id}')" style="background:#27ae60; color:white; border:none; padding:6px 14px; border-radius:20px; font-family:'Nunito',sans-serif; font-weight:700; font-size:13px; cursor:pointer;">🌸 Restock</button>` : ''}
            <button onclick="deleteBuilding('${b.id}')" style="background:#fde8e8; color:#c0392b; border:none; padding:6px 14px; border-radius:20px; font-family:'Nunito',sans-serif; font-weight:700; font-size:13px; cursor:pointer;">🗑 Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function restockBuilding(id) {
  database.ref("buildings/" + id + "/status").set("Pads available")
    .then(() => alert("Building restocked! 🌸"))
    .catch((error) => alert("Error: " + error.message));
}

function deleteBuilding(id) {
  if (confirm("Are you sure you want to remove this building?")) {
    database.ref("buildings/" + id).remove()
      .then(() => alert("Building removed! 🌸"))
      .catch((error) => alert("Error: " + error.message));
  }
}

function showAdminLogin() {
  const user = firebase.auth().currentUser;
  if (user) {
    showDashboard();
  } else {
    document.getElementById("adminOverlay").classList.add("active");
  }
}

function hideAdminLogin() {
  document.getElementById("adminOverlay").classList.remove("active");
}

function adminLogin() {
  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      hideAdminLogin();
      showDashboard();
    })
    .catch((error) => {
      alert("Error: " + error.message);
    });
}

function showDashboard() {
  document.getElementById("adminDashboard").style.display = "block";
  loadDashboardBuildings();

  database.ref("dispenser/status").on("value", (snapshot) => {
    const status = snapshot.val();
    const statusEl = document.getElementById("dashboardStatus");
    const emojiEl = document.getElementById("dashboardEmoji");

    statusEl.innerText = status;
    if (status === "Dispenser empty" || status === "dispenser empty" || status === "Not Available") {
      statusEl.className = "current-status empty";
      emojiEl.innerText = "❌";
    } else {
      statusEl.className = "current-status available";
      emojiEl.innerText = "✅";
    }
  });
}

function markAvailable() {
  database.ref("dispenser/status").set("Pads available");
  alert("Dispenser marked as restocked! 🌸");
}

function adminLogout() {
  firebase.auth().signOut().then(() => {
    document.getElementById("adminDashboard").style.display = "none";
    alert("Logged out successfully!");
  });
}

function goHome() {
  document.getElementById("adminDashboard").style.display = "none";
}

function addBuilding() {
  const name = document.getElementById("buildingName").value.trim();
  const floor = document.getElementById("buildingFloor").value.trim();

  if (name === "" || floor === "") {
    alert("Please fill in all fields!");
    return;
  }

  const newBuilding = database.ref("buildings").push();
  newBuilding.set({
    name: name,
    floor: floor,
    status: "Not available"
  }).then(() => {
    alert(name + " - " + floor + " has been added! 🌸");
    document.getElementById("buildingName").value = "";
    document.getElementById("buildingFloor").value = "";
  }).catch((error) => {
    alert("Error adding building: " + error.message);
  });
}

function searchDropdown() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const dropdown = document.getElementById("searchDropdown");

  if (query === "") {
    dropdown.classList.remove("open");
    return;
  }

  const filtered = allBuildings.filter(b =>
    b.name.toLowerCase().includes(query) ||
    b.floor.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    dropdown.innerHTML = '<div class="dropdown-item"><div><h4>No results found</h4></div></div>';
  } else {
    dropdown.innerHTML = filtered.map(b => {
      const isAvailable = b.status === "Pads available";
      return `
        <div class="dropdown-item" onclick="selectBuilding('${b.id}')">
          <div>
            <h4>${b.name}</h4>
            <p>${b.floor}</p>
          </div>
          <span class="building-status ${isAvailable ? 'available' : 'empty'}">
            ${isAvailable ? '✅ Available' : '❌ Empty'}
          </span>
        </div>
      `;
    }).join("");
  }

  dropdown.classList.add("open");
}

function selectBuilding(id) {
  const building = allBuildings.find(b => b.id === id);
  if (building) {
    document.getElementById("searchInput").value = building.name;
    document.getElementById("searchDropdown").classList.remove("open");
    applyFilters();
  }
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrapper")) {
    document.getElementById("searchDropdown").classList.remove("open");
  }
});




