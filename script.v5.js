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
// CHECK IF ANY QUANTITY CHANGED (by matching Item names)
// =======================================================
function hasQuantityChanged(newData, oldData) {
  return newData.some(newItem => {
    const oldItem = oldData.find(d => d.Item === newItem.Item);
    if (!oldItem) return false;
    return oldItem.quantity !== newItem.quantity;
  });
}


// =======================================================
// UPDATE TABLE UI
// =======================================================
function updateTable(data) {
  const table = document.getElementById("stockBody");
  table.innerHTML = "";

  data.forEach((item, index) => {
    const tr = document.createElement("tr");

    // ITEM NAME
    const itemTd = document.createElement("td");
    itemTd.textContent = item.Item;
    itemTd.style.fontSize = "2rem";

    // QUANTITY + UOM
    const qtyTd = document.createElement("td");
    qtyTd.style.fontSize = "2rem";

    const prev = lastStableData.find(i => i.Item === item.Item);

    // Flash animation for changes
    if (prev && prev.quantity !== item.quantity) {
      qtyTd.classList.add("flash");
      setTimeout(() => qtyTd.classList.remove("flash"), 1800);
    }

    // Color logic
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
// REFRESH LOOP
// =======================================================
async function refreshStock() {
  const data = await fetchStockData();
  if (!data) return;

  if (hasQuantityChanged(data, lastStableData)) {
    updateTable(data);

    if (soundEnabled) {
      dingSound.play().catch(() => {});
    }
  }

  lastStableData = data;
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
// START INTERVALS (NO COUNTDOWN)
// =======================================================
refreshStock();
setInterval(refreshStock, fetchInterval);
