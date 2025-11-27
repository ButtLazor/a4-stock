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
const fetchInterval = 3000;

const dingSound = document.getElementById("dingSound");


// =======================================================
// AUDIO UNLOCK
// =======================================================
document.addEventListener("click", () => {
  dingSound.play().catch(() => {});
}, { once: true });


// =======================================================
// DARK MODE
// =======================================================
document.getElementById("darkToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const icon = document.querySelector("#darkToggle i");
  if (document.body.classList.contains("dark")) {
    icon.classList.replace("fa-moon", "fa-sun");
  } else {
    icon.classList.replace("fa-sun", "fa-moon");
  }
});


// =======================================================
// FETCH STOCK
// =======================================================
async function fetchStockData() {
  const { data, error } = await supabaseClient
    .from("stock_items")
    .select("Item, uom, quantity")
    .order("Item", { ascending: true });

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}


// =======================================================
// DETECT QUANTITY CHANGE
// =======================================================
function hasQuantityChanged(newData, oldData) {
  return newData.some(n => {
    const p = oldData.find(x => x.Item === n.Item);
    return p && p.quantity !== n.quantity;
  });
}


// =======================================================
// UPDATE TABLE
// =======================================================
function updateTable(data) {
  const tbody = document.getElementById("stockBody");
  tbody.innerHTML = "";

  data.forEach(item => {
    const tr = document.createElement("tr");

    // Item
    const tdItem = document.createElement("td");
    tdItem.textContent = item.Item;
    tdItem.style.fontSize = "2rem";

    // Quantity + UOM
    const tdQty = document.createElement("td");
    tdQty.style.fontSize = "2rem";

    const prev = lastStableData.find(x => x.Item === item.Item);

    if (prev && prev.quantity !== item.quantity) {
      tdQty.classList.add("flash");
      setTimeout(() => tdQty.classList.remove("flash"), 1800);
    }

    if (item.quantity === 0) {
      tdQty.textContent = "OUT OF STOCK";
      tdQty.className = "out-of-stock";
    } else {
      tdQty.textContent = `${item.quantity} ${item.uom}`;
      tdQty.className = 
        item.quantity < 200 ? "low-stock" :
        item.quantity <= 700 ? "medium-stock" :
        "high-stock";
    }

    tr.appendChild(tdItem);
    tr.appendChild(tdQty);
    tbody.appendChild(tr);
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
    if (soundEnabled) dingSound.play().catch(()=>{});
  }

  lastStableData = data;
}


// =======================================================
// SOUND TOGGLE
// =======================================================
document.getElementById("soundToggle").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  document.getElementById("soundToggle").classList.toggle("active");
  dingSound.play().catch(()=>{});
});


// =======================================================
// START LOOP
// =======================================================
refreshStock();
setInterval(refreshStock, fetchInterval);
