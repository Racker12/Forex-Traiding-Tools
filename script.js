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

// Dynamische Order Inputs für Nvidia Rechner
function updateOrderInputs() {
  const buyCount = parseInt(document.getElementById('numBuyOrders').value) || 1;
  const sellCount = parseInt(document.getElementById('numSellOrders').value) || 1;
  const buyContainer = document.getElementById('buyOrdersContainer');
  const sellContainer = document.getElementById('sellOrdersContainer');

  // Buy Inputs
  buyContainer.innerHTML = '';
  for (let i = 1; i <= buyCount; i++) {
    buyContainer.innerHTML += `
      <div style="margin-bottom: .5rem;">
        <label>Buy Order ${i} (%):
          <input type="number" min="0" max="100" id="buyPercent${i}" value="0" required style="width:60px;">
        </label>
        <label>Preis:
          <input type="number" step="0.0001" id="buyPrice${i}" value="0" required style="width:90px;">
        </label>
      </div>
    `;
  }

  // Sell Inputs
  sellContainer.innerHTML = '';
  for (let i = 1; i <= sellCount; i++) {
    sellContainer.innerHTML += `
      <div style="margin-bottom: .5rem;">
        <label>Sell Order ${i} (%):
          <input type="number" min="0" max="100" id="sellPercent${i}" value="0" required style="width:60px;">
        </label>
        <label>Preis:
          <input type="number" step="0.0001" id="sellPrice${i}" value="0" required style="width:90px;">
        </label>
      </div>
    `;
  }
}

// Prozent für Buy Orders automatisch aufteilen oder zurücksetzen
function autoFillBuyPercents() {
  const buyCount = parseInt(document.getElementById('numBuyOrders').value) || 1;
  const checked = document.getElementById('autoBuyPercent').checked;
  for (let i = 1; i <= buyCount; i++) {
    document.getElementById(`buyPercent${i}`).value = checked ? (100 / buyCount).toFixed(2) : '';
  }
}
// Prozent für Sell Orders automatisch aufteilen oder zurücksetzen
function autoFillSellPercents() {
  const sellCount = parseInt(document.getElementById('numSellOrders').value) || 1;
  const checked = document.getElementById('autoSellPercent').checked;
  for (let i = 1; i <= sellCount; i++) {
    document.getElementById(`sellPercent${i}`).value = checked ? (100 / sellCount).toFixed(2) : '';
  }
}

// Berechnung für Nvidia Order Rechner
function calculateNvidiaOrders() {
  const kapital = parseFloat(document.getElementById('kapitalInput').value) || 0;
  const buyCount = parseInt(document.getElementById('numBuyOrders').value) || 1;
  const sellCount = parseInt(document.getElementById('numSellOrders').value) || 1;
  let buyTotal = 0, sellTotal = 0;
  let buyOrders = [], sellOrders = [];

  // Buy Orders Daten
  for (let i = 1; i <= buyCount; i++) {
    const percent = parseFloat(document.getElementById(`buyPercent${i}`).value) || 0;
    const price = parseFloat(document.getElementById(`buyPrice${i}`).value) || 0;
    buyOrders.push({percent, price});
    buyTotal += percent;
  }
  // Sell Orders Daten
  for (let i = 1; i <= sellCount; i++) {
    const percent = parseFloat(document.getElementById(`sellPercent${i}`).value) || 0;
    const price = parseFloat(document.getElementById(`sellPrice${i}`).value) || 0;
    sellOrders.push({percent, price});
    sellTotal += percent;
  }

  let resultHTML = "";

  // Validation
  let error = "";
  if (!kapital || kapital <= 0) error += `<div style="color:#ff5b5b">Kapital muss > 0 sein.</div>`;
  if (buyTotal !== 100) error += `<div style="color:#ff5b5b">Buy Orders ergeben nicht 100% (aktuell: ${buyTotal}%)</div>`;
  if (sellTotal !== 100) error += `<div style="color:#ff5b5b">Sell Orders ergeben nicht 100% (aktuell: ${sellTotal}%)</div>`;
  if (buyOrders.some(o => o.price <= 0)) error += `<div style="color:#ff5b5b">Alle Buy-Preise müssen > 0 sein.</div>`;
  if (sellOrders.some(o => o.price <= 0)) error += `<div style="color:#ff5b5b">Alle Sell-Preise müssen > 0 sein.</div>`;

  if (error) {
    document.getElementById("nvidiaOrderResult").innerHTML = error;
    return;
  }

  // Buy-Gesamteinstieg (gewichteter Durchschnitt)
  let buyEntry = buyOrders.reduce((sum, o) => sum + (o.percent * o.price / 100), 0);
  // Sell-Gesamtausgang (gewichteter Durchschnitt)
  let sellExit = sellOrders.reduce((sum, o) => sum + (o.percent * o.price / 100), 0);

  // Positionsgröße = Kapital / BuyEntry
  let positionSize = kapital / buyEntry;

  // Gewinn = (SellGesamt - BuyGesamt) * PositionSize
    let profit = (sellExit - buyEntry) * positionSize;
  let kosten = buyCount + sellCount;
  let profitNachKosten = profit - kosten;

  resultHTML += `<table style="width:100%;margin-top:.5rem;border-collapse:collapse;">
    <tr><th style="text-align:left;">Buy Gesamteinstieg</th><td>${buyEntry.toFixed(4)}</td></tr>
    <tr><th style="text-align:left;">Sell Gesamtaustieg</th><td>${sellExit.toFixed(4)}</td></tr>
    <tr><th style="text-align:left;">Positionsgröße</th><td>${positionSize.toFixed(4)}</td></tr>
    <tr><th style="text-align:left;">Profit</th><td style="color:#4eaaff;font-weight:bold;">${profit.toFixed(2)}</td></tr>
    <tr><th style="text-align:left;">Profit nach Ausführungskosten</th><td style="color:#30e473;font-weight:bold;">${profitNachKosten.toFixed(2)}</td></tr>
  </table>`;


  document.getElementById("nvidiaOrderResult").innerHTML = resultHTML;
}

// Initialisierung Events
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('numBuyOrders')) {
    updateOrderInputs();
    document.getElementById('numBuyOrders').addEventListener('input', function(){
      updateOrderInputs();
      if(document.getElementById('autoBuyPercent').checked) autoFillBuyPercents();
    });
    document.getElementById('numSellOrders').addEventListener('input', function(){
      updateOrderInputs();
      if(document.getElementById('autoSellPercent').checked) autoFillSellPercents();
    });
  }
});

