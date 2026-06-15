const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Tab switching
const tabs = document.querySelectorAll(".tab");
const tabPanels = {
  convert: document.getElementById("tab-convert"),
  rate: document.getElementById("tab-rate"),
  series: document.getElementById("tab-series"),
  currencies: document.getElementById("tab-currencies"),
};

let activeTab = "convert";

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    activeTab = tab.dataset.tab;
    Object.entries(tabPanels).forEach(([key, panel]) => {
      panel.style.display = key === activeTab ? "" : "none";
    });
    document.getElementById("output").innerHTML =
      '<p class="placeholder">Press the button to fetch data.</p>';
  });
});

// Status check
async function checkStatus() {
  const dot = document.getElementById("statusDot");
  try {
    const res = await fetch(`${API_BASE}/v1/health`, { signal: AbortSignal.timeout(3000) });
    dot.className = "status-dot " + (res.ok ? "ok" : "err");
    dot.title = res.ok ? "API is reachable" : "API returned an error";
  } catch {
    dot.className = "status-dot err";
    dot.title = "API is not reachable — start it with: pnpm --filter @openrates/api dev";
  }
}
checkStatus();
setInterval(checkStatus, 15000);

// Helpers
function qs(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== "" && v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  const json = await res.json();
  if (!json.success) throw json;
  return json.data;
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.textContent = loading ? "Loading…" : btn.dataset.label;
}

function renderOutput(html) {
  document.getElementById("output").innerHTML = html;
}

function copyableJson(label, obj) {
  const id = `json-${Math.random().toString(36).slice(2)}`;
  const json = JSON.stringify(obj, null, 2);
  setTimeout(() => {
    const btn = document.getElementById(`copy-${id}`);
    if (btn) {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(json).then(() => {
          btn.textContent = "Copied";
          setTimeout(() => (btn.textContent = "Copy"), 1500);
        });
      });
    }
  }, 0);
  return `
    <div class="json-block">
      <div class="json-block-header">
        <span>${label}</span>
        <button class="copy-btn" id="copy-${id}">Copy</button>
      </div>
      <pre>${escapeHtml(json)}</pre>
    </div>`;
}

function copyableText(label, text) {
  const id = `txt-${Math.random().toString(36).slice(2)}`;
  setTimeout(() => {
    const btn = document.getElementById(`copy-${id}`);
    if (btn) {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = "Copied";
          setTimeout(() => (btn.textContent = "Copy"), 1500);
        });
      });
    }
  }, 0);
  return `
    <div class="json-block">
      <div class="json-block-header">
        <span>${label}</span>
        <button class="copy-btn" id="copy-${id}">Copy</button>
      </div>
      <pre>${escapeHtml(text)}</pre>
    </div>`;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function confidenceBadge(label) {
  const cls = label === "high" ? "high" : label === "medium" ? "medium" : "low";
  return `<span class="badge ${cls}">confidence: ${label}</span>`;
}

function freshnessBadge(cls, isLive) {
  return `<span class="badge${isLive ? " live" : ""}">${cls}</span>`;
}

function renderWarnings(warnings) {
  if (!warnings?.length) return "";
  return `<div class="warnings">${warnings.map((w) => escapeHtml(w)).join("<br>")}</div>`;
}

function renderError(err) {
  const error = err?.error ?? err;
  return `<div class="error-box">
    <strong>${escapeHtml(error?.code ?? "ERROR")}</strong><br>
    ${escapeHtml(error?.message ?? String(err))}
    ${error?.suggestion ? `<br><em>${escapeHtml(error.suggestion)}</em>` : ""}
    ${error?.details?.candidates ? `<br>Candidates: ${error.details.candidates.join(", ")}` : ""}
  </div>`;
}

// Convert
const btnConvert = document.getElementById("btn-convert");
btnConvert.dataset.label = "Convert";
btnConvert.addEventListener("click", async () => {
  setLoading("btn-convert", true);
  const amount = document.getElementById("c-amount").value.trim();
  const from = document.getElementById("c-from").value.trim().toUpperCase();
  const to = document.getElementById("c-to").value.trim().toUpperCase();
  const date = document.getElementById("c-date").value.trim();
  const mode = document.getElementById("c-mode").value;
  const detail = document.getElementById("c-detail").value;
  const useCase = document.getElementById("c-usecase").value;
  const spread = document.getElementById("c-spread").value.trim();

  const body = { amount, from, to, date, mode, responseDetail: detail };
  if (useCase) body.useCase = useCase;
  if (spread) body.spreadPercentage = spread;

  const curl = `curl -X POST ${API_BASE}/v1/convert \\\n  -H "content-type: application/json" \\\n  -d '${JSON.stringify(body)}'`;

  try {
    const data = await apiFetch("/v1/convert", { method: "POST", body: JSON.stringify(body) });
    const rate = data.rate ?? data;
    renderOutput(`
      <h2>Result</h2>
      <div class="result-summary">
        <div class="amount">${escapeHtml(data.result?.roundedAmount ?? data.convertedAmount ?? "—")} ${escapeHtml(to)}</div>
        <div style="color:var(--muted);font-size:13px">from ${escapeHtml(amount)} ${escapeHtml(from)} at rate ${escapeHtml(rate?.rate ?? data.rate ?? "—")}</div>
        <div class="badges">
          ${freshnessBadge(rate?.freshnessClass ?? data.freshness ?? "", rate?.isLive ?? false)}
          ${confidenceBadge(rate?.confidenceLabel ?? data.confidence ?? "")}
          <span class="badge">${escapeHtml(rate?.rateType ?? data.rateType ?? "")}</span>
          <span class="badge">${escapeHtml(rate?.providerId ?? data.provider ?? "")}</span>
          <span class="badge">effective ${escapeHtml(rate?.effectiveDate ?? data.effectiveDate ?? "")}</span>
        </div>
      </div>
      ${renderWarnings(rate?.warnings ?? data.warnings)}
      ${copyableText("cURL", curl)}
      ${copyableJson("Full response", data)}
    `);
  } catch (err) {
    renderOutput(`<h2>Error</h2>${renderError(err)}${copyableText("cURL", curl)}`);
  }
  setLoading("btn-convert", false);
});

// Rate
const btnRate = document.getElementById("btn-rate");
btnRate.dataset.label = "Get rate";
btnRate.addEventListener("click", async () => {
  setLoading("btn-rate", true);
  const base = document.getElementById("r-base").value.trim().toUpperCase();
  const quote = document.getElementById("r-quote").value.trim().toUpperCase();
  const date = document.getElementById("r-date").value.trim();
  const mode = document.getElementById("r-mode").value;
  const detail = document.getElementById("r-detail").value;

  const params = qs({ base, quote, date, mode, responseDetail: detail });
  const url = `/v1/rates?${params}`;
  const curl = `curl "${API_BASE}${url}"`;

  try {
    const data = await apiFetch(url);
    renderOutput(`
      <h2>Rate</h2>
      <div class="result-summary">
        <div class="amount">${escapeHtml(base)}/${escapeHtml(quote)} = ${escapeHtml(data.rate ?? "—")}</div>
        <div class="badges">
          ${freshnessBadge(data.freshnessClass ?? "", data.isLive ?? false)}
          ${confidenceBadge(data.confidenceLabel ?? "")}
          <span class="badge">${escapeHtml(data.rateType ?? "")}</span>
          <span class="badge">${escapeHtml(data.providerId ?? "")}</span>
          <span class="badge">effective ${escapeHtml(data.effectiveDate ?? "")}</span>
          ${data.calculationMethod !== "direct" ? `<span class="badge">${escapeHtml(data.calculationMethod ?? "")}</span>` : ""}
        </div>
      </div>
      ${renderWarnings(data.warnings)}
      ${copyableText("cURL", curl)}
      ${copyableJson("Full response", data)}
    `);
  } catch (err) {
    renderOutput(`<h2>Error</h2>${renderError(err)}${copyableText("cURL", curl)}`);
  }
  setLoading("btn-rate", false);
});

// Series
const btnSeries = document.getElementById("btn-series");
btnSeries.dataset.label = "Get series";
btnSeries.addEventListener("click", async () => {
  setLoading("btn-series", true);
  const base = document.getElementById("s-base").value.trim().toUpperCase();
  const quote = document.getElementById("s-quote").value.trim().toUpperCase();
  const startDate = document.getElementById("s-start").value.trim();
  const endDate = document.getElementById("s-end").value.trim();
  const fillPolicy = document.getElementById("s-fill").value;

  const params = qs({ base, quote, startDate, endDate, fillPolicy });
  const url = `/v1/rates/series?${params}`;
  const curl = `curl "${API_BASE}${url}"`;

  try {
    const data = await apiFetch(url);
    const points = data.points ?? [];
    const tableRows = points
      .map(
        (p) =>
          `<tr><td>${escapeHtml(p.date)}</td><td>${escapeHtml(p.rate)}</td><td class="${p.filled ? "filled" : ""}">${p.filled ? "filled" : ""}</td></tr>`
      )
      .join("");
    renderOutput(`
      <h2>Series</h2>
      <div class="result-summary">
        <div style="font-size:13px;color:var(--muted)">${escapeHtml(base)}/${escapeHtml(quote)} — ${points.length} points — ${escapeHtml(data.providerId ?? "")}</div>
      </div>
      <div class="json-block" style="overflow:auto;max-height:360px">
        <table class="series-table">
          <thead><tr><th>Date</th><th>Rate</th><th>Note</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      ${copyableText("cURL", curl)}
      ${copyableJson("Full response", data)}
    `);
  } catch (err) {
    renderOutput(`<h2>Error</h2>${renderError(err)}${copyableText("cURL", curl)}`);
  }
  setLoading("btn-series", false);
});

// Currencies
const btnCurrencies = document.getElementById("btn-currencies");
btnCurrencies.dataset.label = "Search currencies";
btnCurrencies.addEventListener("click", async () => {
  setLoading("btn-currencies", true);
  const query = document.getElementById("cur-query").value.trim();
  const status = document.getElementById("cur-status").value;

  const params = qs({ query, status });
  const url = `/v1/currencies${params ? "?" + params : ""}`;
  const curl = `curl "${API_BASE}${url}"`;

  try {
    const data = await apiFetch(url);
    const currencies = data.currencies ?? [];
    const rows = currencies
      .map(
        (c) =>
          `<tr><td><strong>${escapeHtml(c.code)}</strong></td><td>${escapeHtml(c.name)}</td><td style="color:var(--muted)">${c.minorUnits ?? "—"}</td><td style="color:var(--muted)">${escapeHtml(c.status ?? "")}</td></tr>`
      )
      .join("");
    renderOutput(`
      <h2>Currencies (${currencies.length})</h2>
      <div class="json-block" style="overflow:auto;max-height:480px">
        <table class="series-table">
          <thead><tr><th>Code</th><th>Name</th><th>Minor units</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${copyableText("cURL", curl)}
    `);
  } catch (err) {
    renderOutput(`<h2>Error</h2>${renderError(err)}${copyableText("cURL", curl)}`);
  }
  setLoading("btn-currencies", false);
});
