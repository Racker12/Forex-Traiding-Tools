const sessionTimes = [
  { name: 'Sydney', open: 23, close: 8 },
  { name: 'Asia', open: 2, close: 11 },
  { name: 'London', open: 9, close: 18 },
  { name: 'New York', open: 21.5, close: 4 }
];

// Zuverlässige DST-Erkennung für Deutschland
function isDST(date = new Date()) {
  const year = date.getFullYear();

  // Letzter Sonntag im März
  const march = new Date(year, 2, 31);
  march.setDate(march.getDate() - march.getDay());

  // Letzter Sonntag im Oktober
  const october = new Date(year, 9, 31);
  october.setDate(october.getDate() - october.getDay());

  return date >= march && date < october;
}

function updateSessions() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const utcTotal = utcHour + utcMin / 60;

  const isInDST = isDST();
  const germanyOffset = isInDST ? 2 : 1; // MESZ = UTC+2, MEZ = UTC+1
  const germanTime = (utcTotal + germanyOffset + 24) % 24;

  const sessionsDiv = document.getElementById('sessions');
  sessionsDiv.innerHTML = '';

  sessionTimes.forEach(session => {
    const open = session.open;
    const close = session.close;

    let isOpen = false;

    if (open < close) {
      isOpen = germanTime >= open && germanTime < close;
    } else {
      // Öffnung über Mitternacht (z. B. New York 21:30 – 04:00)
      isOpen = germanTime >= open || germanTime < close;
    }

    const color = isOpen ? 'green' : 'red';

    const span = document.createElement('span');
    span.className = 'session';
    span.innerHTML = `
      <div class="status" style="background-color: ${color}"></div>
      ${session.name}
    `;
    sessionsDiv.appendChild(span);
  });
}

// Funktionen für Navigation
function openApp(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function goHome() {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById('home').classList.add('active');
}

function calculateSL() {
  const pair = document.getElementById('pair').value;
  const slValue = parseFloat(document.getElementById('slValue').value);
  const currency = document.getElementById('slCurrency').value;
  const distance = parseFloat(document.getElementById('slDistance').value);
  const slType = document.getElementById('slType').value;
  const resultDiv = document.getElementById('result');

  if (isNaN(slValue) || isNaN(distance)) {
    resultDiv.textContent = "Bitte alle Felder korrekt ausfüllen.";
    return;
  }

  const pipValuePerLot = 10;
  let distanceInPips = slType === "percent" ? distance * 100 : distance;
  let riskPerLot = pipValuePerLot * distanceInPips;
  let lots = slValue / riskPerLot;

  resultDiv.innerHTML = `Empfohlene Positionsgröße: <strong>${lots.toFixed(2)} Lots</strong>`;
}

let widget;

function updateChartSymbol() {
  const selectedSymbol = document.getElementById("chartPair").value;

  if (widget) {
    widget.remove();
  }

  widget = new TradingView.widget({
    "container_id": "tradingview_chart",
    "autosize": true,
    "symbol": selectedSymbol,
    "interval": "30",
    "timezone": "Etc/UTC",
    "theme": "dark",
    "style": "1",
    "locale": "de",
    "toolbar_bg": "#1e1e1e",
    "enable_publishing": false,
    "hide_top_toolbar": false,
    "hide_legend": false,
    "save_image": false,
    "studies": [],
  });
}

window.addEventListener("DOMContentLoaded", () => {
  widget = new TradingView.widget({
    "container_id": "tradingview_chart",
    "autosize": true,
    "symbol": "OANDA:EURUSD",
    "interval": "30",
    "timezone": "Etc/UTC",
    "theme": "dark",
    "style": "1",
    "locale": "de",
    "toolbar_bg": "#1e1e1e",
    "enable_publishing": false,
    "hide_top_toolbar": false,
    "hide_legend": false,
    "save_image": false,
    "studies": [],
  });
});

// Sitzungen jede Minute aktualisieren
setInterval(updateSessions, 60000);
updateSessions();
