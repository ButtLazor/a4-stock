/* ============================================================
   Supabase Connection
============================================================ */
const supabaseClient = supabase.createClient(
  "https://oypsfuygfwxaoghlpeaz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cHNmdXlnZnd4YW9naGxwZWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTAxMDYsImV4cCI6MjA3OTcyNjEwNn0.VDueoceN3jbgCOo1D6xp4i9tLMyHG247Y4nFdBv0QI8"
);

/* ============================================================
   UI Toggle Logic
============================================================ */
let soundEnabled = false;

function enableSound() {
  soundEnabled = !soundEnabled;

  const btn = document.getElementById("soundToggle");
  btn.classList.toggle("active");

  const icon = btn.querySelector("i");
  icon.className = soundEnabled ? "fa-solid fa-bell-slash" : "fa-solid fa-bell";

  if (soundEnabled) {
    document.getElementById("dingSound").play().catch(() => {});
  }
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");

  const icon = document.getElementById("darkToggle").querySelector("i");
  icon.className = document.body.classList.contains("dark")
    ? "fa-solid fa-sun"
    : "fa-solid fa-moon";

  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
}

if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
  document.getElementById("darkToggle").querySelector("i").className =
    "fa-solid fa-sun";
}

/* ============================================================
   Fetch Latest Stock
============================================================ */
async function fetchStockData() {
  const { data, error } = await supabaseClient
    .from("stock_items")
    .select("brand, quantity")
    .order("brand", { ascending: true });

  if (error) {
    console.error("Supabase fetch error:", error);
    return [];
  }

  return data.map(item => [item.brand, item.quantity.toString()]);
}

/* ============================================================
   Update Table UI
============================================================ */
function updateTable(data) {
  const table = document.getElementById("stockBody");
  table.innerHTML = "";

  data.forEach(([brand, qtyStr]) => {
    const qty = parseInt(qtyStr);

    const tr = document.createElement("tr");

    const brandTd = document.createElement("td");
    brandTd.textContent = brand;

    const qtyTd = document.createElement("td");

    if (qty === 0) qtyTd.className = "out-of-stock";
    else if (qty < 200) qtyTd.className = "low-stock";
    else if (qty <= 700) qtyTd.className = "medium-stock";
    else qtyTd.className = "high-stock";

    qtyTd.textContent = qty === 0 ? "OUT OF STOCK" : qty;

    tr.appendChild(brandTd);
    tr.appendChild(qtyTd);
    table.appendChild(tr);
  });

  document.getElementById("lastUpdated").innerHTML =
    `<i class="fa-regular fa-clock"></i> Last updated: ${new Date().toLocaleTimeString()}`;

  if (soundEnabled) {
    document.getElementById("dingSound").play().catch(() => {});
  }
}

/* ============================================================
   REAL-TIME SUBSCRIPTION (insert, update, delete)
============================================================ */
supabaseClient
  .channel("stock_items_updates")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "stock_items",
    },
    async (payload) => {
      console.log("Realtime change detected:", payload);

      // Always reload updated data
      const stock = await fetchStockData();
      updateTable(stock);
    }
  )
  .subscribe();

/* ============================================================
   Initial Load
============================================================ */
(async () => {
  const stock = await fetchStockData();
  updateTable(stock);
})();
