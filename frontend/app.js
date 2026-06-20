// Finance Tracker — dashboard.
// Toma los datos reales del Sheet (vía backend Flask) y llena la UI.

// Vacío = mismo origen (el backend Flask sirve también el frontend).
// En desarrollo local con el frontend abierto aparte, usar "http://localhost:5000".
const API_BASE = "";

// Presupuestos mensuales de referencia por categoría (CAD).
const BUDGETS = {
  Groceries: 700,
  Entertainment: 300,
  "Fixed & Home": 2700,
  Medical: 250,
  Pets: 150,
  Transportation: 250,
  Others: 200,
};

const CATEGORY_ORDER = [
  "Groceries",
  "Entertainment",
  "Fixed & Home",
  "Medical",
  "Pets",
  "Transportation",
  "Others",
];

// Metas de ahorro: target fijo + subcategoría del Sheet que las alimenta.
// (Los montos ahorrados salen de transacciones con App Category = "Savings".)
const SAVINGS_GOALS = [
  { name: "Fondo de vacaciones", target: 5000, match: "Vacation Fund" },
];

// Paleta para el donut de presupuesto.
const DONUT_COLORS = [
  "#7b61ff", "#9b87ff", "#b9abff", "#c9bdff",
  "#d9d0ff", "#6a4ef0", "#8f7bf5",
];

// --- Helpers --------------------------------------------------------------

function formatCAD(value) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

// Devuelve { int: "$15,700", cents: ".00" } para mostrar los centavos chicos.
function moneyParts(value) {
  const full = formatCAD(value);
  const i = full.lastIndexOf(".");
  return i === -1
    ? { int: full, cents: "" }
    : { int: full.slice(0, i), cents: full.slice(i) };
}

// Amount puede venir como número (-87.43) o string contable ("($87.43)").
function parseAmount(raw) {
  if (typeof raw === "number") return raw;
  const s = String(raw).trim();
  const negative = s.includes("(") || s.startsWith("-");
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  const value = Number.isFinite(n) ? n : 0;
  return negative ? -value : value;
}

// Date puede ser texto ("2025-06-01") o ISO ("2025-06-20T07:00:00.000Z").
function formatDate(raw) {
  return String(raw || "").slice(0, 10);
}

// Recibe la transacción y devuelve su mes (YYYY-MM).
function monthKey(t) {
  return formatDate(t["Date"]).slice(0, 7);
}

function avatarFor(owner) {
  if (owner === "Santiago") return { cls: "s", text: "S" };
  if (owner === "Carolina") return { cls: "c", text: "C" };
  return { cls: "joint", text: "J" };
}

function amt(t) {
  return parseAmount(t["Amount (CAD)"]);
}

function category(t) {
  return t["App Category"] || t["Raw Category"] || "";
}

// --- KPIs -----------------------------------------------------------------

function setKpi(id, value) {
  const { int, cents } = moneyParts(value);
  document.getElementById(id).innerHTML = `${int}<span class="cents">${cents}</span>`;
}

function renderKpis(txns) {
  const income = txns.filter((t) => amt(t) > 0).reduce((s, t) => s + amt(t), 0);
  const expense = txns
    .filter((t) => amt(t) < 0)
    .reduce((s, t) => s + Math.abs(amt(t)), 0);
  const savings = txns
    .filter((t) => category(t) === "Savings")
    .reduce((s, t) => s + amt(t), 0);
  const balance = income - expense;

  setKpi("kpi-balance", balance);
  setKpi("kpi-income", income);
  setKpi("kpi-expense", expense);
  setKpi("kpi-savings", savings);

  // "vs mes anterior" solo si hay al menos dos meses en la data.
  renderDeltas(txns);
}

function renderDeltas(txns) {
  const months = [...new Set(txns.map((t) => monthKey(t)))].sort();
  const cells = {
    "kpi-balance-delta": "",
    "kpi-income-delta": "",
    "kpi-expense-delta": "",
    "kpi-savings-delta": "",
  };

  if (months.length >= 2) {
    const cur = months[months.length - 1];
    const prev = months[months.length - 2];
    const sum = (m, pred) =>
      txns.filter((t) => monthKey(t) === m && pred(t)).reduce((s, t) => s + Math.abs(amt(t)), 0);

    const pct = (a, b) => (b === 0 ? null : ((a - b) / b) * 100);
    const badge = (p) => {
      if (p === null) return "";
      const dir = p >= 0 ? "up" : "down";
      const arrow = p >= 0 ? "▲" : "▼";
      return `<span class="${dir}">${arrow} ${Math.abs(p).toFixed(1)}%</span> vs mes anterior`;
    };

    cells["kpi-income-delta"] = badge(
      pct(sum(cur, (t) => amt(t) > 0), sum(prev, (t) => amt(t) > 0))
    );
    cells["kpi-expense-delta"] = badge(
      pct(sum(cur, (t) => amt(t) < 0), sum(prev, (t) => amt(t) < 0))
    );
  } else {
    // Una sola ventana de datos: lo indicamos en vez de inventar un %.
    const note = "Datos de un solo período";
    cells["kpi-balance-delta"] = note;
  }

  for (const [id, html] of Object.entries(cells)) {
    document.getElementById(id).innerHTML = html;
  }
}

// --- Gráfico de flujo de dinero ------------------------------------------

let flowChart, budgetChart;

function renderFlow(txns) {
  const months = [...new Set(txns.map((t) => monthKey(t)))].sort();
  const income = months.map((m) =>
    txns.filter((t) => monthKey(t) === m && amt(t) > 0).reduce((s, t) => s + amt(t), 0)
  );
  const expense = months.map((m) =>
    txns.filter((t) => monthKey(t) === m && amt(t) < 0).reduce((s, t) => s + Math.abs(amt(t)), 0)
  );

  const ctx = document.getElementById("flow-chart");
  if (flowChart) flowChart.destroy();
  flowChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        { label: "Ingresos", data: income, backgroundColor: "#7b61ff", borderRadius: 6, maxBarThickness: 26 },
        { label: "Gastos", data: expense, backgroundColor: "#c9bdff", borderRadius: 6, maxBarThickness: 26 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#9a99b3" } },
        y: {
          grid: { color: "rgba(154,153,179,0.15)" },
          ticks: { color: "#9a99b3", callback: (v) => "$" + v.toLocaleString() },
        },
      },
    },
  });
}

// --- Donut de presupuesto -------------------------------------------------

function renderBudget(txns) {
  const byCat = {};
  for (const cat of CATEGORY_ORDER) byCat[cat] = 0;
  for (const t of txns) {
    if (amt(t) < 0 && category(t) in byCat) {
      byCat[category(t)] += Math.abs(amt(t));
    }
  }

  const entries = CATEGORY_ORDER.map((c) => [c, byCat[c]]).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  document.getElementById("budget-total").textContent = formatCAD(total);

  const ctx = document.getElementById("budget-chart");
  if (budgetChart) budgetChart.destroy();
  budgetChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: entries.map(([c]) => c),
      datasets: [
        {
          data: entries.map(([, v]) => v),
          backgroundColor: DONUT_COLORS,
          borderWidth: 0,
          cutout: "72%",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });

  const legend = document.getElementById("budget-legend");
  legend.innerHTML = entries
    .map(
      ([c, v], i) => `
      <li>
        <i class="dot" style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></i>
        ${c}
        <span class="legend-amt">${formatCAD(v)}</span>
      </li>`
    )
    .join("");
}

// --- Tabla de transacciones ----------------------------------------------

function renderTransactions(txns) {
  const tbody = document.getElementById("txn-rows");
  if (txns.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Sin transacciones.</td></tr>';
    return;
  }

  const recent = txns.slice(-8).reverse();
  tbody.innerHTML = recent
    .map((t) => {
      const a = amt(t);
      const isIncome = a > 0;
      const { cls, text } = avatarFor(t["Owner"]);
      const review =
        String(t["Needs Review"]).toLowerCase() === "yes"
          ? '<span class="review-flag" title="Necesita revisión"></span>'
          : "";
      return `
        <tr>
          <td>${formatDate(t["Date"])}</td>
          <td class="${isIncome ? "amt-income" : "amt-expense"}">${formatCAD(a)}</td>
          <td>
            <span class="txn-name">
              <span class="avatar ${cls}">${text}</span>
              ${t["Merchant"] || "—"}${review}
            </span>
          </td>
          <td>${t["Account"] || "—"}</td>
          <td><span class="pill">${category(t)}</span></td>
        </tr>`;
    })
    .join("");
}

// --- Metas de ahorro ------------------------------------------------------

function renderGoals(txns) {
  const list = document.getElementById("goals-list");
  list.innerHTML = SAVINGS_GOALS.map((g) => {
    const saved = txns
      .filter((t) => category(t) === "Savings" && t["App Subcategory"] === g.match)
      .reduce((s, t) => s + amt(t), 0);
    const pct = g.target > 0 ? Math.min((saved / g.target) * 100, 100) : 0;
    return `
      <li>
        <div class="goal-top">
          <span>${g.name}</span>
          <span class="goal-target">${formatCAD(g.target)}</span>
        </div>
        <div class="goal-bar"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
        <div class="goal-pct">${formatCAD(saved)} ahorrados · ${pct.toFixed(0)}%</div>
      </li>`;
  }).join("");
}

// --- Período --------------------------------------------------------------

function renderPeriod(txns) {
  const months = [...new Set(txns.map((t) => monthKey(t)))].sort();
  const label =
    months.length === 0
      ? "Sin datos"
      : months.length === 1
      ? months[0]
      : `${months[0]} – ${months[months.length - 1]}`;
  document.getElementById("period-label").textContent = label;
}

// --- Carga --------------------------------------------------------------

async function loadData() {
  try {
    const res = await fetch(`${API_BASE}/api/transactions`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const txns = await res.json();

    renderPeriod(txns);
    renderKpis(txns);
    renderFlow(txns);
    renderBudget(txns);
    renderTransactions(txns);
    renderGoals(txns);
  } catch (err) {
    document.getElementById("txn-rows").innerHTML =
      '<tr><td colspan="5" class="empty">No se pudo conectar con el backend.</td></tr>';
    console.error(err);
  }
}

// --- Modal + alta de transacción -----------------------------------------

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

const modal = document.getElementById("modal");

function openModal() {
  document.getElementById("date").value = todayISO();
  document.getElementById("form-status").textContent = "";
  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
}

async function handleSubmit(event) {
  event.preventDefault();
  const btn = document.getElementById("submit-btn");
  const status = document.getElementById("form-status");

  const payload = {
    date: document.getElementById("date").value,
    amount: document.getElementById("amount").value,
    category: document.getElementById("category").value,
    merchant: document.getElementById("merchant").value,
    account: document.getElementById("account").value,
    owner: document.getElementById("owner").value,
    subcategory: "",
    description: "",
  };

  btn.disabled = true;
  status.className = "form-status";
  status.textContent = "Guardando…";

  try {
    const res = await fetch(`${API_BASE}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (result.success) {
      status.className = "form-status ok";
      status.textContent = `Guardado ✓ (${result.transaction_id})`;
      event.target.reset();
      await loadData();
      setTimeout(closeModal, 800);
    } else {
      throw new Error(result.error || "respuesta sin éxito");
    }
  } catch (err) {
    status.className = "form-status error";
    status.textContent = "Error al guardar. Revisa que el backend esté disponible.";
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}

// --- Tema -----------------------------------------------------------------

function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
}

// --- Init -----------------------------------------------------------------

document.getElementById("open-form").addEventListener("click", openModal);
document.getElementById("close-form").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.getElementById("transaction-form").addEventListener("submit", handleSubmit);
document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

if (window.lucide) lucide.createIcons();
loadData();
