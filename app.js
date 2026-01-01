/* =========================
   Idiot-proof boot + guards
   ========================= */

(function bootGuard() {
  // If app.js is running at all, show it in the console.
  console.log("[HabitCalendar] app.js loaded");

  // Basic DOM guard (helps catch mismatched index.html)
  const requiredIds = [
    "calendar","selectedDateTitle","checklist","daySummary",
    "markAllBtn","clearDayBtn","todayBtn",
    "weeklyCompletion","weeklyCompletionMeta","currentStreak","bestStreak",
    "reportRangeSelect","refreshReportBtn","reportSummary","reportList",
    "editTemplateBtn","templateModal","modalBackdrop","closeModalBtn",
    "cancelModalBtn","saveTemplateBtn","resetTemplateBtn","dayTabs",
    "editorDayName","taskEditorList","addTaskBtn",
    "exportBtn","importInput","wipeBtn"
  ];

  const missing = requiredIds.filter(id => !document.getElementById(id));
  if (missing.length) {
    document.body.innerHTML =
      `<div style="padding:16px;font-family:system-ui;color:#fff;background:#111;">
        <h2>App setup error</h2>
        <p>These elements are missing from <code>index.html</code>:</p>
        <pre style="white-space:pre-wrap;background:#222;padding:12px;border-radius:8px;">${missing.join(", ")}</pre>
        <p><strong>Fix:</strong> replace <code>index.html</code> with the fresh version I provided.</p>
      </div>`;
    throw new Error("Missing DOM IDs: " + missing.join(", "));
  }
})();

/* =========================
   Storage keys
   ========================= */

const STORAGE_KEY = "habitCalendar.v2";
const FIRST_DAY_OF_WEEK = 1; // Monday

/* =========================
   Default weekly template (your schedule)
   ========================= */

const defaultTemplate = {
  1: [ // Mon
    { id: "am_cycling", time: "AM", label: "Cycling", meta: "45 min" },
    { id: "pm_strength", time: "PM", label: "Strength training", meta: "5–10 min" },
    { id: "pm_stretching", time: "PM", label: "Stretching", meta: "10 min" },
    { id: "pm_breath", time: "PM", label: "Breathwork / embodiment", meta: "30 min" },
    { id: "pm_read", time: "PM", label: "Read", meta: "10 pages (night)" },
  ],
  2: [ // Tue
    { id: "am_egoscue", time: "AM", label: "Egoscue", meta: "10 min" },
    { id: "am_stretching", time: "AM", label: "Stretching", meta: "10 min" },
    { id: "pm_strength", time: "PM", label: "Strength training", meta: "5–10 min" },
    { id: "pm_bedmassage", time: "PM", label: "Bed of Nails + Massage", meta: "45 min" },
    { id: "pm_read", time: "PM", label: "Read", meta: "10 pages (night)" },
  ],
  3: [ // Wed
    { id: "am_cycling", time: "AM", label: "Cycling", meta: "45 min" },
    { id: "pm_strength", time: "PM", label: "Strength training", meta: "5–10 min" },
    { id: "pm_stretching", time: "PM", label: "Stretching", meta: "10 min" },
    { id: "pm_egoscue", time: "PM", label: "Egoscue", meta: "10 min" },
    { id: "pm_read", time: "PM", label: "Read", meta: "10 pages (night)" },
  ],
  4: [ // Thu
    { id: "am_egoscue", time: "AM", label: "Egoscue", meta: "10 min" },
    { id: "am_stretching", time: "AM", label: "Stretching", meta: "10 min" },
    { id: "pm_bedmassage", time: "PM", label: "Bed of Nails + Massage", meta: "45 min" },
    { id: "pm_breath", time: "PM", label: "Breathwork / embodiment", meta: "30 min (only overlap night)" },
    { id: "pm_read", time: "PM", label: "Read", meta: "10 pages (night)" },
  ],
  5: [ // Fri
    { id: "am_cycling", time: "AM", label: "Cycling", meta: "45 min" },
    { id: "pm_strength", time: "PM", label: "Strength training", meta: "5–10 min" },
    { id: "pm_stretching", time: "PM", label: "Stretching", meta: "10 min" },
    { id: "pm_egoscue", time: "PM", label: "Egoscue", meta: "10 min" },
    { id: "pm_read", time: "PM", label: "Read", meta: "10 pages (night)" },
  ],
  6: [ // Sat
    { id: "am_cycling", time: "AM", label: "Cycling", meta: "45 min" },
    { id: "pm_breath", time: "PM", label: "Breathwork / embodiment", meta: "30 min" },
    { id: "pm_read", time: "PM", label: "Read", meta: "10 pages (night)" },
  ],
  0: [ // Sun
    { id: "pm_bedmassage", time: "PM", label: "Bed of Nails + Massage", meta: "45 min" },
    { id: "pm_egoscue", time: "PM", label: "Egoscue", meta: "10 min" },
    { id: "pm_strength", time: "PM", label: "Strength training", meta: "5–10 min" },
    { id: "pm_read", time: "PM", label: "Read", meta: "10 pages (night)" },
  ],
};

/* =========================
   Helpers
   ========================= */

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

function todayStrLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fmtLong(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function fmtShort(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function startOfWeek(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = (day - FIRST_DAY_OF_WEEK + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function makeId() {
  return "t_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
}

function normalizeLabel(s) { return String(s || "").trim().toLowerCase(); }

function autoMetaForLabel(label) {
  const norm = normalizeLabel(label);
  if (norm === "cycling") return "45 min";
  if (norm === "bed of nails + massage") return "45 min";
  if (norm === "bed of nails and massage") return "45 min";
  return null;
}

/* =========================
   Storage (template + date data)
   ========================= */

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { template: deepClone(defaultTemplate), data: {} };
    const parsed = JSON.parse(raw);
    if (!parsed.template) parsed.template = deepClone(defaultTemplate);
    if (!parsed.data) parsed.data = {};
    return parsed;
  } catch {
    return { template: deepClone(defaultTemplate), data: {} };
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function loadTemplate() { return loadStore().template; }

function saveTemplate(template) {
  const store = loadStore();
  store.template = template;
  saveStore(store);
}

function loadAllData() { return loadStore().data; }

function saveAllData(data) {
  const store = loadStore();
  store.data = data;
  saveStore(store);
}

function loadDay(dateStr) {
  const all = loadAllData();
  return all[dateStr] || {};
}

function saveDay(dateStr, dayObj) {
  const all = loadAllData();
  all[dateStr] = dayObj;
  saveAllData(all);
}

function setTaskDone(dateStr, taskId, done) {
  const day = loadDay(dateStr);
  day[taskId] = !!done;
  saveDay(dateStr, day);
}

function clearDay(dateStr) {
  const all = loadAllData();
  delete all[dateStr];
  saveAllData(all);
}

/* =========================
   Tasks for a date
   ========================= */

function tasksForDate(dateStr) {
  const template = loadTemplate();
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay();
  return template[dow] ? deepClone(template[dow]) : [];
}

function getProgress(dateStr, tasks) {
  const day = loadDay(dateStr);
  const total = tasks.length;
  const done = tasks.reduce((acc, t) => acc + (day[t.id] ? 1 : 0), 0);
  return { done, total };
}

function getMissingTasks(dateStr) {
  const tasks = tasksForDate(dateStr);
  if (!tasks.length) return { tasks, missing: [], done: 0, total: 0 };
  const day = loadDay(dateStr);
  const missing = tasks.filter(t => !day[t.id]);
  const done = tasks.length - missing.length;
  return { tasks, missing, done, total: tasks.length };
}

function isFullyComplete(dateStr) {
  const { total, done } = getMissingTasks(dateStr);
  return total > 0 && done === total;
}

/* =========================
   Streaks
   ========================= */

function computeCurrentStreak() {
  let streak = 0;
  let cur = todayStrLocal();
  while (true) {
    if (!isFullyComplete(cur)) break;
    streak += 1;
    cur = addDays(cur, -1);
  }
  return streak;
}

function computeBestStreak() {
  const data = loadAllData();
  const dates = Object.keys(data).sort();
  if (!dates.length) return 0;

  const min = dates[0];
  const max = dates[dates.length - 1];

  let best = 0;
  let run = 0;
  let cur = min;

  while (cur <= max) {
    if (isFullyComplete(cur)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    cur = addDays(cur, 1);
  }
  return best;
}

/* =========================
   Weekly totals
   ========================= */

function computeWeeklyTotals(weekStartStr) {
  let done = 0;
  let total = 0;
  let daysComplete = 0;
  let daysWithTasks = 0;

  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStartStr, i);
    const tasks = tasksForDate(d);
    if (!tasks.length) continue;

    daysWithTasks += 1;
    const p = getProgress(d, tasks);
    done += p.done;
    total += p.total;
    if (p.total > 0 && p.done === p.total) daysComplete += 1;
  }

  const pct = total ? Math.round((done / total) * 100) : 0;
  return { done, total, pct, daysComplete, daysWithTasks };
}

/* =========================
   Missed report (missed days only)
   ========================= */

function buildMissedReport(daysBack) {
  const today = todayStrLocal();
  let incompleteDays = 0;
  let totalMissedTasks = 0;
  let totalScheduledTasks = 0;

  const items = [];

  for (let i = 0; i < daysBack; i++) {
    const d = addDays(today, -i);
    const { tasks, missing, done, total } = getMissingTasks(d);
    if (!tasks.length) continue;

    totalScheduledTasks += total;
    totalMissedTasks += missing.length;

    if (missing.length > 0) {
      incompleteDays += 1;
      items.push({
        dateStr: d,
        done,
        total,
        missingLabels: missing.map(t => t.label),
      });
    }
  }

  return { daysBack, incompleteDays, totalMissedTasks, totalScheduledTasks, items };
}

/* =========================
   UI references
   ========================= */

let selectedDate = null;
let calendar = null;

const selectedDateTitle = document.getElementById("selectedDateTitle");
const checklistEl = document.getElementById("checklist");
const daySummaryEl = document.getElementById("daySummary");

const markAllBtn = document.getElementById("markAllBtn");
const clearDayBtn = document.getElementById("clearDayBtn");
const todayBtn = document.getElementById("todayBtn");

const weeklyCompletionEl = document.getElementById("weeklyCompletion");
const weeklyCompletionMetaEl = document.getElementById("weeklyCompletionMeta");
const currentStreakEl = document.getElementById("currentStreak");
const bestStreakEl = document.getElementById("bestStreak");

const reportRangeSelect = document.getElementById("reportRangeSelect");
const refreshReportBtn = document.getElementById("refreshReportBtn");
const reportSummaryEl = document.getElementById("reportSummary");
const reportListEl = document.getElementById("reportList");

/* =========================
   Render checklist
   ========================= */

function renderChecklist(dateStr) {
  selectedDate = dateStr;

  const tasks = tasksForDate(dateStr);
  selectedDateTitle.textContent = fmtLong(dateStr);
  markAllBtn.disabled = tasks.length === 0;
  clearDayBtn.disabled = tasks.length === 0;

  checklistEl.innerHTML = "";
  daySummaryEl.textContent = "";

  if (!tasks.length) {
    checklistEl.innerHTML = `<p class="hint">No tasks scheduled for this day.</p>`;
    return;
  }

  const dayState = loadDay(dateStr);

  const groups = {
    AM: tasks.filter(t => t.time === "AM"),
    PM: tasks.filter(t => t.time === "PM"),
  };

  for (const time of ["AM", "PM"]) {
    if (!groups[time].length) continue;

    const title = document.createElement("div");
    title.className = "sectionTitle";
    title.textContent = time;
    checklistEl.appendChild(title);

    groups[time].forEach(task => {
      const row = document.createElement("div");
      row.className = "taskRow";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!dayState[task.id];
      cb.addEventListener("change", () => {
        setTaskDone(dateStr, task.id, cb.checked);
        refreshCalendar();
        renderSummary(dateStr);
        refreshStatsForVisibleWeek();
        renderMissedReport();
      });

      const textWrap = document.createElement("div");

      const label = document.createElement("div");
      label.className = "taskLabel";
      label.textContent = task.label;

      const meta = document.createElement("div");
      meta.className = "taskMeta";
      meta.textContent = task.meta || "";

      textWrap.appendChild(label);
      if (task.meta) textWrap.appendChild(meta);

      row.appendChild(cb);
      row.appendChild(textWrap);
      checklistEl.appendChild(row);
    });
  }

  renderSummary(dateStr);
}

function renderSummary(dateStr) {
  const tasks = tasksForDate(dateStr);
  const p = getProgress(dateStr, tasks);
  daySummaryEl.textContent = `Progress: ${p.done}/${p.total} completed`;
}

/* =========================
   Stats + report
   ========================= */

function refreshCalendar() { calendar.render(); }

function refreshStatsForVisibleWeek() {
  const view = calendar.view;
  const start = view.currentStart.toISOString().slice(0, 10);
  const weekStart = startOfWeek(start);
  const totals = computeWeeklyTotals(weekStart);

  weeklyCompletionEl.textContent = `${totals.pct}%`;
  weeklyCompletionMetaEl.textContent =
    `${totals.done}/${totals.total} tasks done • ${totals.daysComplete}/${totals.daysWithTasks} days fully complete`;

  currentStreakEl.textContent = `${computeCurrentStreak()} day(s)`;
  bestStreakEl.textContent = `${computeBestStreak()} day(s)`;
}

function renderMissedReport() {
  const daysBack = Number(reportRangeSelect.value || 7);
  const report = buildMissedReport(daysBack);

  if (report.totalScheduledTasks === 0) {
    reportSummaryEl.textContent = `No scheduled tasks found in the last ${daysBack} days (based on your template).`;
    reportListEl.innerHTML = "";
    return;
  }

  const missedPct = Math.round((report.totalMissedTasks / report.totalScheduledTasks) * 100);
  reportSummaryEl.textContent =
    `Last ${daysBack} days: missed ${report.totalMissedTasks}/${report.totalScheduledTasks} tasks (${missedPct}% missed) across ${report.incompleteDays} incomplete day(s).`;

  reportListEl.innerHTML = "";

  if (!report.items.length) {
    const div = document.createElement("div");
    div.className = "reportItem";
    div.innerHTML = `<div class="reportDate">Nice.</div><div class="reportMissed">No missed tasks in this range.</div>`;
    reportListEl.appendChild(div);
    return;
  }

  report.items.forEach(item => {
    const card = document.createElement("div");
    card.className = "reportItem";

    const top = document.createElement("div");
    top.className = "reportItemTop";

    const date = document.createElement("div");
    date.className = "reportDate";
    date.textContent = fmtShort(item.dateStr);

    const counts = document.createElement("div");
    counts.className = "reportCounts";
    counts.textContent = `${item.done}/${item.total} done`;

    top.appendChild(date);
    top.appendChild(counts);

    const missed = document.createElement("div");
    missed.className = "reportMissed";
    missed.textContent = "Missed: ";

    item.missingLabels.forEach(lbl => {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = lbl;
      missed.appendChild(pill);
    });

    card.appendChild(top);
    card.appendChild(missed);

    card.addEventListener("click", () => {
      calendar.gotoDate(item.dateStr);
      renderChecklist(item.dateStr);
    });

    reportListEl.appendChild(card);
  });
}

/* =========================
   Calendar init + idiot-proof boot
   ========================= */

function initCalendar() {
  const calendarEl = document.getElementById("calendar");

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    firstDay: FIRST_DAY_OF_WEEK,
    height: "auto",
    fixedWeekCount: false,

    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,dayGridWeek"
    },

    dateClick: (info) => renderChecklist(info.dateStr),

    datesSet: () => refreshStatsForVisibleWeek(),

    dayCellDidMount: (args) => {
      const dateStr = args.date.toISOString().slice(0, 10);
      const tasks = tasksForDate(dateStr);
      if (!tasks.length) return;

      const { done, total } = getProgress(dateStr, tasks);

      const top = args.el.querySelector(".fc-daygrid-day-top");
      if (!top) return;

      const badge = document.createElement("span");
      badge.className = "progress-badge";
      badge.textContent = `${done}/${total}`;
      top.appendChild(badge);

      if (done < total) args.el.classList.add("has-incomplete");
      else args.el.classList.add("has-complete");
    },
  });

  calendar.render();

  const todayStr = todayStrLocal();
  renderChecklist(todayStr);
  refreshStatsForVisibleWeek();
  renderMissedReport();
}

function boot() {
  // Fail loudly if FullCalendar didn't load (blocked CDN)
  if (!window.FullCalendar) {
    const cal = document.getElementById("calendar");
    cal.innerHTML = `
      <div style="padding:12px;border:1px solid #1f2a36;border-radius:12px;background:#0b1016;">
        <div style="font-weight:800;margin-bottom:6px;">Calendar library didn’t load</div>
        <div style="opacity:.85;font-size:13px;line-height:1.35;">
          Your network may be blocking the CDN. Try a different network or run a local server.<br/>
          Local server: <code>python -m http.server 8000</code> then open <code>http://localhost:8000</code>
        </div>
      </div>`;
    console.error("FullCalendar not loaded. CDN blocked?");
    return;
  }

  try {
    initCalendar();
  } catch (e) {
    const cal = document.getElementById("calendar");
    cal.innerHTML = `
      <div style="padding:12px;border:1px solid #1f2a36;border-radius:12px;background:#0b1016;">
        <div style="font-weight:800;margin-bottom:6px;">App crashed during startup</div>
        <div style="opacity:.85;font-size:13px;line-height:1.35;">
          Open DevTools Console to see the error.<br/>
          (On Mac: ⌥⌘I, on Windows: Ctrl+Shift+I)
        </div>
      </div>`;
    console.error(e);
  }
}

/* =========================
   Buttons: Today / Export / Import / Wipe / Report
   ========================= */

todayBtn.addEventListener("click", () => {
  const t = todayStrLocal();
  if (calendar) calendar.today();
  renderChecklist(t);
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const store = loadStore();
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "habit-calendar-export.json";
  a.click();

  URL.revokeObjectURL(url);
});

document.getElementById("importInput").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    const store = {
      template: parsed.template ? parsed.template : deepClone(defaultTemplate),
      data: parsed.data ? parsed.data : (parsed || {}),
    };

    saveStore(store);

    if (calendar) {
      calendar.render();
      renderChecklist(selectedDate || todayStrLocal());
      refreshStatsForVisibleWeek();
      renderMissedReport();
    }
  } catch (err) {
    alert("Import failed: " + (err?.message || String(err)));
  } finally {
    e.target.value = "";
  }
});

document.getElementById("wipeBtn").addEventListener("click", () => {
  const ok = confirm("Wipe ALL tracking data and template? This cannot be undone.");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  if (calendar) {
    calendar.render();
    renderChecklist(todayStrLocal());
    refreshStatsForVisibleWeek();
    renderMissedReport();
  }
});

markAllBtn.addEventListener("click", () => {
  if (!selectedDate) return;
  const tasks = tasksForDate(selectedDate);
  const dayObj = loadDay(selectedDate);
  tasks.forEach(t => dayObj[t.id] = true);
  saveDay(selectedDate, dayObj);

  calendar.render();
  renderChecklist(selectedDate);
  refreshStatsForVisibleWeek();
  renderMissedReport();
});

clearDayBtn.addEventListener("click", () => {
  if (!selectedDate) return;
  clearDay(selectedDate);

  calendar.render();
  renderChecklist(selectedDate);
  refreshStatsForVisibleWeek();
  renderMissedReport();
});

document.getElementById("refreshReportBtn").addEventListener("click", () => {
  renderMissedReport();
});

document.getElementById("reportRangeSelect").addEventListener("change", () => {
  renderMissedReport();
});

/* =========================
   Template Editor
   ========================= */

const templateModal = document.getElementById("templateModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const editTemplateBtn = document.getElementById("editTemplateBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const saveTemplateBtn = document.getElementById("saveTemplateBtn");
const resetTemplateBtn = document.getElementById("resetTemplateBtn");

const dayTabsEl = document.getElementById("dayTabs");
const editorDayNameEl = document.getElementById("editorDayName");
const taskEditorListEl = document.getElementById("taskEditorList");
const addTaskBtn = document.getElementById("addTaskBtn");

const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

let draftTemplate = null;
let activeEditorDow = 1;

function openModal() {
  draftTemplate = deepClone(loadTemplate());
  activeEditorDow = 1;
  buildDayTabs();
  renderEditorDay(activeEditorDow);
  templateModal.classList.remove("hidden");
  templateModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  templateModal.classList.add("hidden");
  templateModal.setAttribute("aria-hidden", "true");
  draftTemplate = null;
}

function buildDayTabs() {
  dayTabsEl.innerHTML = "";
  const order = [1,2,3,4,5,6,0];
  order.forEach(dow => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dayTab" + (dow === activeEditorDow ? " active" : "");
    btn.textContent = dayNames[dow];
    btn.addEventListener("click", () => {
      activeEditorDow = dow;
      buildDayTabs();
      renderEditorDay(dow);
    });
    dayTabsEl.appendChild(btn);
  });
}

function ensureDayArray(dow) {
  if (!draftTemplate[dow]) draftTemplate[dow] = [];
  if (!Array.isArray(draftTemplate[dow])) draftTemplate[dow] = [];
}

function renderEditorDay(dow) {
  ensureDayArray(dow);
  editorDayNameEl.textContent = dayNames[dow];
  taskEditorListEl.innerHTML = "";

  const tasks = draftTemplate[dow];

  if (!tasks.length) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = "No tasks yet. Click “Add task”.";
    taskEditorListEl.appendChild(p);
    return;
  }

  tasks.forEach((task, idx) => {
    const row = document.createElement("div");
    row.className = "editorTaskRow";

    const top = document.createElement("div");
    top.className = "editorRowTop";

    const timeSel = document.createElement("select");
    ["AM","PM"].forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      if (task.time === v) opt.selected = true;
      timeSel.appendChild(opt);
    });
    timeSel.addEventListener("change", () => { task.time = timeSel.value; });

    const labelInp = document.createElement("input");
    labelInp.type = "text";
    labelInp.placeholder = "Label";
    labelInp.value = task.label || "";

    const metaInp = document.createElement("input");
    metaInp.type = "text";
    metaInp.placeholder = "Meta";
    metaInp.value = task.meta || "";

    labelInp.addEventListener("input", () => {
      task.label = labelInp.value;

      const suggestion = autoMetaForLabel(task.label);
      if (suggestion) {
        const current = normalizeLabel(task.meta);
        const empty = !current;
        const alreadyAuto = current === "45 min";
        if (empty || alreadyAuto) {
          task.meta = suggestion;
          metaInp.value = suggestion;
        }
      }
    });

    metaInp.addEventListener("input", () => { task.meta = metaInp.value; });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "smallBtn danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => {
      draftTemplate[dow].splice(idx, 1);
      renderEditorDay(dow);
    });

    top.appendChild(timeSel);
    top.appendChild(labelInp);
    top.appendChild(metaInp);
    top.appendChild(delBtn);

    const bottom = document.createElement("div");
    bottom.className = "editorRowBottom";

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "smallBtn";
    upBtn.textContent = "↑ Up";
    upBtn.disabled = idx === 0;
    upBtn.addEventListener("click", () => {
      const arr = draftTemplate[dow];
      [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
      renderEditorDay(dow);
    });

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = "smallBtn";
    downBtn.textContent = "↓ Down";
    downBtn.disabled = idx === tasks.length - 1;
    downBtn.addEventListener("click", () => {
      const arr = draftTemplate[dow];
      [arr[idx], arr[idx+1]] = [arr[idx+1], arr[idx]];
      renderEditorDay(dow);
    });

    bottom.appendChild(upBtn);
    bottom.appendChild(downBtn);

    row.appendChild(top);
    row.appendChild(bottom);
    taskEditorListEl.appendChild(row);
  });
}

function normalizeTemplateIds(template) {
  for (const dow of ["0","1","2","3","4","5","6"]) {
    const list = template[dow] || [];
    const seen = new Set();
    list.forEach(task => {
      if (!task.id) task.id = makeId();
      if (seen.has(task.id)) task.id = makeId();
      seen.add(task.id);
      if (!task.time) task.time = "PM";
      if (typeof task.label !== "string") task.label = "";
      if (typeof task.meta !== "string") task.meta = "";
    });
    template[dow] = list;
  }
  return template;
}

editTemplateBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
cancelModalBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

addTaskBtn.addEventListener("click", () => {
  ensureDayArray(activeEditorDow);
  draftTemplate[activeEditorDow].push({
    id: makeId(),
    time: "PM",
    label: "New task",
    meta: ""
  });
  renderEditorDay(activeEditorDow);
});

resetTemplateBtn.addEventListener("click", () => {
  const ok = confirm("Reset template back to the default plan?");
  if (!ok) return;
  draftTemplate = deepClone(defaultTemplate);
  buildDayTabs();
  renderEditorDay(activeEditorDow);
});

saveTemplateBtn.addEventListener("click", () => {
  const normalized = normalizeTemplateIds(deepClone(draftTemplate));
  saveTemplate(normalized);

  calendar.render();
  renderChecklist(selectedDate || todayStrLocal());
  refreshStatsForVisibleWeek();
  renderMissedReport();

  closeModal();
});

/* =========================
   Final boot (DOM ready)
   ========================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
