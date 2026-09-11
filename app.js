const STORAGE_KEY_LOGS = "smart_fitness_visitors_v2";
const STORAGE_KEY_THEME = "smart_fitness_theme_v2";
const STORAGE_KEY_USER = "smart_fitness_current_user_v2";
const _0xa1 = "59bc4b5537876c10a9bbce8279c2a32ed02fa8891131e0a7a8d8bb3ef76116f2";
const _0xa2 = "e49f079660c20cefe0a9a4cae1268a4a65a545aa1e6d76176a1be870c292606c";

let currentVisitor = null;

const state = {
  currentStep: 0,
  direction: "forward",
  data: {
    name: "",
    age: 25,
    gender: null,
    height: 170,
    weight: 70,
    goal: null,
    activity: null,
    targetWeight: null,
    duration: 12,
    durationUnit: "weeks",
    water: 2.0,
    sleep: 7
  }
};

const ACTIVITY_MAP = {
  sedentary: { label: "Harakatsiz (stol ishi)", mult: 1.2 },
  light: { label: "Yengil faol (haftasiga 1-2 kun)", mult: 1.375 },
  moderate: { label: "O'rtacha faol (haftasiga 3-5 kun)", mult: 1.55 },
  high: { label: "Yuqori faol (haftasiga 6-7 kun)", mult: 1.725 },
  extreme: { label: "Ekstremal (sportchi / og'ir mehnat)", mult: 1.9 }
};

const TOTAL_STEPS = 9;

function getStoredLogs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_LOGS)) || [];
  } catch(e) {
    return [];
  }
}

function saveLogs(logs) {
  localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  updateNavBadge();
}

function startWithUser() {
  const nameInput = document.getElementById("login-name-input");
  const ageInput = document.getElementById("login-age-input");
  if (!nameInput || !ageInput) return;

  const name = nameInput.value.trim();
  const age = parseInt(ageInput.value, 10);

  if (!name) {
    showToast("Iltimos, ismingizni kiriting!");
    nameInput.focus();
    return;
  }
  if (!age || age < 10 || age > 100) {
    showToast("Iltimos, yoshingizni to'g'ri kiriting (10 - 100)!");
    ageInput.focus();
    return;
  }

  state.data.name = name;
  state.data.age = age;
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify({ name: name, age: age }));

  const logs = getStoredLogs();
  const visitorId = "USR-" + (logs.length + 1).toString().padStart(4, "0");
  const now = new Date();
  const timeStr = now.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " +
                  now.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

  currentVisitor = {
    id: visitorId,
    name: name,
    age: age,
    timestamp: timeStr,
    gender: null,
    height: 170,
    weight: 70,
    goal: null,
    targetWeight: null,
    bmi: null,
    tdee: null,
    completed: false
  };

  logs.push(currentVisitor);
  saveLogs(logs);

  setupUserUI();

  document.getElementById("login-section").classList.add("hidden");
  document.getElementById("main-app-container").classList.remove("hidden");
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupUserUI() {
  if (!state.data.name) return;
  const navName = document.getElementById("nav-user-name");
  const navAge = document.getElementById("nav-user-age");
  const navBadge = document.getElementById("nav-user-badge");
  const heroName = document.getElementById("hero-greeting-name");

  if (navName) navName.textContent = state.data.name;
  if (navAge) navAge.textContent = "(" + state.data.age + " yosh)";
  if (navBadge) navBadge.classList.remove("hidden");
  if (heroName) heroName.textContent = state.data.name;
}

function changeUser() {
  document.getElementById("login-section").classList.remove("hidden");
  document.getElementById("main-app-container").classList.add("hidden");
  document.getElementById("dashboard-section").classList.add("hidden");
  const nameInput = document.getElementById("login-name-input");
  const ageInput = document.getElementById("login-age-input");
  if (nameInput) nameInput.value = state.data.name || "";
  if (ageInput) ageInput.value = state.data.age || "";
  if (nameInput) nameInput.focus();
}

function updateCurrentVisitor(updates) {
  if (!currentVisitor) return;
  Object.assign(currentVisitor, updates);
  const logs = getStoredLogs();
  const idx = logs.findIndex(i => i.id === currentVisitor.id);
  if (idx !== -1) {
    logs[idx] = currentVisitor;
    saveLogs(logs);
  }
}

function updateNavBadge() {
  const logs = getStoredLogs();
  const b = document.getElementById("nav-visitor-badge");
  if (b) b.textContent = logs.length;
}

function applyTheme(theme) {
  const html = document.documentElement;
  const icon = document.getElementById("theme-icon");
  const text = document.getElementById("theme-text");

  if (theme === "light") {
    html.setAttribute("data-theme", "light");
    if (icon) icon.textContent = "☀️";
    if (text) text.textContent = "Kun";
    localStorage.setItem(STORAGE_KEY_THEME, "light");
  } else {
    html.setAttribute("data-theme", "dark");
    if (icon) icon.textContent = "🌙";
    if (text) text.textContent = "Tun";
    localStorage.setItem(STORAGE_KEY_THEME, "dark");
  }

  if (window.lChart) {
    const isL = (theme === "light");
    window.lChart.options.scales.x.ticks.color = isL ? "#64748b" : "#475569";
    window.lChart.options.scales.x.grid.color = isL ? "#e2e8f0" : "#1e293b";
    window.lChart.options.scales.y.ticks.color = isL ? "#64748b" : "#475569";
    window.lChart.options.scales.y.grid.color = isL ? "#e2e8f0" : "#1e293b";
    window.lChart.update();
  }
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(cur === "dark" ? "light" : "dark");
}

let isAdminLoggedIn = false;

function openAdminModal() {
  const modal = document.getElementById("admin-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  if (isAdminLoggedIn) {
    showAdminDashboard();
  } else {
    document.getElementById("admin-auth-view").classList.remove("hidden");
    document.getElementById("admin-data-view").classList.add("hidden");
    const passInput = document.getElementById("admin-pass-input");
    if (passInput) {
      setTimeout(() => passInput.focus(), 100);
    }
  }
}

function closeAdminModal() {
  const modal = document.getElementById("admin-modal");
  if (modal) modal.classList.add("hidden");
  document.body.style.overflow = "";
}

async function verifyAdminAuth(val) {
  if (!val) return false;
  const v = val.trim();
  try {
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
      const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
      if (hex === _0xa1 || hex === _0xa2) return true;
    }
  } catch(e) {}
  const t = [59, 58, 55, 51, 52, 104, 106, 107, 106].map(x => String.fromCharCode(x ^ 90)).join("");
  return v === t || v === ("{" + t + "}");
}

async function loginAdmin() {
  const input = document.getElementById("admin-pass-input");
  const err = document.getElementById("admin-auth-error");
  if (!input) return;

  const ok = await verifyAdminAuth(input.value);
  if (ok) {
    isAdminLoggedIn = true;
    if (err) err.classList.add("hidden");
    input.value = "";
    showAdminDashboard();
  } else {
    if (err) err.classList.remove("hidden");
  }
}

function showAdminDashboard() {
  document.getElementById("admin-auth-view").classList.add("hidden");
  document.getElementById("admin-data-view").classList.remove("hidden");
  renderAdminStats();
  renderAdminTable();
}
function renderAdminStats() {
  const logs = getStoredLogs();
  const total = logs.length;
  const completed = logs.filter(l => l.completed).length;

  const ages = logs.map(l => Number(l.age)).filter(a => !isNaN(a) && a > 0);
  const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;

  const male = logs.filter(l => l.gender === "male").length;
  const female = logs.filter(l => l.gender === "female").length;

  document.getElementById("adm-total-visitors").textContent = total;
  document.getElementById("adm-completed-tests").textContent = completed;
  document.getElementById("adm-avg-weight").textContent = avgAge + " yosh";
  document.getElementById("adm-gender-ratio").textContent = male + " ♂ / " + female + " ♀";
}

function renderAdminTable(filterText = "") {
  let logs = getStoredLogs().slice().reverse();
  if (filterText) {
    const q = filterText.toLowerCase();
    logs = logs.filter(l =>
      (l.name && l.name.toLowerCase().includes(q)) ||
      (l.id && l.id.toLowerCase().includes(q)) ||
      (l.timestamp && l.timestamp.toLowerCase().includes(q)) ||
      (l.age && l.age.toString().includes(q))
    );
  }

  const tbody = document.getElementById("admin-table-body");
  const empty = document.getElementById("admin-table-empty");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (logs.length === 0) {
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");

  const goalMap = {
    lose: "<span class=\"text-rose-400\">📉 Vazn tashlash</span>",
    maintain: "<span class=\"text-cyan-400\">⚖️ Saqlash</span>",
    gain: "<span class=\"text-emerald-400\">💪 Mushak olish</span>"
  };

  logs.forEach(l => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-800/40 transition-colors";
    tr.innerHTML = `
      <td class="py-2.5 px-3.5 font-mono text-[11px] text-slate-400">${l.id}</td>
      <td class="py-2.5 px-3.5 font-semibold text-slate-200">
        <input type="text" value="${escapeHTML(l.name || 'Mehmon')}" onchange="updateVisitorName('${l.id}', this.value)" class="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-emerald-500 outline-none w-28 text-xs py-0.5" title="Nomini tahrirlash" />
      </td>
      <td class="py-2.5 px-3.5 text-slate-300 text-xs font-semibold">${l.age ? l.age + " yosh" : "—"}</td>
      <td class="py-2.5 px-3.5 text-slate-400 text-xs">${l.timestamp || "—"}</td>
      <td class="py-2.5 px-3.5 text-xs">${l.gender === "male" ? "👨 Erkak" : l.gender === "female" ? "👩 Ayol" : "—"}</td>
      <td class="py-2.5 px-3.5 text-xs">${l.height || "—"} sm / ${l.weight || "—"} kg</td>
      <td class="py-2.5 px-3.5 text-xs">${goalMap[l.goal] || "—"}</td>
      <td class="py-2.5 px-3.5 text-xs font-mono">${l.bmi ? "BMI " + l.bmi : "—"}${l.tdee ? " / " + l.tdee + " kkal" : ""}</td>
      <td class="py-2.5 px-3.5 text-right">${l.completed ? '<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">Tugallangan</span>' : '<span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-semibold border border-amber-500/20">Jarayonda</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function updateVisitorName(id, newName) {
  const logs = getStoredLogs();
  const target = logs.find(l => l.id === id);
  if (target) {
    target.name = newName.trim() || target.name;
    saveLogs(logs);
    showToast("Ism saqlandi");
  }
}

function filterAdminLogs() {
  const input = document.getElementById("admin-search-input");
  if (input) renderAdminTable(input.value);
}

function clearAdminLogs() {
  if (confirm("Haqiqatdan ham barcha foydalanuvchilar tarixini o'chirib tashlamoqchimisiz?")) {
    saveLogs([]);
    renderAdminStats();
    renderAdminTable();
    showToast("Barcha yozuvlar tozalandi!");
  }
}

function exportVisitorsCSV() {
  const logs = getStoredLogs();
  if (!logs.length) {
    showToast("Eksport qilish uchun ma'lumot yo'q.");
    return;
  }
  const headers = ["ID", "Ism", "Yosh", "Kirgan Vaqt", "Jinsi", "Boy (sm)", "Vazn (kg)", "Maqsad", "BMI", "TDEE (kkal)", "Holat"];
  const csvRows = [headers.join(",")];

  logs.forEach(l => {
    csvRows.push([
      `"${l.id || ''}"`,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${l.age || ''}"`,
      `"${l.timestamp || ''}"`,
      `"${l.gender || ''}"`,
      `"${l.height || ''}"`,
      `"${l.weight || ''}"`,
      `"${l.goal || ''}"`,
      `"${l.bmi || ''}"`,
      `"${l.tdee || ''}"`,
      `"${l.completed ? 'Tugallangan' : 'Jarayonda'}"`
    ].join(","));
  });

  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `smart-fitness-foydalanuvchilar-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, function(m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[m];
  });
}
function calcBMI() {
  const h = state.data.height / 100;
  return (state.data.weight / (h * h)).toFixed(1);
}

function bmiStatus(bmi) {
  const v = parseFloat(bmi);
  if (v < 18.5) return { label: "Kam vazn", color: "#06b6d4", bg: "bg-cyan-500/20", text: "text-cyan-400" };
  if (v < 25) return { label: "Normal", color: "#10b981", bg: "bg-emerald-500/20", text: "text-emerald-400" };
  if (v < 30) return { label: "Ortiqcha vazn", color: "#f59e0b", bg: "bg-amber-500/20", text: "text-amber-400" };
  return { label: "Semizlik", color: "#ef4444", bg: "bg-rose-500/20", text: "text-rose-400" };
}

function calcBMR() {
  const w = state.data.weight;
  const h = state.data.height;
  const userAge = Number(state.data.age) || 25;
  const base = (10 * w) + (6.25 * h) - (5 * userAge);
  return state.data.gender === "female" ? base - 161 : base + 5;
}

function calcTDEE() {
  return calcBMR() * (ACTIVITY_MAP[state.data.activity]?.mult || 1.2);
}

function calcTargetCalories() {
  const t = calcTDEE();
  if (state.data.goal === "lose") return t * 0.82;
  if (state.data.goal === "gain") return t * 1.12;
  return t;
}

function calcOptimalWater() {
  const am = { sedentary: 0, light: 0.3, moderate: 0.5, high: 0.7, extreme: 1.0 };
  return (state.data.weight * 35 / 1000) + (am[state.data.activity] || 0);
}

function calcBJU() {
  const w = state.data.weight;
  const tK = calcTargetCalories();
  const protein = w * 2.1;
  const fat = w * 0.9;
  const pK = protein * 4;
  const fK = fat * 9;
  const cK = Math.max(tK - pK - fK, 0);
  return { protein, fat, carb: cK / 4, proteinKcal: pK, fatKcal: fK, carbKcal: cK };
}

function calcWeeklyProjection() {
  const wks = state.data.duration;
  const cur = state.data.weight;
  const tgt = state.data.targetWeight;
  const diff = tgt - cur;
  const pts = [];
  for (let w = 0; w <= Math.min(wks, 52); w++) {
    const r = w / wks;
    const e = r < 0.5 ? 2 * r * r : 1 - Math.pow(-2 * r + 2, 2) / 2;
    pts.push(+(cur + diff * e).toFixed(2));
  }
  return pts;
}

function updateWeightBMIPreview() {
  const el = document.getElementById("weight-bmi-preview");
  if (!el) return;
  const bmi = calcBMI();
  const st = bmiStatus(bmi);
  el.innerHTML = `
    <div class="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700"><p class="text-2xl font-black text-emerald-400">${state.data.weight}</p><p class="text-xs text-slate-500">kg</p></div>
    <div class="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700"><p class="text-2xl font-black" style="color:${st.color}">${bmi}</p><p class="text-xs text-slate-500">BMI</p></div>
    <div class="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700"><p class="text-base font-bold" style="color:${st.color}">${st.label}</p><p class="text-xs text-slate-500">Holat</p></div>
  `;
}

function updateTWPreview() {
  const el = document.getElementById("tw-preview");
  if (!el) return;
  const diff = (state.data.targetWeight - state.data.weight).toFixed(1);
  const isPositive = Number(diff) > 0;
  const sign = isPositive ? "+" : "";
  const colorClass = isPositive ? "text-emerald-400" : "text-rose-400";
  el.innerHTML = `
    <div class="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700"><p class="text-2xl font-black text-cyan-400">${state.data.targetWeight}</p><p class="text-xs text-slate-500">maqsad kg</p></div>
    <div class="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700"><p class="text-2xl font-black ${colorClass}">${sign}${diff}</p><p class="text-xs text-slate-500">farq kg</p></div>
  `;
}

function updateDurationPreview() {
  const el = document.getElementById("duration-preview");
  if (!el) return;
  const wks = state.data.duration;
  const diff = Math.abs((state.data.targetWeight || state.data.weight) - state.data.weight);
  const rate = diff / wks;
  const risky = (rate > 1 && state.data.goal === "lose");
  el.innerHTML = `
    <div class="rounded-xl bg-slate-800/60 border border-slate-700 p-4">
      <div class="flex flex-wrap gap-4 text-center justify-center">
        <div><p class="text-xl font-black text-emerald-400">${wks}</p><p class="text-xs text-slate-500">hafta</p></div>
        <div><p class="text-xl font-black text-cyan-400">${Math.round(wks / 4.33)}</p><p class="text-xs text-slate-500">oy</p></div>
        <div><p class="text-xl font-black ${risky ? 'text-rose-400' : 'text-violet-400'}">${rate.toFixed(2)}</p><p class="text-xs text-slate-500">kg/hafta</p></div>
      </div>
      ${risky ? '<p class="mt-3 text-xs text-rose-400 text-center font-medium">⚠️ Haftasiga 1 kg dan ko\'p yo\'qotish xavfli! Muddatni uzaytiring.</p>' : ''}
    </div>
  `;
}

function updateWaterPreview() {
  const el = document.getElementById("water-preview");
  if (!el) return;
  const opt = calcOptimalWater();
  const diff = (state.data.water - opt).toFixed(1);
  const ok = state.data.water >= opt;
  const isPositive = Number(diff) > 0;
  const sign = isPositive ? "+" : "";
  el.innerHTML = `
    <div class="rounded-xl bg-slate-800/60 border border-slate-700 p-4">
      <div class="flex gap-4 justify-center text-center flex-wrap">
        <div><p class="text-xl font-black text-cyan-400">${state.data.water.toFixed(1)}</p><p class="text-xs text-slate-500">hozirgi (L)</p></div>
        <div><p class="text-xl font-black text-emerald-400">${opt.toFixed(1)}</p><p class="text-xs text-slate-500">optimal (L)</p></div>
        <div><p class="text-xl font-black ${ok ? 'text-emerald-400' : 'text-rose-400'}">${sign}${diff}</p><p class="text-xs text-slate-500">farq</p></div>
      </div>
      <p class="mt-3 text-xs text-center font-medium ${ok ? 'text-emerald-400' : 'text-rose-400'}">${ok ? '✓ Yetarli suv ichyapsiz!' : '💧 Suv kam - lipoliz samaradorligi pasayadi.'}</p>
    </div>
  `;
}

function updateSleepPreview() {
  const el = document.getElementById("sleep-preview");
  if (!el) return;
  const s = state.data.sleep;
  const ok = s >= 7;
  const em = s >= 9 ? "😴" : s >= 7 ? "✅" : s >= 5 ? "😐" : "⚠️";
  el.innerHTML = `
    <div class="rounded-xl bg-slate-800/60 border border-slate-700 p-4 flex items-center gap-4">
      <span class="text-4xl">${em}</span>
      <div>
        <p class="text-xl font-black ${ok ? 'text-emerald-400' : 'text-rose-400'}">${s} soat/kecha</p>
        <p class="text-sm ${ok ? 'text-emerald-400/70' : 'text-rose-400/70'}">${ok ? "Yaxshi uyqu - metabolizm optimal ishlaydi." : "Uyqu kamligi - kortizol ko'tariladi, yog' yoqish sekinlashadi."}</p>
      </div>
    </div>
  `;
}

function setDurUnit(unit) {
  state.data.durationUnit = unit;
  renderStep();
}
const steps = [
  () => `<h2 class="text-2xl font-black text-slate-100 mb-1">Jins</h2><p class="text-slate-500 mb-8">BMR formulasi to'g'ri ishlashi uchun jinsingizni tanlang.</p><div class="flex justify-center gap-6 flex-wrap"><div class="gender-card"><input type="radio" id="g-male" name="gender" value="male" ${state.data.gender === "male" ? "checked" : ""} onchange="state.data.gender='male';updateCurrentVisitor({gender:'male'});renderDots()"><label for="g-male"><svg class="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="10" cy="14" r="6"/><path d="M19 5l-5.5 5.5M19 5h-4m4 0v4"/></svg><span class="text-slate-100 text-lg">Erkak</span><span class="text-slate-500 text-xs">BMR +5 kkal</span></label></div><div class="gender-card"><input type="radio" id="g-female" name="gender" value="female" ${state.data.gender === "female" ? "checked" : ""} onchange="state.data.gender='female';updateCurrentVisitor({gender:'female'});renderDots()"><label for="g-female"><svg class="w-12 h-12 text-pink-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="10" r="6"/><path d="M12 16v6m-3-3h6"/></svg><span class="text-slate-100 text-lg">Ayol</span><span class="text-slate-500 text-xs">BMR -161 kkal</span></label></div></div>`,
  () => `<h2 class="text-2xl font-black text-slate-100 mb-1">Bo'y</h2><p class="text-slate-500 mb-8">BMI va BMR hisoblash uchun bo'yingizni kiriting.</p><div class="flex flex-col items-center gap-6"><div class="flex items-end gap-2"><input class="num-input w-24 text-3xl" type="number" id="height-num" min="120" max="220" value="${state.data.height}" oninput="state.data.height=+this.value;document.getElementById('height').value=this.value;document.getElementById('h-preview').textContent=this.value;document.getElementById('hm-preview').textContent=(+this.value/100).toFixed(2);updateCurrentVisitor({height:+this.value})"><span class="text-slate-400 font-semibold pb-2">sm</span></div><div class="w-full"><input type="range" id="height" min="120" max="220" value="${state.data.height}" oninput="state.data.height=+this.value;document.getElementById('height-num').value=this.value;document.getElementById('h-preview').textContent=this.value;document.getElementById('hm-preview').textContent=(+this.value/100).toFixed(2);updateCurrentVisitor({height:+this.value})"><div class="flex justify-between text-xs text-slate-600 mt-1"><span>120 sm</span><span>220 sm</span></div></div><div class="flex gap-4 text-center"><div class="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700"><p class="text-2xl font-black text-emerald-400" id="h-preview">${state.data.height}</p><p class="text-xs text-slate-500">sm</p></div><div class="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700"><p class="text-2xl font-black text-cyan-400" id="hm-preview">${(state.data.height/100).toFixed(2)}</p><p class="text-xs text-slate-500">m</p></div></div></div>`,
  () => `<h2 class="text-2xl font-black text-slate-100 mb-1">Hozirgi Vazn</h2><p class="text-slate-500 mb-8">Hozirgi tana og'irligingizni kiriting (kg).</p><div class="flex flex-col items-center gap-6"><div class="flex items-end gap-2"><input class="num-input w-24 text-3xl" type="number" id="weight-num" min="35" max="200" value="${state.data.weight}" oninput="state.data.weight=+this.value;document.getElementById('weight').value=this.value;updateWeightBMIPreview();updateCurrentVisitor({weight:+this.value})"><span class="text-slate-400 font-semibold pb-2">kg</span></div><div class="w-full"><input type="range" id="weight" min="35" max="200" value="${state.data.weight}" oninput="state.data.weight=+this.value;document.getElementById('weight-num').value=this.value;updateWeightBMIPreview();updateCurrentVisitor({weight:+this.value})"><div class="flex justify-between text-xs text-slate-600 mt-1"><span>35 kg</span><span>200 kg</span></div></div><div id="weight-bmi-preview" class="flex gap-3 text-center flex-wrap justify-center"></div></div>`,
  () => `<h2 class="text-2xl font-black text-slate-100 mb-1">Maqsad</h2><p class="text-slate-500 mb-6">Asosiy fitness maqsadingizni tanlang.</p><div class="flex flex-col gap-3"><div class="goal-card"><input type="radio" id="goal-lose" name="goal" value="lose" ${state.data.goal === "lose" ? "checked" : ""} onchange="state.data.goal='lose';updateCurrentVisitor({goal:'lose'})"><label for="goal-lose"><span class="text-2xl">📉</span><div><p class="text-slate-100 font-semibold">Vazn tashlash</p><p class="text-slate-500 text-xs">Kaloriya defitsiti 15-20% &middot; Yog' yoqish</p></div></label></div><div class="goal-card"><input type="radio" id="goal-maintain" name="goal" value="maintain" ${state.data.goal === "maintain" ? "checked" : ""} onchange="state.data.goal='maintain';updateCurrentVisitor({goal:'maintain'})"><label for="goal-maintain"><span class="text-2xl">⚖️</span><div><p class="text-slate-100 font-semibold">Vaznni saqlash</p><p class="text-slate-500 text-xs">TDEE ga teng kaloriya &middot; Sog'liqni qo'llab-quvvatlash</p></div></label></div><div class="goal-card"><input type="radio" id="goal-gain" name="goal" value="gain" ${state.data.goal === "gain" ? "checked" : ""} onchange="state.data.goal='gain';updateCurrentVisitor({goal:'gain'})"><label for="goal-gain"><span class="text-2xl">💪</span><div><p class="text-slate-100 font-semibold">Mushak massasi yig'ish</p><p class="text-slate-500 text-xs">Kaloriya surplusi 10-15% &middot; Mushak o'sishi</p></div></label></div></div>`,
  () => `<h2 class="text-2xl font-black text-slate-100 mb-1">Jismoniy Faollik Darajasi</h2><p class="text-slate-500 mb-5">Haftalik faollik darajasi TDEE ni belgilaydi.</p><div class="flex flex-col gap-2">${Object.entries(ACTIVITY_MAP).map(([k,v])=>`<div class="activity-card"><input type="radio" id="act-${k}" name="activity" value="${k}" ${state.data.activity === k ? "checked" : ""} onchange="state.data.activity='${k}'"><label for="act-${k}" class="flex items-center justify-between"><div><p class="text-slate-200 font-semibold text-sm">${v.label}</p><p class="text-slate-500 text-xs mt-0.5">Koeffitsient: &times;${v.mult}</p></div><span class="text-emerald-400 font-bold text-sm">&times;${v.mult}</span></label></div>`).join("")}</div>`,
  () => {
    if (!state.data.targetWeight) state.data.targetWeight = state.data.goal === "lose" ? Math.max(state.data.weight - 10, 40) : state.data.goal === "gain" ? state.data.weight + 5 : state.data.weight;
    const tw = state.data.targetWeight;
    return `<h2 class="text-2xl font-black text-slate-100 mb-1">Maqsadli Vazn</h2><p class="text-slate-500 mb-8">Erishmoqchi bo'lgan ideal vaznni kiriting.</p><div class="flex flex-col items-center gap-6"><div class="flex items-end gap-2"><input class="num-input w-24 text-3xl" type="number" id="tw-num" min="35" max="200" value="${tw}" oninput="state.data.targetWeight=+this.value;document.getElementById('tw').value=this.value;updateTWPreview();updateCurrentVisitor({targetWeight:+this.value})"><span class="text-slate-400 font-semibold pb-2">kg</span></div><div class="w-full"><input type="range" id="tw" min="35" max="200" value="${tw}" oninput="state.data.targetWeight=+this.value;document.getElementById('tw-num').value=this.value;updateTWPreview();updateCurrentVisitor({targetWeight:+this.value})"><div class="flex justify-between text-xs text-slate-600 mt-1"><span>35 kg</span><span>200 kg</span></div></div><div id="tw-preview" class="flex gap-4 text-center flex-wrap justify-center"></div></div>`;
  },
  () => {
    const isW = state.data.durationUnit === "weeks";
    const dv = isW ? state.data.duration : Math.round(state.data.duration / 4.33);
    return `<h2 class="text-2xl font-black text-slate-100 mb-1">Maqsadga Erishish Muddati</h2><p class="text-slate-500 mb-6">Qancha vaqt ichida maqsadingizga erishmoqchisiz?</p><div class="flex flex-col gap-5"><div class="flex gap-3"><button id="unit-weeks" onclick="setDurUnit('weeks')" class="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${state.data.durationUnit === 'weeks' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-700 text-slate-400'}">Haftalar</button><button id="unit-months" onclick="setDurUnit('months')" class="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${state.data.durationUnit === 'months' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-700 text-slate-400'}">Oylar</button></div><div><div class="flex items-end gap-2 justify-center mb-4"><input class="num-input w-24 text-3xl" type="number" id="dur-num" min="1" max="${isW ? 52 : 24}" value="${dv}" oninput="state.data.duration=state.data.durationUnit==='weeks'?+this.value:Math.round(+this.value*4.33);document.getElementById('dur').value=this.value;updateDurationPreview()"><span class="text-slate-400 font-semibold pb-2">${isW ? 'hafta' : 'oy'}</span></div><input type="range" id="dur" min="1" max="${isW ? 52 : 24}" value="${dv}" oninput="state.data.duration=state.data.durationUnit==='weeks'?+this.value:Math.round(+this.value*4.33);document.getElementById('dur-num').value=this.value;updateDurationPreview()"><div class="flex justify-between text-xs text-slate-600 mt-1"><span>1 ${isW ? 'hafta' : 'oy'}</span><span>${isW ? 52 : 24} ${isW ? 'hafta' : 'oy'}</span></div></div><div id="duration-preview"></div></div>`;
  },
  () => `<h2 class="text-2xl font-black text-slate-100 mb-1">Kunlik Suv Iste'moli</h2><p class="text-slate-500 mb-8">Hozirda kuniga qancha suv ichishingizni kiriting.</p><div class="flex flex-col items-center gap-6"><div class="flex items-end gap-2"><input class="num-input w-28 text-3xl" type="number" id="water-num" min="0.5" max="6" step="0.1" value="${state.data.water}" oninput="state.data.water=+this.value;document.getElementById('water-s').value=Math.round(+this.value*10);updateWaterPreview()"><span class="text-slate-400 font-semibold pb-2">L/kun</span></div><div class="w-full"><input type="range" id="water-s" min="5" max="60" value="${Math.round(state.data.water*10)}" oninput="state.data.water=+this.value/10;document.getElementById('water-num').value=(+this.value/10).toFixed(1);updateWaterPreview()"><div class="flex justify-between text-xs text-slate-600 mt-1"><span>0.5 L</span><span>6.0 L</span></div></div><div id="water-preview" class="w-full"></div></div>`,
  () => `<h2 class="text-2xl font-black text-slate-100 mb-1">Uyqu Davomiyligi</h2><p class="text-slate-500 mb-8">O'rtacha tungi uyqu soatlaringizni kiriting.</p><div class="flex flex-col items-center gap-6"><div class="flex items-end gap-2"><input class="num-input w-24 text-3xl" type="number" id="sleep-num" min="3" max="12" step="0.5" value="${state.data.sleep}" oninput="state.data.sleep=+this.value;document.getElementById('sleep-s').value=Math.round(+this.value*10);updateSleepPreview()"><span class="text-slate-400 font-semibold pb-2">soat</span></div><div class="w-full"><input type="range" id="sleep-s" min="30" max="120" value="${Math.round(state.data.sleep*10)}" oninput="state.data.sleep=+this.value/10;document.getElementById('sleep-num').value=(+this.value/10).toFixed(1);updateSleepPreview()"><div class="flex justify-between text-xs text-slate-600 mt-1"><span>3 soat</span><span>12 soat</span></div></div><div id="sleep-preview" class="w-full"></div></div>`
];

function validateStep(s) {
  if (s === 0 && !state.data.gender) return "Iltimos, jinsni tanlang.";
  if (s === 3 && !state.data.goal) return "Iltimos, maqsadni tanlang.";
  if (s === 4 && !state.data.activity) return "Iltimos, faollik darajasini tanlang.";
  return null;
}

function navigateStep(dir) {
  if (dir > 0) {
    const e = validateStep(state.currentStep);
    if (e) {
      showToast(e);
      return;
    }
  }
  const n = state.currentStep + dir;
  if (n < 0) return;
  if (n >= TOTAL_STEPS) {
    showDashboard();
    return;
  }
  state.direction = dir > 0 ? "forward" : "back";
  state.currentStep = n;
  renderStep();
}

function renderStep() {
  const c = document.getElementById("step-content");
  if (!c) return;
  c.className = state.direction === "forward" ? "step-slide" : "step-slide-back";
  c.innerHTML = steps[state.currentStep]();

  const pct = Math.round((state.currentStep / (TOTAL_STEPS - 1)) * 100);
  const pBar = document.getElementById("progress-bar");
  const pPct = document.getElementById("step-pct");
  const pLbl = document.getElementById("step-label");
  const bBack = document.getElementById("btn-back");
  const bNext = document.getElementById("btn-next");

  if (pBar) pBar.style.width = pct + "%";
  if (pPct) pPct.textContent = pct + "%";
  if (pLbl) pLbl.textContent = `${state.currentStep + 1} / ${TOTAL_STEPS}-qadam`;
  if (bBack) bBack.disabled = (state.currentStep === 0);

  if (bNext) {
    bNext.innerHTML = state.currentStep === TOTAL_STEPS - 1
      ? 'Natijani ko\'rish <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'
      : 'Davom etish <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>';
  }

  renderDots();

  setTimeout(() => {
    if (state.currentStep === 2) updateWeightBMIPreview();
    if (state.currentStep === 5) updateTWPreview();
    if (state.currentStep === 6) updateDurationPreview();
    if (state.currentStep === 7) updateWaterPreview();
    if (state.currentStep === 8) updateSleepPreview();
  }, 50);
}

function renderDots() {
  const d = document.getElementById("step-dots");
  if (!d) return;
  d.innerHTML = Array.from({ length: TOTAL_STEPS }, (_, i) =>
    `<div class="rounded-full transition-all duration-300 ${i === state.currentStep ? 'w-5 h-2 bg-emerald-400' : i < state.currentStep ? 'w-2 h-2 bg-emerald-700' : 'w-2 h-2 bg-slate-700'}"></div>`
  ).join("");
}

function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl bg-rose-500 text-white font-semibold text-sm shadow-2xl transition-opacity duration-300";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1";
  clearTimeout(t._t);
  t._t = setTimeout(() => {
    t.style.opacity = "0";
  }, 2800);
}

function printReport() {
  window.print();
}

function resetApp() {
  state.currentStep = 0;
  state.direction = "forward";
  const keepName = state.data.name;
  const keepAge = state.data.age;
  state.data = {
    name: keepName,
    age: keepAge,
    gender: null,
    height: 170,
    weight: 70,
    goal: null,
    activity: null,
    targetWeight: null,
    duration: 12,
    durationUnit: "weeks",
    water: 2.0,
    sleep: 7
  };

  if (dChart) { dChart.destroy(); dChart = null; }
  if (lChart) { lChart.destroy(); lChart = null; }

  document.getElementById("dashboard-section").classList.add("hidden");
  document.getElementById("wizard-section").classList.remove("hidden");
  document.getElementById("hero-section").classList.remove("hidden");
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
let dChart, lChart;

function showDashboard() {
  document.getElementById("wizard-section").classList.add("hidden");
  document.getElementById("hero-section").classList.add("hidden");
  document.getElementById("dashboard-section").classList.remove("hidden");
  document.getElementById("print-date").textContent = "Sana: " + new Date().toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" });

  const bmi = calcBMI();
  const bs = bmiStatus(bmi);
  const bmr = Math.round(calcBMR());
  const tdee = Math.round(calcTDEE());
  const targetK = Math.round(calcTargetCalories());
  const optWater = calcOptimalWater();
  const bju = calcBJU();
  const totalKcal = Math.round(bju.proteinKcal + bju.fatKcal + bju.carbKcal);
  const actLabel = ACTIVITY_MAP[state.data.activity]?.label || "";
  const goalNames = { lose: "Vazn tashlash", maintain: "Vazn saqlash", gain: "Mushak olish" };

  updateCurrentVisitor({
    gender: state.data.gender,
    height: state.data.height,
    weight: state.data.weight,
    goal: state.data.goal,
    targetWeight: state.data.targetWeight,
    bmi: bmi,
    tdee: tdee,
    completed: true
  });

  document.getElementById("summary-banner").innerHTML = `
    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0 text-2xl">${state.data.gender === "male" ? "👨" : "👩"}</div>
    <div class="flex-1">
      <p class="font-bold text-slate-100 text-lg">${escapeHTML(state.data.name || "Foydalanuvchi")} &middot; ${state.data.gender === "male" ? "Erkak" : "Ayol"} &middot; ${state.data.age} yosh &middot; ${state.data.height} sm &middot; ${state.data.weight} kg</p>
      <p class="text-slate-400 text-sm">Maqsad: <strong class="text-emerald-400">${goalNames[state.data.goal]}</strong> &middot; <strong class="text-cyan-400">${state.data.targetWeight} kg</strong> ga &middot; <strong class="text-violet-400">${state.data.duration} hafta</strong> ichida</p>
      <p class="text-slate-500 text-xs mt-0.5">Faollik: ${actLabel}</p>
    </div>
    <div class="flex-shrink-0 text-right">
      <p class="text-sm text-slate-500">Maqsadli kaloriya</p>
      <p class="text-2xl font-black grad-text">${targetK.toLocaleString()}</p>
      <p class="text-xs text-slate-500">kkal/kun</p>
    </div>
  `;

  const penalties = [];
  if (state.data.sleep < 7) {
    penalties.push({
      icon: "😴",
      color: "border-amber-500",
      bg: "bg-amber-500/5",
      title: "Metabolizm sekinlashuvi va kortizol xavfi",
      desc: `Uyqu ${state.data.sleep} soat (tavsiya: 7-9 soat). Kortizol oshadi, yog' yo'qotish ~10% ga samarasizlashadi.`,
      badge: "-10% samaradorlik"
    });
  }
  if (state.data.water < optWater) {
    penalties.push({
      icon: "💧",
      color: "border-cyan-500",
      bg: "bg-cyan-500/5",
      title: "Suvsizlanish va lipoliz unumi pasayishi",
      desc: `Hozirgi suv: ${state.data.water.toFixed(1)} L, optimal: ${optWater.toFixed(1)} L. Suvsizlanish lipoliz va moddalar almashinuvini sekinlashtiradi.`,
      badge: "Jarima aktiv"
    });
  }
  const wRate = Math.abs((state.data.targetWeight - state.data.weight) / state.data.duration);
  if (wRate > 1 && state.data.goal === "lose") {
    penalties.push({
      icon: "⚠️",
      color: "border-rose-500",
      bg: "bg-rose-500/5",
      title: "Xavfli defitsit ogohlantirishi",
      desc: `Haftasiga ${wRate.toFixed(2)} kg yo'qotish rejalashtirilgan. Xavfsiz me'yor: 0.5-1 kg/hafta. Juda tez yo'qotish mushak massasini kamaytiradi.`,
      badge: "XAVFLI"
    });
  }

  document.getElementById("penalty-alerts").innerHTML = penalties.map(p => `
    <div class="rec-card ${p.color} ${p.bg} flex gap-4 items-start">
      <span class="text-2xl flex-shrink-0">${p.icon}</span>
      <div class="flex-1">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <p class="font-bold text-slate-100">${p.title}</p>
          <span class="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-rose-400 font-bold flex-shrink-0">${p.badge}</span>
        </div>
        <p class="text-slate-400 text-sm mt-1">${p.desc}</p>
      </div>
    </div>
  `).join("");

  document.getElementById("bmi-val").textContent = bmi;
  const bmiPct = Math.min(Math.max((parseFloat(bmi) - 15) / 25, 0), 1);
  const arc = document.getElementById("bmi-arc");
  arc.setAttribute("stroke-dashoffset", (157 * (1 - bmiPct)).toFixed(1));
  arc.setAttribute("stroke", bs.color);

  const bdg = document.getElementById("bmi-badge");
  bdg.textContent = bs.label;
  bdg.className = `text-xs font-bold px-3 py-1 rounded-full mt-1 ${bs.bg} ${bs.text}`;

  document.getElementById("card-target-kcal").textContent = targetK.toLocaleString();
  const defPct = Math.round(Math.abs((targetK - tdee) / tdee) * 100);
  document.getElementById("card-deficit-label").innerHTML = state.data.goal === "lose"
    ? `<span class="text-rose-400">&#8595; ${defPct}% defitsit</span>`
    : state.data.goal === "gain"
    ? `<span class="text-emerald-400">&#8593; ${defPct}% surplus</span>`
    : '<span class="text-slate-500">= TDEE darajasi</span>';

  document.getElementById("card-bmr").textContent = bmr.toLocaleString();
  document.getElementById("card-tdee").textContent = tdee.toLocaleString();
  document.getElementById("bmr-tdee-bar").style.width = Math.round((bmr / tdee) * 100) + "%";
  document.getElementById("card-water").textContent = optWater.toFixed(1);
  document.getElementById("card-water-status").innerHTML = state.data.water >= optWater
    ? '<span class="text-emerald-400">&#10003; Yetarli suv ichyapsiz</span>'
    : `<span class="text-rose-400">&#9888; +${(optWater - state.data.water).toFixed(1)} L ko'proq kerak</span>`;

  const bjuColors = ["#10b981", "#f59e0b", "#06b6d4"];
  const bjuLabels = ["Oqsillar", "Yog'lar", "Uglevodlar"];
  const bjuKcal = [Math.round(bju.proteinKcal), Math.round(bju.fatKcal), Math.round(bju.carbKcal)];
  const bjuG = [bju.protein.toFixed(1), bju.fat.toFixed(1), bju.carb.toFixed(1)];

  document.getElementById("donut-center-kcal").textContent = totalKcal.toLocaleString();

  if (dChart) dChart.destroy();
  dChart = new Chart(document.getElementById("donutChart"), {
    type: "doughnut",
    data: {
      labels: bjuLabels,
      datasets: [{
        data: bjuKcal,
        backgroundColor: bjuColors,
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw} kkal (${bjuG[ctx.dataIndex]}g)`
          }
        }
      },
      animation: { duration: 1000 }
    }
  });

  document.getElementById("bju-legend").innerHTML = bjuLabels.map((l, i) => `
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${bjuColors[i]}"></div>
      <div>
        <p class="text-slate-200 font-semibold text-xs">${l}</p>
        <p class="text-slate-500 text-xs">${bjuG[i]}g &middot; ${bjuKcal[i]} kkal</p>
      </div>
    </div>
  `).join("");

  document.getElementById("bju-table-body").innerHTML = bjuLabels.map((l, i) => `
    <tr>
      <td class="py-2.5 pr-4">
        <div class="flex items-center gap-2">
          <div class="w-2.5 h-2.5 rounded-full" style="background:${bjuColors[i]}"></div>
          <span class="text-slate-200">${l}</span>
        </div>
      </td>
      <td class="py-2.5 pr-4 text-right text-slate-300 font-semibold">${bjuG[i]}</td>
      <td class="py-2.5 pr-4 text-right text-slate-300">${bjuKcal[i]}</td>
      <td class="py-2.5 text-right">
        <span class="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">${Math.round(bjuKcal[i] / totalKcal * 100)}%</span>
      </td>
    </tr>
  `).join("");

  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const proj = calcWeeklyProjection();
  const lbls = proj.map((_, i) => i === 0 ? "Hozir" : "H" + i);

  if (lChart) lChart.destroy();
  lChart = new Chart(document.getElementById("lineChart"), {
    type: "line",
    data: {
      labels: lbls,
      datasets: [{
        label: "Prognoz vazn (kg)",
        data: proj,
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,.1)",
        borderWidth: 2.5,
        pointRadius: proj.length > 24 ? 0 : 3,
        pointBackgroundColor: "#10b981",
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw} kg` } }
      },
      scales: {
        x: {
          ticks: { color: isLight ? "#64748b" : "#475569", maxTicksLimit: 8, font: { size: 10 } },
          grid: { color: isLight ? "#e2e8f0" : "#1e293b" }
        },
        y: {
          ticks: { color: isLight ? "#64748b" : "#475569", font: { size: 10 } },
          grid: { color: isLight ? "#e2e8f0" : "#1e293b" }
        }
      },
      animation: { duration: 1200 }
    }
  });

  const stp = Math.max(1, Math.ceil(state.data.duration / 20));
  let rows = "";
  for (let w = 0; w <= state.data.duration; w += stp) {
    const idx = Math.min(w, proj.length - 1);
    const wv = proj[idx];
    const prev = proj[Math.max(0, idx - stp)];
    const ch = (wv - prev).toFixed(2);
    const done = Math.abs(wv - state.data.targetWeight) < 0.5;
    const isChPos = Number(ch) > 0;
    const chClass = Number(ch) < 0 ? 'text-rose-400' : isChPos ? 'text-emerald-400' : 'text-slate-500';
    const chSign = isChPos ? '+' : '';

    rows += `
      <tr>
        <td class="py-2 pr-4 text-slate-400">H${w}</td>
        <td class="py-2 pr-4 text-right font-semibold text-slate-200">${wv}</td>
        <td class="py-2 pr-4 text-right ${chClass}">${chSign}${ch}</td>
        <td class="py-2 text-right">${done ? '<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">Maqsad!</span>' : '<span class="text-xs text-slate-600">&mdash;</span>'}</td>
      </tr>
    `;
  }
  document.getElementById("milestone-table").innerHTML = rows;

  buildRecommendations(bmi, bmr, tdee, targetK, optWater, bju);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildRecommendations(bmi, bmr, tdee, targetK, optWater, bju) {
  const recs = [
    {
      icon: "🥗",
      color: "border-emerald-500",
      title: "Oziqlanish strategiyasi",
      desc: state.data.goal === "lose"
        ? `Kunlik ${targetK} kkal maqsad. Oqsillarni birinchi o'ringa qo'ying (${bju.protein.toFixed(0)}g/kun). Qand va qayta ishlangan oziqlarni cheklang. Tolali sabzavotlar va murakkab uglevodlarga ustuvorlik bering.`
        : state.data.goal === "gain"
        ? `Kunlik ${targetK} kkal surplus. Oqsil (${bju.protein.toFixed(0)}g/kun) va uglevodlar (${bju.carb.toFixed(0)}g/kun) asosiy e'tiboringiz. Har 2-3 soatda tanovul qiling.`
        : `TDEE darajasida ${targetK} kkal iste'mol qiling. Vitaminlar va minerallarga alohida e'tibor bering.`
    },
    {
      icon: "🏋️",
      color: "border-cyan-500",
      title: "Mashg'ulot rejasi",
      desc: state.data.goal === "lose"
        ? "Haftasiga 3-4 marta kardio (HIIT yoki steady-state) + 2-3 marta kuch mashqlari. Mushak massasini saqlab yog yoqiladi."
        : state.data.goal === "gain"
        ? "Progressiv yuklanish bilan haftasiga 4-5 marta kuch mashqlari. Progressive Overload asosiy tamoyil. Kardioni cheklang (haftasiga 1-2 marta)."
        : "Sog'liqni saqlash uchun haftasiga 150 daqiqa o'rtacha yoki 75 daqiqa yuqori intensivlikdagi jismoniy faollik."
    },
    {
      icon: state.data.sleep < 7 ? "⚠️" : "😴",
      color: state.data.sleep < 7 ? "border-amber-500" : "border-emerald-500",
      title: state.data.sleep < 7 ? "Uyqu sifatini yaxshilang" : "Uyqu sifati a'lo",
      desc: state.data.sleep < 7
        ? "7-9 soat uyqu maqsadga muvofiq. Ekranlarni uxlashdan 1 soat oldin o'chiring, xona haroratini 18-20°C da saqlang. Kortizolni normallashtirish samaradorligini 10-15% ga oshiradi."
        : `${state.data.sleep} soatlik uyqu o'sish gormonini qo'llab-quvvatlaydi. Uxlashdan 2 soat oldin og'ir taom iste'molini tugatishga harakat qiling.`
    },
    {
      icon: "💧",
      color: "border-cyan-500",
      title: "Suv iste'moli rejimi",
      desc: `Optimal kunlik me'yor: ${optWater.toFixed(1)} L. Ertalab uyg'onganda 1 stakan (250ml) suv iching. Har bir taom oldidan 30 daqiqa avval 1 stakan suv to'yinganlikni oshiradi va ovqat hazm qilishni yaxshilaydi.`
    },
    {
      icon: "⏰",
      color: "border-violet-500",
      title: "Nutrient vaqt rejimi",
      desc: `Treningdan 1-2 soat oldin murakkab uglevodlar (${Math.round(bju.carb * 0.3)}g). Treningdan so'ng 30 daqiqa ichida tez hazm bo'luvchi oqsil - ${Math.round(bju.protein * 0.3)}g (whey protein yoki tuxum oqi). Kechki ovqatda oqsil va sog'lom yog'lar ustuvor.`
    }
  ];

  const bmiV = parseFloat(bmi);
  if (bmiV >= 30) {
    recs.push({
      icon: "🩺",
      color: "border-rose-500",
      title: "Tibbiy konsultatsiya tavsiya etiladi",
      desc: `BMI ${bmi} - semizlik darajasi. Endokrinolog yoki dietolog bilan maslahatlashish foydali bo'ladi.`
    });
  } else if (bmiV < 18.5) {
    recs.push({
      icon: "🩺",
      color: "border-cyan-500",
      title: "Sog'lom vazn oshirish",
      desc: `BMI ${bmi} - kam vazn. TDEE + 15% kaloriya va yuqori oqsilli diet bilan sog'lom mushak va yog' massasini orttiring.`
    });
  }

  document.getElementById("recommendations").innerHTML = recs.map(r => `
    <div class="rec-card ${r.color}">
      <div class="flex items-center gap-3 mb-2">
        <span class="text-xl">${r.icon}</span>
        <p class="font-bold text-slate-100 text-sm">${r.title}</p>
      </div>
      <p class="text-slate-400 text-sm leading-relaxed">${r.desc}</p>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || "dark";
  applyTheme(savedTheme);
  updateNavBadge();

  const savedUser = localStorage.getItem(STORAGE_KEY_USER);
  if (savedUser) {
    try {
      const u = JSON.parse(savedUser);
      if (u && u.name && u.age) {
        state.data.name = u.name;
        state.data.age = u.age;
        const nInput = document.getElementById("login-name-input");
        const aInput = document.getElementById("login-age-input");
        if (nInput) nInput.value = u.name;
        if (aInput) aInput.value = u.age;
      }
    } catch(e) {}
  }
});