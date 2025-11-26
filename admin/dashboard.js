// Initialize Supabase client (FIXED NAME)
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
    body.innerHTML = `<tr><td colspan="3">Error loading data</td></tr>`;
    return;
  }

  data.forEach(item => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.brand}</td>
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

// Add new item
async function addItem() {
  const name = document.getElementById("newName").value.trim();
  const qty = parseInt(document.getElementById("newQty").value);

  if (!name || isNaN(qty)) {
    alert("Enter valid name & quantity");
    return;
  }

  const { error } = await supabaseClient
    .from("stock_items")
    .insert([{ brand: name, quantity: qty }]);

  if (error) {
    alert("Insert error: " + error.message);
    console.error(error);
    return;
  }

  document.getElementById("newName").value = "";
  document.getElementById("newQty").value = "";

  loadStock();
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

// Auto-load stock
loadStock();
