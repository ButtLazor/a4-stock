// =======================================================
// Supabase Client
// =======================================================
const supabaseClient = supabase.createClient(
  "https://oypsfuygfwxaoghlpeaz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cHNmdXlnZnd4YW9naGxwZWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTAxMDYsImV4cCI6MjA3OTcyNjEwNn0.VDueoceN3jbgCOo1D6xp4i9tLMyHG247Y4nFdBv0QI8"
);


// =======================================================
// GLOBALS
// =======================================================
let lastStableData = [];
let soundEnabled = false;

const fetchInterval = 3000; // 3 seconds
const dingSound = document.getElementById("dingSound");


// =======================================================
// FETCH STOCK DATA
// =======================================================
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


// =======================================================
// COMPARE DATA
// =======================================================
function isSameData(a, b) {
  if (a.length !== b.length) return false;

  return a.every((item, i) =>
    item.Item === b[i].Item &&
    item.quantity === b[i].quantity &&
    item.uom === b[i].uom
  );
}


// =======================================================
// UPDATE TABLE
// =======================================================
function updateTable(data) {
  const table = document.getElementById("stockBody");
  table.innerHTML = "";

  data.forEach((item, index) => {
    const tr = document.createElement("tr");

    // =========================
    // ITEM NAME
    // =========================
    const itemTd = document.createElement("td");
    itemTd.textContent = item.Item;
    itemTd.style.fontSize = "2rem";

    // =========================
    // QUANTITY DISPLAY
    // =========================
    const qtyTd = document.createElement("td");
    qtyTd.style.fontSize = "2rem";

    const prev = lastStableData[index];

    // Flash animation on change
    if (prev && prev.quantity !== item.quantity) {
      qtyTd.classList.add("flash");
      setTimeout(() => qtyTd.classList.remove("flash"), 1800);
    }

    // Color logic
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


// =======================================================
// REFRESH LOOP
// =======================================================
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


// =======================================================
// SOUND TOGGLE
// =======================================================
function enableSound() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById("soundToggle");
  btn.classList.toggle("active");

  if (soundEnabled) dingSound.play().catch(() => {});
}


// =======================================================
// COUNTDOWN
// =======================================================
let countdown = fetchInterval / 1000;

function updateCountdown() {
  countdown--;
  if (countdown < 0) countdown = fetchInterval / 1000;

  document.getElementById("countdown").innerHTML =
    `<i class="fa-solid fa-rotate-right"></i> Next update in: 0:${countdown
      .toString()
      .padStart(2, "0")}`;
}


// =======================================================
// START INTERVALS
// =======================================================
refreshStock();
setInterval(refreshStock, fetchInterval);
setInterval(updateCountdown, 1000);
