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
      <td>
        <span class="item-text" onclick="startNameEdit(this)">${item.Item}</span>

        <input class="item-input"
               value="${item.Item}"
               data-id="${item.id}"
               onblur="finishNameEdit(this)"
               onkeydown="nameInputKey(event, this)">
      </td>

      <!-- UOM -->
      <td>
        <select onchange="updateUOM(${item.id}, this.value)">
          <option value="PCS" ${item.uom?.toUpperCase() === "PCS" ? "selected" : ""}>PCS</option>
          <option value="BOX" ${item.uom?.toUpperCase() === "BOX" ? "selected" : ""}>BOX</option>
          <option value="ROLL" ${item.uom?.toUpperCase() === "ROLL" ? "selected" : ""}>ROLL</option>
        </select>
      </td>

      <!-- Quantity -->
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
function startNameEdit(spanEl) {
  const cell = spanEl.parentElement;
  const input = cell.querySelector(".item-input");

  spanEl.style.display = "none";
  input.style.display = "block";
  input.focus();
  input.select();
}

function nameInputKey(event, input) {
  if (event.key === "Enter") {
    finishNameEdit(input);
  }
}

async function finishNameEdit(input) {
  const id = input.dataset.id;
  const newName = input.value.trim();

  const span = input.parentElement.querySelector(".item-text");

  if (!newName) {
    input.value = span.textContent; // revert
  } else {
    const { error } = await supabaseClient
      .from("stock_items")
      .update({ Item: newName })
      .eq("id", id);

    if (error) {
      console.error("Name update error:", error);
    } else {
      span.textContent = newName;
    }
  }

  input.style.display = "none";
  span.style.display = "inline-block";
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

  // Clear + close modal
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
