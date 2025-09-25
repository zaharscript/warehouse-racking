// Global variables
let currentOperation = "in";
let currentZoom = 1;
let warehouseData = [];

// Sample data for demonstration with updated locations
const sampleItems = [
  {
    id: "ITM001",
    name: "Laptop Dell XPS 13",
    category: "electronics",
    location: "A2",
    quantity: 15,
  },
];

// Tab switching functionality
function switchTab(tabName) {
  // Remove active class from all tabs and content
  document
    .querySelectorAll(".nav-tab")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));

  // Add active class to selected tab and content
  event.target.classList.add("active");
  document.getElementById(tabName).classList.add("active");

  // Add fade-in animation
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
    updateStatistics(currentOperation, parseInt(quantity));

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
  }, 1500);
}

// Search items
function searchItems() {
  const searchItemId = document
    .getElementById("searchItemId")
    .value.toLowerCase();
  const searchItemName = document
    .getElementById("searchItemName")
    .value.toLowerCase();
  const searchCategory = document.getElementById("searchCategory").value;
  const searchLocation = document.getElementById("searchLocation").value;

  let results = sampleItems.filter((item) => {
    return (
      (!searchItemId || item.id.toLowerCase().includes(searchItemId)) &&
      (!searchItemName || item.name.toLowerCase().includes(searchItemName)) &&
      (!searchCategory || item.category === searchCategory) &&
      (!searchLocation || item.location === searchLocation)
    );
  });

  displaySearchResults(results);
}

// Display search results
function displaySearchResults(results) {
  const resultsContainer = document.getElementById("searchResults");

  if (results.length === 0) {
    resultsContainer.innerHTML =
      '<div class="search-result-item">No items found matching your criteria.</div>';
    return;
  }

  const resultsHTML = results
    .map(
      (item) => `
        <div class="search-result-item">
            <strong>${item.name}</strong> (${item.id})<br>
            <small>Category: ${item.category} | Location: Rack ${item.location} | Quantity: ${item.quantity}</small>
        </div>
    `
    )
    .join("");

  resultsContainer.innerHTML = resultsHTML;
}

// Update statistics
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
  currentZoom = Math.max(0.5, Math.min(3, currentZoom)); // Limit zoom between 0.5x and 3x

  const warehouseMap = document.getElementById("warehouseMap");
  warehouseMap.style.transform = `scale(${currentZoom})`;
  warehouseMap.style.transformOrigin = "top left";
}

// Select warehouse rack
function selectRack(rackId) {
  // Remove previous selections
  document.querySelectorAll(".rack-slot").forEach((slot) => {
    slot.style.transform = "";
    slot.style.boxShadow = "";
  });

  // Highlight selected rack
  const selectedRack = event.target.closest(".rack-slot");
  selectedRack.style.transform = "translateY(-10px) scale(1.05)";
  selectedRack.style.boxShadow = "0 15px 35px rgba(102, 126, 234, 0.4)";

  // Update location dropdown in registration form
  document.getElementById("location").value = rackId;

  // Show rack info
  const isAvailable = selectedRack.classList.contains("available");
  const status = isAvailable ? "Available" : "Occupied";
  const statusColor = isAvailable ? "#28a745" : "#007bff";

  // Create a temporary notification
  showNotification(`Rack ${rackId} selected - Status: ${status}`, statusColor);
}

// Show notification function
function showNotification(message, color = "#667eea") {
  // Remove existing notification
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

  // Add slide-in animation
  const style = document.createElement("style");
  style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideIn 0.3s ease reverse";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  console.log("Warehouse Tracking System initialized");

  // Add some sample search results on load
  setTimeout(() => {
    displaySearchResults(sampleItems);
  }, 500);
});

// Add keyboard shortcuts
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
        } else {
          searchItems();
        }
        break;
    }
  }
});
