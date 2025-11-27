// =============================
// Supabase Client
// =============================
const supabaseClient = supabase.createClient(
  "https://oypsfuygfwxaoghlpeaz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cHNmdXlnZnd4YW9naGxwZWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTAxMDYsImV4cCI6MjA3OTcyNjEwNn0.VDueoceN3jbgCOo1D6xp4i9tLMyHG247Y4nFdBv0QI8"
);

let lastStableData = [];
let soundEnabled = false;

const fetchInterval = 3000; // 3 seconds refresh
const dingSound = document.getElementById("dingSound");


// =============================
// Fetch Stock Items
// =============================
async function fetchStockData() {
  const { data, error } = await supabaseClient
    .from("stock_items")
    .select("Item, uom, quantity")
    .order("Item", { ascending: true });

  if (error) {
    console.error("Supabase error:", error);
    return null;
  }

  return data;
}


// =============================
// Compare Data
// =============================
function isSameData(a, b) {
  if (a.length !== b.length) return false;

  return a.every((item, i) =>
    item.Item === b[i].Item &&
    item.quantity === b[i].quantity &&
    item.uom === b[i].uom
  );
}


// =============================
// Update Table UI
// =============================
function updateTable(data) {
  const table = document.getElementById("stockBody");
  table.innerHTML = "";

  data.forEach((item, i) => {
    const tr = document.createElement("tr");

    // ITEM NAME
    const itemTd = document.createElement("td");
    itemTd.textContent = item.Item;
    itemTd.style.fontSize = "2rem";

    // QUANTITY (+ optional UOM display)
    const qtyTd = document.createElement("td");
    qtyTd.style.fontSize = "2rem";

    // Show flashing animation if changed
    const prev = lastStableData[i];
    if (prev && prev.quantity !== item.quantity) {
      qtyTd.classList.add("flash");
      setTimeout(() => qtyTd.classList.remove("flash"), 1800);
    }

    // -------------------------
    // STOCK COLOR LOGIC
    // -------------------------
    if (item.quantity === 0) {
      qtyTd.textContent = "OUT OF STOCK";
      qtyTd.className = "out-of-stock";
    } else if (item.quantity < 200) {
      qtyTd.textContent = item.quantity;
      qtyTd.className = "low-stock";
    } else if (item.quantity <= 700) {
      qtyTd.textContent = item.quantity;
      qtyTd.className = "medium-stock";
    } else {
      qtyTd.textContent = item.quantity;
      qtyTd.className = "high-stock";
    }

    tr.appendChild(itemTd);
    tr.appendChild(qtyTd);
    table.appendChild(tr);
  });

  document.getElementById("lastUpdated").textContent =
    "Last updated: " + new Date().toLocaleTimeString();
}


// =============================
// Refresh Loop (every 3 sec)
// =============================
async function refreshStock() {
  const data = await fetchStockData();
  if (!data) return;

  if (!isSameData(data, lastStableData)) {
    updateTable(data);

    if (soundEnabled) {
      dingSound.play().catch(() => {});
    }

    lastStableData = data;
  }
}


// =============================
// Sound Toggle
// =============================
document.getElementById("soundToggle").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById("soundToggle");
  btn.classList.toggle("active");

  if (soundEnabled) dingSound.play().catch(() => {});
});


// =============================
// Countdown Timer Display
// =============================
let countdown = fetchInterval / 1000;

function updateCountdown() {
  countdown--;
  if (countdown < 0) countdown = fetchInterval / 1000;

  document.getElementById("countdown").textContent =
    `Next update in: 0:${countdown.toString().padStart(2, "0")}`;
}


// =============================
// Start Refresh Loop
// =============================
refreshStock();
setInterval(refreshStock, fetchInterval);
setInterval(updateCountdown, 1000);
