// Global variables
let currentOperation = "in";
let currentZoom = 1;
let rackingData = {};

// Check if warehouseData exists (passed from Flask template)
const hasRealData = typeof warehouseData !== "undefined";

// Tab switching functionality
function switchTab(tabName, e) {
  if (e) e.preventDefault();

  document
    .querySelectorAll(".nav-tab")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));

  document
    .querySelector(`.nav-tab[onclick*="${tabName}"]`)
    .classList.add("active");
  document.getElementById(tabName).classList.add("active");
  document.getElementById(tabName).classList.add("fade-in");
}

// Toggle between In and Out operations
function toggleOperation(operation) {
  currentOperation = operation;

  // Update toggle buttons
  document
    .querySelectorAll(".toggle-option")
    .forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  // Update button text
  const btnText = document.getElementById("btnText");
  btnText.textContent =
    operation === "in" ? "Register Item" : "Process Stock Out";
}

// Process registration
function processRegistration() {
  const itemId = document.getElementById("itemId").value;
  const itemName = document.getElementById("itemName").value;
  const category = document.getElementById("category").value;
  const quantity = document.getElementById("quantity").value;
  const location = document.getElementById("location").value;
  const notes = document.getElementById("notes").value;

  if (!itemId || !itemName || !category || !quantity || !location) {
    alert("Please fill in all required fields");
    return;
  }

  // Simulate processing
  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = "Processing...";
  btn.disabled = true;

  setTimeout(() => {
    // Update statistics
    //updateStatistics(currentOperation, parseInt(quantity));

    // Reset form
    document.getElementById("itemId").value = "";
    document.getElementById("itemName").value = "";
    document.getElementById("category").value = "";
    document.getElementById("quantity").value = "";
    document.getElementById("location").value = "";
    document.getElementById("notes").value = "";

    btn.innerHTML = originalText;
    btn.disabled = false;

    alert(
      `Item ${
        currentOperation === "in" ? "registered" : "processed"
      } successfully!`
    );
    refreshMapData();
  }, 1500);
}

// Update statistics based on actual data
function updateStatistics(operation, quantity) {
  const totalItems = document.getElementById("totalItems");
  const availableSlots = document.getElementById("availableSlots");
  const occupiedSlots = document.getElementById("occupiedSlots");

  let currentTotal = parseInt(totalItems.textContent);
  let currentAvailable = parseInt(availableSlots.textContent);
  let currentOccupied = parseInt(occupiedSlots.textContent);

  if (operation === "in") {
    currentTotal += quantity;
    currentAvailable -= quantity;
    currentOccupied += quantity;
  } else {
    currentTotal -= quantity;
    currentAvailable += quantity;
    currentOccupied -= quantity;
  }

  // Animate number changes
  animateNumber(totalItems, currentTotal);
  animateNumber(availableSlots, currentAvailable);
  animateNumber(occupiedSlots, currentOccupied);
}

// Animate number changes
function animateNumber(element, targetValue) {
  const startValue = parseInt(element.textContent);
  const duration = 1000;
  const startTime = performance.now();

  function updateNumber(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const currentValue = Math.round(
      startValue + (targetValue - startValue) * progress
    );
    element.textContent = currentValue;

    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    }
  }

  requestAnimationFrame(updateNumber);
}

// Map functionality
function zoomMap(factor) {
  currentZoom *= factor;
  currentZoom = Math.max(0.5, Math.min(3, currentZoom));

  const warehouseMap = document.getElementById("warehouseMap");
  warehouseMap.style.transform = `scale(${currentZoom})`;
  warehouseMap.style.transformOrigin = "top left";
}

// Show notification function
function showNotification(message, color = "#667eea") {
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.className = "notification";
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
  notification.textContent = message;

  const style = document.createElement("style");
  style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideIn 0.3s ease reverse";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function handleLocationChange(selectElement) {
  const locationInput = document.getElementById("location");
  if (selectElement.value === "Out Storage") {
    locationInput.disabled = true;
    locationInput.required = false;
  } else {
    locationInput.disabled = false;
    locationInput.required = true;
  }
}

function findRecord() {
  console.log("Find Record clicked");
}

function clearSearch() {
  // Clear the search input
  const searchInput = document.getElementById("searchItemId");
  if (searchInput) {
    searchInput.value = "";
    searchInput.classList.remove("input-error");
  }

  // Clear the results table
  const resultsTable = document.querySelector(".search-results");
  if (resultsTable) {
    resultsTable.innerHTML = "";
  }

  // Clear the push out button (it's a sibling of search-results)
  const pushOutForm = document.querySelector(".btn-push-out");
  if (pushOutForm && pushOutForm.closest("form")) {
    pushOutForm.closest("form").remove();
  }
}

function pushOutFromSlot() {
  const serial = document.getElementById("searchItemId").value;
  const serialInput = document.getElementById("serial_number_input");
  if (serialInput) {
    serialInput.value = serial;
  }
}

// Flash message handling
document.addEventListener("DOMContentLoaded", () => {
  const flashMessages = document.querySelectorAll(".flash-message");
  flashMessages.forEach((msg) => {
    setTimeout(() => {
      msg.style.animation = "fadeOut 0.8s ease forwards";
    }, 3000);
  });

  const flashWarning = document.querySelector(".flash-message.warning");
  const confirmedInput = document.getElementById("confirmed");

  if (flashWarning && confirmedInput) {
    const proceed = confirm(
      flashWarning.textContent + "\n\nClick OK to confirm."
    );
    if (proceed) {
      confirmedInput.value = "yes";
      document.querySelector("form").submit();
    }
  }
});

// Keyboard shortcuts
document.addEventListener("keydown", function (e) {
  if (e.ctrlKey) {
    switch (e.key) {
      case "1":
        e.preventDefault();
        document.querySelector(".nav-tab").click();
        break;
      case "2":
        e.preventDefault();
        document.querySelectorAll(".nav-tab")[1].click();
        break;
      case "Enter":
        if (
          document.getElementById("registration").classList.contains("active")
        ) {
          processRegistration();
        }
        break;
    }
  }
});

// ============= MAP LOGIC WITH DATABASE INTEGRATION =============

const levels = ["A4", "A3", "A2", "A1"];
const rackingConfig = {
  1: { slots: 18 }, // R1 has 18 slots per level
  2: { slots: 16 }, // R2 has 16 slots per level
};

// Generate racking data - NOW INTEGRATED WITH DATABASE
function generateRackingData(rackNum) {
  const data = {};
  const totalSlots = rackingConfig[rackNum].slots;

  levels.forEach((level) => {
    for (let i = 1; i <= totalSlots; i++) {
      const id = `R${rackNum}_${level}_${String(i).padStart(2, "0")}`;

      // Default values
      let status = "available";
      let serialNumber = null;
      let lastUpdate = null;
      let items = 0;
      let occupancy = 0;

      // Check if this location exists in database
      if (hasRealData && warehouseData && warehouseData[id]) {
        const dbData = warehouseData[id];

        // DEBUG: Log every match
        console.log(`✓ Found DB data for ${id}:`, dbData);
        console.log(`  - Status: ${dbData.status}`);
        console.log(`  - Serial: ${dbData.serial}`);

        // CRITICAL: Check status carefully (case-sensitive!)
        if (dbData.status === "In Storage") {
          status = "occupied";
          serialNumber = dbData.serial;
          lastUpdate = dbData.last_update_in || dbData.last_update_out;
          items = 1;
          occupancy = 100;

          console.log(`  ✓ Set ${id} to OCCUPIED (GREEN)`);
        } else {
          console.log(
            `  ✗ Status is "${dbData.status}" - keeping as AVAILABLE (RED)`
          );
        }
      }

      data[id] = {
        id: id,
        level: level,
        status: status,
        occupancy: occupancy,
        items: items,
        serialNumber: serialNumber,
        lastUpdated: lastUpdate || "N/A",
        intensity: status === "occupied" ? 1 : 0,
      };
    }
  });

  console.log(`Generated ${Object.keys(data).length} slots for R${rackNum}`);
  return data;
}

// Get CSS class based on cell status
function getCellClass(cell) {
  // occupied = GREEN, available = RED
  return cell.status === "occupied" ? "occupied" : "available";
}

// Create and render racking grid
function createRacking(rackNum, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  const totalSlots = rackingConfig[rackNum].slots;

  levels.forEach((level) => {
    const row = document.createElement("div");
    row.className = "level-row";

    // Create slots from right to left
    for (let i = totalSlots; i >= 1; i--) {
      const id = `R${rackNum}_${level}_${String(i).padStart(2, "0")}`;
      const cellData = rackingData[id];

      const cell = document.createElement("div");
      cell.className = `cell ${getCellClass(cellData)}`;
      cell.textContent = String(i).padStart(2, "0");
      cell.dataset.id = id;

      cell.addEventListener("mouseenter", (e) => {
        showTooltip(e, cellData);
      });
      cell.addEventListener("mousemove", (e) => moveTooltip(e));
      cell.addEventListener("mouseleave", hideTooltip);
      cell.addEventListener("click", () => {
        updateSearchBox(cellData.id);
      });

      row.appendChild(cell);
    }

    container.appendChild(row);
  });

  // Update statistics after rendering
  updateStatsFromData();
}

// Show tooltip with cell information
function showTooltip(e, data) {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;

  let tooltipContent = `
    <div class="tooltip-row"><span class="tooltip-label">Location:</span> ${
      data.id
    }</div>
    <div class="tooltip-row"><span class="tooltip-label">Status:</span> ${data.status.toUpperCase()}</div>
  `;

  if (data.status === "occupied" && data.serialNumber) {
    tooltipContent += `
      <div class="tooltip-row"><span class="tooltip-label">Serial:</span> ${data.serialNumber}</div>
      <div class="tooltip-row"><span class="tooltip-label">Last Updated:</span> ${data.lastUpdated}</div>
    `;
  } else {
    tooltipContent += `
      <div class="tooltip-row"><span class="tooltip-label">Occupancy:</span> ${data.occupancy}%</div>
    `;
  }

  tooltip.innerHTML = tooltipContent;
  tooltip.classList.add("show");
  moveTooltip(e);
}

// Move tooltip to follow cursor
function moveTooltip(e) {
  const tooltip = document.getElementById("tooltip");
  tooltip.style.left = e.clientX + 15 + "px";
  tooltip.style.top = e.clientY + 15 + "px";
}

// Hide tooltip
function hideTooltip() {
  const tooltip = document.getElementById("tooltip");
  if (tooltip) {
    tooltip.classList.remove("show");
  }
}

// Update search box with location ID
function updateSearchBox(locationId) {
  const locationBox = document.getElementById("location");
  const searchBox = document.getElementById("searchItemId");

  // Update location textbox (for In/Out tabs)
  if (locationBox) {
    locationBox.value = locationId;
  }

  // Update serial number textbox (for Search tab)
  if (searchBox) {
    const cellData = rackingData[locationId];

    if (cellData && (cellData.status === "occupied" || cellData.status === "reserved") && cellData.serialNumber) {
      // If slot is occupied and has serial number, show it
      searchBox.value = cellData.serialNumber;
      searchBox.classList.remove("input-error");

      console.log(
        `Filled search box with serial: ${cellData.serialNumber} from ${locationId}`
      );
    } else {
      // If slot is empty, clear the search box
      searchBox.value = "";
      console.log(`Slot ${locationId} is empty - cleared search box`);
    }
  }

  // Highlight the selected cell
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.remove("highlight");
    if (cell.dataset.id === locationId) {
      cell.classList.add("highlight");
    }
  });
}

// Filter cells by status
// function filterStatus(status) {
//   document.querySelectorAll(".cell").forEach((cell) => {
//     const id = cell.dataset.id;
//     const data = rackingData[id];

//     if (status === "all") {
//       cell.style.display = "flex";
//     } else if (status === data.status) {
//       cell.style.display = "flex";
//     } else {
//       cell.style.display = "none";
//     }
//   });

//   document.querySelectorAll(".control-btn").forEach((btn) => {
//     btn.classList.remove("active");
//   });
//   if (event && event.target) {
//     event.target.classList.add("active");
//   }
// }

// Randomize data and re-render (for testing only)
// function randomizeData() {
//   if (!confirm("This will randomize the map (test mode). Continue?")) {
//     return;
//   }

//   // Generate random data
//   Object.keys(rackingData).forEach((key) => {
//     const isOccupied = Math.random() > 0.5;
//     rackingData[key].status = isOccupied ? "occupied" : "available";
//     rackingData[key].occupancy = isOccupied
//       ? Math.floor(60 + Math.random() * 40)
//       : 0;
//     rackingData[key].items = isOccupied ? Math.floor(1 + Math.random() * 5) : 0;
//     rackingData[key].serialNumber = isOccupied
//       ? `SN${Math.floor(Math.random() * 10000)}`
//       : null;
//     rackingData[key].lastUpdated = new Date().toLocaleDateString();
//   });

//   createRacking(1, "racking1");
//   createRacking(2, "racking2");
// }

// Search box event listener
const locationSearchBox = document.getElementById("location");
if (locationSearchBox) {
  locationSearchBox.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toUpperCase();

    document.querySelectorAll(".cell").forEach((cell) => {
      cell.classList.remove("highlight");
      if (searchTerm && cell.dataset.id.includes(searchTerm)) {
        cell.classList.add("highlight");
        cell.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });
}

// Update statistics from actual data
function updateStatsFromData() {
  const totalSlots = Object.keys(rackingData).length;
  const occupied = Object.values(rackingData).filter(
    (item) => item.status === "occupied"
  ).length;
  const available = totalSlots - occupied;

  const totalEl = document.getElementById("totalItems");
  const occupiedEl = document.getElementById("occupiedSlots");
  const availableEl = document.getElementById("availableSlots");

  if (totalEl) totalEl.textContent = totalSlots;
  if (occupiedEl) occupiedEl.textContent = occupied;
  if (availableEl) availableEl.textContent = available;
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  console.log("========================================");
  console.log("Warehouse Tracking System initialized");
  console.log("Has real data:", hasRealData);
  console.log("Sample warehouse data:", warehouseData);
  console.log(
    "Total entries in warehouseData:",
    Object.keys(warehouseData).length
  );

  // Show first 3 entries as example
  const sampleKeys = Object.keys(warehouseData).slice(0, 3);
  sampleKeys.forEach((key) => {
    console.log(`  ${key}:`, warehouseData[key]);
  });
  console.log("========================================");

  // Generate racking data from database or default
  rackingData = {
    ...generateRackingData(1),
    ...generateRackingData(2),
  };

  // Count occupied vs available
  const occupied = Object.values(rackingData).filter(
    (item) => item.status === "occupied"
  ).length;
  const available = Object.values(rackingData).filter(
    (item) => item.status === "available"
  ).length;
  console.log(
    `Map generated: ${occupied} occupied (GREEN), ${available} available (RED)`
  );

  // Render both racks
  createRacking(1, "racking1");
  createRacking(2, "racking2");

  console.log("Map rendering complete!");
  console.log("========================================");
});

// Function to highlight slots when search finds results
function highlightSearchResults(serialNumber) {
  console.log("Highlighting slots for serial:", serialNumber);

  // Remove any existing highlights
  clearSearchHighlights();

  let foundCount = 0;

  // Find all cells with this serial number
  Object.keys(rackingData).forEach((locationId) => {
    const cellData = rackingData[locationId];

    if (
      cellData.serialNumber === serialNumber &&
      cellData.status === "occupied"
    ) {
      // Find the cell element
      const cellElement = document.querySelector(
        `.cell[data-id="${locationId}"]`
      );

      if (cellElement) {
        // Add search highlight class
        cellElement.classList.add("search-highlight");
        foundCount++;

        // Scroll to the first found cell
        if (foundCount === 1) {
          cellElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }

        console.log(`Highlighted ${locationId} with serial ${serialNumber}`);
      }
    }
  });

  // Add search-active class to body to dim other cells
  if (foundCount > 0) {
    document.body.classList.add("search-active");
  }

  console.log(`Total highlighted cells: ${foundCount}`);
  return foundCount;
}

// Function to clear all search highlights
function clearSearchHighlights() {
  console.log("Clearing search highlights");

  // Remove highlight class from all cells
  document.querySelectorAll(".cell.search-highlight").forEach((cell) => {
    cell.classList.remove("search-highlight");
  });

  // Remove search-active class from body
  document.body.classList.remove("search-active");

  // Reset any filtered cells
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.style.opacity = "1";
    cell.style.filter = "none";
  });
}

// Update the clearSearch function to include resetting slot colors
function clearSearch() {
  console.log("Clear button clicked");

  // Clear the search input
  const searchInput = document.getElementById("searchItemId");
  if (searchInput) {
    searchInput.value = "";
    searchInput.classList.remove("input-error");
  }

  // Clear the results table
  const resultsTable = document.querySelector(".search-results");
  if (resultsTable) {
    resultsTable.innerHTML = "";
  }

  // Clear the push out button form
  const pushOutForm = document.querySelector('form[action*="push_out"]');
  if (pushOutForm) {
    pushOutForm.remove();
  }

  // Clear search highlights (reset to green for occupied, red for available)
  clearSearchHighlights();

  console.log("Search cleared and slots reset to original colors");
}

// Check if search results exist on page load and highlight them
document.addEventListener("DOMContentLoaded", function () {
  // Wait a bit for the map to render
  setTimeout(() => {
    // Check if we're on the search tab with results
    const searchResultTable = document.querySelector(".search-results table");

    if (searchResultTable) {
      // Get the serial number from the table
      const serialCell = searchResultTable.querySelector(
        "tbody tr td:first-child"
      );

      if (serialCell) {
        const serialNumber = serialCell.textContent.trim();
        console.log("Search result found on page load:", serialNumber);

        // Highlight the matching slots
        const foundCount = highlightSearchResults(serialNumber);

        if (foundCount > 0) {
          console.log(
            `Auto-highlighted ${foundCount} slot(s) for serial: ${serialNumber}`
          );
        }
      }
    }
  }, 500);
});

// Add search form submission handler
const searchForm = document.querySelector('form[action*="search"]');
if (searchForm) {
  searchForm.addEventListener("submit", function (e) {
    console.log("Search form submitted");
    // The form will submit normally and page will reload with results
    // The DOMContentLoaded event will then highlight the results
  });
}

// Barcode scanner integration
// function openScanner() {
//   window.open("https://mynilasdmfgdb01.emrsn.org:9000/qrscanner", "Scanner", "width=400,height=600");
// }
// Refresh map data from database
function refreshMapData() {
  console.log("🔄 Refreshing map data...");

  // Reload the page to get fresh data from database
  window.location.reload();
}

// OR, if you want to refresh without page reload (AJAX version):
async function refreshMapDataAjax() {
  try {
    console.log("🔄 Fetching fresh data from server...");

    const response = await fetch("/api/warehouse_data");
    const freshData = await response.json();

    // Update global warehouseData
    warehouseData = freshData;

    // Regenerate racking data
    rackingData = {
      ...generateRackingData(1),
      ...generateRackingData(2),
    };

    // Re-render both racks
    createRacking(1, "racking1");
    createRacking(2, "racking2");

    console.log("✓ Map refreshed successfully!");
    showNotification("Map updated!", "#28a745");
  } catch (error) {
    console.error("Error refreshing map:", error);
    showNotification("Failed to refresh map", "#dc3545");
  }
}

// Add these functions to warehouse.js

// Register dummy pallet function
function registerDummy() {
  const locationInput = document.getElementById("location");
  const kanban_location = locationInput.value.trim();

  if (!kanban_location) {
    alert("⚠️ Please select a location from the map first!");
    return;
  }

  // Check if location exists in rackingData
  const cellData = rackingData[kanban_location];

  if (!cellData) {
    alert("❌ Invalid location! Please select a valid slot from the map.");
    return;
  }

  // Check if already occupied by real item
  if (
    cellData.status === "occupied" &&
    !cellData.serialNumber?.startsWith("Dummy_")
  ) {
    const confirm_remove = confirm(
      `⚠️ Location ${kanban_location} is occupied by ${cellData.serialNumber}.\n\n` +
        `This action cannot mark it as dummy.\n\nPlease remove the item first.`
    );
    return;
  }

  // Toggle confirmation for dummy
  const isDummy = cellData.serialNumber?.startsWith("Dummy_");
  const action = isDummy ? "remove dummy from" : "mark as dummy";
  const confirmMsg = `Are you sure you want to ${action} location ${kanban_location}?`;

  if (confirm(confirmMsg)) {
    // Create a form and submit
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/register_dummy";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "kanban_location";
    input.value = kanban_location;

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  }
}

// Update the generateRackingData function to handle "Reserved" status
// Modify the existing function to include this check:
function generateRackingData(rackNum) {
  const data = {};
  const totalSlots = rackingConfig[rackNum].slots;

  levels.forEach((level) => {
    for (let i = 1; i <= totalSlots; i++) {
      const id = `R${rackNum}_${level}_${String(i).padStart(2, "0")}`;

      // Default values
      let status = "available";
      let serialNumber = null;
      let lastUpdate = null;
      let items = 0;
      let occupancy = 0;

      // Check if this location exists in database
      if (hasRealData && warehouseData && warehouseData[id]) {
        const dbData = warehouseData[id];

        console.log(`✓ Found DB data for ${id}:`, dbData);

        // Check for Reserved/Dummy status
        if (
          dbData.status === "Reserved" ||
          dbData.serial?.startsWith("Dummy_")
        ) {
          status = "reserved";
          serialNumber = dbData.serial;
          lastUpdate = dbData.last_update_in;
          items = 0;
          occupancy = 100;
          console.log(`  🎯 Set ${id} to RESERVED (ORANGE)`);
        }
        // Check for In Storage status
        else if (dbData.status === "In Storage") {
          status = "occupied";
          serialNumber = dbData.serial;
          lastUpdate = dbData.last_update_in || dbData.last_update_out;
          items = 1;
          occupancy = 100;
          console.log(`  ✓ Set ${id} to OCCUPIED (GREEN)`);
        } else {
          console.log(
            `  ✗ Status is "${dbData.status}" - keeping as AVAILABLE (RED)`
          );
        }
      }

      data[id] = {
        id: id,
        level: level,
        status: status,
        occupancy: occupancy,
        items: items,
        serialNumber: serialNumber,
        lastUpdated: lastUpdate || "N/A",
        intensity: status === "occupied" || status === "reserved" ? 1 : 0,
      };
    }
  });

  console.log(`Generated ${Object.keys(data).length} slots for R${rackNum}`);
  return data;
}

// Update getCellClass to include reserved
function getCellClass(cell) {
  if (cell.status === "reserved") return "reserved";
  if (cell.status === "occupied") return "occupied";
  return "available";
}

// Update showTooltip to display dummy info
function showTooltip(e, data) {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;

  let tooltipContent = `
  <div class="tooltip-row"><span class="tooltip-label">Location:</span> ${
    data.id
  }</div>
  <div class="tooltip-row"><span class="tooltip-label">Status:</span> ${data.status.toUpperCase()}</div>
`;

  if (data.status === "reserved") {
    tooltipContent += `
    <div class="tooltip-row"><span class="tooltip-label">Type:</span> Dummy Pallet (Reserved)</div>
    <div class="tooltip-row"><span class="tooltip-label">Serial:</span> ${data.serialNumber}</div>
    <div class="tooltip-row"><span class="tooltip-label">Reserved On:</span> ${data.lastUpdated}</div>
  `;
  } else if (data.status === "occupied" && data.serialNumber) {
    tooltipContent += `
    <div class="tooltip-row"><span class="tooltip-label">Serial:</span> ${data.serialNumber}</div>
    <div class="tooltip-row"><span class="tooltip-label">Last Updated:</span> ${data.lastUpdated}</div>
  `;
  } else {
    tooltipContent += `
    <div class="tooltip-row"><span class="tooltip-label">Occupancy:</span> ${data.occupancy}%</div>
  `;
  }

  tooltip.innerHTML = tooltipContent;
  tooltip.classList.add("show");
  moveTooltip(e);
}

// Update statistics to include reserved count
function updateStatsFromData() {
  const totalSlots = Object.keys(rackingData).length;
  const occupied = Object.values(rackingData).filter(
    (item) => item.status === "occupied"
  ).length;
  const reserved = Object.values(rackingData).filter(
    (item) => item.status === "reserved"
  ).length;
  const available = totalSlots - occupied - reserved;

  const totalEl = document.getElementById("totalItems");
  const occupiedEl = document.getElementById("occupiedSlots");
  const availableEl = document.getElementById("availableSlots");

  if (totalEl) totalEl.textContent = totalSlots;
  if (occupiedEl) occupiedEl.textContent = occupied;
  if (availableEl) availableEl.textContent = available;

  console.log(
    `Stats: ${occupied} occupied, ${reserved} reserved, ${available} available`
  );
}

/*form format s/n validation*/
                function validateSerialNumber() {
    const serial = document.getElementById("itemId").value.trim();
    const regex = /^F\d{9}$/;  // F + 9 digits

    if (!regex.test(serial)) {
        // Show modal if invalid
        document.getElementById("serialModal").style.display = "flex";
        return false; // prevent form submission
    }
    return true; // allow form submission
}

function closeModal() {
    document.getElementById("serialModal").style.display = "none";
}