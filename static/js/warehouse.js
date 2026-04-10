/*
 * Warehouse JS Logic - Industrial UI Version
 */

// Global State
let rackingData = {};
let currentZoom = 1;
let activeSidePanelTab = "registration";
let distributionChart = null;
let capacityChart = null;

const ITEM_TYPE_CLASS = {
  "Control Valve": "item-control-valve",
  "Unpainted Body": "item-unpainted-body",
  "Level Troll": "item-level-troll",
  "Whisper Disk": "item-whisper-disk",
  Diffuser: "item-diffuser",
};

const levels = ["A4", "A3", "A2", "A1"];
// rackingConfig is now provided by the template (flask data)
// const rackingConfig = {
//   1: { slots: 18 },
//   2: { slots: 16 }
// };

/*************************************************
 * INITIALIZATION
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Icons
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  // Position Active Indicator initially
  const activeBtn = document.querySelector(".nav-item.active");
  const indicator = document.getElementById("activeIndicator");
  if (activeBtn && indicator) {
    indicator.style.transform = `translateY(${activeBtn.offsetTop - 24}px)`;
  }

  // Restore Sidebar State
  const sidebarState = localStorage.getItem("sidebarState");
  const activePanelTab = localStorage.getItem("activePanelTab");

  if (sidebarState === "open") {
    const panel = document.getElementById("sidebarSecondary");
    panel.classList.add("open");
    document.querySelector(".app-header").classList.add("secondary-open");
    document.querySelector(".main-viewport").classList.add("secondary-open");

    if (activePanelTab) {
      switchPanelTab(activePanelTab);
      // Update nav item active state if needed (e.g. registration/search)
      const navBtn = document.querySelector(
        `.nav-item[onclick*="${activePanelTab}"]`
      );
      if (navBtn) {
        document
          .querySelectorAll(".nav-item")
          .forEach((item) => item.classList.remove("active"));
        navBtn.classList.add("active");
        indicator.style.transform = `translateY(${navBtn.offsetTop - 24}px)`;
      }
    }
  }

  // Sync data from Flask global
  if (typeof warehouseData !== "undefined") {
    initRackingData();
    renderAllRacks();
    initDashboard();
  } else {
    console.warn("warehouseData not found. Retrying in 1s...");
    setTimeout(() => {
      if (typeof warehouseData !== "undefined") {
        initRackingData();
        renderAllRacks();
        initDashboard();
      }
    }, 1000);
  }

  // Auto-fill from search results if present
  const resultCard = document.querySelector(".result-card");
  if (resultCard) {
    const loc = resultCard.querySelector("p strong").textContent.trim();
    highlightMapLocation(loc);
  }

  // Setup Flash Toast Auto-hide
  const toasts = document.querySelectorAll(".flash-toast");
  toasts.forEach((t) => {
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateX(120%)";
      setTimeout(() => t.remove(), 500);
    }, 4000);
  });
});

function initRackingData() {
  rackingData = {
    ...generateRackingData(1),
    ...generateRackingData(2),
  };
}

function renderAllRacks() {
  createRacking(1, "racking1");
  createRacking(2, "racking2");
}

/*************************************************
 * SIDEBAR NAVIGATION LOGIC
 *************************************************/
function handleNavClick(tabId, btn) {
  // 1. Move Indicator
  const indicator = document.getElementById("activeIndicator");
  if (btn && indicator) {
    const btnTop = btn.offsetTop;
    indicator.style.transform = `translateY(${btnTop - 24}px)`; // Offset by padding-top
  }

  // 2. Manage Active States
  document
    .querySelectorAll(".nav-item")
    .forEach((item) => item.classList.remove("active"));
  btn.classList.add("active");

  // 3. Handle Transitions
  if (tabId === "map-view" || tabId === "dashboard") {
    closeSecondaryPanel();
    switchTab(tabId);
  } else if (tabId === "registration" || tabId === "search") {
    openSecondaryPanel(tabId);
  } else if (tabId === "activity") {
    // Optional: Activity handling
    console.log("Activity log clicked");
  }
}

function openSecondaryPanel(targetTab) {
  const panel = document.getElementById("sidebarSecondary");
  panel.classList.add("open");
  localStorage.setItem("sidebarState", "open");

  // Apply Push Layout
  document.querySelector(".app-header").classList.add("secondary-open");
  document.querySelector(".main-viewport").classList.add("secondary-open");

  if (targetTab) {
    switchPanelTab(targetTab);
    localStorage.setItem("activePanelTab", targetTab);
  }
}

function closeSecondaryPanel() {
  const panel = document.getElementById("sidebarSecondary");
  panel.classList.remove("open");
  localStorage.setItem("sidebarState", "closed");

  // Remove Push Layout
  document.querySelector(".app-header").classList.remove("secondary-open");
  document.querySelector(".main-viewport").classList.remove("secondary-open");
}

function switchTab(tabId) {
  // Update Content
  document
    .querySelectorAll(".main-viewport .tab-content")
    .forEach((c) => c.classList.remove("active"));
  const target = document.getElementById(tabId);
  if (target) {
    target.classList.add("active");
    if (tabId === "dashboard") updateDashboardData();
  }
}

function switchPanelTab(tabId) {
  activeSidePanelTab = tabId;

  // Update Buttons
  document.querySelectorAll(".p-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === tabId);
  });

  // Update Content
  document.querySelectorAll(".panel-tab-content").forEach((c) => {
    c.classList.toggle("active", c.id === `p-${tabId}`);
  });

  document.getElementById("panelTitle").textContent =
    tabId.charAt(0).toUpperCase() + tabId.slice(1);
}

/*************************************************
 * RACK GENERATION
 *************************************************/
function generateRackingData(rackId) {
  const data = {};
  const rack = rackingConfig.find((r) => r.id == rackId);
  const totalSlots = rack ? rack.slots : 0;

  levels.forEach((level) => {
    for (let i = 1; i <= totalSlots; i++) {
      const id = `R${rackNum}_${level}_${String(i).padStart(2, "0")}`;

      let status = "available";
      let serial = null;
      let type = null;
      let lastUp = null;

      if (warehouseData && warehouseData[id]) {
        const db = warehouseData[id];
        if (db.status === "Reserved" || db.serial?.startsWith("Dummy_")) {
          status = "reserved";
          serial = db.serial;
        } else if (db.status === "In Storage") {
          status = "occupied";
          serial = db.serial;
          type = db.item_type;
          lastUp = db.last_update_in;
        }
      }

      data[id] = { id, status, serial, type, lastUp };
    }
  });
  return data;
}

function createRacking(rackNum, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  const totalSlots = rackingConfig[rackNum].slots;

  levels.forEach((level) => {
    const row = document.createElement("div");
    row.className = "level-row";

    // Right-to-Left loop: Slot 01 will be on the far right
    for (let i = totalSlots; i >= 1; i--) {
      const id = `R${rackNum}_${level}_${String(i).padStart(2, "0")}`;
      const cellData = rackingData[id];

      const cell = document.createElement("div");
      cell.className = `cell ${cellData.status}`;
      if (cellData.type && ITEM_TYPE_CLASS[cellData.type]) {
        cell.classList.add(ITEM_TYPE_CLASS[cellData.type]);
      }
      cell.textContent = String(i).padStart(2, "0");
      cell.dataset.id = id;

      cell.addEventListener("mouseenter", (e) => showTooltip(e, cellData));
      cell.addEventListener("mousemove", moveTooltip);
      cell.addEventListener("mouseleave", hideTooltip);
      cell.addEventListener("click", () => selectSlot(id));

      row.appendChild(cell);
    }
    container.appendChild(row);
  });
}

function selectSlot(id) {
  const data = rackingData[id];
  document
    .querySelectorAll(".cell")
    .forEach((c) => c.classList.remove("selected"));
  const cell = document.querySelector(`.cell[data-id="${id}"]`);
  if (cell) cell.classList.add("selected");

  // Fill Registration Location
  const locInput = document.getElementById("location");
  if (locInput) locInput.value = id;

  // If occupied, fill search box for info
  if (data.status === "occupied") {
    const searchInput = document.getElementById("searchItemId");
    if (searchInput) searchInput.value = data.serial;
  }

  // Open Registration Panel
  const regBtn = document.querySelector('.nav-item[onclick*="registration"]');
  handleNavClick("registration", regBtn);
}

/*************************************************
 * TOOLTIP
 *************************************************/
function showTooltip(e, data) {
  const tooltip = document.getElementById("tooltip");
  let html = `<strong>Location: ${
    data.id
  }</strong><br>Status: ${data.status.toUpperCase()}`;
  if (data.serial) html += `<br>Serial: ${data.serial}`;
  if (data.type) html += `<br>Type: ${data.type}`;
  if (data.lastUp) html += `<br>In: ${data.lastUp}`;

  tooltip.innerHTML = html;
  tooltip.classList.add("show");
  moveTooltip(e);
}

function moveTooltip(e) {
  const tooltip = document.getElementById("tooltip");
  tooltip.style.left = e.clientX + 15 + "px";
  tooltip.style.top = e.clientY + 15 + "px";
}

function hideTooltip() {
  document.getElementById("tooltip").classList.remove("show");
}

/*************************************************
 * MAP UTILS
 *************************************************/
function zoomMap(factor) {
  currentZoom *= factor;
  currentZoom = Math.max(0.3, Math.min(3, currentZoom));
  const map = document.getElementById("warehouseMap");
  map.style.transform = `scale(${currentZoom})`;
  map.style.transformOrigin = "top left";
}

function refreshMapData() {
  location.reload();
}

function highlightMapLocation(locId) {
  const cell = document.querySelector(`.cell[data-id="${locId}"]`);
  if (cell) {
    cell.classList.add("selected");
    cell.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/*************************************************
 * DASHBOARD LOGIC (CHART.JS)
 *************************************************/
function initDashboard() {
  const ctxDistrib = document
    .getElementById("distributionChart")
    ?.getContext("2d");
  const ctxCap = document.getElementById("capacityChart")?.getContext("2d");

  if (!ctxDistrib || !ctxCap) return;

  // Process data for charts
  const types = {};
  const rackCap = { "Rack 1": 0, "Rack 2": 0 };
  let occupiedCount = 0;

  Object.keys(warehouseData).forEach((loc) => {
    const item = warehouseData[loc];
    if (item.status === "In Storage") {
      occupiedCount++;
      const t = item.item_type || "Unknown";
      types[t] = (types[t] || 0) + 1;

      const rack = loc.startsWith("R1") ? "Rack 1" : "Rack 2";
      rackCap[rack]++;
    }
  });

  // Utilization Stats
  const total = 136;
  const util = ((occupiedCount / total) * 100).toFixed(1);
  document.getElementById("utilPercent").textContent = util;
  document.getElementById("syncTime").textContent =
    new Date().toLocaleTimeString();

  // Distribution Pie Chart
  distributionChart = new Chart(ctxDistrib, {
    type: "doughnut",
    data: {
      labels: Object.keys(types),
      datasets: [
        {
          data: Object.values(types),
          backgroundColor: [
            "#2563eb",
            "#10b981",
            "#f59e0b",
            "#8b5cf6",
            "#ef4444",
            "#64748b",
          ],
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 12, font: { size: 10 } },
        },
      },
      maintainAspectRatio: false,
    },
  });

  // Capacity Bar Chart
  capacityChart = new Chart(ctxCap, {
    type: "bar",
    data: {
      labels: ["Rack 1", "Rack 2"],
      datasets: [
        {
          label: "Occupied Slots",
          data: [rackCap["Rack 1"], rackCap["Rack 2"]],
          backgroundColor: "#2563eb",
          borderRadius: 8,
        },
        {
          label: "Total Capacity",
          data: [72, 64], // R1: 4*18=72, R2: 4*16=64
          backgroundColor: "#e2e8f0",
          borderRadius: 8,
        },
      ],
    },
    options: {
      scales: {
        y: { beginAtZero: true, grid: { display: false } },
        x: { grid: { display: false } },
      },
      plugins: { legend: { display: false } },
      maintainAspectRatio: false,
    },
  });
}

function updateDashboardData() {
  // Logic to refresh charts if needed
  if (distributionChart) distributionChart.update();
  if (capacityChart) capacityChart.update();
}

/*************************************************
 * KEYBOARD SHORTCUTS
 *************************************************/
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "1") document.querySelector(".nav-tab").click();
  if (e.ctrlKey && e.key === "2")
    document.querySelectorAll(".nav-tab")[1].click();
});

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {
  rackingData = {
    ...generateRackingData(1),
    ...generateRackingData(2),
  };

  createRacking(1, "racking1");
  createRacking(2, "racking2");

  // Auto-highlight search result after reload
  setTimeout(() => {
    const cell = document.querySelector(".results-table td");
    if (cell) highlightSearchResults(cell.textContent.trim());
  }, 500);

  console.log("✅ Warehouse JS cleaned & fully restored");
});

/*************************************************
 * MESSAGE FLASH FADE OUT
 *************************************************/

document.addEventListener("DOMContentLoaded", () => {
  const flashes = document.querySelectorAll(".flash-message");

  flashes.forEach((msg) => {
    setTimeout(() => {
      msg.style.transition = "opacity 0.3s ease";
      msg.style.opacity = "0";

      // remove from DOM after fade
      setTimeout(() => msg.remove(), 300);
    }, 500); // ⏱ 0.5 second
  });
});

/*************************************************
 * VALIDATE SEARCH INPUT
 *************************************************/
function validateSerialNumber() {
  const input = document.getElementById("itemId");
  const serial = input.value.trim().toUpperCase();
  input.value = serial;

  const serialRegex = /^F\d{9}$/;
  if (!serialRegex.test(serial)) {
    document.getElementById("serialModal").style.display = "flex";
    input.classList.add("input-error");
    return false;
  }
  return true;
}

function closeModal() {
  document.getElementById("serialModal").style.display = "none";
}

function clearSearch() {
  document.getElementById("searchItemId").value = "";
  const container = document.getElementById("sideSearchResults");
  if (container) container.innerHTML = "";
  document
    .querySelectorAll(".cell")
    .forEach((c) => c.classList.remove("selected"));
}

function registerDummy() {
  const loc = document.getElementById("location").value;
  if (!loc) {
    alert("Please select a location first.");
    return;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/register_dummy"; // This stays the same as it's a fixed route
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "kanban_location";
  input.value = loc;
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}

function openScanner() {
  // Assuming html5-qrcode is loaded as in previous version
  const html5QrCode = new Html5Qrcode("reader");
  const config = { fps: 10, qrbox: { width: 250, height: 250 } };

  html5QrCode
    .start({ facingMode: "environment" }, config, (decodedText) => {
      document.getElementById("itemId").value = decodedText;
      html5QrCode.stop();
    })
    .catch((err) => alert("Camera error: " + err));
}
