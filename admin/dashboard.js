// =======================================================
// Supabase Client
// =======================================================
const supabaseClient = supabase.createClient(
  "https://oypsfuygfwxaoghlpeaz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cHNmdXlnZnd4YW9naGxwZWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTAxMDYsImV4cCI6MjA3OTcyNjEwNn0.VDueoceN3jbgCOo1D6xp4i9tLMyHG247Y4nFdBv0QI8"
);


// =======================================================
// Load Stock Items
// =======================================================
async function loadStock() {
  const { data, error } = await supabaseClient
    .from("stock_items")
    .select("*")
    .order("Item", { ascending: true });

  if (error) {
    console.error("Load error:", error);
    document.getElementById("stockBody").innerHTML =
      "<tr><td colspan='4'>Error loading data</td></tr>";
    return;
  }

  updateTable(data);
}


// =======================================================
// Render Table
// =======================================================
function updateTable(data) {
  const body = document.getElementById("stockBody");
  body.innerHTML = "";

  data.forEach(item => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <!-- ITEM NAME (inline editable) -->
      <td onclick="enableNameEdit(this, ${item.id})">
        <span class="item-text">${item.Item}</span>
        <input class="item-input" 
               value="${item.Item}"
               onblur="saveName(${item.id}, this.value)"
               onkeydown="handleNameKey(event, ${item.id}, this)">
      </td>

      <!-- UOM DROPDOWN -->
      <td>
        <select onchange="updateUOM(${item.id}, this.value)">
          <option value="PCS" ${item.uom?.toUpperCase() === "PCS" ? "selected" : ""}>PCS</option>
          <option value="BOX" ${item.uom?.toUpperCase() === "BOX" ? "selected" : ""}>BOX</option>
        </select>
      </td>

      <!-- QUANTITY -->
      <td>
        <input type="number"
               value="${item.quantity}"
               onchange="updateQty(${item.id}, this.value)">
      </td>

      <!-- DELETE -->
      <td>
        <button onclick="deleteItem(${item.id})" class="delete-btn">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;

    body.appendChild(tr);
  });
}


// =======================================================
// Inline Editing — Item Name
// =======================================================
function enableNameEdit(cell, id) {
  const text = cell.querySelector(".item-text");
  const input = cell.querySelector(".item-input");

  text.style.display = "none";
  input.style.display = "block";
  input.focus();
  input.select();
}

function handleNameKey(event, id, input) {
  if (event.key === "Enter") {
    saveName(id, input.value);
    input.blur();
  }
}

async function saveName(id, newName) {
  if (!newName.trim()) return;

  const { error } = await supabaseClient
    .from("stock_items")
    .update({ Item: newName.trim() })
    .eq("id", id);

  if (error) console.error("Name update error:", error);

  loadStock();
}


// =======================================================
// Update UOM
// =======================================================
async function updateUOM(id, newUom) {
  const { error } = await supabaseClient
    .from("stock_items")
    .update({ uom: newUom.toUpperCase() })
    .eq("id", id);

  if (error) console.error("UOM update error:", error);
}


// =======================================================
// Update Quantity
// =======================================================
async function updateQty(id, qty) {
  qty = Number(qty);
  if (isNaN(qty)) return;

  const { error } = await supabaseClient
    .from("stock_items")
    .update({ quantity: qty })
    .eq("id", id);

  if (error) console.error("Quantity update error:", error);
}


// =======================================================
// Delete Item
// =======================================================
async function deleteItem(id) {
  if (!confirm("Delete this item?")) return;

  const { error } = await supabaseClient
    .from("stock_items")
    .delete()
    .eq("id", id);

  if (error) console.error("Delete error:", error);

  loadStock();
}


// =======================================================
// Add Item (Modal)
// =======================================================
function openAddModal() {
  document.getElementById("addModal").style.display = "flex";
}

function closeAddModal() {
  document.getElementById("addModal").style.display = "none";
}

async function submitAddItem() {
  const name = document.getElementById("modalName").value.trim();
  const uom = document.getElementById("modalUOM").value.trim().toUpperCase();
  const qty = Number(document.getElementById("modalQty").value);

  if (!name || isNaN(qty)) {
    alert("Please enter valid item name & quantity.");
    return;
  }

  const { error } = await supabaseClient
    .from("stock_items")
    .insert([{ Item: name, uom: uom, quantity: qty }]);

  if (error) {
    console.error("Add error:", error);
    alert("Failed to add item.");
    return;
  }

  // Clear modal
  document.getElementById("modalName").value = "";
  document.getElementById("modalUOM").value = "PCS";
  document.getElementById("modalQty").value = "";

  closeAddModal();
  loadStock();
}


// =======================================================
// INITIAL LOAD
// =======================================================
loadStock();
