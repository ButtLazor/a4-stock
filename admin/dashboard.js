// Initialize Supabase client
const supabase = supabase.createClient(
  "https://oypsfuygfwxaoghlpeaz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cHNmdXlnZnd4YW9naGxwZWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTAxMDYsImV4cCI6MjA3OTcyNjEwNn0.VDueoceN3jbgCOo1D6xp4i9tLMyHG247Y4nFdBv0QI8"
);

// Load all stock items
async function loadStock() {
  const { data, error } = await supabase
    .from("stock_items")
    .select("*")
    .order("brand", { ascending: true });

  const body = document.getElementById("stockBody");
  body.innerHTML = "";

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

  if (!name || isNaN(qty)) return alert("Enter valid name & quantity");

  await supabase.from("stock_items").insert([{ brand: name, quantity: qty }]);

  document.getElementById("newName").value = "";
  document.getElementById("newQty").value = "";

  loadStock();
}

// Update quantity
async function updateQty(id, qty) {
  await supabase
    .from("stock_items")
    .update({ quantity: qty })
    .eq("id", id);
}

// Delete item
async function deleteItem(id) {
  if (!confirm("Delete this item?")) return;

  await supabase.from("stock_items").delete().eq("id", id);
  loadStock();
}

// Auto-load stock
loadStock();
