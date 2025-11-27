// =======================================================
// Supabase Client
// =======================================================
const supabaseClient = supabase.createClient(
  "https://oypsfuygfwxaoghlpeaz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cHNmdXlnZnd4YW9naGxwZWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTAxMDYsImV4cCI6MjA3OTcyNjEwNn0.VDueoceN3jbgCOo1D6xp4i9tLMyHG247Y4nFdBv0QI8"
);

let lastStableData = [];
let soundEnabled = false;

const fetchInterval = 3000; // 3 seconds
const dingSound = document.getElementById("dingSound");


// =======================================================
// Fetch Stock Items
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
// Compare Data
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
// Update Table UI
// =======================================================
function updateTable(data) {
  const table = document.getElementById("stockBody");
  table.innerHTML = "";

  data.forEach((item, i) => {
    const tr = document.createElement("tr");

    // ITEM NAME
    const itemTd = document.createElement("td");
    itemTd.textContent = item.Item;
    itemTd.style.fontSize = "2rem";

    // QUANTITY + UOM
    const qtyTd = document.createElement("td");
    qtyTd.style.fontSize = "2rem";

    const prev = lastStableData[i];

    // Flash animation
    if (prev && prev.quantity !== item.quantity) {
      qtyTd.classList.add("flash");
      setTimeout(() => qtyTd.classList.remove("flash"), 1800);
    }

    // Color logic + text formatting
    if (item.quantity === 0) {
      qtyTd.textContent = "OUT OF STOCK";
      qtyTd.className = "out-of-stock";
    } else if (item.quantity < 200) {
      qtyTd.textContent = `${item.quantity} ${item.uom}`;
      qtyTd.className = "low-stock";
    } else if (item.quantity <= 700) {
      qtyTd.textContent = `${item.quantity} ${item.uom}`;
      qtyTd.className = "medium-stock";
    } else {
      qtyTd.textContent = `${item.quantity} ${item.uom}`;
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
// Refresh Loop
// =======================================================
async function refreshStock() {
  const data = await fetchStockData();
  if (!data) return;

  if (!isSameData(data, lastStableData)) {
    updateTable(data);
    if (soundEnabled) dingSound.play().catch(() => {});
    lastStableData = data;
  }
}


// =======================================================
// Sound Toggle
// =======================================================
const soundBtn = document.getElementById("soundToggle");
if (soundBtn) {
  soundBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundBtn.classList.toggle("active");
    if (soundEnabled) dingSound.play().catch(() => {});
  });
}


// =======================================================
// Start Loop
// =======================================================
refreshStock();
setInterval(refreshStock, fetchInterval);
