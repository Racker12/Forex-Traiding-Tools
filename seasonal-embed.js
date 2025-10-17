(function(){
  function css(strings){ return strings[0]; }

  // Dark-Theme Styles, isoliert unter .stapp
  const STYLES = css`
  .stapp { font-family: system-ui, Arial, sans-serif; color:#e5e7eb; position:relative; }
  .stapp .card{ background:#1e1e1e;border-radius:12px;padding:1rem 1.25rem;box-shadow:0 2px 6px rgba(0,0,0,.3);margin-bottom:1rem;border:1px solid #2a2a2a }
  .stapp .row{ display:flex; gap:.75rem; align-items:center; flex-wrap:wrap; margin-bottom:.75rem }
  .stapp label{ font-weight:600; color:#e5e7eb }
  .stapp select{ margin-left:.25rem; padding:.45rem .6rem; border-radius:8px; border:1px solid #3a3a3a; background:#121212; color:#e5e7eb; }
  .stapp h3{ margin:.25rem 0 .5rem 0; font-size:1.05rem; color:#fff }
  .stapp .grid{ display:grid; grid-template-columns:1fr 1fr; gap:1rem }
  .stapp .muted{ color:#9ca3af; font-size:.9rem }
  .stapp canvas{ width:100% !important; height:300px !important; background:#111; border-radius:8px; }
  .stapp .help-btn{
    margin-left:auto; background:#0ea5e9; color:#fff; border:none; border-radius:999px; width:36px; height:36px;
    display:inline-flex; align-items:center; justify-content:center; font-weight:800; cursor:pointer;
    box-shadow:0 2px 8px rgba(14,165,233,.5);
  }
  .stapp .help-btn:hover{ filter:brightness(1.05); }
  @media (max-width: 900px){ .stapp .grid{ grid-template-columns:1fr } .stapp canvas{ height:260px !important } }
  @media (max-width: 420px){ .stapp canvas{ height:240px !important } }

  /* Guided Tour (scoped) */
  .stapp .tour-overlay{ position:fixed; inset:0; background:rgba(2,6,23,.45); backdrop-filter:blur(2px); z-index:1000; }
  .stapp .tour-card{
    position:fixed; max-width:320px; background:#0b1020; color:#e5e7eb;
    border:1px solid #334155; border-radius:12px; padding:12px 14px; box-shadow:0 10px 40px rgba(0,0,0,.35); z-index:1001;
  }
  .stapp .tour-actions{ display:flex; gap:8px; margin-top:10px; justify-content:flex-end; }
  .stapp .tour-btn{ background:#1f2937; border:1px solid #374151; color:#e5e7eb; padding:.45rem .7rem; border-radius:8px; cursor:pointer; }
  .stapp .tour-btn:hover{ filter:brightness(1.05); }
  .stapp .tour-primary{ background:#0ea5e9; border-color:#0284c7; color:#fff; }
  .stapp .tour-highlight{ outline:3px solid rgba(14,165,233,.9); outline-offset:2px; border-radius:10px; transition:outline-color .2s ease; }
  .stapp .tour-arrow{ position:fixed; left:0; top:0; pointer-events:none; z-index:1000; }
  `;

  function injectStyles(root){
    const style = document.createElement('style');
    style.textContent = STYLES;
    root.appendChild(style);
  }

  // ---- Utils ----
  async function safeLoadJSONTxt(path){
    const res = await fetch(path, { cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status} für ${path}`);
    let text = (await res.text()).replace(/^\uFEFF/, "").trim();
    const first = text.indexOf("{"), last = text.lastIndexOf("}");
    if(first === -1 || last === -1) throw new Error(`Kein JSON in ${path}`);
    return JSON.parse(text.slice(first, last + 1));
  }
  async function fileExists(path){
    try{ const r = await fetch(path, { cache: "no-store" }); return r.ok; }
    catch{ return false; }
  }
  function createStripePattern(color){
    const c = document.createElement("canvas"); const s = 8; c.width=s; c.height=s;
    const g = c.getContext("2d"); g.strokeStyle = color; g.lineWidth=2;
    g.beginPath(); g.moveTo(0,s); g.lineTo(s,0); g.stroke(); return g.createPattern(c,"repeat");
  }
  const GREEN_PATTERN = createStripePattern("rgba(34,197,94,0.28)");
  const RED_PATTERN   = createStripePattern("rgba(239,68,68,0.28)");

  // ---- Plugins ----
  let hoverY = null;
  const CrosshairPlugin = {
    id: "st_crosshair",
    afterDatasetsDraw(chart){
      const { ctx, tooltip, chartArea } = chart;
      const active = tooltip?.getActiveElements?.()[0];
      if(!active) return;
      const el = chart.getDatasetMeta(active.datasetIndex).data[active.index];
      if(!el) return;
      ctx.save(); ctx.setLineDash([4,4]); ctx.strokeStyle = "rgba(148,163,184,.7)";
      ctx.beginPath(); ctx.moveTo(el.x, chartArea.top); ctx.lineTo(el.x, chartArea.bottom); ctx.stroke(); ctx.restore();
      if(chart.config.type==="line" && hoverY!=null){
        const yPix = chart.scales.y.getPixelForValue(hoverY);
        if(yPix>=chartArea.top && yPix<=chartArea.bottom){
          ctx.save(); ctx.setLineDash([4,4]); ctx.strokeStyle = "rgba(148,163,184,.7)";
          ctx.beginPath(); ctx.moveTo(chartArea.left, yPix); ctx.lineTo(chartArea.right, yPix); ctx.stroke(); ctx.restore();
        }
      }
    }
  };

  const MonthlyFillPlugin = {
    id: "st_monthlyfill",
    beforeDatasetsDraw(chart){
      if(chart.config.type!=="line") return;
      const ds = chart.config.data.datasets?.[0];
      const labels = chart.config.data.labels;
      const values = ds?.data;
      if(!labels || !values || labels.length!==values.length) return;
      const { ctx, chartArea, scales:{ x, y } } = chart;
      if(!chartArea) return;

      // Monatsanfänge
      const monthStarts = [];
      for(let i=0;i<labels.length;i++){ if(labels[i].slice(3,5)==="01") monthStarts.push(i); }
      const lastIsFirstAgain = labels[labels.length-1] === labels[0];
      const usableLen = lastIsFirstAgain ? labels.length-1 : labels.length;
      const ends = [...monthStarts.slice(1), usableLen];
      const step = (labels.length>1) ? (x.getPixelForValue(1) - x.getPixelForValue(0)) : 0;
      const y0 = y.getPixelForValue(0);

      ctx.save();
      ctx.beginPath();
      ctx.rect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
      ctx.clip();

      // Monatsschraffur (nur bis zur Linie)
      for(let k=0;k<monthStarts.length;k++){
        const startIdx = monthStarts[k];
        const endExclusive = ends[k];
        const endIdx = Math.max(startIdx, endExclusive-1);
        const positive = (values[endIdx] - values[startIdx]) >= 0;
        ctx.fillStyle = positive ? GREEN_PATTERN : RED_PATTERN;
        for(let i=startIdx; i<endIdx; i++){
          const x1 = x.getPixelForValue(i);
          const x2 = x.getPixelForValue(i+1);
          const yVal = y.getPixelForValue(values[i]);
          const segWidth = x2 - x1;
          const height = Math.abs(y0 - yVal);
          const top = Math.min(y0, yVal);
          ctx.fillRect(x1, top, segWidth, height);
        }
      }

      // Trenner am 1. des Monats (exakt an der linken Kante)
      ctx.setLineDash([3,3]); ctx.strokeStyle="rgba(148,163,184,0.35)"; ctx.lineWidth=1;
      for(const idx of monthStarts){
        const xCenter = x.getPixelForValue(idx);
        const xLine = xCenter - step/2;
        ctx.beginPath(); ctx.moveTo(xLine, chartArea.top); ctx.lineTo(xLine, chartArea.bottom); ctx.stroke();
      }
      ctx.restore();
    }
  };

  function makeTrendChart(canvasEl, data){
    const values = data.chart.values;
    const labels = data.chart.labels;
    const monthNames = ["Jan","Feb","Mrz","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
    const fmt = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

    return new Chart(canvasEl.getContext("2d"), {
      type: "line",
      data: { labels, datasets: [{ label:"Seasonal Trend", data:values, borderWidth:2, borderColor:"#60a5fa", tension:0.25, pointRadius:0, fill:false }]},
      options: {
        responsive:true, maintainAspectRatio:false,
        interaction:{ mode:"index", intersect:false },
        plugins:{
          legend:{ display:false },
          tooltip:{ callbacks:{ label:(c)=>{ hoverY=c.parsed.y; return " "+fmt.format(c.parsed.y); } } },
          decimation:{ enabled:true, algorithm:"lttb", samples:400 }
        },
        onLeave:()=>{ hoverY=null; },
        scales:{
          x:{
            grid:{ color:"rgba(148,163,184,.15)" },
            ticks:{ color:"#cbd5e1", autoSkip:false, maxRotation:0, callback:(val,idx)=>{
              const lab=labels[idx]; if(!lab) return ""; if(lab.slice(3,5)!=="01") return "";
              const m = parseInt(lab.slice(0,2),10)-1; return monthNames[m] ?? "";
            }}
          },
          y:{ grid:{ color:"rgba(148,163,184,.2)" }, ticks:{ color:"#cbd5e1" } }
        }
      },
      plugins: [CrosshairPlugin, MonthlyFillPlugin]
    });
  }

  function makeBarChart(canvasEl, vals, labels){
    const colors = vals.map(v => v>=0 ? "rgba(34,197,94,.85)" : "rgba(239,68,68,.85)");
    const fmt = (v)=> new Intl.NumberFormat("de-DE",{maximumFractionDigits:2}).format(v)+"%";
    return new Chart(canvasEl.getContext("2d"), {
      type:"bar",
      data:{ labels, datasets:[{ data:vals, backgroundColor:colors }] },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:c=>" "+fmt(c.parsed.y) } } },
        scales:{ 
          y:{ grid:{ color:"rgba(148,163,184,.15)" }, ticks:{ color:"#cbd5e1", callback:v=>fmt(v) } }, 
          x:{ grid:{ display:false }, ticks:{ color:"#cbd5e1" } } 
        }
      }
    });
  }

  // ---- Public API ----
  window.initSeasonalTrends = async function(container, options = {}){
    if(!container) throw new Error("Container not found");
    const dataPath = (options.dataPath ?? "./data/").replace(/\/?$/, "/");
    const assetsCfg = options.assets ?? [
      { key:"NVD", label:"NVIDIA" }, { key:"AMZ", label:"Amazon" }
    ];
    const candidatePeriods = options.periods ?? ["3","5","7","8","10","15","20","25"];
    const title = options.title ?? "Seasonale Trends";

    const root = document.createElement('div');
    root.className = 'stapp';
    root.innerHTML = `
      <style>${STYLES}</style>
      <div class="card">
        <div class="row">
          <h3 style="margin-right:auto">${title}</h3>
          <label>Asset:
            <select id="stAsset" data-tour="asset"></select>
          </label>
          <label>Zeitraum:
            <select id="stPeriod" data-tour="period"></select>
          </label>
          <button class="help-btn" id="stHelp" aria-label="Tutorial">?</button>
        </div>
        <canvas id="stTrend" data-tour="trend"></canvas>
        <div id="stRange" class="muted" data-tour="range"></div>
      </div>
      <div class="grid">
        <div class="card">
          <h3>Monthly Returns</h3>
          <canvas id="stMonthly" data-tour="monthly"></canvas>
        </div>
        <div class="card">
          <h3>Weekday Returns</h3>
          <canvas id="stWeekday" data-tour="weekday"></canvas>
        </div>
      </div>

      <!-- Guided Tour UI -->
      <div class="tour-overlay" id="stTourOverlay" hidden></div>
      <div class="tour-card" id="stTourTooltip" hidden>
        <div id="stTourText"></div>
        <div class="tour-actions">
          <button class="tour-btn" id="stTourPrev" type="button">Zurück</button>
          <button class="tour-btn tour-primary" id="stTourNext" type="button">Weiter</button>
          <button class="tour-btn" id="stTourClose" type="button">Schließen</button>
        </div>
      </div>
      <svg class="tour-arrow" id="stTourArrow" width="0" height="0" hidden></svg>
    `;
    container.appendChild(root);
    injectStyles(root);

    const $asset   = root.querySelector('#stAsset');
    const $period  = root.querySelector('#stPeriod');
    const $range   = root.querySelector('#stRange');
    const $trend   = root.querySelector('#stTrend');
    const $monthly = root.querySelector('#stMonthly');
    const $weekday = root.querySelector('#stWeekday');

    const $help    = root.querySelector('#stHelp');
    const $overlay = root.querySelector('#stTourOverlay');
    const $tooltip = root.querySelector('#stTourTooltip');
    const $text    = root.querySelector('#stTourText');
    const $prev    = root.querySelector('#stTourPrev');
    const $next    = root.querySelector('#stTourNext');
    const $close   = root.querySelector('#stTourClose');
    const $arrow   = root.querySelector('#stTourArrow');

    assetsCfg.forEach((a,i)=>{
      const o = document.createElement('option');
      o.value = a.key; o.textContent = a.label; if(i===0) o.selected=true;
      $asset.appendChild(o);
    });

    let trendChart, monthlyChart, weekdayChart;

    async function discoverPeriodsForAsset(assetKey){
      const found = [];
      for(const p of candidatePeriods){
        const file = `${assetKey}${p}.txt`;
        if(await fileExists(dataPath + file)) found.push(p);
      }
      return found.sort((a,b)=>Number(a)-Number(b));
    }

    async function refreshPeriods(assetKey){
      $period.innerHTML = "";
      const avail = await discoverPeriodsForAsset(assetKey);
      if(avail.length===0){
        const o = document.createElement('option'); o.value=""; o.textContent="Keine Daten gefunden";
        $period.appendChild(o); return;
      }
      avail.forEach((p,i)=>{
        const o = document.createElement('option'); o.value=p; o.textContent=`${p} Jahre`; if(i===0) o.selected=true;
        $period.appendChild(o);
      });
    }

    async function loadCurrent(){
      const assetKey = $asset.value;
      const periodKey = $period.value;
      const file = `${assetKey}${periodKey}.txt`;
      const path = dataPath + file;
      try{
        const data = await safeLoadJSONTxt(path);
        const m = data.metrics || {};
        $range.textContent = (m.start && m.end) ? `Zeitraum: ${m.start} → ${m.end} (Punkte: ${m.count ?? "?"})` : "";

        trendChart?.destroy(); monthlyChart?.destroy(); weekdayChart?.destroy();
        trendChart   = makeTrendChart($trend, data);
        monthlyChart = makeBarChart($monthly, data.monthlyChartData.values, data.monthlyChartData.labels);
        weekdayChart = makeBarChart($weekday, data.weekdayChartData.values, data.weekdayChartData.labels);
      }catch(e){
        console.error(e);
        $range.textContent = `Fehler beim Laden von ${path}: ${e.message}`;
        trendChart?.destroy(); monthlyChart?.destroy(); weekdayChart?.destroy();
      }
    }

    $asset.addEventListener('change', async ()=>{ await refreshPeriods($asset.value); await loadCurrent(); });
    $period.addEventListener('change', loadCurrent);

    await refreshPeriods($asset.value);
    await loadCurrent();

    // -------------------------
    // Guided Tour (scoped)
    // -------------------------
    const tour = {
      steps: [
        { el:'#stAsset',   text:'Wähle hier das <b>Asset</b> (Aktie, Währung, Rohstoff, Krypto). Die verfügbaren Zeiträume werden automatisch erkannt.', prefer:'bottom' },
        { el:'#stPeriod',  text:'Wähle den <b>Zeitraum</b> (z. B. 5, 10 Jahre).', prefer:'bottom' },
        { el:'#stTrend',   text:'Hauptchart: Saisonaler Verlauf. <b>Monats-Schraffur</b>: grün=positiv, rot=negativ. Hover zeigt Hilfslinien.', prefer:'right' },
        { el:'#stRange',   text:'Hier siehst du den <b>Datenzeitraum</b> & die Anzahl der Punkte.', prefer:'top' },
        { el:'#stMonthly', text:'<b>Monthly Returns</b>: Durchschnittliche Monatsperformance. Grün = Plus, Rot = Minus.', prefer:'right' },
        { el:'#stWeekday', text:'<b>Weekday Returns</b>: Durchschnitt pro Wochentag (Mo–Fr).', prefer:'right' }
      ],
      i: 0
    };

    function clearHighlight(){ root.querySelectorAll('.tour-highlight').forEach(el=>el.classList.remove('tour-highlight')); }

    function endTour(){
      $overlay.hidden = true;
      $tooltip.hidden = true;
      clearHighlight();
      // Pfeil vollständig entfernen & resetten
      $arrow.hidden = true;
      $arrow.innerHTML = "";
      $arrow.setAttribute("width", 0);
      $arrow.setAttribute("height", 0);
      $arrow.style.left = "0px";
      $arrow.style.top  = "0px";
    }

    function showStep(i, isResize=false){
      if(i<0) i=0;
      if(i>=tour.steps.length){ endTour(); return; }
      tour.i = i;

      const step = tour.steps[i];
      const el = root.querySelector(step.el);
      if(!el){ if(!isResize) showStep(i+1); return; }

      clearHighlight(); el.classList.add('tour-highlight');

      $text.innerHTML = step.text;
      $prev.disabled = (i===0);
      $next.textContent = (i===tour.steps.length-1) ? 'Fertig' : 'Weiter';

      const rect = el.getBoundingClientRect();
      const tipRect = { w: 320, h: 120 };
      const margin = 10;

      // Grundposition nach Präferenz
      let left, top;
      switch (step.prefer) {
        case 'right': left = rect.right + margin; top  = rect.top; break;
        case 'left':  left = rect.left - tipRect.w - margin; top  = rect.top; break;
        case 'top':   left = rect.left; top  = rect.top - tipRect.h - margin; break;
        default:      left = rect.left; top  = rect.bottom + margin; // bottom
      }

      // Ausweich-Logik für schmale Viewports
      if (step.prefer === 'right' && (left + tipRect.w > window.innerWidth - margin)) {
        left = rect.left - tipRect.w - margin;
      }
      if (step.prefer === 'left' && (left < margin)) {
        left = rect.right + margin;
      }

      // Clamp
      if (left + tipRect.w > window.innerWidth - margin) left = window.innerWidth - tipRect.w - margin;
      if (left < margin) left = margin;
      if (top + tipRect.h > window.innerHeight - margin) top = window.innerHeight - tipRect.h - margin;
      if (top < margin) top = margin;

      // Mobile Fallback
      const isMobile = window.innerWidth < 480;
      if (isMobile) {
        left = (window.innerWidth - tipRect.w) / 2;
        top  = Math.min(rect.bottom + margin, window.innerHeight - tipRect.h - margin);
      }

      $tooltip.style.left = `${left}px`;
      $tooltip.style.top  = `${top}px`;
      $tooltip.style.width = `${tipRect.w}px`;

      drawArrowTo(el, $tooltip);
    }

    function drawArrowTo(targetEl, tooltipEl){
      const tr = targetEl.getBoundingClientRect();
      const rr = tooltipEl.getBoundingClientRect();

      // Ziel sichtbar?
      const targetVisible = tr.bottom > 0 && tr.top < window.innerHeight && tr.right > 0 && tr.left < window.innerWidth;
      if (!targetVisible) {
        $arrow.hidden = true;
        $arrow.innerHTML = "";
        return;
      }

      const from = { x: rr.left + rr.width/2, y: rr.top + rr.height/2 };
      const to   = { x: tr.left + tr.width/2, y: tr.top + tr.height/2 };

      const minX = Math.min(from.x, to.x) - 12;
      const minY = Math.min(from.y, to.y) - 12;
      const w = Math.abs(from.x - to.x) + 24;
      const h = Math.abs(from.y - to.y) + 24;

      $arrow.hidden = false;
      $arrow.setAttribute('width', w);
      $arrow.setAttribute('height', h);
      $arrow.style.left = `${minX}px`;
      $arrow.style.top  = `${minY}px`;
      $arrow.innerHTML = `
        <defs>
          <marker id="stArrowHead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#0ea5e9"></polygon>
          </marker>
        </defs>
        <line x1="${from.x - minX}" y1="${from.y - minY}" x2="${to.x - minX}" y2="${to.y - minY}"
          stroke="#0ea5e9" stroke-width="2.5" marker-end="url(#stArrowHead)" />
      `;
    }

    // Events
    $help.addEventListener('click', () => {
      tour.i = 0;
      $overlay.hidden = false;
      $tooltip.hidden = false;
      showStep(0);
    });
    $prev.addEventListener('click', () => showStep(tour.i - 1));
    $next.addEventListener('click', () => showStep(tour.i + 1));
    $close.addEventListener('click', endTour);
    $overlay.addEventListener('click', endTour);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$overlay.hidden) endTour(); });
    window.addEventListener('resize', () => { if(!$overlay.hidden) showStep(tour.i, true); });
  };
})();
