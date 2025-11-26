let soundEnabled = false;
let lastStableData = [];
let countdown = 0;

const fetchInterval = 9000; // fetch every 9 seconds
const sampleCount = 3;      // 3 samples before confirming update
const countdownReset = () => Math.floor((fetchInterval * sampleCount) / 1000);

let devMode = false;
const devPanel = document.getElementById("devPanel");
let fetchHistory = [];

function enableSound() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById("soundToggle");
  btn.classList.toggle("active");
  btn.classList.add("clicked");
  setTimeout(() => btn.classList.remove("clicked"), 300);
  if (soundEnabled) {
    document.getElementById("dingSound").play().catch(() => {});
  }
}

function toggleDev() {
  devMode = !devMode;
  devPanel.style.display = devMode ? 'block' : 'none';
  if (devMode) updateDevPanel();
}

async function fetchCSVData() {
  const bust = Date.now();
  const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vQhN6fUWPVPrCPdTyY9xIR_hcOc25np8UlAhdFEMK6SPxGOuie5Ozm6hPnQ8mdR5qWB7lhjgXMaZ809/pub?gid=0&single=true&output=csv&t=${bust}`;

  const res = await fetch(url);
  const text = await res.text();
  const parsed = text.trim().split("\n").slice(1).map(r => r.split(","));

  fetchHistory.unshift({ time: new Date().toLocaleTimeString(), data: parsed });
  fetchHistory = fetchHistory.slice(0, 3);

  if (devMode) updateDevPanel();
  return parsed;
}

function updateDevPanel() {
  devPanel.textContent = fetchHistory
    .map(f => `[${f.time}]\n` + f.data.map(r => `${r[0]}: ${r[1]}`).join("\n"))
    .join("\n\n");
}

function isSameData(a, b) {
  if (a.length !== b.length) return false;
  return a.every((row, i) => row[1] === b[i][1]);
}

function updateTable(data) {
  const table = document.getElementById("stockBody");
  table.innerHTML = "";

  data.forEach(([brand, qtyStr], index) => {
    const qty = parseInt(qtyStr);
    const tr = document.createElement("tr");

    const brandTd = document.createElement("td");
    brandTd.textContent = brand;
    brandTd.style.fontSize = "2rem";

    const qtyTd = document.createElement("td");
    qtyTd.style.fontSize = "2rem";

    const prevQty = lastStableData[index]?.[1];
    if (prevQty !== undefined && prevQty !== qtyStr) {
      qtyTd.classList.add("flash");
      setTimeout(() => qtyTd.classList.remove("flash"), 1800);
    }

    if (qty === 0) {
      qtyTd.textContent = "OUT OF STOCK";
      qtyTd.className += " out-of-stock";
    } else if (qty < 200) {
      qtyTd.textContent = qty;
      qtyTd.className += " low-stock";
    } else if (qty <= 700) {
      qtyTd.textContent = qty;
      qtyTd.className += " medium-stock";
    } else {
      qtyTd.textContent = qty;
      qtyTd.className += " high-stock";
    }

    tr.appendChild(brandTd);
    tr.appendChild(qtyTd);
    table.appendChild(tr);
  });

  document.getElementById("lastUpdated").textContent =
    "Last updated: " + new Date().toLocaleTimeString();
}

async function monitorStableStock() {
  const samples = [];

  for (let i = 0; i < sampleCount; i++) {
    const data = await fetchCSVData();
    samples.push(data);
    await new Promise(r => setTimeout(r, fetchInterval));
  }

  const allSame = samples.every((sample, i, arr) => isSameData(sample, arr[0]));

  if (allSame && !isSameData(lastStableData, samples[0])) {
    lastStableData = samples[0];
    updateTable(samples[0]);

    if (soundEnabled) {
      document.getElementById("dingSound").play().catch(() => {});
    }
  }
}

function updateCountdown() {
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  document.getElementById("countdown").textContent =
    `Next update in: ${minutes}:${seconds.toString().padStart(2, '0')}`;

  countdown--;
  if (countdown < 0) countdown = countdownReset();
}

monitorStableStock();
countdown = countdownReset();
setInterval(monitorStableStock, fetchInterval * sampleCount);
setInterval(updateCountdown, 1000);
