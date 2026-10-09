const CA = "0x1ae0bd3f23962734f293a7bdd6dc4734a02b7e01";

const SERIES = {
  "1D": [12, 12, 13, 12, 14, 13, 15, 18, 28, 46, 62, 74, 84, 91],
  "1W": [22, 24, 23, 26, 28, 27, 32, 36, 48, 70, 86, 94],
  "1M": [18, 20, 19, 22, 24, 26, 25, 29, 31, 36, 44, 62, 80, 93],
  "3M": [14, 16, 15, 18, 20, 22, 24, 23, 28, 30, 34, 40, 55, 74, 92],
  "YTD": [10, 12, 14, 13, 16, 18, 21, 24, 28, 27, 34, 42, 58, 76, 96],
  "1Y": [16, 18, 17, 20, 22, 24, 23, 28, 30, 34, 33, 40, 52, 70, 88, 98],
  "5Y": [8, 10, 12, 14, 16, 18, 22, 24, 28, 32, 36, 40, 48, 60, 78, 97],
  MAX: [6, 8, 10, 12, 16, 18, 22, 26, 30, 36, 42, 50, 64, 82, 100],
};

let activeRange = "1D";

function smooth(values) {
  const w = 640;
  const h = 260;
  const pad = 16;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: pad + (1 - (v - min) / span) * (h - pad * 2),
    v,
  }));
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return { d, area: `${d} L ${w} ${h} L 0 ${h} Z`, pts, w, h };
}

function draw(root) {
  const compact = root.dataset.compact === "true";
  const { d, area, pts, w, h } = smooth(SERIES[activeRange]);
  const last = pts[pts.length - 1];
  const note = root.querySelector(".chart-note");
  root.innerHTML = "";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Illustrative Paws chart");
  const gid = `fill-${compact ? "c" : "f"}`;
  svg.innerHTML = `
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3DDC57" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#3DDC57" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#${gid})"></path>
    <path d="${d}" fill="none" stroke="#1a1a1a" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"></path>
    <path d="${d}" fill="none" stroke="#3DDC57" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"></path>
    <circle class="pulse" cx="${last.x}" cy="${last.y}" r="8"></circle>
    <circle cx="${last.x}" cy="${last.y}" r="8" fill="#fff" stroke="#1a1a1a" stroke-width="3"></circle>
    <circle class="dot" cx="${last.x}" cy="${last.y}" r="4"></circle>
    <line class="cross" x1="0" y1="0" x2="0" y2="${h}" visibility="hidden"></line>
  `;
  root.appendChild(svg);
  if (note) root.appendChild(note);

  if (compact) return;

  const cross = svg.querySelector(".cross");
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.hidden = true;
  root.appendChild(tip);

  svg.addEventListener("mousemove", (event) => {
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * w;
    let nearest = pts[0];
    let best = Infinity;
    for (const p of pts) {
      const dist = Math.abs(p.x - x);
      if (dist < best) {
        best = dist;
        nearest = p;
      }
    }
    cross.setAttribute("x1", nearest.x);
    cross.setAttribute("x2", nearest.x);
    cross.setAttribute("visibility", "visible");
    const left = (nearest.x / w) * rect.width;
    tip.hidden = false;
    tip.style.left = `${left}px`;
    tip.style.top = `${(nearest.y / h) * rect.height}px`;
    tip.textContent = "Illustrative";
  });
  svg.addEventListener("mouseleave", () => {
    cross.setAttribute("visibility", "hidden");
    tip.hidden = true;
  });
}

function renderCharts() {
  document.querySelectorAll("[data-chart]").forEach(draw);
}

document.querySelectorAll("[data-range]").forEach((button) => {
  button.addEventListener("click", () => {
    activeRange = button.dataset.range;
    document.querySelectorAll("[data-range]").forEach((el) => {
      el.setAttribute("aria-selected", el === button ? "true" : "false");
    });
    renderCharts();
  });
});

const toast = document.querySelector(".toast");
let toastTimer = 0;
async function copyContract() {
  try {
    await navigator.clipboard.writeText(CA);
  } catch {
    const area = document.createElement("textarea");
    area.value = CA;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 1600);
}
document.querySelectorAll("[data-copy]").forEach((el) => {
  el.addEventListener("click", copyContract);
});

const buy = document.getElementById("tab-buy");
const sell = document.getElementById("tab-sell");
const buyPanel = document.getElementById("panel-buy");
const sellPanel = document.getElementById("panel-sell");
function selectTab(which) {
  const isBuy = which === "buy";
  buy.setAttribute("aria-selected", isBuy ? "true" : "false");
  sell.setAttribute("aria-selected", isBuy ? "false" : "true");
  buyPanel.hidden = !isBuy;
  sellPanel.hidden = isBuy;
}
buy.addEventListener("click", () => selectTab("buy"));
sell.addEventListener("click", () => selectTab("sell"));

const menu = document.querySelector(".menu-btn");
const links = document.getElementById("nav-links");
menu.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  menu.setAttribute("aria-expanded", open ? "true" : "false");
});
links.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => {
    links.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  });
});

renderCharts();
