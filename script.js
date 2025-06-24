// Forex Sessions
const sessionTimes = [
  { name: 'Sydney', open: 22, close: 7 },
  { name: 'Tokyo', open: 1, close: 10 },
  { name: 'London', open: 8, close: 17 },
  { name: 'New York', open: 13, close: 22 }
];

function updateSessions() {
  const now = new Date();
  const localHour = now.getHours();
  const localMin = now.getMinutes();
  const localTime = localHour + localMin / 60;

  const sessionsDiv = document.getElementById('sessions');
  sessionsDiv.innerHTML = '';

  sessionTimes.forEach(session => {
    const isOpen = session.open < session.close
      ? localTime >= session.open && localTime < session.close
      : localTime >= session.open || localTime < session.close;

    const color = isOpen ? 'green' : 'red';

    const div = document.createElement('div');
    div.className = 'session';
    div.innerHTML = `<div class="status" style="background:${color}"></div>${session.name}`;
    sessionsDiv.appendChild(div);
  });
}

// Tabs in Nvidia App
function openTab(evt, tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

  evt.currentTarget.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

// Navigation
function openApp(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function goHome() {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById('home').classList.add('active');
}

// SL Rechner (korrigiert mit validierung und Ausgabe in Lots)
function calculateSL() {
  const slValue = parseFloat(document.getElementById('slValue').value);
  const slDistance = parseFloat(document.getElementById('slDistance').value);
  const slType = document.getElementById('slType').value;
  const pair = document.getElementById('pair').value;

  const resultDiv = document.getElementById('result');
  resultDiv.textContent = '';

  // Validation
  if (
    isNaN(slValue) || slValue <= 0 ||
    isNaN(slDistance) || slDistance <= 0
  ) {
    resultDiv.textContent = 'Bitte gültige Werte für Risiko und SL-Abstand eingeben.';
    return;
  }

  // PIP-Größe ermitteln
  let pipSize = pair.includes("JPY") ? 0.01 : 0.0001;

  // Standardwert: ca. 10 USD/EUR pro Pip pro Lot
  const pipValuePerLot = 10;

  const totalRiskPerLot = slDistance * pipValuePerLot;
  const lots = slValue / totalRiskPerLot;

  if (!isFinite(lots) || lots <= 0) {
    resultDiv.textContent = 'Berechnung nicht möglich – überprüfe deine Eingaben.';
    return;
  }

  resultDiv.innerHTML = `Empfohlene Positionsgröße: <strong>${lots.toFixed(2)} Lots</strong>`;
}

// Chart init
let widget;
function updateChartSymbol() {
  const selectedSymbol = document.getElementById('chartPair').value;
  if (widget) widget.remove();

  widget = new TradingView.widget({
    container_id: "tradingview_chart",
    autosize: true,
    symbol: selectedSymbol,
    interval: "30",
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1",
    locale: "de",
    toolbar_bg: "#1e1e1e",
    enable_publishing: false,
    hide_top_toolbar: false,
    hide_legend: false,
    save_image: false,
    studies: [],
  });
}

// Initialisierung
window.addEventListener('DOMContentLoaded', () => {
  updateSessions();
  setInterval(updateSessions, 60000);
  updateChartSymbol();
});
