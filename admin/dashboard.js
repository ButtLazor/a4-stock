const supabase = supabase.createClient(
  "https://YOUR-PROJECT.supabase.co",
  "YOUR_ANON_KEY"
);

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

async function addItem() {
  const name = document.getElementById("newName").value.trim();
  const qty = parseInt(document.getElementById("newQty").value);

  if (!name || isNaN(qty)) return alert("Enter valid name & quantity");

  await supabase.from("stock_items").insert([{ brand: name, quantity: qty }]);

  document.getElementById("newName").value = "";
  document.getElementById("newQty").value = "";

  loadStock();
}

async function updateQty(id, qty) {
  await supabase.from("stock_items").update({ quantity: qty }).eq("id", id);
}

async function deleteItem(id) {
  if (!confirm("Delete this item?")) return;
  await supabase.from("stock_items").delete().eq("id", id);
  loadStock();
}

loadStock();
