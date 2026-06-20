// Finance Tracker — lógica del frontend.
// Habla con el backend Flask en localhost:5000.

const API_BASE = "http://localhost:5000";

// Presupuestos mensuales de referencia por categoría (en CAD).
const BUDGETS = {
  Groceries: 700,
  Entertainment: 300,
  "Fixed & Home": 2700,
  Medical: 250,
  Pets: 150,
  Transportation: 250,
  Others: 200,
};

// Orden EXACTO en que se muestran las categorías.
const CATEGORY_ORDER = [
  "Groceries",
  "Entertainment",
  "Fixed & Home",
  "Medical",
  "Pets",
  "Transportation",
  "Others",
];

// --- Helpers --------------------------------------------------------------

// Formatea un número como moneda CAD: 1234.5 -> "$1,234.50".
function formatCAD(value) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

// Convierte el campo "Amount (CAD)" (que puede venir como string) a número.
function parseAmount(raw) {
  const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// ¿La fecha (YYYY-MM-DD) cae en el mes y año actuales?
function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

// Devuelve la fecha de hoy como YYYY-MM-DD (para el valor por defecto del form).
function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

// Datos del avatar según el dueño.
function avatarFor(owner) {
  if (owner === "Santiago") return { cls: "s", text: "S" };
  if (owner === "Carolina") return { cls: "c", text: "C" };
  return { cls: "joint", text: "J" }; // Joint
}

// --- Render: resumen del mes ---------------------------------------------

function renderSummary(transactions) {
  // Solo gastos (montos negativos) de este mes.
  const expensesThisMonth = transactions.filter(
    (t) => isThisMonth(t["Date"]) && parseAmount(t["Amount (CAD)"]) < 0
  );

  // Total gastado (lo mostramos como positivo).
  const total = expensesThisMonth.reduce(
    (sum, t) => sum + Math.abs(parseAmount(t["Amount (CAD)"])),
    0
  );
  document.getElementById("month-total").textContent = formatCAD(total);

  // Gasto acumulado por categoría.
  const byCategory = {};
  for (const cat of CATEGORY_ORDER) byCategory[cat] = 0;
  for (const t of expensesThisMonth) {
    const cat = t["App Category"] || t["Raw Category"];
    if (cat in byCategory) {
      byCategory[cat] += Math.abs(parseAmount(t["Amount (CAD)"]));
    }
  }

  // Una fila con barra de progreso por categoría.
  const container = document.getElementById("category-breakdown");
  container.innerHTML = "";

  for (const cat of CATEGORY_ORDER) {
    const spent = byCategory[cat];
    const budget = BUDGETS[cat] || 0;
    const ratio = budget > 0 ? spent / budget : 0;
    const pct = Math.min(ratio * 100, 100);

    // Verde por defecto; ámbar cerca del límite; rojo solo si se pasó.
    let fillClass = "cat-bar-fill";
    if (ratio > 1) fillClass += " is-over";
    else if (ratio >= 0.8) fillClass += " is-warning";

    const row = document.createElement("div");
    row.className = "cat-row";
    row.innerHTML = `
      <span class="cat-name">${cat}</span>
      <span class="cat-amount">${formatCAD(spent)} / ${formatCAD(budget)}</span>
      <div class="cat-bar"><div class="${fillClass}" style="width: ${pct}%"></div></div>
    `;
    container.appendChild(row);
  }
}

// --- Render: transacciones recientes -------------------------------------

function renderTransactions(transactions) {
  const list = document.getElementById("transactions-list");
  list.innerHTML = "";

  if (transactions.length === 0) {
    list.innerHTML = '<li class="empty">Todavía no hay transacciones.</li>';
    return;
  }

  // Últimas 20, más recientes primero (asumimos que se agregan en orden).
  const recent = transactions.slice(-20).reverse();

  for (const t of recent) {
    const amount = parseAmount(t["Amount (CAD)"]);
    const isIncome = amount > 0;
    const { cls, text } = avatarFor(t["Owner"]);
    const needsReview = String(t["Needs Review"]).toLowerCase() === "yes";
    const category = t["App Category"] || t["Raw Category"] || "";

    const li = document.createElement("li");
    li.className = "txn" + (needsReview ? " needs-review" : "");
    li.innerHTML = `
      <span class="avatar ${cls}">${text}</span>
      <div class="txn-main">
        <div class="txn-merchant">${t["Merchant"] || "—"}</div>
        <div class="txn-meta">${t["Date"] || ""} · ${category}</div>
      </div>
      <span class="txn-amount ${isIncome ? "income" : "expense"}">${formatCAD(amount)}</span>
    `;
    list.appendChild(li);
  }
}

// --- Carga de datos -------------------------------------------------------

async function loadTransactions() {
  try {
    const res = await fetch(`${API_BASE}/api/transactions`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderSummary(data);
    renderTransactions(data);
  } catch (err) {
    document.getElementById("transactions-list").innerHTML =
      '<li class="empty">No se pudo conectar con el backend (¿está corriendo en localhost:5000?).</li>';
    console.error(err);
  }
}

// --- Alta de transacción --------------------------------------------------

async function handleSubmit(event) {
  event.preventDefault();

  const btn = document.getElementById("submit-btn");
  const status = document.getElementById("form-status");

  const payload = {
    date: document.getElementById("date").value,
    amount: document.getElementById("amount").value,
    category: document.getElementById("category").value,
    merchant: document.getElementById("merchant").value,
    owner: document.getElementById("owner").value,
    // Campos que el backend acepta pero que el form no usa por ahora.
    account: "",
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
      document.getElementById("date").value = todayISO();
      await loadTransactions(); // refrescar resumen y lista
    } else {
      throw new Error("La respuesta no indicó éxito.");
    }
  } catch (err) {
    status.className = "form-status error";
    status.textContent = "Error al guardar. Revisá que el backend esté corriendo.";
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}

// --- Init -----------------------------------------------------------------

document.getElementById("date").value = todayISO();
document.getElementById("transaction-form").addEventListener("submit", handleSubmit);
loadTransactions();
