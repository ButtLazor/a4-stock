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

// safety for missing audio element
if (!dingSound) console.warn("dingSound element not found");

// =======================================================
// UNLOCK AUDIO (first user click)
// =======================================================
document.addEventListener("click", () => {
  if (dingSound) dingSound.play().catch(()=>{});
}, { once: true });

// =======================================================
// DARK MODE TOGGLE
// =======================================================
const darkBtn = document.getElementById("darkToggle");
if (darkBtn) {
  darkBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const icon = darkBtn.querySelector("i");
    if (document.body.classList.contains("dark")) {
      icon.classList.replace("fa-moon", "fa-sun");
    } else {
      icon.classList.replace("fa-sun", "fa-moon");
    }
  });
}

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
// CHECK IF QUANTITY CHANGED (by item name)
// =======================================================
function hasQuantityChanged(newData, oldData) {
  if (!oldData || oldData.length === 0) return true; // first run -> render
  return newData.some(n => {
    const p = oldData.find(x => x.Item === n.Item);
    if (!p) return true; // new item added
    return p.quantity !== n.quantity;
  });
}

// =======================================================
// UPDATE TABLE UI
// =======================================================
function updateTable(data) {
  const tbody = document.getElementById("stockBody");
  if (!tbody) return console.error("stockBody element not found");
  tbody.innerHTML = "";

  data.forEach(item => {
    const tr = document.createElement("tr");

    // Item cell
    const tdItem = document.createElement("td");
    tdItem.textContent = item.Item;
    tdItem.style.fontSize = "1.15rem";

    // Quantity + UOM cell
    const tdQty = document.createElement("td");
    tdQty.style.fontSize = "1.15rem";

    const prev = lastStableData.find(x => x.Item === item.Item);

    // flash on quantity change
    if (prev && prev.quantity !== item.quantity) {
      tdQty.classList.add("flash");
      setTimeout(() => tdQty.classList.remove("flash"), 1400);
    }

    // content + classes
    if (item.quantity === 0) {
      tdQty.textContent = "OUT OF STOCK";
      tdQty.className = "out-of-stock";
    } else {
      tdQty.textContent = `${item.quantity} ${item.uom || ''}`.trim();
      tdQty.className =
        item.quantity < 200 ? "low-stock" :
        item.quantity <= 700 ? "medium-stock" :
        "high-stock";
    }

    tr.appendChild(tdItem);
    tr.appendChild(tdQty);
    tbody.appendChild(tr);
  });

  const last = document.getElementById("lastUpdated");
  if (last) last.textContent = "Last updated: " + new Date().toLocaleTimeString();
}

// =======================================================
// REFRESH LOOP
// =======================================================
async function refreshStock() {
  const data = await fetchStockData();
  if (!data) return;

  // Debug line (safe to keep)
  // console.log("DATA:", data);

  if (hasQuantityChanged(data, lastStableData)) {
    updateTable(data);

    if (soundEnabled && dingSound) {
      dingSound.play().catch(()=>{});
    }
  }
  lastStableData = data;
}

// =======================================================
// SOUND TOGGLE
// =======================================================
const soundBtn = document.getElementById("soundToggle");

if (soundBtn) {
  soundBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;

    // toggle button active color
    soundBtn.classList.toggle("active", soundEnabled);

    // toggle icon
    const icon = soundBtn.querySelector("i");
    if (soundEnabled) {
      icon.classList.replace("fa-bell-slash", "fa-bell");
    } else {
      icon.classList.replace("fa-bell", "fa-bell-slash");
    }

    // play test sound when enabling
    if (soundEnabled && dingSound) {
      dingSound.play().catch(()=>{});
    }
  });
}



// =======================================================
// START LOOP
// =======================================================
refreshStock();
setInterval(refreshStock, fetchInterval);
