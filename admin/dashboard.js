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
    .order("Item", { ascending: true });

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
      <td onclick="enableNameEdit(this, ${item.id})">
        <span class="item-text">${item.Item}</span>
        <input class="item-input" value="${item.Item}"
          onblur="saveName(${item.id}, this.value)"
          onkeydown="handleNameKey(event, ${item.id}, this)">
      </td>

      <td>
        <select onchange="updateUOM(${item.id}, this.value)">
          <option value="PCS" ${item.uom === "pcs" || item.uom === "PCS" ? "selected" : ""}>PCS</option>
          <option value="BOX" ${item.uom === "box" || item.uom === "BOX" ? "selected" : ""}>BOX</option>
        </select>
      </td>

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


// ===============================
// Editable Name Logic
// ===============================
function enableNameEdit(cell, id) {
  const textSpan = cell.querySelector(".item-text");
  const input = cell.querySelector(".item-input");

  textSpan.style.display = "none";
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
  newName = newName.trim();
  if (newName === "") return;

  const { error } = await supabaseClient
    .from("stock_items")
    .update({ Item: newName })
    .eq("id", id);

  if (error) {
    alert("Name update failed.");
    console.error(error);
  }

  loadStock();
}


// ===============================
// Update UOM
// ===============================
async function updateUOM(id, newUom) {
  newUom = newUom.toUpperCase();

  const { error } = await supabaseClient
    .from("stock_items")
    .update({ uom: newUom })
    .eq("id", id);

  if (error) console.error("UOM update error:", error);
}


// ===============================
// Update Quantity
// ===============================
async function updateQty(id, qty) {
  qty = parseInt(qty);

  if (isNaN(qty)) return;

  const { error } = await supabaseClient
    .from("stock_items")
    .update({ quantity: qty })
    .eq("id", id);

  if (error) console.error("Update error:", error);
}


// ===============================
// Delete item
// ===============================
async function deleteItem(id) {
  if (!confirm("Delete this item?")) return;

  const { error } = await supabaseClient
    .from("stock_items")
    .delete()
    .eq("id", id);

  if (error) console.error("Delete error:", error);

  loadStock();
}


// ===============================
// Modal Functions
// ===============================
function openAddModal() {
  document.getElementById("addModal").style.display = "flex";
}

function closeAddModal() {
  document.getElementById("addModal").style.display = "none";
}


// Add new item
async function submitAddItem() {
  const name = document.getElementById("modalName").value.trim();
  const uom = document.getElementById("modalUOM").value.trim().toUpperCase() || "PCS";
  const qty = parseInt(document.getElementById("modalQty").value);

  if (!name || isNaN(qty)) {
    alert("Please enter valid item name & quantity");
    return;
  }

  const { error } = await supabaseClient
    .from("stock_items")
    .insert([{ Item: name, uom: uom, quantity: qty }]);

  if (error) {
    alert("Failed to add item: " + error.message);
    console.error(error);
    return;
  }

  document.getElementById("modalName").value = "";
  document.getElementById("modalUOM").value = "PCS";
  document.getElementById("modalQty").value = "";

  closeAddModal();
  loadStock();
}


// Load on start
loadStock();
