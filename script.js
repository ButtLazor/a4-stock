let soundEnabled = false;
let lastStableData = [];
let countdown = 0;

const fetchInterval = 9000;
const sampleCount = 3;
const countdownReset = () => Math.floor((fetchInterval * sampleCount) / 1000);

/* SOUND TOGGLE */
function enableSound() {
  soundEnabled = !soundEnabled;

  const btn = document.getElementById("soundToggle");
  btn.classList.toggle("active");

  const icon = btn.querySelector("i");
  icon.className = soundEnabled ? "fa-solid fa-bell-slash" : "fa-solid fa-bell";

  if (soundEnabled) document.getElementById("dingSound").play().catch(() => {});
}

/* DARK MODE */
function toggleDarkMode() {
  const body = document.body;
  body.classList.toggle("dark");

  const icon = document.getElementById("darkToggle").querySelector("i");
  icon.className = body.classList.contains("dark")
    ? "fa-solid fa-sun"
    : "fa-solid fa-moon";

  localStorage.setItem("darkMode", body.classList.contains("dark"));
}

// Load preference
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
  document.getElementById("darkToggle").querySelector("i").className = "fa-solid fa-sun";
}

/* FETCH CSV */
async function fetchCSVData() {
  const bust = Date.now();
  const url =
    `https://docs.google.com/spreadsheets/d/e/2PACX-1vQhN6fUWPVPrCPdTyY9xIR_hcOc25np8UlAhdFEMK6SPxGOuie5Ozm6hPnQ8mdR5qWB7lhjgXMaZ809/pub?gid=0&single=true&output=csv&t=${bust}`;

  const res = await fetch(url);
  const text = await res.text();
  return text.trim().split("\n").slice(1).map(r => r.split(","));
}

/* UPDATE TABLE */
function updateTable(data) {
  const table = document.getElementById("stockBody");
  table.innerHTML = "";

  data.forEach(([brand, qtyStr]) => {
    const tr = document.createElement("tr");
    const qty = parseInt(qtyStr);

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
}

/* MONITOR STOCK */
async function monitorStableStock() {
  const samples = [];

  for (let i = 0; i < sampleCount; i++) {
    samples.push(await fetchCSVData());
    await new Promise(r => setTimeout(r, fetchInterval));
  }

  const allSame = samples.every(
    (s, i, arr) => JSON.stringify(s) === JSON.stringify(arr[0])
  );

  if (allSame && JSON.stringify(samples[0]) !== JSON.stringify(lastStableData)) {
    lastStableData = samples[0];
    updateTable(samples[0]);

    if (soundEnabled) document.getElementById("dingSound").play().catch(() => {});
  }
}

/* COUNTDOWN */
function updateCountdown() {
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  document.getElementById("countdown").innerHTML =
    `<i class="fa-solid fa-rotate-right"></i> Next update in: ${minutes}:${seconds.toString().padStart(2, "0")}`;

  countdown--;
  if (countdown < 0) countdown = countdownReset();
}

/* INIT */
monitorStableStock();
countdown = countdownReset();
setInterval(monitorStableStock, fetchInterval * sampleCount);
setInterval(updateCountdown, 1000);
