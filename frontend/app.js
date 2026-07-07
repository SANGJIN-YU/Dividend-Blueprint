const API_BASE = window.API_BASE || "http://localhost:8000/api/v1";

const els = {
  form: document.getElementById("simulation-form"),
  etfSelect: document.getElementById("etf-select"),
  submitBtn: document.getElementById("submit-btn"),
  message: document.getElementById("form-message"),
  results: document.getElementById("results"),
  statFinalAsset: document.getElementById("stat-final-asset"),
  statTotalDividend: document.getElementById("stat-total-dividend"),
  assetChart: document.getElementById("asset-chart"),
  assetTooltip: document.getElementById("asset-tooltip"),
  assetTable: document.getElementById("asset-table"),
  dividendChart: document.getElementById("dividend-chart"),
  dividendTooltip: document.getElementById("dividend-tooltip"),
  dividendTable: document.getElementById("dividend-table"),
};

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatWon(value) {
  return currencyFormatter.format(Math.round(value));
}

function formatCompactWon(value) {
  return `${compactFormatter.format(value)}원`;
}

function showMessage(text, isError) {
  els.message.textContent = text;
  els.message.hidden = !text;
  els.message.classList.toggle("is-error", Boolean(isError));
}

async function loadEtfs() {
  try {
    const res = await fetch(`${API_BASE}/etfs/`);
    if (!res.ok) throw new Error(`ETF 목록을 불러오지 못했습니다 (${res.status})`);
    const etfs = await res.json();
    els.etfSelect.innerHTML = "";
    for (const etf of etfs) {
      const option = document.createElement("option");
      option.value = etf.id;
      option.textContent = `${etf.ticker} · ${etf.name}`;
      els.etfSelect.appendChild(option);
    }
    if (etfs.length === 0) {
      showMessage("등록된 ETF가 없습니다. 시더 스크립트를 먼저 실행해 주세요.", true);
    }
  } catch (err) {
    showMessage(`백엔드(${API_BASE})에 연결할 수 없습니다: ${err.message}`, true);
  }
}

function niceCeil(value) {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const fraction = value / magnitude;
  let niceFraction;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * magnitude;
}

function niceTicks(maxValue, count = 4) {
  const ceilMax = niceCeil(maxValue);
  const step = niceCeil(ceilMax / count) || ceilMax;
  const ticks = [];
  for (let v = 0; v <= ceilMax + step / 2; v += step) {
    ticks.push(Math.round(v));
  }
  return ticks;
}

const MARGIN = { top: 16, right: 16, bottom: 30, left: 64 };
const VIEW_W = 640;
const VIEW_H = 320;
const PLOT_W = VIEW_W - MARGIN.left - MARGIN.right;
const PLOT_H = VIEW_H - MARGIN.top - MARGIN.bottom;

function svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    el.setAttribute(key, value);
  }
  return el;
}

function renderAxes(svg, ticks, maxValue, years) {
  const yScale = (v) => MARGIN.top + PLOT_H - (v / maxValue) * PLOT_H;
  const xStep = years.length > 1 ? PLOT_W / (years.length - 1) : 0;
  const xScale = (i) => MARGIN.left + i * xStep;

  for (const tick of ticks) {
    const y = yScale(tick);
    svg.appendChild(
      svgEl("line", {
        class: "grid-line",
        x1: MARGIN.left,
        x2: MARGIN.left + PLOT_W,
        y1: y,
        y2: y,
      })
    );
    const label = svgEl("text", { x: MARGIN.left - 10, y: y + 4, "text-anchor": "end" });
    label.textContent = compactFormatter.format(tick);
    svg.appendChild(label);
  }

  svg.appendChild(
    svgEl("line", {
      class: "axis-line",
      x1: MARGIN.left,
      x2: MARGIN.left + PLOT_W,
      y1: MARGIN.top + PLOT_H,
      y2: MARGIN.top + PLOT_H,
    })
  );

  years.forEach((year, i) => {
    const label = svgEl("text", { x: xScale(i), y: VIEW_H - 8, "text-anchor": "middle" });
    label.textContent = `${year}년`;
    svg.appendChild(label);
  });

  return { xScale, yScale };
}

function clearSvg(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function positionTooltip(tooltip, wrap, svg, cx, cy) {
  const scaleX = wrap.clientWidth / VIEW_W;
  const scaleY = (wrap.clientWidth * (VIEW_H / VIEW_W)) / VIEW_H;
  tooltip.style.left = `${cx * scaleX}px`;
  tooltip.style.top = `${cy * scaleY - 10}px`;
}

function renderAssetChart(projection) {
  const svg = els.assetChart;
  const wrap = svg.parentElement;
  const tooltip = els.assetTooltip;
  clearSvg(svg);

  const years = projection.map((p) => p.year);
  const maxAsset = Math.max(...projection.map((p) => p.asset));
  const ticks = niceTicks(maxAsset);
  const maxTick = ticks[ticks.length - 1];
  const { xScale, yScale } = renderAxes(svg, ticks, maxTick, years);

  const points = projection.map((p, i) => [xScale(i), yScale(p.asset)]);

  const areaPath = [
    `M ${points[0][0]} ${MARGIN.top + PLOT_H}`,
    ...points.map(([x, y]) => `L ${x} ${y}`),
    `L ${points[points.length - 1][0]} ${MARGIN.top + PLOT_H}`,
    "Z",
  ].join(" ");
  svg.appendChild(svgEl("path", { class: "series-area", d: areaPath }));

  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  svg.appendChild(svgEl("path", { class: "series-line", d: linePath }));

  const markers = points.map(([x, y]) =>
    svgEl("circle", { class: "series-marker", cx: x, cy: y, r: 4 })
  );
  markers.forEach((m) => svg.appendChild(m));

  const last = points[points.length - 1];
  const lastLabel = svgEl("text", {
    class: "direct-label",
    x: last[0],
    y: last[1] - 12,
    "text-anchor": "end",
  });
  lastLabel.textContent = formatCompactWon(projection[projection.length - 1].asset);
  svg.appendChild(lastLabel);

  const crosshair = svgEl("line", {
    class: "crosshair",
    x1: 0,
    x2: 0,
    y1: MARGIN.top,
    y2: MARGIN.top + PLOT_H,
  });
  crosshair.style.display = "none";
  svg.appendChild(crosshair);

  const catcher = svgEl("rect", {
    class: "hover-catcher",
    x: MARGIN.left,
    y: MARGIN.top,
    width: PLOT_W,
    height: PLOT_H,
  });
  svg.appendChild(catcher);

  catcher.addEventListener("mousemove", (evt) => {
    const rect = svg.getBoundingClientRect();
    const scale = VIEW_W / rect.width;
    const mouseX = (evt.clientX - rect.left) * scale;
    const xStep = years.length > 1 ? PLOT_W / (years.length - 1) : 0;
    const idx = xStep > 0
      ? Math.max(0, Math.min(years.length - 1, Math.round((mouseX - MARGIN.left) / xStep)))
      : 0;
    const [px, py] = points[idx];

    crosshair.setAttribute("x1", px);
    crosshair.setAttribute("x2", px);
    crosshair.style.display = "block";

    markers.forEach((m, i) => m.classList.toggle("is-hovered", i === idx));

    tooltip.innerHTML = `<strong>${projection[idx].year}년</strong><br />자산 ${formatWon(
      projection[idx].asset
    )}`;
    tooltip.hidden = false;
    positionTooltip(tooltip, wrap, svg, px, py);
  });

  catcher.addEventListener("mouseleave", () => {
    crosshair.style.display = "none";
    markers.forEach((m) => m.classList.remove("is-hovered"));
    tooltip.hidden = true;
  });
}

function renderDividendChart(projection) {
  const svg = els.dividendChart;
  const wrap = svg.parentElement;
  const tooltip = els.dividendTooltip;
  clearSvg(svg);

  const years = projection.map((p) => p.year);
  const maxDividend = Math.max(...projection.map((p) => p.dividend));
  const ticks = niceTicks(maxDividend);
  const maxTick = ticks[ticks.length - 1];
  const { xScale, yScale } = renderAxes(svg, ticks, maxTick, years);

  const bandWidth = years.length > 1 ? PLOT_W / years.length : PLOT_W;
  const barWidth = Math.min(24, bandWidth * 0.5);
  const gap = 2;
  const baseline = MARGIN.top + PLOT_H;

  const bars = projection.map((p, i) => {
    const centerX = xScale(i);
    const barHeight = baseline - yScale(p.dividend);
    const x = centerX - barWidth / 2 + gap / 2;
    const y = baseline - barHeight;
    const w = barWidth - gap;
    const r = 4;
    const h = Math.max(barHeight, 0.001);
    const path = svgEl("path", {
      class: "bar",
      d: `M ${x} ${y + r}
          A ${r} ${r} 0 0 1 ${x + r} ${y}
          L ${x + w - r} ${y}
          A ${r} ${r} 0 0 1 ${x + w} ${y + r}
          L ${x + w} ${y + h}
          L ${x} ${y + h}
          Z`,
    });
    svg.appendChild(path);
    return { el: path, x: centerX, y, year: p.year, dividend: p.dividend };
  });

  bars.forEach((bar) => {
    bar.el.addEventListener("mousemove", () => {
      bars.forEach((b) => b.el.classList.toggle("is-hovered", b === bar));
      tooltip.innerHTML = `<strong>${bar.year}년</strong><br />배당금 ${formatWon(bar.dividend)}`;
      tooltip.hidden = false;
      positionTooltip(tooltip, wrap, svg, bar.x, bar.y);
    });
    bar.el.addEventListener("mouseleave", () => {
      bar.el.classList.remove("is-hovered");
      tooltip.hidden = true;
    });
  });
}

function renderTable(container, projection) {
  container.innerHTML = "";
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr><th>연도</th><th>자산</th><th>배당금</th></tr>
    </thead>
    <tbody>
      ${projection
        .map((p) => `<tr><td>${p.year}년</td><td>${formatWon(p.asset)}</td><td>${formatWon(p.dividend)}</td></tr>`)
        .join("")}
    </tbody>
  `;
  container.appendChild(table);
}

function setupTableToggles(projection) {
  document.querySelectorAll(".table-toggle").forEach((btn) => {
    btn.onclick = () => {
      const target = btn.dataset.target;
      const wrap = document.getElementById(`${target}-chart-wrap`);
      const table = document.getElementById(`${target}-table`);
      const showTable = table.hidden;
      table.hidden = !showTable;
      wrap.hidden = showTable;
      btn.textContent = showTable ? "차트로 보기" : "표로 보기";
    };
  });
}

async function runSimulation(evt) {
  evt.preventDefault();
  showMessage("", false);
  els.submitBtn.disabled = true;
  els.submitBtn.textContent = "계산 중...";

  const payload = {
    etf_id: Number(els.etfSelect.value),
    initial_investment: Number(document.getElementById("initial-investment").value),
    monthly_contribution: Number(document.getElementById("monthly-contribution").value),
    investment_years: Number(document.getElementById("investment-years").value),
    expected_return: Number(document.getElementById("expected-return").value) / 100,
    dividend_policy: document.querySelector('input[name="dividend-policy"]:checked').value,
  };

  try {
    const res = await fetch(`${API_BASE}/simulations/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      throw new Error(detail?.detail ? JSON.stringify(detail.detail) : `요청 실패 (${res.status})`);
    }

    const result = await res.json();
    els.statFinalAsset.textContent = formatWon(result.final_asset);
    els.statTotalDividend.textContent = formatWon(result.total_dividend);

    renderAssetChart(result.yearly_projection);
    renderDividendChart(result.yearly_projection);
    renderTable(els.assetTable, result.yearly_projection);
    renderTable(els.dividendTable, result.yearly_projection);
    setupTableToggles(result.yearly_projection);

    els.results.hidden = false;
  } catch (err) {
    showMessage(err.message, true);
  } finally {
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = "시뮬레이션 실행";
  }
}

els.form.addEventListener("submit", runSimulation);

loadEtfs();
