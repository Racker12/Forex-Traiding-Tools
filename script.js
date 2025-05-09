const sessionTimes = [
  { name: 'Sydney', open: 23, close: 8 },
  { name: 'Asia', open: 2, close: 11 },
  { name: 'London', open: 9, close: 18 },
  { name: 'New York', open: 13.5, close: 20 }
];

function updateSessions() {
  const offsetMinutes = new Date().getTimezoneOffset();
  const offsetHours = -offsetMinutes / 60;

  const now = new Date();
  const localHour = now.getUTCHours() + offsetHours;
  const localMin = now.getUTCMinutes();
  const localTime = (localHour + localMin / 60 + 24) % 24;

  const sessionsDiv = document.getElementById('sessions');
  if (!sessionsDiv) return;
  sessionsDiv.innerHTML = '';

  sessionTimes.forEach(session => {
    const open = session.open;
    const close = session.close;

    let statusColor = 'red'; // default: geschlossen

    const timeToOpen = ((open - localTime + 24) % 24);
    const timeToClose = ((close - localTime + 24) % 24);

    const isOpen = open < close
      ? localTime >= open && localTime < close
      : localTime >= open || localTime < close;

    if (isOpen) {
      if (timeToClose <= 1) {
        statusColor = 'orange'; // kurz vor Schließung
      } else {
        statusColor = 'green'; // aktiv
      }
    } else {
      if (timeToOpen <= 1) {
        statusColor = 'yellow'; // bald offen
      } else {
        statusColor = 'red'; // geschlossen
      }
    }

    const span = document.createElement('span');
    span.className = 'session';
    span.innerHTML = `
      <div class="status" style="background-color: ${statusColor}"></div>
      ${session.name}
    `;
    sessionsDiv.appendChild(span);
  });
}

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

  updateSessions();
  setInterval(updateSessions, 60000);
});

  updateSessions();
  setInterval(updateSessions, 60000);
});

