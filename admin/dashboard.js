// Initialize Supabase client
const supabaseClient = supabase.createClient(
  "https://oypsfuygfwxaoghlpeaz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cHNmdXlnZnd4YW9naGxwZWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTAxMDYsImV4cCI6MjA3OTcyNjEwNn0.VDueoceN3jbgCOo1D6xp4i9tLMyHG247Y4nFdBv0QI8"
);

// Load all stock items
async function loadStock() {
  const { data, error } = await supabaseClient
    .from("stock_items")
    .select("*")
    .order("brand", { ascending: true });

  const body = document.getElementById("stockBody");
  body.innerHTML = "";

  if (error) {
    console.error("Load error:", error);
    body.innerHTML = `<tr><td colspan="4">Error loading data</td></tr>`;
    return;
  }

  data.forEach(item => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.brand}</td>
      <td>${item.uom ?? "-"}</td>
      <td>
        <input type="number" value="${item.quantity}"
          onchange="updateQty(${item.id}, this.value)">
      </td>
      <td>
        <button onclick="deleteItem(${item.id})" class="delete-btn">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;

    body.appendChild(tr);
  });
}

// Update quantity
async function updateQty(id, qty) {
  const { error } = await supabaseClient
    .from("stock_items")
    .update({ quantity: qty })
    .eq("id", id);

  if (error) console.error("Update error:", error);
}

// Delete item
async function deleteItem(id) {
  if (!confirm("Delete this item?")) return;

  const { error } = await supabaseClient
    .from("stock_items")
    .delete()
    .eq("id", id);

  if (error) console.error("Delete error:", error);

  loadStock();
}

// ------------------------------
// Modal Functions
// ------------------------------
function openAddModal() {
  document.getElementById("addModal").style.display = "flex";
}

function closeAddModal() {
  document.getElementById("addModal").style.display = "none";
}

// Add new item (with UOM)
async function submitAddItem() {
  const name = document.getElementById("modalName").value.trim();
  const uom = document.getElementById("modalUOM").value.trim() || "pcs";
  const qty = parseInt(document.getElementById("modalQty").value);

  if (!name || isNaN(qty)) {
    alert("Please enter valid item name, UOM & quantity");
    return;
  }

  const { error } = await supabaseClient
    .from("stock_items")
    .insert([{ brand: name, uom: uom, quantity: qty }]);

  if (error) {
    alert("Failed to add item: " + error.message);
    return;
  }

  // Clear fields
  document.getElementById("modalName").value = "";
  document.getElementById("modalUOM").value = "";
  document.getElementById("modalQty").value = "";

  // Close modal
  closeAddModal();

  // Refresh table
  loadStock();
}

// Auto-load stock on startup
loadStock();
