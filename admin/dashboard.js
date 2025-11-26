// Initialize Supabase client
const supabaseClient = supabase.createClient(
  "https://oypsfuygfwxaoghlpeaz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cHNmdXlnZnd4YW9naGxwZWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTAxMDYsImV4cCI6MjA3OTcyNjEwNn0.VDueoceN3jbgCOo1D6xp4i9tLMyHG247Y4nFdBv0QI8"
);

// Load items
async function loadStock() {
  const { data, error } = await supabaseClient
    .from("stock_items")
    .select("*")
    .order("brand", { ascending: true });

  const body = document.getElementById("stockBody");
  body.innerHTML = "";

  if (error) {
    console.error(error);
    body.innerHTML = "<tr><td colspan='3'>Error loading data</td></tr>";
    return;
  }

  data.forEach(item => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.brand}</td>
      <td><input type="number" value="${item.quantity}" onchange="updateQty(${item.id}, this.value)"></td>
      <td><button class="delete-btn" onclick="deleteItem(${item.id})"><i class="fa-solid fa-trash"></i></button></td>
    `;

    body.appendChild(tr);
  });
}

// Modal open
function openAddModal() {
  document.getElementById("addModal").style.display = "flex";
}

// Modal close
function closeAddModal() {
  document.getElementById("addModal").style.display = "none";
}

// Submit new item
async function submitAddItem() {
  const name = document.getElementById("modalName").value.trim();
  const qty = parseInt(document.getElementById("modalQty").value);

  if (!name || isNaN(qty)) return alert("Please enter valid name & quantity");

  const { error } = await supabaseClient
    .from("stock_items")
    .insert([{ brand: name, quantity: qty }]);

  if (error) {
    alert("Failed to add item: " + error.message);
    return;
  }

  document.getElementById("modalName").value = "";
  document.getElementById("modalQty").value = "";

  closeAddModal();
  loadStock();
}

// Update quantity
async function updateQty(id, qty) {
  await supabaseClient.from("stock_items").update({ quantity: qty }).eq("id", id);
}

// Delete
async function deleteItem(id) {
  if (!confirm("Delete this item?")) return;
  await supabaseClient.from("stock_items").delete().eq("id", id);
  loadStock();
}

// Load on start
loadStock();
