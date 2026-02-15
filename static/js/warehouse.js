/*************************************************
 * GLOBAL VARIABLES
 *************************************************/
let currentOperation = "in";
let currentZoom = 1;
let rackingData = {};

// Flask data
const hasRealData = typeof warehouseData !== "undefined";

/*************************************************
 * ITEM TYPE → CSS CLASS
 *************************************************/
const ITEM_TYPE_CLASS = {
  "Control Valve": "item-control-valve",
  "Unpainted Body": "item-unpainted-body",
  "Level Troll": "item-level-troll",
  "Whisper Disk": "item-whisper-disk",
  "Diffuser": "item-diffuser"
};

/*************************************************
 * TAB SWITCHING
 *************************************************/
function switchTab(tabName, e) {
  if (e) e.preventDefault();

  document.querySelectorAll(".nav-tab").forEach(tab =>
    tab.classList.remove("active")
  );
  document.querySelectorAll(".tab-content").forEach(c =>
    c.classList.remove("active")
  );

  document
    .querySelector(`.nav-tab[onclick*="${tabName}"]`)
    .classList.add("active");

  const tab = document.getElementById(tabName);
  tab.classList.add("active", "fade-in");
}

/*************************************************
 * MAP ZOOM
 *************************************************/
function zoomMap(factor) {
  currentZoom *= factor;
  currentZoom = Math.max(0.5, Math.min(3, currentZoom));

  const map = document.getElementById("warehouseMap");
  map.style.transform = `scale(${currentZoom})`;
  map.style.transformOrigin = "top left";
}

/*************************************************
 * RACK CONFIG
 *************************************************/
const levels = ["A4", "A3", "A2", "A1"];
const rackingConfig = {
  1: { slots: 18 },
  2: { slots: 16 }
};

/*************************************************
 * GENERATE RACKING DATA (SINGLE SOURCE OF TRUTH)
 *************************************************/
function generateRackingData(rackNum) {
  const data = {};
  const totalSlots = rackingConfig[rackNum].slots;

  levels.forEach(level => {
    for (let i = 1; i <= totalSlots; i++) {
      const id = `R${rackNum}_${level}_${String(i).padStart(2, "0")}`;

      let status = "available";
      let serialNumber = null;
      let lastUpdate = null;
      let itemType = null;

      if (hasRealData && warehouseData[id]) {
        const db = warehouseData[id];

        // RESERVED / DUMMY
        if (db.status === "Reserved" || db.serial?.startsWith("Dummy_")) {
          status = "reserved";
          serialNumber = db.serial;
          lastUpdate = db.last_update_in;
        }

        // OCCUPIED
        else if (db.status === "In Storage") {
          status = "occupied";
          serialNumber = db.serial;
          lastUpdate = db.last_update_in || db.last_update_out;
          itemType = db.item_type || "Unknown";
        }
      }

      data[id] = {
        id,
        level,
        status,
        serialNumber,
        itemType,
        lastUpdated: lastUpdate || "N/A"
      };
    }
  });

  return data;
}

/*************************************************
 * CELL CLASS
 *************************************************/
function getCellClass(cell) {
  if (cell.status === "occupied") return "occupied";
  if (cell.status === "reserved") return "reserved";
  return "available";
}

/*************************************************
 * CREATE RACKING
 *************************************************/
function createRacking(rackNum, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  const totalSlots = rackingConfig[rackNum].slots;

  levels.forEach(level => {
    const row = document.createElement("div");
    row.className = "level-row";

    for (let i = totalSlots; i >= 1; i--) {
      const id = `R${rackNum}_${level}_${String(i).padStart(2, "0")}`;
      const cellData = rackingData[id];

      let itemClass = "";
      if (cellData.status === "occupied" && cellData.itemType) {
        itemClass = ITEM_TYPE_CLASS[cellData.itemType] || "";
      }

      const cell = document.createElement("div");
      cell.className = `cell ${getCellClass(cellData)} ${itemClass}`;
      cell.textContent = String(i).padStart(2, "0");
      cell.dataset.id = id;

      cell.addEventListener("mouseenter", e => showTooltip(e, cellData));
      cell.addEventListener("mousemove", moveTooltip);
      cell.addEventListener("mouseleave", hideTooltip);
      cell.addEventListener("click", () => updateSearchBox(id));

      row.appendChild(cell);
    }

    container.appendChild(row);
  });
}

/*************************************************
 * TOOLTIP
 *************************************************/
function showTooltip(e, data) {
  const tooltip = document.getElementById("tooltip");

  let html = `
    <div class="tooltip-row"><span class="tooltip-label">Location:</span> ${data.id}</div>
    <div class="tooltip-row"><span class="tooltip-label">Status:</span> ${data.status.toUpperCase()}</div>
  `;

  if (data.status === "occupied") {
    html += `
      <div class="tooltip-row"><span class="tooltip-label">Serial:</span> ${data.serialNumber}</div>
      <div class="tooltip-row"><span class="tooltip-label">Item Type:</span> ${data.itemType}</div>
      <div class="tooltip-row"><span class="tooltip-label">Last Update:</span> ${data.lastUpdated}</div>
    `;
  }

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
 * SEARCH & LOCATION SYNC
 *************************************************/
function updateSearchBox(locationId) {
  const locationBox = document.getElementById("location");
  const searchBox = document.getElementById("searchItemId");

  if (locationBox) locationBox.value = locationId;

  if (searchBox) {
    const cellData = rackingData[locationId];
    if (cellData?.serialNumber) {
      searchBox.value = cellData.serialNumber;
      searchBox.classList.remove("input-error");
    } else {
      searchBox.value = "";
    }
  }

  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.toggle("selected", cell.dataset.id === locationId);
  });
}

/*************************************************
 * SEARCH HIGHLIGHT
 *************************************************/
function highlightSearchResults(serial) {
  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.remove("search-highlight");
    const data = rackingData[cell.dataset.id];
    if (data.serialNumber === serial && data.status === "occupied") {
      cell.classList.add("search-highlight");
      cell.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

/*************************************************
 * CLEAR SEARCH
 *************************************************/
function clearSearch() {
  // 1. Clear input
  const searchBox = document.getElementById("searchItemId");
  if (searchBox) {
    searchBox.value = "";
    searchBox.classList.remove("input-error");
  }

  // 2. Remove search results table
  const searchResults = document.querySelector(".search-results");
  if (searchResults) {
    searchResults.innerHTML = "";
  }

  // 3. Remove Push Out button form
  const pushOutBtn = document.querySelector(".btn-push-out");
  if (pushOutBtn) {
    const parentForm = pushOutBtn.closest("form");
    if (parentForm) parentForm.remove();
  }

  // 4. Clear map highlights
  document.querySelectorAll(".cell").forEach(c => {
    c.classList.remove("search-highlight", "selected");
  });

  console.log("🔍 Search reset complete");
}

/*************************************************
 * REFRESH MAP
 *************************************************/
function refreshMapData() {
  window.location.reload();
}

/*************************************************
 * DUMMY PALLET
 *************************************************/
function registerDummy() {
  const location = document.getElementById("location").value.trim();
  if (!location || !rackingData[location]) {
    alert("Select a valid slot first.");
    return;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/register_dummy";

  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "kanban_location";
  input.value = location;

  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}

/*************************************************
 * KEYBOARD SHORTCUTS
 *************************************************/
document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.key === "1") document.querySelector(".nav-tab").click();
  if (e.ctrlKey && e.key === "2") document.querySelectorAll(".nav-tab")[1].click();
});

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {
  rackingData = {
    ...generateRackingData(1),
    ...generateRackingData(2)
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

  flashes.forEach(msg => {
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
  if (!input) return true;

  const serial = input.value.trim().toUpperCase();
  input.value = serial;

  // Regex: F + exactly 9 digits
  const serialRegex = /^F\d{9}$/;

  if (!serialRegex.test(serial)) {
    showSerialModal();
    input.classList.add("input-error");
    return false; // ❌ block form submit
  }

  input.classList.remove("input-error");
  return true; // ✅ allow submit
}

/*************************************************
 * SERIAL MODAL HELPERS
 *************************************************/
function showSerialModal() {
  const modal = document.getElementById("serialModal");
  if (modal) modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("serialModal");
  if (modal) modal.style.display = "none";
}

function showConfirmationModal() {
  const modal = document.getElementById("confirmationModal");
  modal.style.display = "flex";

  // Yes button → proceed with move
  document.querySelector(".btn-confirm-yes").onclick = () => {
    modal.style.display = "none";
    proceedWithMove(); // <-- your function to handle relocation
  };

  // No button → cancel move
  document.querySelector(".btn-confirm-no").onclick = () => {
    modal.style.display = "none";
  };
}