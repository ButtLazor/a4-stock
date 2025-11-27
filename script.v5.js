/* ============================================================
   Supabase Connection
============================================================ */
const supabaseClient = supabase.createClient(
  "https://oypsfuygfwxaoghlpeaz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cHNmdXlnZnd4YW9naGxwZWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTAxMDYsImV4cCI6MjA3OTcyNjEwNn0.VDueoceN3jbgCOo1D6xp4i9tLMyHG247Y4nFdBv0QI8"
);

/* ============================================================
   Variables
============================================================ */
let soundEnabled = false;
let lastData = null;
const REFRESH_INTERVAL_MS = 3000; // <-- now 3 seconds
let countdown = Math.floor(REFRESH_INTERVAL_MS / 1000);

/* ============================================================
   UI Toggles
============================================================ */
function enableSound() {
  soundEnabled = !soundEnabled;

  const btn = document.getElementById("soundToggle");
  if (btn) btn.classList.toggle("active");

  const icon = btn?.querySelector("i");
  if (icon) icon.className = soundEnabled ? "fa-solid fa-bell-slash" : "fa-solid fa-bell";

  if (soundEnabled) {
    document.getElementById("dingSound")?.play().catch(() => {});
  }
}

function toggleDarkMode() {
  const body = document.body;
  body.classList.toggle("dark");

  const icon = document.getElementById("darkToggle")?.querySelector("i");
  if (icon) icon.className = body.classList.contains("dark") ? "fa-solid fa-sun" : "fa-solid fa-moon";

  localStorage.setItem("darkMode", body.classList.contains("dark"));
}

// Apply saved theme
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
  const icon = document.getElementById("darkToggle")?.querySelector("i");
  if (icon) icon.className = "fa-solid fa-sun";
}

/* ============================================================
   Fetch Stock Data From Supabase
============================================================ */
async function fetchStockData() {
  const { data, error } = await supabaseClient
    .from("stock_items")
    .select("brand, quantity")
    .order("brand", { ascending: true });

  if (error) {
    console.error("Supabase error:", error);
    return [];
  }

  return data;
}

/* ============================================================
   Update Table UI
============================================================ */
function updateTable(data) {
  const tbody = document.getElementById("stockBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  data.forEach(item => {
    const tr = document.createElement("tr");
    const qty = item.quantity;

    const brandTd = document.createElement("td");
    brandTd.textContent = item.brand;

    const qtyTd = document.createElement("td");

    if (qty === 0) qtyTd.className = "out-of-stock";
    else if (qty < 200) qtyTd.className = "low-stock";
    else if (qty <= 700) qtyTd.className = "medium-stock";
    else qtyTd.className = "high-stock";

    qtyTd.textContent = qty === 0 ? "OUT OF STOCK" : qty;

    tr.appendChild(brandTd);
    tr.appendChild(qtyTd);
    tbody.appendChild(tr);
  });

  const lastUpdatedEl = document.getElementById("lastUpdated");
  if (lastUpdatedEl) {
    lastUpdatedEl.innerHTML = `<i class="fa-regular fa-clock"></i> Last updated: ${new Date().toLocaleTimeString()}`;
  }
}

/* ============================================================
   Auto Refresh Logic
============================================================ */
async function refreshStock() {
  const newData = await fetchStockData();

  // Simple string compare to detect changes
  const newStr = JSON.stringify(newData);
  const lastStr = JSON.stringify(lastData);

  if (newStr !== lastStr) {
    updateTable(newData);

    // Play sound only when there was a previous dataset (avoid ding on first load)
    if (soundEnabled && lastData !== null) {
      document.getElementById("dingSound")?.play().catch(() => {});
    }

    lastData = newData;
  }
}

/* ============================================================
   Countdown Timer
============================================================ */
function updateCountdown() {
  const countdownEl = document.getElementById("countdown");
  if (!countdownEl) return;

  countdownEl.innerHTML =
    `<i class="fa-solid fa-rotate-right"></i> Next update in: ${countdown}s`;

  countdown--;
  if (countdown < 0) countdown = Math.floor(REFRESH_INTERVAL_MS / 1000);
}

/* ============================================================
   Init
============================================================ */
(async () => {
  await refreshStock(); // initial load
  countdown = Math.floor(REFRESH_INTERVAL_MS / 1000);

  // periodic refresh every 3 seconds
  setInterval(refreshStock, REFRESH_INTERVAL_MS);
  setInterval(updateCountdown, 1000);
})();
