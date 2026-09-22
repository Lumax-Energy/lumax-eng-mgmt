/**
 * Lumax Energy — Engineering Management v2.4
 * Vanilla JS SPA: Dashboard · Projects · Tasks + Structural Conformance Letter + exec KPIs + GitHub sync + Excel.
 */
(function () {
  "use strict";
  if (window.__LUMAX_ENG_MGMT_BOOTED) return;
  window.__LUMAX_ENG_MGMT_BOOTED = true;

  const LS_DATA = "lumax-eng-mgmt-data";
  const LS_SETTINGS = "lumax-eng-mgmt-settings";
  const LS_UI = "lumax-eng-mgmt-ui";
  const LS_SHA = "lumax-eng-mgmt-sha";
  const DEFAULT_OWNER = "Lumax-Energy";
  const DEFAULT_REPO = "lumax-eng-mgmt";
  const DATA_PATH = "data/projects.json";
  const APP_VERSION = 2.4;

  const DEFAULT_PHASES = [
    { id: "phase-intake", name: "Intake" },
    { id: "phase-concept", name: "Concept" },
    { id: "phase-design", name: "Design" },
    { id: "phase-check", name: "Check" },
    { id: "phase-drawings", name: "Drawings" },
    { id: "phase-site-investigation", name: "Site investigation" },
    { id: "phase-site", name: "Site/Construction support" },
    { id: "phase-closeout", name: "Close-out" },
    { id: "phase-done", name: "Done" },
  ];

  /** Extensible dashboard / projects filter chips. Add entries here for new views. */
  const DASHBOARD_VIEWS = [
    {
      id: "clients",
      label: "Clients",
      kind: "browse-clients",
      hint: "Unique clients from projects",
    },
    {
      id: "assignees",
      label: "Engineer",
      kind: "browse-assignees",
      hint: "Unique assignees from all tasks",
    },
    {
      id: "project-types",
      label: "Structure type",
      kind: "browse-structure-types",
      hint: "Browse projects by structure type",
    },
    {
      id: "open-projects",
      label: "Open projects",
      kind: "filter-projects",
      hint: "Active (non-archived) projects",
    },
    {
      id: "overdue-work",
      label: "Overdue work",
      kind: "filter-projects",
      hint: "Projects with at least one overdue open task",
    },
    {
      id: "muni-pending",
      label: "Municipal sign-off pending",
      kind: "filter-projects",
      hint: "Municipal sign-off = pending",
    },
    {
      id: "conformance",
      label: "Structural Conformance Letter",
      kind: "filter-projects",
      hint: "Pending or approved Structural Conformance Letter (not none)",
    },
    {
      id: "scf-ready",
      label: "Ready for SC letter",
      kind: "filter-projects",
      hint: "INV + contact + address + Done phase — ready to create SC Letter",
    },
    {
      id: "scf-issued",
      label: "SC letters issued",
      kind: "filter-projects",
      hint: "Approved with LMX-SCL / LMX-SCF ref",
    },
    {
      id: "commercial-gaps",
      label: "Commercial gaps",
      kind: "filter-projects",
      hint: "Missing invoice, address, or contact person",
    },
    {
      id: "site-investigation",
      label: "Site investigation",
      kind: "filter-projects",
      hint: "Active / current phase is Site investigation",
    },
  ];

  const CONFORMANCE_STATUSES = [
    { id: "none", name: "None" },
    { id: "pending", name: "Pending" },
    { id: "approved", name: "Approved" },
  ];

  const DEFAULT_PROJECT_TYPES = [
    "Carport",
    "Ground mount",
    "SAT tracker",
    "Rooftop ballast",
    "Rooftop flush mount",
    "Custom",
  ];

  const DEFAULT_STRUCTURE_TYPES = [
    "Carport H-Max",
    "Carport Alu-Max",
    "Carport Econo-Max",
    "Carport Ergo-Max",
    "Carport Ergo+",
    "GM Steel",
    "GM Alu",
    "SAT tracker",
    "Rooftop ballast",
    "Rooftop flush mount",
    "Custom",
  ];

  const STRUCTURE_TYPE_ALIASES = {
    "pv gm (steelcore)": "GM Steel",
    "pv gm (steel core)": "GM Steel",
    "steel-core gm": "GM Steel",
    "steelcore": "GM Steel",
    "ground mount other": "GM Steel",
    "ground mount": "GM Steel",
    "gm steel": "GM Steel",
    "gm alu": "GM Alu",
    "carport": "Custom",
    "sat": "SAT tracker",
    "rooftop flush": "Rooftop flush mount",
    "rooftop flush-mount": "Rooftop flush mount",
  };

  const DEFAULT_ENGINEER = {
    name: "Demo Pr. Eng. (SAMPLE)",
    ecsaNo: "ECSA-DEMO-00000",
    business: "Lumax ENERGY (PTY) Ltd — SAMPLE",
    address: "Demo Corporate Park North, Midrand 1685",
    contact: "+27(0) 00 000 0000 · demo-eng@example.invalid",
  };

  const DEFAULT_STATUSES = [
    { id: "status-backlog", name: "Backlog", color: "#6b7c93", category: "todo" },
    { id: "status-todo", name: "To do", color: "#5c6b7e", category: "todo" },
    { id: "status-doing", name: "Doing", color: "#2f80ed", category: "doing" },
    { id: "status-in-check", name: "In check", color: "#9b59b6", category: "doing" },
    { id: "status-blocked", name: "Blocked", color: "#c0392b", category: null },
    { id: "status-done", name: "Done", color: "#1a7f4b", category: "done" },
  ];

  const DEFAULT_TASK_TYPES = [
    { id: "rdn", name: "RDN" },
    { id: "design_check", name: "Design check" },
    { id: "drawing", name: "Drawing" },
    { id: "eng_task", name: "Eng task" },
    { id: "site_visit", name: "Site visit" },
    { id: "calculation", name: "Calculation" },
    { id: "review", name: "Review" },
    { id: "coordination", name: "Coordination" },
    { id: "other", name: "Other" },
  ];
  /** @deprecated use getTaskTypes() — kept as alias for any leftover refs during load */
  const TASK_TYPES = DEFAULT_TASK_TYPES;

  const V1_STATUS_MAP = {
    todo: "status-todo",
    doing: "status-doing",
    done: "status-done",
  };

  let state = {
    data: emptyData(),
    view: "dashboard", // dashboard | projects | tasks | detail
    selectedProjectId: null,
    selectedPhaseId: "all",
    showArchived: false,
    search: "",
    taskFilters: { type: "", statusId: "", assignee: "", overdueOnly: false, projectId: "", client: "", structureType: "", hideCompleted: loadUiPrefs().hideCompleted },
    projectFilters: { client: "", dashboardView: null },
    dashboardView: null, // id from DASHBOARD_VIEWS, or null
    tasksMode: "list", // list | board
    settings: loadBrowserSettings(),
    githubUser: null,
    fileSha: localStorage.getItem(LS_SHA) || null,
    loadedThisSession: false,
    syncOp: null,
  };

  function emptyData() {
    return {
      version: APP_VERSION,
      updatedAt: null,
      settings: {
        taskStatuses: DEFAULT_STATUSES.map((s) => ({ ...s })),
        taskTypes: DEFAULT_TASK_TYPES.map((t) => ({ ...t })),
        myAssignee: "",
        projectTypes: DEFAULT_PROJECT_TYPES.slice(),
        structureTypes: DEFAULT_STRUCTURE_TYPES.slice(),
        engineerDefaults: Object.assign({}, DEFAULT_ENGINEER),
        scfYear: new Date().getFullYear(),
        scfSeq: 1,
        voidedLetters: [],
      },
      projects: [],
      tasks: [],
    };
  }

  // ---------- Utils ----------
  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }
  function nowIso() {
    return new Date().toISOString();
  }
  function todayStr() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Johannesburg",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch (_) {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return y + "-" + m + "-" + day;
    }
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function toast(msg, type, action) {
    const bar = document.getElementById("status-bar");
    if (!bar) return;
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    const text = document.createElement("div");
    text.textContent = msg;
    el.appendChild(text);
    if (action && action.label && typeof action.onClick === "function") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toast-action";
      btn.textContent = action.label;
      btn.onclick = async () => {
        btn.disabled = true;
        try {
          await action.onClick();
          el.remove();
        } catch (e) {
          btn.disabled = false;
          toast(e.message || String(e), "error");
        }
      };
      el.appendChild(btn);
    }
    bar.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.remove();
    }, type === "error" || action ? 14000 : 4200);
  }
  function localSaveHint(baseMsg) {
    if (state.settings.pat) return baseMsg + " — click Save to sync";
    return baseMsg + " — set PAT in Settings to sync";
  }
  function setSyncBusy(op) {
    state.syncOp = op;
    ["btn-load", "btn-save"].forEach((id) => {
      const b = document.getElementById(id);
      if (b) b.disabled = !!op;
    });
  }
  function markLastSync(kind) {
    const el = document.getElementById("last-sync");
    if (!el) return;
    const t = new Date();
    el.textContent = "Sync: " + kind + " " + t.toLocaleString();
    el.title = "Last successful " + kind + " at " + t.toISOString();
  }
  function loadBrowserSettings() {
    try {
      const raw = localStorage.getItem(LS_SETTINGS);
      if (raw) {
        const s = JSON.parse(raw);
        return {
          owner: s.owner || DEFAULT_OWNER,
          repo: s.repo || DEFAULT_REPO,
          pat: s.pat || "",
        };
      }
    } catch (_) {}
    return { owner: DEFAULT_OWNER, repo: DEFAULT_REPO, pat: "" };
  }
  function saveBrowserSettings() {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(state.settings));
  }
  function loadUiPrefs() {
    try {
      const raw = localStorage.getItem(LS_UI);
      if (raw) {
        const u = JSON.parse(raw);
        return { hideCompleted: !!u.hideCompleted };
      }
    } catch (_) {}
    return { hideCompleted: false };
  }
  function saveUiPrefs() {
    localStorage.setItem(LS_UI, JSON.stringify({ hideCompleted: !!(state.taskFilters && state.taskFilters.hideCompleted) }));
  }
  /** Fresh task filter object; keeps hideCompleted unless overridden. */
  function blankTaskFilters(overrides) {
    const hide =
      overrides && Object.prototype.hasOwnProperty.call(overrides, "hideCompleted")
        ? !!overrides.hideCompleted
        : !!(state.taskFilters && state.taskFilters.hideCompleted);
    return Object.assign(
      {
        type: "",
        statusId: "",
        assignee: "",
        overdueOnly: false,
        projectId: "",
        client: "",
        structureType: "",
        hideCompleted: hide,
      },
      overrides || {},
      { hideCompleted: hide }
    );
  }
  function cacheDataLocally() {
    try {
      localStorage.setItem(LS_DATA, JSON.stringify(state.data));
      if (state.fileSha) localStorage.setItem(LS_SHA, state.fileSha);
    } catch (e) {
      console.warn("localStorage cache failed", e);
    }
  }
  function loadCachedData() {
    try {
      const raw = localStorage.getItem(LS_DATA);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }
  function getProject(id) {
    return (state.data.projects || []).find((p) => p.id === id);
  }
  function getTask(id) {
    return (state.data.tasks || []).find((t) => t.id === id);
  }
  function getStatuses() {
    const list = (state.data.settings && state.data.settings.taskStatuses) || [];
    return list.length ? list : DEFAULT_STATUSES.map((s) => ({ ...s }));
  }
  function getStatus(id) {
    return getStatuses().find((s) => s.id === id) || null;
  }
  function statusIsDone(statusId) {
    const s = getStatus(statusId);
    return s && s.category === "done";
  }
  function normalizeDesignScope(v) {
    const o = v && typeof v === "object" ? v : {};
    return { designed: !!o.designed, checked: !!o.checked };
  }
  function designTick(on) {
    return on ? "☑" : "☐";
  }
  function doneStatusId() {
    const done = getStatuses().find((s) => s.category === "done") || getStatus("status-done");
    return (done && done.id) || "status-done";
  }
  function markTaskDone(task) {
    if (!task) return false;
    task.statusId = doneStatusId();
    task.doneDate = todayStr();
    task.updatedAt = nowIso();
    if (task.projectId) {
      const proj = getProject(task.projectId);
      if (proj) proj.updatedAt = nowIso();
    }
    cacheDataLocally();
    toast(localSaveHint("Marked done · completed " + task.doneDate), "success");
    return true;
  }
  function markDoneButtonHtml(task) {
    if (!task) return "";
    const done = statusIsDone(task.statusId);
    const label = done ? "Set completed today" : "Mark as Done";
    return (
      `<button type="button" class="btn btn-done btn-sm btn-mark-done" data-mark-done="${escapeHtml(task.id)}" title="Set status to Done and completed date to today">${escapeHtml(label)}</button>`
    );
  }
  function bindMarkDoneButtons(root) {
    if (!root) return;
    root.querySelectorAll(".btn-mark-done").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const t = getTask(btn.dataset.markDone);
        if (!t) return;
        markTaskDone(t);
        closeOverlay();
        render();
      });
    });
  }
  function sclDesignBlocksHtml(structural, foundation) {
    const sd = normalizeDesignScope(structural);
    const fd = normalizeDesignScope(foundation);
    function row(title, scope) {
      return (
        "<tr><td class='lbl'>" +
        escapeHtml(title) +
        "</td><td>" +
        designTick(scope.designed) +
        " Designed</td><td>" +
        designTick(scope.checked) +
        " Checked</td></tr>"
      );
    }
    return (
      "<table class='scf-design-blocks'><tbody>" +
      row("Structural Design", sd) +
      row("Foundation Design", fd) +
      "</tbody></table>"
    );
  }
  function statusIsBlocked(statusId) {
    const s = getStatus(statusId);
    return s && (s.id === "status-blocked" || (s.name || "").toLowerCase() === "blocked");
  }
  function statusIsOpen(statusId) {
    return !statusIsDone(statusId);
  }
  function typeLabel(typeId) {
    const t = getTaskTypes().find((x) => x.id === typeId);
    return t ? t.name : typeId || "—";
  }
  function isSample(project) {
    const code = project.projectCode || "";
    const client = project.clientName || "";
    return (
      (project.projectName || "").includes("SAMPLE") ||
      code === "DEMO-001" ||
      code.startsWith("DEMO-") ||
      client === "Demo Client" ||
      client === "Demo" ||
      client.startsWith("Demo ")
    );
  }
  function isOverdue(task) {
    if (!task.dueDate || statusIsDone(task.statusId)) return false;
    return task.dueDate < todayStr();
  }
  function isDueWithin(task, days) {
    if (!task.dueDate || statusIsDone(task.statusId)) return false;
    const d = new Date(task.dueDate + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() + days);
    return d >= now && d <= end;
  }
  function projectTasks(projectId) {
    return (state.data.tasks || []).filter((t) => t.projectId === projectId);
  }
  function allTasksFiltered() {
    return (state.data.tasks || []).filter((t) => taskPassesTaskFilters(t));
  }

  function taskPassesTaskFilters(t, opts) {
    opts = opts || {};
    const q = (state.search || "").trim().toLowerCase();
    const f = state.taskFilters;
    if (f.type && t.type !== f.type) return false;
    if (f.statusId && t.statusId !== f.statusId) return false;
    if (f.assignee && (t.assignee || "").toLowerCase() !== f.assignee.toLowerCase()) return false;
    if (f.projectId === "__standalone__" && t.projectId) return false;
    if (f.projectId && f.projectId !== "__standalone__" && t.projectId !== f.projectId) return false;
    if (f.client) {
      const p = t.projectId ? getProject(t.projectId) : null;
      if (!p || (p.clientName || "").toLowerCase() !== f.client.toLowerCase()) return false;
    }
    if (f.structureType) {
      const want = String(f.structureType).toLowerCase();
      const taskStructs = [];
      if (t.structureType) taskStructs.push(String(t.structureType));
      if (Array.isArray(t.structureTypes)) taskStructs.push.apply(taskStructs, t.structureTypes);
      if (taskStructs.length) {
        if (!taskStructs.some((s) => String(s).toLowerCase() === want)) return false;
      } else {
        const p = t.projectId ? getProject(t.projectId) : null;
        const structs = (p && p.structureTypes) || [];
        if (!structs.some((s) => String(s).toLowerCase() === want)) return false;
      }
    }
    if (!opts.skipOverdue && f.overdueOnly && !isOverdue(t)) return false;
    // Main list/board: keep completed out unless a done status is explicitly selected.
    // Completed tasks are shown in the month archive instead (see renderCompletedByMonthHtml).
    if (!opts.skipHideCompleted && statusIsDone(t.statusId) && !(f.statusId && statusIsDone(f.statusId))) return false;
    if (q) {
      const p = t.projectId ? getProject(t.projectId) : null;
      const hay = [
        t.title,
        t.description,
        t.assignee,
        t.type,
        typeLabel(t.type),
        t.refNumber,
        t.drawingNumber,
        t.discipline,
        p ? p.projectName : "",
        p ? p.projectCode : "",
        p ? p.clientName : "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function completedMonthKey(task) {
    const d = (task && task.doneDate) || "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(d)) return d;
    return "unknown";
  }

  function completedMonthLabel(key) {
    if (key === "unknown") return "No completed date";
    const parts = String(key).split("-");
    if (parts.length !== 2) return key;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!y || !m) return key;
    const dt = new Date(y, m - 1, 1);
    return dt.toLocaleString(undefined, { month: "long", year: "numeric" });
  }

  /** Completed tasks that match current filters, for the month archive under Hide completed. */
  function completedDateKey(task) {
    const d = (task && task.doneDate) || "";
    // YYYY-MM-DD sorts correctly as text; missing dates sink to the bottom when ordering latest-first
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
    if (/^\d{4}-\d{2}$/.test(d)) return d + "-01";
    return "0000-00-00";
  }

  function completedTasksMatchingFilters() {
    return (state.data.tasks || [])
      .filter((t) => statusIsDone(t.statusId) && taskPassesTaskFilters(t, { skipHideCompleted: true, skipOverdue: true }))
      .sort((a, b) => {
        // Most recently completed first (22 Sep above 16 Sep)
        const dd = completedDateKey(b).localeCompare(completedDateKey(a));
        if (dd) return dd;
        const ua = String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
        if (ua) return ua;
        return String(a.title || "").localeCompare(String(b.title || ""));
      });
  }

  function groupCompletedByMonth(tasks) {
    const map = new Map();
    (tasks || []).forEach((t) => {
      const key = completedMonthKey(t);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    const keys = [...map.keys()].sort((a, b) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;
      return b.localeCompare(a);
    });
    return keys.map((key) => ({ key, label: completedMonthLabel(key), tasks: map.get(key) }));
  }

  function taskTableRowHtml(t) {
    const p = t.projectId ? getProject(t.projectId) : null;
    const st = getStatus(t.statusId);
    return (
      `<tr class="${isOverdue(t) ? "overdue" : ""}" data-task="${escapeHtml(t.id)}">` +
      `<td><span class="type-chip">${escapeHtml(typeLabel(t.type))}</span></td>` +
      `<td>${escapeHtml(t.title)}</td>` +
      `<td>${escapeHtml(p ? p.projectCode || p.projectName : "—")}</td>` +
      `<td>${escapeHtml(st ? st.name : t.statusId)}</td>` +
      `<td>${escapeHtml(t.assignee || "—")}</td>` +
      `<td><span class="priority ${escapeHtml(t.priority)}">${escapeHtml(t.priority)}</span></td>` +
      `<td>${escapeHtml(t.dueDate || "—")}</td>` +
      `<td>${escapeHtml(t.doneDate || "—")}</td>` +
      `<td class="task-done-cell">${markDoneButtonHtml(t)}</td>` +
      `</tr>`
    );
  }

  function renderCompletedByMonthHtml() {
    const f = state.taskFilters;
    // Open tasks stay in the main list above. Completed list below: most recently completed first.
    if (f.statusId && statusIsDone(f.statusId)) return "";
    const completed = completedTasksMatchingFilters();
    if (!completed.length) {
      return (
        `<div class="completed-by-month">` +
        `<h2>Completed</h2>` +
        `<p class="hint">No completed tasks match the current filters.</p>` +
        `</div>`
      );
    }
    let lastMonth = null;
    const bodyRows = completed
      .map((t) => {
        const key = completedMonthKey(t);
        let sep = "";
        if (key !== lastMonth) {
          lastMonth = key;
          sep =
            `<tr class="month-sep"><td colspan="9"><span class="month-label">${escapeHtml(completedMonthLabel(key))}</span></td></tr>`;
        }
        return sep + taskTableRowHtml(t);
      })
      .join("");
    return (
      `<div class="completed-by-month">` +
      `<h2>Completed <span class="stat-sub">(${completed.length})</span></h2>` +
      `<p class="hint">Most recently completed at the top (e.g. 22 Sep above 16 Sep). Open tasks stay in the list above.</p>` +
      `<div class="tasks-table-wrap"><table class="tasks-table"><thead><tr>` +
      `<th>Type</th><th>Title</th><th>Project</th><th>Status</th><th>Assignee</th><th>Priority</th><th>Due</th><th>Completed</th><th></th>` +
      `</tr></thead><tbody>` +
      bodyRows +
      `</tbody></table></div>` +
      `</div>`
    );
  }

  // ---------- Forms / modals ----------
  function showOverlay(html) {
    const ov = document.getElementById("overlay");
    ov.innerHTML = html;
    ov.classList.remove("hidden");
    ov.onclick = (e) => {
      if (e.target === ov) closeOverlay();
    };
  }
  function closeOverlay() {
    const ov = document.getElementById("overlay");
    ov.classList.add("hidden");
    ov.innerHTML = "";
    ov.onclick = null;
  }


  function xmlEscape(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function wPara(text, opts) {
    opts = opts || {};
    const bold = opts.bold ? '<w:b/>' : '';
    const sz = opts.sz ? '<w:sz w:val="' + opts.sz + '"/><w:szCs w:val="' + opts.sz + '"/>' : '';
    const after = opts.after != null ? opts.after : 120;
    let jc = '';
    if (opts.center) jc = '<w:jc w:val="center"/>';
    else if (opts.justify) jc = '<w:jc w:val="both"/>';
    return (
      '<w:p><w:pPr><w:spacing w:after="' + after + '"/>' +
      jc +
      '</w:pPr><w:r><w:rPr>' + bold + sz +
      '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t xml:space="preserve">' +
      xmlEscape(text) +
      '</w:t></w:r></w:p>'
    );
  }
  function wEmpty() {
    return '<w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>';
  }
  function wTc(text, opts) {
    opts = opts || {};
    const width = opts.width || 2400;
    const shade = opts.shade ? '<w:shd w:val="clear" w:fill="' + opts.shade + '"/>' : '';
    const bold = opts.bold ? '<w:b/>' : '';
    const span = opts.span && opts.span > 1 ? '<w:gridSpan w:val="' + opts.span + '"/>' : '';
    const vMerge =
      opts.vMerge === "restart"
        ? '<w:vMerge w:val="restart"/>'
        : opts.vMerge === "continue"
          ? '<w:vMerge/>'
          : "";
    return (
      '<w:tc><w:tcPr><w:tcW w:w="' + width + '" w:type="dxa"/>' + span + vMerge + shade +
      '<w:tcBorders>' +
      '<w:top w:val="single" w:sz="4" w:color="000000"/>' +
      '<w:left w:val="single" w:sz="4" w:color="000000"/>' +
      '<w:bottom w:val="single" w:sz="4" w:color="000000"/>' +
      '<w:right w:val="single" w:sz="4" w:color="000000"/>' +
      '</w:tcBorders></w:tcPr>' +
      '<w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr>' +
      '<w:r><w:rPr>' + bold +
      '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>' +
      '<w:t xml:space="preserve">' + xmlEscape(text == null || text === "" ? "—" : text) +
      '</w:t></w:r></w:p></w:tc>'
    );
  }
  function wRow(cells) {
    return '<w:tr>' + cells.join("") + '</w:tr>';
  }
  function buildSclDocumentXml(project) {
    const snap = project && project.conformanceCert;
    const eng = (snap && snap.engineer) || getEngineerDefaults();
    const drawings = ((snap && snap.drawingNumbers) || project.drawingNumbers || []).join(" + ") || "—";
    const pType =
      (snap && snap.projectType) ||
      project.projectType ||
      ((project.structureTypes || [])[0]) ||
      "Photovoltaic Mounting system";
    const ref = (snap && snap.ref) || project.conformanceRef || "LMX-SCL-DRAFT";
    const issued =
      (snap && snap.dateLabel) ||
      (project.conformanceIssuedAt
        ? ScfHelper.issueDateParts(project.conformanceIssuedAt).dateLabel
        : ScfHelper.issueDateParts(new Date()).dateLabel);
    const clientName = (snap && snap.clientName) || project.clientName || "—";
    const projectName = (snap && snap.projectName) || project.projectName || "—";
    const invoiceNumber = (snap && snap.invoiceNumber) || project.invoiceNumber || "—";
    const soNumber = (snap && snap.salesOrderNumber) || project.salesOrderNumber || "—";
    const address = (snap && snap.address) || project.address || "—";
    const contactPerson = (snap && snap.contactPerson) || project.contactPerson || "—";
    const sd = normalizeDesignScope((snap && snap.structuralDesign) || project.structuralDesign);
    const fd = normalizeDesignScope((snap && snap.foundationDesign) || project.foundationDesign);
    const intro =
      "As a practising Structural Engineer and registered as a Professional Engineer Technologist under the provisions of the Engineering Profession Act, 2000 (Act No. 46 of 2000), I hereby certify that the Photovoltaic Mounting system (" +
      pType +
      ") analysed complies with the National Building Regulations, SANS 10400-Part B — Structural Design Building Regulations.";
    const refLine =
      "Ref: " +
      ref +
      " ___________________________________________________________" +
      issued +
      "____________";
    const tblBorders =
      '<w:tblBorders>' +
      '<w:top w:val="single" w:sz="4" w:color="000000"/>' +
      '<w:left w:val="single" w:sz="4" w:color="000000"/>' +
      '<w:bottom w:val="single" w:sz="4" w:color="000000"/>' +
      '<w:right w:val="single" w:sz="4" w:color="000000"/>' +
      '<w:insideH w:val="single" w:sz="4" w:color="000000"/>' +
      '<w:insideV w:val="single" w:sz="4" w:color="000000"/>' +
      "</w:tblBorders>";
    // Project details: 4-col grid matching sample (label|value|label|value) with colspan-3 value rows
    const projTbl =
      '<w:tbl><w:tblPr><w:tblW w:w="10456" w:type="dxa"/><w:tblLayout w:type="fixed"/>' +
      tblBorders +
      "</w:tblPr>" +
      '<w:tblGrid><w:gridCol w:w="1696"/><w:gridCol w:w="4111"/><w:gridCol w:w="1418"/><w:gridCol w:w="3231"/></w:tblGrid>' +
      wRow([
        wTc("Client Name", { bold: true, shade: "F4F6F8", width: 1696, vMerge: "restart" }),
        wTc(clientName, { width: 4111, vMerge: "restart" }),
        wTc("Invoice No.", { bold: true, shade: "F4F6F8", width: 1418 }),
        wTc(invoiceNumber, { width: 3231 }),
      ]) +
      wRow([
        wTc("Client Name", { bold: true, shade: "F4F6F8", width: 1696, vMerge: "continue" }),
        wTc(clientName, { width: 4111, vMerge: "continue" }),
        wTc("SO No.", { bold: true, shade: "F4F6F8", width: 1418 }),
        wTc(soNumber, { width: 3231 }),
      ]) +
      wRow([
        wTc("Project Name", { bold: true, shade: "F4F6F8", width: 1696 }),
        wTc(projectName, { width: 4111 }),
        wTc("Drawing No.", { bold: true, shade: "F4F6F8", width: 1418 }),
        wTc(drawings, { width: 3231 }),
      ]) +
      wRow([
        wTc("Project Type", { bold: true, shade: "F4F6F8", width: 1696 }),
        wTc(pType, { width: 8760, span: 3 }),
      ]) +
      wRow([
        wTc("Address", { bold: true, shade: "F4F6F8", width: 1696 }),
        wTc(address, { width: 8760, span: 3 }),
      ]) +
      wRow([
        wTc("Contact Person", { bold: true, shade: "F4F6F8", width: 1696 }),
        wTc(contactPerson, { width: 8760, span: 3 }),
      ]) +
      "</w:tbl>";
    const designTbl =
      '<w:tbl><w:tblPr><w:tblW w:w="10456" w:type="dxa"/><w:tblLayout w:type="fixed"/>' +
      tblBorders +
      "</w:tblPr>" +
      '<w:tblGrid><w:gridCol w:w="5228"/><w:gridCol w:w="2614"/><w:gridCol w:w="2614"/></w:tblGrid>' +
      wRow([
        wTc("Structural Design", { bold: true, shade: "F4F6F8", width: 5228 }),
        wTc(designTick(sd.designed) + " Designed", { width: 2614 }),
        wTc(designTick(sd.checked) + " Checked", { width: 2614 }),
      ]) +
      wRow([
        wTc("Foundation Design", { bold: true, shade: "F4F6F8", width: 5228 }),
        wTc(designTick(fd.designed) + " Designed", { width: 2614 }),
        wTc(designTick(fd.checked) + " Checked", { width: 2614 }),
      ]) +
      "</w:tbl>";
    const engTbl =
      '<w:tbl><w:tblPr><w:tblW w:w="10456" w:type="dxa"/><w:tblLayout w:type="fixed"/>' +
      tblBorders +
      "</w:tblPr>" +
      '<w:tblGrid><w:gridCol w:w="1980"/><w:gridCol w:w="8476"/></w:tblGrid>' +
      wRow([wTc("Pr. Engineer", { bold: true, shade: "F4F6F8", width: 1980 }), wTc(eng.name || "—", { bold: true, width: 8476 })]) +
      wRow([wTc("ECSA No.", { bold: true, shade: "F4F6F8", width: 1980 }), wTc(eng.ecsaNo || "—", { width: 8476 })]) +
      wRow([wTc("Business Name", { bold: true, shade: "F4F6F8", width: 1980 }), wTc(eng.business || "—", { width: 8476 })]) +
      wRow([wTc("Business Address", { bold: true, shade: "F4F6F8", width: 1980 }), wTc(eng.address || "—", { width: 8476 })]) +
      wRow([wTc("Contact Details", { bold: true, shade: "F4F6F8", width: 1980 }), wTc(eng.contact || "—", { width: 8476 })]) +
      "</w:tbl>";
    const body =
      wPara(refLine, { bold: true, sz: 20, center: true, after: 200 }) +
      wPara("STRUCTURAL COMPLIANCE FORM:", { bold: true, sz: 28, after: 160 }) +
      wPara(intro, { sz: 20, justify: true, after: 200 }) +
      wPara("Project Details", { bold: true, sz: 22, after: 80 }) +
      projTbl +
      wEmpty() +
      designTbl +
      wEmpty() +
      wPara("Practising Engineer Details", { bold: true, sz: 22, after: 80 }) +
      engTbl +
      wEmpty() +
      wPara(
        "We respectfully direct the client's attention to the stipulations outlined in Regulation 11(2) of the Construction Regulations 2014, which are derived from the Occupational Health & Safety Act No. 85 of 1993. This regulation mandates that any structure must undergo periodic inspection by competent individuals to ensure its ongoing safety and integrity.",
        { sz: 20, justify: true, after: 160 }
      ) +
      wPara(
        "It is imperative to note that this form does not imply acceptance of any site work performed by the contractor if it deviates from the building code or the contractual specifications outlined in the project documents.",
        { sz: 20, justify: true, after: 160 }
      ) +
      wPara(
        'This document is not a replacement or substitute for “Form 2” or “Form 4”. It is strongly recommended that you apply for building approval from the applicable local authority/Municipality.',
        { sz: 20, justify: true, after: 200 }
      ) +
      wPara("Yours faithfully,", { sz: 20, after: 200 }) +
      wPara(eng.name || "", { bold: true, sz: 20, after: 40 }) +
      wPara("Pr. Eng.", { sz: 20, after: 40 }) +
      wPara(eng.contact || "", { sz: 20, after: 40 });

    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" ' +
      'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" ' +
      'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
      'xmlns:v="urn:schemas-microsoft-com:vml" ' +
      'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
      'xmlns:w10="urn:schemas-microsoft-com:office:word" ' +
      'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" ' +
      'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" ' +
      'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" ' +
      'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" ' +
      'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" ' +
      'mc:Ignorable="w14 wp14">' +
      '<w:body>' +
      body +
      // A4 + ~0.5" margins (sample)
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="720" w:footer="720" w:gutter="0"/>' +
      '</w:sectPr></w:body></w:document>'
    );
  }
  async function downloadSclDocx(project) {
    if (typeof JSZip === "undefined") {
      throw new Error("JSZip failed to load");
    }
    const ref = (project.conformanceRef || "LMX-SCL-DRAFT").replace(/[^\w.-]+/g, "_");
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        "</Types>"
    );
    zip.folder("_rels").file(
      ".rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        "</Relationships>"
    );
    const word = zip.folder("word");
    word.file("document.xml", buildSclDocumentXml(project));
    word.folder("_rels").file(
      "document.xml.rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'
    );
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ref + ".docx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function issueConformance(project) {
    if (!project) return;
    const blockers = sclGate(project);
    if (blockers.length) {
      toast("Cannot create SC Letter — missing: " + blockers.join("; "), "error");
      return;
    }
    if (isScfIssued(project)) {
      toast("SCL already issued as " + (project.conformanceRef || "approved"), "error");
      openScfPreview(project);
      return;
    }
    if (
      !confirm(
        "Create Structural Conformance Letter for " +
          (project.projectCode || project.projectName || "this project") +
          "?\n\nAllocates next LMX-SCL-YYYY-NNN, stores a certificate snapshot, and downloads a Word (.docx) file."
      )
    ) {
      return;
    }
    project.sclUndoSnapshot = {
      conformanceStatus: normalizeConformanceStatus(project.conformanceStatus),
      conformanceRef: project.conformanceRef || "",
      conformanceIssuedAt: project.conformanceIssuedAt || null,
      conformanceCert: project.conformanceCert ? JSON.parse(JSON.stringify(project.conformanceCert)) : null,
      activePhaseId: project.activePhaseId || null,
    };
    const settings = state.data.settings || (state.data.settings = {});
    const meta = ScfHelper.allocateRef(settings, new Date());
    const snap = ScfHelper.snapshot(project, getEngineerDefaults(), meta);
    project.conformanceStatus = "approved";
    project.conformanceRef = meta.ref;
    project.conformanceIssuedAt = meta.issuedAt;
    project.conformanceCert = snap;
    if (!Array.isArray(project.sclHistory)) project.sclHistory = [];
    project.sclHistory.push({
      ref: meta.ref,
      issuedAt: meta.issuedAt,
      action: "issued",
      at: meta.issuedAt,
      seq: meta.seq,
      year: meta.year,
    });
    const donePh = (project.phases || []).find((ph) => isDonePhaseName(ph.name));
    if (donePh) project.activePhaseId = donePh.id;
    project.updatedAt = nowIso();
    cacheDataLocally();
    toast(localSaveHint("Created " + meta.ref), "success");
    render();
    downloadSclDocx(project).catch((err) => {
      console.error(err);
      toast("Word download failed — opening print preview instead", "error");
      openScfPreview(project);
    });
  }

  function parseSclRef(ref) {
    const m = String(ref || "").trim().match(/^LMX-SCL-(\d{4})-(\d+)$/i);
    if (!m) return null;
    return { year: Number(m[1]), seq: Number(m[2]) };
  }

  function undoConformance(project) {
    if (!project || !project.sclUndoSnapshot) {
      toast("Nothing to undo for this SC Letter", "error");
      return;
    }
    if (
      !confirm(
        "Undo Create SC Letter for " +
          (project.projectCode || project.projectName || "this project") +
          "?\n\nRestores the pre-issue conformance snapshot."
      )
    ) {
      return;
    }
    const voidedRef = project.conformanceRef || "";
    const snap = project.sclUndoSnapshot;
    project.conformanceStatus = normalizeConformanceStatus(snap.conformanceStatus);
    project.conformanceRef = snap.conformanceRef || "";
    project.conformanceIssuedAt = snap.conformanceIssuedAt || null;
    project.conformanceCert = snap.conformanceCert || null;
    project.activePhaseId = snap.activePhaseId || project.activePhaseId || null;
    project.sclUndoSnapshot = null;

    const settings = state.data.settings || (state.data.settings = {});
    const parsed = parseSclRef(voidedRef);
    let decremented = false;
    if (parsed) {
      const year = Number(settings.scfYear);
      let seq = Number(settings.scfSeq);
      if (!Number.isFinite(seq) || seq < 1) seq = 1;
      // If this ref was the last allocated number (scfSeq points at next), decrement.
      if (parsed.year === year && parsed.seq === seq - 1) {
        settings.scfSeq = Math.max(1, seq - 1);
        if (settings.sclSeq != null) settings.sclSeq = settings.scfSeq;
        decremented = true;
      }
    }
    if (!decremented) {
      if (!Array.isArray(settings.voidedLetters)) settings.voidedLetters = [];
      settings.voidedLetters.push({
        ref: voidedRef,
        projectId: project.id,
        issuedAt: null,
        voidedAt: nowIso(),
      });
    }
    if (!Array.isArray(project.sclHistory)) project.sclHistory = [];
    project.sclHistory.push({
      ref: voidedRef,
      issuedAt: null,
      action: decremented ? "undone" : "voided",
      at: nowIso(),
    });
    project.updatedAt = nowIso();
    cacheDataLocally();
    toast(
      localSaveHint(
        decremented
          ? "Undid " + voidedRef + " (sequence restored)"
          : "Undid " + voidedRef + " (marked voided — sequence left unchanged)"
      ),
      "success"
    );
    render();
  }

  function buildScfHtml(project) {
    const snap = project && project.conformanceCert;
    const eng = (snap && snap.engineer) || getEngineerDefaults();
    const drawings = ((snap && snap.drawingNumbers) || project.drawingNumbers || []).join(" + ") || "—";
    const struct =
      (snap && snap.projectType) ||
      (project.structureTypes || []).join(", ") ||
      project.projectType ||
      "Photovoltaic mounting system";
    const ref = (snap && snap.ref) || project.conformanceRef || "LMX-SCL-DRAFT";
    const issued =
      (snap && snap.dateLabel) ||
      (project.conformanceIssuedAt
        ? ScfHelper.issueDateParts(project.conformanceIssuedAt).dateLabel
        : ScfHelper.issueDateParts(new Date()).dateLabel);
    const certType = (snap && snap.projectType) || project.projectType || struct;
    const clientName = (snap && snap.clientName) || project.clientName || "—";
    const projectName = (snap && snap.projectName) || project.projectName || "—";
    const invoiceNumber = (snap && snap.invoiceNumber) || project.invoiceNumber || "—";
    const soNumber = (snap && snap.salesOrderNumber) || project.salesOrderNumber || "—";
    const address = (snap && snap.address) || project.address || "—";
    const contactPerson = (snap && snap.contactPerson) || project.contactPerson || "—";
    const poNumber = (snap && snap.poNumber) || project.poNumber || "";
    const popReference = (snap && snap.popReference) || project.popReference || "";
    const sd = normalizeDesignScope((snap && snap.structuralDesign) || (project && project.structuralDesign));
    const fd = normalizeDesignScope((snap && snap.foundationDesign) || (project && project.foundationDesign));
    return (
      "<!DOCTYPE html><html><head><meta charset='utf-8'/>" +
      "<title>" +
      escapeHtml(ref) +
      " — Structural Compliance Letter</title>" +
      "<style>" +
      "body{font-family:Georgia,'Times New Roman',serif;max-width:820px;margin:24px auto;padding:0 16px;color:#111;line-height:1.45}" +
      "h1{font-size:1.25rem;letter-spacing:0.04em;margin:1.2rem 0 0.6rem}" +
      ".ref{white-space:pre-wrap;font-family:ui-monospace,Consolas,monospace;font-size:0.92rem;border-bottom:1px solid #333;padding-bottom:0.35rem;margin-bottom:1rem}" +
      "table{width:100%;border-collapse:collapse;margin:0.75rem 0 1.1rem}" +
      "td{border:1px solid #333;padding:0.45rem 0.55rem;vertical-align:top;font-size:0.95rem}" +
      "td.lbl{width:22%;font-weight:700;background:#f4f6f8}" +
      ".note{font-size:0.9rem;margin:0.55rem 0}" +
      ".sign{margin-top:1.6rem}" +
      "@media print{body{margin:12mm} .no-print{display:none}}" +
      "</style></head><body>" +
      "<div class='no-print' style='margin-bottom:12px'>" +
      "<button onclick='window.print()'>Print</button> " +
      "<button onclick='window.close()'>Close</button>" +
      "<p style='font-size:12px;color:#666'>SAMPLE / fictional preview — not a legal certificate.</p></div>" +
      "<div class='ref'>Ref: " +
      escapeHtml(ref) +
      " ________________________________ " +
      escapeHtml(issued) +
      "</div>" +
      "<h1>STRUCTURAL COMPLIANCE FORM:</h1>" +
      "<p>As a practising Structural Engineer and registered as a Professional Engineer / Technologist under the provisions of the Engineering Profession Act, 2000 (Act No. 46 of 2000), I hereby certify that the " +
      escapeHtml(certType) +
      " analysed complies with the National Building Regulations, SANS 10400-Part B — Structural Design Building Regulations.</p>" +
      "<h1>Project Details</h1>" +
      "<table>" +
      "<tr><td class='lbl' rowspan='2'>Client Name</td><td rowspan='2'>" +
      escapeHtml(clientName) +
      "</td><td class='lbl'>Invoice No.</td><td>" +
      escapeHtml(invoiceNumber) +
      "</td></tr>" +
      "<tr><td class='lbl'>SO No.</td><td>" +
      escapeHtml(soNumber) +
      "</td></tr>" +
      "<tr><td class='lbl'>Project Name</td><td>" +
      escapeHtml(projectName) +
      "</td><td class='lbl'>Drawing No.</td><td>" +
      escapeHtml(drawings) +
      "</td></tr>" +
      "<tr><td class='lbl'>Project Type</td><td colspan='3'>" +
      escapeHtml(struct) +
      "</td></tr>" +
      "<tr><td class='lbl'>Address</td><td colspan='3'>" +
      escapeHtml(address) +
      "</td></tr>" +
      "<tr><td class='lbl'>Contact Person</td><td colspan='3'>" +
      escapeHtml(contactPerson) +
      "</td></tr>" +
      "<tr><td class='lbl'>PO / POP</td><td colspan='3'>" +
      escapeHtml([poNumber, popReference].filter(Boolean).join(" · ") || "—") +
      "</td></tr>" +
      "</table>" +
      sclDesignBlocksHtml(sd, fd) +
      "<h1>Practising Engineer Details</h1>" +
      "<table>" +
      "<tr><td class='lbl'>Pr. Engineer</td><td>" +
      escapeHtml(eng.name) +
      "</td></tr>" +
      "<tr><td class='lbl'>ECSA No.</td><td>" +
      escapeHtml(eng.ecsaNo) +
      "</td></tr>" +
      "<tr><td class='lbl'>Business Name</td><td>" +
      escapeHtml(eng.business) +
      "</td></tr>" +
      "<tr><td class='lbl'>Business Address</td><td>" +
      escapeHtml(eng.address) +
      "</td></tr>" +
      "<tr><td class='lbl'>Contact Details</td><td>" +
      escapeHtml(eng.contact) +
      "</td></tr>" +
      "</table>" +
      "<p class='note'>We respectfully direct the client's attention to the stipulations outlined in Regulation 11(2) of the Construction Regulations 2014, which are derived from the Occupational Health &amp; Safety Act No. 85 of 1993. This regulation mandates that any structure must undergo periodic inspection by competent individuals to ensure its ongoing safety and integrity.</p>" +
      "<p class='note'>It is imperative to note that this form does not imply acceptance of any site work performed by the contractor if it deviates from the building code or the contractual specifications outlined in the project documents.</p>" +
      "<p class='note'>This document is not a replacement or substitute for “Form 2” or “Form 4”. It is strongly recommended that you apply for building approval from the applicable local authority/Municipality.</p>" +
      "<div class='sign'><p>Yours faithfully,</p>" +
      "<p><strong>" +
      escapeHtml(eng.name) +
      "</strong><br/>Pr. Eng.<br/>" +
      escapeHtml(eng.contact) +
      "</p></div>" +
      "</body></html>"
    );
  }

  function openScfPreview(project) {
    const html = buildScfHtml(project);
    const w = window.open("", "_blank");
    if (!w) {
      toast("Popup blocked — allow popups to preview the SCL print view.", "error");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  function openSettings() {
    const s = state.settings;
    const ds = state.data.settings || {};
    const statuses = getStatuses();
    const eng = getEngineerDefaults();
    showOverlay(
      `<div class="panel wide" role="dialog" aria-label="Settings">` +
        `<h2>Settings <span class="version-badge" style="background:#eef2f7;color:var(--navy)">v${APP_VERSION}</span></h2>` +
        `<div class="form-group"><label>GitHub owner</label><input id="set-owner" value="${escapeHtml(s.owner)}" /></div>` +
        `<div class="form-group"><label>Repository</label><input id="set-repo" value="${escapeHtml(s.repo)}" /></div>` +
        `<div class="form-group"><label>Personal Access Token (PAT)</label>` +
        `<input id="set-pat" type="password" autocomplete="off" value="" placeholder="${s.pat ? "•••• token saved — paste to replace" : "ghp_… or github_pat_…"}" />` +
        `<p class="hint">Stored only in this browser's localStorage — never written to projects.json. Each engineer uses their own PAT.</p></div>` +
        `<div class="form-group"><label>My name (for Dashboard “My work”)</label>` +
        `<input id="set-my-name" value="${escapeHtml(ds.myAssignee || "")}" placeholder="e.g. Alex Engineer" />` +
        `<p class="hint">Match the assignee string used on tasks.</p></div>` +
        `<div class="settings-section"><h3>Structural Conformance Letter</h3>` +
        `<div class="form-row">` +
        `<div class="form-group"><label>SCL year</label><input id="set-scf-year" type="number" min="2000" max="2100" value="${escapeHtml(String(ds.scfYear || new Date().getFullYear()))}" /></div>` +
        `<div class="form-group"><label>Next SCL sequence</label><input id="set-scf-seq" type="number" min="1" value="${escapeHtml(String(ds.scfSeq || 1))}" />` +
        `<p class="hint">Next ref will be <code>LMX-SCL-YEAR-NNN</code> (never bare 008). Legacy LMX-SCF-* refs stay readable.</p></div>` +
        `</div>` +
        `<div class="form-row">` +
        `<div class="form-group"><label>Engineer name</label><input id="set-eng-name" value="${escapeHtml(eng.name)}" /></div>` +
        `<div class="form-group"><label>ECSA no</label><input id="set-eng-ecsa" value="${escapeHtml(eng.ecsaNo)}" /></div>` +
        `</div>` +
        `<div class="form-group"><label>Business name</label><input id="set-eng-biz" value="${escapeHtml(eng.business)}" /></div>` +
        `<div class="form-group"><label>Business address</label><input id="set-eng-addr" value="${escapeHtml(eng.address)}" /></div>` +
        `<div class="form-group"><label>Contact details</label><input id="set-eng-contact" value="${escapeHtml(eng.contact)}" /></div>` +
        `<p class="hint">Editable defaults printed on SCL letters (fictional SAMPLE values ship in seed data).</p></div>` +
        `<div class="settings-section"><h3>Project types</h3>` +
        `<div class="dyn-list" id="set-project-types"></div>` +
        `<button type="button" class="btn btn-secondary btn-sm" id="set-add-project-type" style="margin-top:0.4rem">+ Project type</button>` +
        `<p class="hint">Add / rename / delete. Used on project forms (free text still allowed).</p></div>` +
        `<div class="settings-section"><h3>Structure types</h3>` +
        `<div class="dyn-list" id="set-structure-types"></div>` +
        `<button type="button" class="btn btn-secondary btn-sm" id="set-add-structure-type" style="margin-top:0.4rem">+ Structure type</button>` +
        `<p class="hint">Canonical defaults include Carport H-Max … Custom. Add more as needed.</p></div>` +
        `<div class="settings-section"><h3>Task types (add / edit / remove)</h3>` +
        `<div class="dyn-list" id="set-task-types"></div>` +
        `<button type="button" class="btn btn-secondary btn-sm" id="set-add-task-type" style="margin-top:0.4rem">+ Task type</button>` +
        `<p class="hint">id is stable (snake_case). Name is the label shown in filters and forms.</p></div>` +
        `<div class="settings-section"><h3>Task statuses (board columns)</h3>` +
        `<div class="dyn-list" id="set-statuses"></div>` +
        `<button type="button" class="btn btn-secondary btn-sm" id="set-add-status" style="margin-top:0.4rem">+ Status</button>` +
        `<p class="hint">Category maps open/done semantics. Order = board column order.</p></div>` +
        `<p class="sync-info">Default phases end with <strong>Done</strong>. Data path: <code>${DATA_PATH}</code>.</p>` +
        `<div class="panel-actions">` +
        `<button type="button" class="btn btn-secondary" id="set-cancel">Cancel</button>` +
        `<button type="button" class="btn" id="set-save">Save settings</button>` +
        `</div></div>`
    );

    const box = document.getElementById("set-statuses");
    const ttBox = document.getElementById("set-task-types");
    function addTaskTypeRow(tt) {
      const row = document.createElement("div");
      row.className = "dyn-row";
      row.innerHTML =
        `<input class="tt-id" value="${escapeHtml((tt && tt.id) || "")}" placeholder="id (e.g. site_visit)" style="max-width:28%" />` +
        `<input class="tt-name" value="${escapeHtml((tt && tt.name) || "")}" placeholder="Label" />` +
        `<button type="button" class="btn btn-secondary btn-sm tt-rm">×</button>`;
      row.querySelector(".tt-rm").onclick = () => row.remove();
      ttBox.appendChild(row);
    }
    getTaskTypes().forEach(addTaskTypeRow);
    const addTtBtn = document.getElementById("set-add-task-type");
    if (addTtBtn) addTtBtn.onclick = () => addTaskTypeRow({ id: "", name: "" });

    const ptBox = document.getElementById("set-project-types");
    const stTypeBox = document.getElementById("set-structure-types");
    function addNamedRow(box, name) {
      const row = document.createElement("div");
      row.className = "dyn-row";
      row.innerHTML =
        `<input class="nt-name" value="${escapeHtml(name || "")}" placeholder="Name" />` +
        `<button type="button" class="btn btn-secondary btn-sm nt-rm">×</button>`;
      row.querySelector(".nt-rm").onclick = () => row.remove();
      box.appendChild(row);
    }
    getProjectTypes().forEach((n) => addNamedRow(ptBox, n));
    getStructureTypes().forEach((n) => addNamedRow(stTypeBox, n));
    const addPt = document.getElementById("set-add-project-type");
    if (addPt) addPt.onclick = () => addNamedRow(ptBox, "");
    const addSt = document.getElementById("set-add-structure-type");
    if (addSt) addSt.onclick = () => addNamedRow(stTypeBox, "");

    function addStatusRow(st) {
      const row = document.createElement("div");
      row.className = "dyn-row";
      row.dataset.id = st.id || "";
      row.innerHTML =
        `<span class="handle" title="Drag order">↕</span>` +
        `<input class="st-name" value="${escapeHtml(st.name || "")}" placeholder="Name" />` +
        `<input class="st-color" type="color" value="${escapeHtml(st.color || "#6b7c93")}" title="Color" style="width:48px;padding:0;height:32px" />` +
        `<select class="st-cat">` +
        `<option value="todo"${st.category === "todo" ? " selected" : ""}>todo</option>` +
        `<option value="doing"${st.category === "doing" ? " selected" : ""}>doing</option>` +
        `<option value="done"${st.category === "done" ? " selected" : ""}>done</option>` +
        `<option value=""${st.category == null || st.category === "" ? " selected" : ""}>—</option>` +
        `</select>` +
        `<button type="button" class="btn btn-secondary btn-sm st-up" title="Move up">↑</button>` +
        `<button type="button" class="btn btn-secondary btn-sm st-down" title="Move down">↓</button>` +
        `<button type="button" class="btn btn-secondary btn-sm st-rm">×</button>`;
      row.querySelector(".st-rm").onclick = () => row.remove();
      row.querySelector(".st-up").onclick = () => {
        if (row.previousElementSibling) box.insertBefore(row, row.previousElementSibling);
      };
      row.querySelector(".st-down").onclick = () => {
        if (row.nextElementSibling) box.insertBefore(row.nextElementSibling, row);
      };
      box.appendChild(row);
    }
    statuses.forEach(addStatusRow);
    document.getElementById("set-add-status").onclick = () =>
      addStatusRow({ id: uid("status"), name: "", color: "#6b7c93", category: "todo" });

    document.getElementById("set-cancel").onclick = closeOverlay;
    document.getElementById("set-save").onclick = () => {
      state.settings.owner = document.getElementById("set-owner").value.trim() || DEFAULT_OWNER;
      state.settings.repo = document.getElementById("set-repo").value.trim() || DEFAULT_REPO;
      const nextPat = document.getElementById("set-pat").value.trim();
      if (nextPat) state.settings.pat = nextPat;
      saveBrowserSettings();

      const nextStatuses = [];
      box.querySelectorAll(".dyn-row").forEach((row) => {
        const name = row.querySelector(".st-name").value.trim();
        if (!name) return;
        const cat = row.querySelector(".st-cat").value;
        nextStatuses.push({
          id: row.dataset.id || uid("status"),
          name,
          color: row.querySelector(".st-color").value || "#6b7c93",
          category: cat === "" ? null : cat,
        });
      });
      if (!nextStatuses.length) {
        toast("Keep at least one status", "error");
        return;
      }
      const valid = new Set(nextStatuses.map((s) => s.id));
      const fallback = nextStatuses[0].id;
      (state.data.tasks || []).forEach((t) => {
        if (!valid.has(t.statusId)) t.statusId = fallback;
      });
      state.data.settings.taskStatuses = nextStatuses;
      state.data.settings.myAssignee = document.getElementById("set-my-name").value.trim();
      const yr = Number(document.getElementById("set-scf-year").value);
      const seq = Number(document.getElementById("set-scf-seq").value);
      state.data.settings.scfYear = Number.isFinite(yr) && yr >= 2000 ? yr : new Date().getFullYear();
      state.data.settings.scfSeq = Number.isFinite(seq) && seq >= 1 ? Math.floor(seq) : 1;
      state.data.settings.engineerDefaults = {
        name: document.getElementById("set-eng-name").value.trim() || DEFAULT_ENGINEER.name,
        ecsaNo: document.getElementById("set-eng-ecsa").value.trim() || DEFAULT_ENGINEER.ecsaNo,
        business: document.getElementById("set-eng-biz").value.trim() || DEFAULT_ENGINEER.business,
        address: document.getElementById("set-eng-addr").value.trim() || DEFAULT_ENGINEER.address,
        contact: document.getElementById("set-eng-contact").value.trim() || DEFAULT_ENGINEER.contact,
      };
      const nextTaskTypes = [];
      const seenTt = new Set();
      ttBox.querySelectorAll(".dyn-row").forEach((row) => {
        let id = row.querySelector(".tt-id").value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_\-]/g, "");
        const name = row.querySelector(".tt-name").value.trim();
        if (!name) return;
        if (!id) id = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_\-]/g, "") || uid("tt");
        if (seenTt.has(id)) return;
        seenTt.add(id);
        nextTaskTypes.push({ id, name });
      });
      if (!nextTaskTypes.length) {
        toast("Keep at least one task type", "error");
        return;
      }
      const validTypes = new Set(nextTaskTypes.map((t) => t.id));
      (state.data.tasks || []).forEach((t) => {
        if (!validTypes.has(t.type)) t.type = nextTaskTypes[0].id;
      });
      state.data.settings.taskTypes = nextTaskTypes;

      const nextProjectTypes = [];
      ptBox.querySelectorAll(".dyn-row").forEach((row) => {
        const name = row.querySelector(".nt-name").value.trim();
        if (name && !nextProjectTypes.includes(name)) nextProjectTypes.push(name);
      });
      const nextStructureTypes = [];
      stTypeBox.querySelectorAll(".dyn-row").forEach((row) => {
        const name = row.querySelector(".nt-name").value.trim();
        if (name && !nextStructureTypes.includes(name)) nextStructureTypes.push(name);
      });
      state.data.settings.projectTypes = nextProjectTypes.length
        ? nextProjectTypes
        : DEFAULT_PROJECT_TYPES.slice();
      state.data.settings.structureTypes = nextStructureTypes.length
        ? nextStructureTypes
        : DEFAULT_STRUCTURE_TYPES.slice();
      cacheDataLocally();
      closeOverlay();
      updateAuthBadge();
      toast(localSaveHint("Settings saved"), "success");
      if (state.settings.pat) fetchGithubUser();
      else {
        state.githubUser = null;
        updateAuthBadge();
      }
      render();
    };
  }

  function openProjectForm(projectId) {
    const isEdit = !!projectId;
    const p = isEdit ? getProject(projectId) : null;
    const drawings = (p && p.drawingNumbers) || [];
    const customs = p && p.customFields ? Object.entries(p.customFields) : [];
    const typeOpts = getProjectTypes();
    const structOpts = getStructureTypes();
    const selectedStructs = new Set((p && p.structureTypes) || []);
    const typeList =
      typeOpts
        .map((t) => `<option value="${escapeHtml(t)}"></option>`)
        .join("") +
      (p && p.projectType && !typeOpts.includes(p.projectType)
        ? `<option value="${escapeHtml(p.projectType)}"></option>`
        : "");

    showOverlay(
      `<div class="panel wide" role="dialog">` +
        `<h2>${isEdit ? "Edit project" : "New project"}</h2>` +
        `<div class="form-row">` +
        `<div class="form-group"><label>Client name</label><input id="pf-client" value="${escapeHtml(p ? p.clientName : "")}" /></div>` +
        `<div class="form-group"><label>Project code</label><input id="pf-code" value="${escapeHtml(p ? p.projectCode : "")}" /></div>` +
        `</div>` +
        `<div class="form-group"><label>Project name</label><input id="pf-name" value="${escapeHtml(p ? p.projectName : "")}" /></div>` +
        `<div class="form-group"><label>Sales order number</label><input id="pf-so" value="${escapeHtml(p ? p.salesOrderNumber : "")}" /></div>` +
        `<div class="form-row three">` +
        `<div class="form-group"><label>PO number</label><input id="pf-po" value="${escapeHtml(p ? p.poNumber || "" : "")}" placeholder="PO-…" /></div>` +
        `<div class="form-group"><label>POP reference</label><input id="pf-pop" value="${escapeHtml(p ? p.popReference || "" : "")}" placeholder="POP-…" /></div>` +
        `<div class="form-group"><label>Invoice number</label><input id="pf-inv" value="${escapeHtml(p ? p.invoiceNumber || "" : "")}" placeholder="INV-…" /></div>` +
        `</div>` +
        `<div class="form-row">` +
        `<div class="form-group"><label>Project type</label>` +
        `<input id="pf-type" list="pf-type-list" value="${escapeHtml(p ? p.projectType || "" : "")}" placeholder="Select or type…" />` +
        `<datalist id="pf-type-list">${typeList}</datalist>` +
        `<p class="hint">Selectable list from Settings + free text.</p></div>` +
        `<div class="form-group"><label>Address</label><input id="pf-address" value="${escapeHtml(p ? p.address || "" : "")}" placeholder="Site / project address" /></div>` +
        `</div>` +
        `<div class="form-group"><label>Contact person</label><input id="pf-contact" value="${escapeHtml(p ? p.contactPerson || "" : "")}" placeholder="Name · phone" /></div>` +
        `<div class="scl-design-blocks">` +
        `<div class="scl-design-block"><h4>Structural Design</h4><div class="checks">` +
        `<label class="checkbox-label"><input type="checkbox" id="pf-sd-designed"${p && p.structuralDesign && p.structuralDesign.designed ? " checked" : ""}/> Designed</label>` +
        `<label class="checkbox-label"><input type="checkbox" id="pf-sd-checked"${p && p.structuralDesign && p.structuralDesign.checked ? " checked" : ""}/> Checked</label>` +
        `</div></div>` +
        `<div class="scl-design-block"><h4>Foundation Design</h4><div class="checks">` +
        `<label class="checkbox-label"><input type="checkbox" id="pf-fd-designed"${p && p.foundationDesign && p.foundationDesign.designed ? " checked" : ""}/> Designed</label>` +
        `<label class="checkbox-label"><input type="checkbox" id="pf-fd-checked"${p && p.foundationDesign && p.foundationDesign.checked ? " checked" : ""}/> Checked</label>` +
        `</div></div></div>` +
        `<div class="form-group"><label>Structure types</label>` +
        `<div class="chip-check-grid" id="pf-structures">` +
        structOpts
          .map((s) => {
            const on = selectedStructs.has(s);
            return (
              `<label class="checkbox-label chip-check"><input type="checkbox" class="pf-struct" value="${escapeHtml(s)}"${on ? " checked" : ""}/> ${escapeHtml(s)}</label>`
            );
          })
          .join("") +
        `</div>` +
        `<input id="pf-struct-extra" value="" placeholder="Add other structure type (comma-separated)" style="margin-top:0.4rem" />` +
        `</div>` +
        `<div class="form-row">` +
        `<div class="form-group"><label>Municipal sign-off</label>` +
        `<select id="pf-muni-signoff">` +
        ["pending", "approved", "n/a"].map((s) => {
          const cur = p ? normalizeMunicipalSignOff(p.municipalSignOff, p.engineeringSignOff) : "pending";
          const lab = s === "n/a" ? "N/A" : s.charAt(0).toUpperCase() + s.slice(1);
          return `<option value="${s}"${cur === s ? " selected" : ""}>${lab}</option>`;
        }).join("") +
        `</select>` +
        `<p class="hint">pending | approved | n/a (migrates from legacy checkbox).</p></div>` +
        `<div class="form-group"><label>Conformance</label>` +
        `<select id="pf-conformance">` +
        CONFORMANCE_STATUSES.map((s) => {
          const cur = p ? normalizeConformanceStatus(p.conformanceStatus) : "none";
          return `<option value="${s.id}"${cur === s.id ? " selected" : ""}>${escapeHtml(s.name)}</option>`;
        }).join("") +
        `</select>` +
        `<p class="hint">Create via <strong>Create SC Letter</strong> on the project (sets approved + LMX-SCL ref).</p></div>` +
        `</div>` +
        `<div class="form-row" id="pf-signoff-extra">` +
        `<div class="form-group"><label>Sign-off at</label><input type="date" id="pf-signoff-at" value="${escapeHtml(p && p.engineeringSignOffAt ? String(p.engineeringSignOffAt).slice(0, 10) : "")}" /></div>` +
        `<div class="form-group"><label>Sign-off by</label><input id="pf-signoff-by" value="${escapeHtml(p ? p.engineeringSignOffBy || "" : "")}" placeholder="Name" /></div>` +
        `</div>` +
        (p && p.conformanceRef
          ? `<p class="hint">Conformance ref: <strong>${escapeHtml(p.conformanceRef)}</strong>` +
            (p.conformanceIssuedAt ? ` · issued ${escapeHtml(String(p.conformanceIssuedAt).slice(0, 10))}` : "") +
            `</p>`
          : "") +
        `<div class="form-group"><label>Drawing numbers</label>` +
        `<div class="dyn-list" id="pf-drawings"></div>` +
        `<button type="button" class="btn btn-secondary btn-sm" id="pf-add-drawing" style="margin-top:0.4rem">+ Drawing</button></div>` +
        `<div class="form-group"><label>Custom fields</label>` +
        `<div class="dyn-list" id="pf-customs"></div>` +
        `<button type="button" class="btn btn-secondary btn-sm" id="pf-add-custom" style="margin-top:0.4rem">+ Field</button></div>` +
        (!isEdit
          ? `<p class="hint">New projects get default phases ending in <strong>Done</strong> (terminal for SCL).</p>`
          : "") +
        `<div class="panel-actions">` +
        (isEdit ? `<button type="button" class="btn btn-danger" id="pf-delete" style="margin-right:auto">Delete</button>` : "") +
        `<button type="button" class="btn btn-secondary" id="pf-cancel">Cancel</button>` +
        `<button type="button" class="btn" id="pf-save">Save</button>` +
        `</div></div>`
    );

    const drawBox = document.getElementById("pf-drawings");
    const custBox = document.getElementById("pf-customs");
    function addDrawingRow(val) {
      const row = document.createElement("div");
      row.className = "dyn-row";
      row.innerHTML =
        `<input class="pf-draw-val" value="${escapeHtml(val || "")}" placeholder="e.g. DRW-001" />` +
        `<button type="button" class="btn btn-secondary btn-sm pf-rm">×</button>`;
      row.querySelector(".pf-rm").onclick = () => row.remove();
      drawBox.appendChild(row);
    }
    function addCustomRow(k, v) {
      const row = document.createElement("div");
      row.className = "dyn-row";
      row.innerHTML =
        `<input class="pf-cf-key" value="${escapeHtml(k || "")}" placeholder="Field name" />` +
        `<input class="pf-cf-val" value="${escapeHtml(v || "")}" placeholder="Value" />` +
        `<button type="button" class="btn btn-secondary btn-sm pf-rm">×</button>`;
      row.querySelector(".pf-rm").onclick = () => row.remove();
      custBox.appendChild(row);
    }
    (drawings.length ? drawings : [""]).forEach(addDrawingRow);
    (customs.length ? customs : [["", ""]]).forEach(([k, v]) => addCustomRow(k, v));
    document.getElementById("pf-add-drawing").onclick = () => addDrawingRow("");
    document.getElementById("pf-add-custom").onclick = () => addCustomRow("", "");
    document.getElementById("pf-cancel").onclick = closeOverlay;
    function syncSignOffExtra() {
      const el = document.getElementById("pf-muni-signoff");
      const v = el ? el.value : "pending";
      const wrap = document.getElementById("pf-signoff-extra");
      if (wrap) wrap.style.opacity = v === "approved" ? "1" : "0.55";
    }
    document.getElementById("pf-muni-signoff").onchange = syncSignOffExtra;
    syncSignOffExtra();

    if (isEdit) {
      document.getElementById("pf-delete").onclick = () => {
        if (!confirm("Permanently delete this project and unlink its tasks (tasks become standalone)?")) return;
        state.data.tasks.forEach((t) => {
          if (t.projectId === projectId) t.projectId = null;
        });
        state.data.projects = state.data.projects.filter((x) => x.id !== projectId);
        cacheDataLocally();
        closeOverlay();
        setView("projects");
        toast("Project deleted", "success");
      };
    }

    document.getElementById("pf-save").onclick = () => {
      const clientName = document.getElementById("pf-client").value.trim();
      const projectName = document.getElementById("pf-name").value.trim();
      const projectCode = document.getElementById("pf-code").value.trim();
      const salesOrderNumber = document.getElementById("pf-so").value.trim();
      if (!projectName && !projectCode) {
        toast("Enter at least a project name or code", "error");
        return;
      }
      const drawingNumbers = [...drawBox.querySelectorAll(".pf-draw-val")].map((i) => i.value.trim()).filter(Boolean);
      const customFields = {};
      custBox.querySelectorAll(".dyn-row").forEach((row) => {
        const k = row.querySelector(".pf-cf-key").value.trim();
        const v = row.querySelector(".pf-cf-val").value.trim();
        if (k) customFields[k] = v;
      });
      const municipalSignOff = normalizeMunicipalSignOff(document.getElementById("pf-muni-signoff").value);
      const engineeringSignOff = municipalSignOff === "approved";
      let engineeringSignOffAt = document.getElementById("pf-signoff-at").value || null;
      let engineeringSignOffBy = document.getElementById("pf-signoff-by").value.trim();
      if (engineeringSignOff && !engineeringSignOffAt) engineeringSignOffAt = todayStr();
      if (!engineeringSignOff) {
        engineeringSignOffAt = engineeringSignOffAt || null;
      }
      const conformanceStatus = normalizeConformanceStatus(document.getElementById("pf-conformance").value);
      const poNumber = document.getElementById("pf-po").value.trim();
      const popReference = document.getElementById("pf-pop").value.trim();
      const invoiceNumber = document.getElementById("pf-inv").value.trim();
      const address = document.getElementById("pf-address").value.trim();
      const contactPerson = document.getElementById("pf-contact").value.trim();
      const projectType = document.getElementById("pf-type").value.trim();
      const structureTypes = [...document.querySelectorAll(".pf-struct:checked")].map((el) => el.value);
      const extraStructs = document.getElementById("pf-struct-extra").value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      extraStructs.forEach((s) => {
        if (!structureTypes.includes(s)) structureTypes.push(s);
      });
      // Remember free-text project type in settings list
      if (projectType) {
        const pts = getProjectTypes();
        if (!pts.includes(projectType)) {
          state.data.settings.projectTypes = pts.concat([projectType]);
        }
      }
      if (extraStructs.length) {
        const sts = getStructureTypes();
        const next = sts.slice();
        extraStructs.forEach((s) => {
          if (!next.includes(s)) next.push(s);
        });
        state.data.settings.structureTypes = next;
      }

      const commercial = {
        poNumber,
        popReference,
        invoiceNumber,
        address,
        contactPerson,
        projectType,
        structureTypes,
        structuralDesign: normalizeDesignScope({
          designed: !!(document.getElementById("pf-sd-designed") && document.getElementById("pf-sd-designed").checked),
          checked: !!(document.getElementById("pf-sd-checked") && document.getElementById("pf-sd-checked").checked),
        }),
        foundationDesign: normalizeDesignScope({
          designed: !!(document.getElementById("pf-fd-designed") && document.getElementById("pf-fd-designed").checked),
          checked: !!(document.getElementById("pf-fd-checked") && document.getElementById("pf-fd-checked").checked),
        }),
      };

      if (isEdit) {
        Object.assign(p, {
          clientName,
          projectName,
          projectCode,
          salesOrderNumber,
          drawingNumbers,
          customFields,
          municipalSignOff,
          engineeringSignOff,
          engineeringSignOffAt,
          engineeringSignOffBy,
          conformanceStatus,
          ...commercial,
          updatedAt: nowIso(),
        });
      } else {
        const np = normalizeProject({
          id: uid("proj"),
          clientName,
          projectName,
          projectCode,
          salesOrderNumber,
          drawingNumbers,
          customFields,
          municipalSignOff,
          engineeringSignOff,
          engineeringSignOffAt,
          engineeringSignOffBy,
          conformanceStatus,
          ...commercial,
          phases: DEFAULT_PHASES.map((ph) => ({ id: uid("phase"), name: ph.name })),
          archived: false,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
        state.data.projects.push(np);
      }
      cacheDataLocally();
      closeOverlay();
      if (isEdit && state.selectedProjectId === p.id && state.view === "detail") {
        renderDetail();
      } else {
        render();
      }
      toast(localSaveHint(isEdit ? "Project updated" : "Project created"), "success");
    };
  }

  function openPhasesForm(project) {
    showOverlay(
      `<div class="panel" role="dialog">` +
        `<h2>Edit phases</h2>` +
        `<div class="dyn-list" id="ph-list"></div>` +
        `<button type="button" class="btn btn-secondary btn-sm" id="ph-add" style="margin-top:0.5rem">+ Phase</button>` +
        `<p class="hint">Add, rename, reorder, or delete. Deleting clears phase on linked tasks.</p>` +
        `<div class="panel-actions">` +
        `<button type="button" class="btn btn-secondary" id="ph-cancel">Cancel</button>` +
        `<button type="button" class="btn" id="ph-save">Save</button>` +
        `</div></div>`
    );
    const list = document.getElementById("ph-list");
    function addRow(id, name) {
      const row = document.createElement("div");
      row.className = "dyn-row";
      row.dataset.id = id || "";
      row.innerHTML =
        `<span class="handle">↕</span>` +
        `<input class="ph-name" value="${escapeHtml(name || "")}" placeholder="Phase name" />` +
        `<button type="button" class="btn btn-secondary btn-sm ph-up">↑</button>` +
        `<button type="button" class="btn btn-secondary btn-sm ph-down">↓</button>` +
        `<button type="button" class="btn btn-secondary btn-sm ph-rm">×</button>`;
      row.querySelector(".ph-rm").onclick = () => row.remove();
      row.querySelector(".ph-up").onclick = () => {
        if (row.previousElementSibling) list.insertBefore(row, row.previousElementSibling);
      };
      row.querySelector(".ph-down").onclick = () => {
        if (row.nextElementSibling) list.insertBefore(row.nextElementSibling, row);
      };
      list.appendChild(row);
    }
    (project.phases || []).forEach((ph) => addRow(ph.id, ph.name));
    document.getElementById("ph-add").onclick = () => addRow(uid("phase"), "");
    document.getElementById("ph-cancel").onclick = closeOverlay;
    document.getElementById("ph-save").onclick = () => {
      const phases = [];
      list.querySelectorAll(".dyn-row").forEach((row) => {
        const name = row.querySelector(".ph-name").value.trim();
        if (!name) return;
        phases.push({ id: row.dataset.id || uid("phase"), name });
      });
      if (!phases.length) {
        toast("Keep at least one phase", "error");
        return;
      }
      const validIds = new Set(phases.map((ph) => ph.id));
      project.phases = phases;
      projectTasks(project.id).forEach((t) => {
        if (t.phaseId && !validIds.has(t.phaseId)) t.phaseId = null;
      });
      if (state.selectedPhaseId !== "all" && !validIds.has(state.selectedPhaseId)) {
        state.selectedPhaseId = "all";
      }
      project.updatedAt = nowIso();
      cacheDataLocally();
      closeOverlay();
      render();
      toast(localSaveHint("Phases updated"), "success");
    };
  }

  function openTaskForm(taskId, defaults) {
    defaults = defaults || {};
    const isEdit = !!taskId;
    const t = isEdit ? getTask(taskId) : null;
    const statuses = getStatuses();
    const initialType = t ? t.type : defaults.type || "eng_task";
    const initialProjectId =
      t ? t.projectId : defaults.projectId !== undefined ? defaults.projectId : state.selectedProjectId;

    const projectOpts =
      `<option value="">— Standalone —</option>` +
      (state.data.projects || [])
        .map(
          (p) =>
            `<option value="${escapeHtml(p.id)}"${initialProjectId === p.id ? " selected" : ""}>${escapeHtml(p.projectCode || p.projectName)}</option>`
        )
        .join("");

    const statusOpts = statuses
      .map(
        (s) =>
          `<option value="${escapeHtml(s.id)}"${(t ? t.statusId : "status-todo") === s.id ? " selected" : ""}>${escapeHtml(s.name)}</option>`
      )
      .join("");

    const typeOpts = getTaskTypes().map(
      (ty) => `<option value="${ty.id}"${initialType === ty.id ? " selected" : ""}>${escapeHtml(ty.name)}</option>`
    ).join("");

    showOverlay(
      `<div class="panel wide" role="dialog">` +
        `<h2>${isEdit ? "Edit task" : "New task"}</h2>` +
        `<div class="form-row">` +
        `<div class="form-group"><label>Type</label><select id="tf-type">${typeOpts}</select></div>` +
        `<div class="form-group"><label>Project</label><select id="tf-project">${projectOpts}</select></div>` +
        `</div>` +
        `<div class="form-group"><label>Title</label><input id="tf-title" value="${escapeHtml(t ? t.title : "")}" /></div>` +
        `<div class="form-group"><label>Description</label><textarea id="tf-desc">${escapeHtml(t ? t.description : "")}</textarea></div>` +
        `<div id="tf-type-fields" class="type-fields"></div>` +
        `<div class="form-row three">` +
        `<div class="form-group"><label>Assignee</label><input id="tf-assignee" value="${escapeHtml(t ? t.assignee : "")}" /></div>` +
        `<div class="form-group"><label>Status</label><select id="tf-status">${statusOpts}</select></div>` +
        `<div class="form-group"><label>Priority</label><select id="tf-priority">` +
        ["low", "medium", "high"]
          .map((pr) => `<option value="${pr}"${(t ? t.priority : "medium") === pr ? " selected" : ""}>${pr}</option>`)
          .join("") +
        `</select></div></div>` +
        `<div class="form-row">` +
        `<div class="form-group"><label>Due date</label><input type="date" id="tf-due" value="${escapeHtml(t && t.dueDate ? t.dueDate : "")}" /></div>` +
        `<div class="form-group"><label>Phase</label><select id="tf-phase"></select></div>` +
        `</div>` +
        `<div class="form-group" id="tf-blocked-wrap"><label>Blocked reason</label><input id="tf-blocked" value="${escapeHtml(t ? t.blockedReason : "")}" /></div>` +
        `<div class="form-group"><label>Done date</label><input type="date" id="tf-done" value="${escapeHtml(t && t.doneDate ? t.doneDate : "")}" /></div>` +
        (isEdit
          ? `<div class="form-group">${markDoneButtonHtml(t)}<p class="hint">Sets status to Done and completed date to today (Africa/Johannesburg).</p></div>`
          : "") +
        `<div class="panel-actions">` +
        (isEdit ? `<button type="button" class="btn btn-danger" id="tf-delete" style="margin-right:auto">Delete</button>` : "") +
        `<button type="button" class="btn btn-secondary" id="tf-cancel">Cancel</button>` +
        `<button type="button" class="btn" id="tf-save">Save</button>` +
        `</div></div>`
    );

    function refreshPhases() {
      const pid = document.getElementById("tf-project").value || null;
      const proj = pid ? getProject(pid) : null;
      const sel = document.getElementById("tf-phase");
      const cur = t && t.phaseId ? t.phaseId : state.selectedPhaseId !== "all" ? state.selectedPhaseId : "";
      sel.innerHTML =
        `<option value="">— None —</option>` +
        ((proj && proj.phases) || [])
          .map((ph) => `<option value="${escapeHtml(ph.id)}"${cur === ph.id ? " selected" : ""}>${escapeHtml(ph.name)}</option>`)
          .join("");
      if (!proj) sel.disabled = true;
      else sel.disabled = false;
    }

    function renderTypeFields() {
      const type = document.getElementById("tf-type").value;
      const box = document.getElementById("tf-type-fields");
      const src = t || {};
      let html = `<h4>${escapeHtml(typeLabel(type))} fields</h4>`;
      if (type === "rdn") {
        html +=
          `<div class="form-row"><div class="form-group"><label>Ref #</label><input id="tf-ref" value="${escapeHtml(src.refNumber || "")}" /></div>` +
          `<div class="form-group"><label>Raised by</label><input id="tf-raised" value="${escapeHtml(src.raisedBy || "")}" /></div></div>` +
          `<div class="form-group"><label>Response due</label><input type="date" id="tf-response-due" value="${escapeHtml(src.responseDue || "")}" /></div>`;
      } else if (type === "design_check") {
        html +=
          `<div class="form-row"><div class="form-group"><label>Checker</label><input id="tf-checker" value="${escapeHtml(src.checker || "")}" /></div>` +
          `<div class="form-group"><label>Calc / drawing ref</label><input id="tf-calc-ref" value="${escapeHtml(src.calcOrDrawingRef || "")}" /></div></div>`;
      } else if (type === "drawing") {
        html +=
          `<div class="form-row"><div class="form-group"><label>Drawing #</label><input id="tf-drawing-no" value="${escapeHtml(src.drawingNumber || "")}" /></div>` +
          `<div class="form-group"><label>Rev</label><input id="tf-rev" value="${escapeHtml(src.rev || "")}" /></div></div>`;
      } else {
        html += `<div class="form-group"><label>Discipline</label><input id="tf-discipline" value="${escapeHtml(src.discipline || "")}" placeholder="e.g. Structural / Electrical" /></div>`;
      }
      box.innerHTML = html;
    }

    document.getElementById("tf-type").onchange = renderTypeFields;
    document.getElementById("tf-project").onchange = refreshPhases;
    renderTypeFields();
    refreshPhases();

    document.getElementById("tf-cancel").onclick = closeOverlay;
    bindMarkDoneButtons(document.getElementById("overlay"));
    if (isEdit) {
      document.getElementById("tf-delete").onclick = () => {
        if (!confirm("Delete this task?")) return;
        state.data.tasks = state.data.tasks.filter((x) => x.id !== taskId);
        cacheDataLocally();
        closeOverlay();
        render();
        toast("Task deleted", "success");
      };
    }

    document.getElementById("tf-save").onclick = () => {
      const title = document.getElementById("tf-title").value.trim();
      if (!title) {
        toast("Title is required", "error");
        return;
      }
      const type = document.getElementById("tf-type").value;
      const statusId = document.getElementById("tf-status").value;
      const payload = {
        title,
        description: document.getElementById("tf-desc").value.trim(),
        type,
        projectId: document.getElementById("tf-project").value || null,
        assignee: document.getElementById("tf-assignee").value.trim(),
        statusId,
        priority: document.getElementById("tf-priority").value,
        dueDate: document.getElementById("tf-due").value || null,
        phaseId: document.getElementById("tf-phase").value || null,
        blockedReason: document.getElementById("tf-blocked").value.trim(),
        doneDate: document.getElementById("tf-done").value || null,
        refNumber: "",
        raisedBy: "",
        responseDue: null,
        checker: "",
        calcOrDrawingRef: "",
        drawingNumber: "",
        rev: "",
        discipline: "",
        updatedAt: nowIso(),
      };
      if (type === "rdn") {
        payload.refNumber = (document.getElementById("tf-ref") || {}).value || "";
        payload.raisedBy = (document.getElementById("tf-raised") || {}).value || "";
        payload.responseDue = (document.getElementById("tf-response-due") || {}).value || null;
      } else if (type === "design_check") {
        payload.checker = (document.getElementById("tf-checker") || {}).value || "";
        payload.calcOrDrawingRef = (document.getElementById("tf-calc-ref") || {}).value || "";
      } else if (type === "drawing") {
        payload.drawingNumber = (document.getElementById("tf-drawing-no") || {}).value || "";
        payload.rev = (document.getElementById("tf-rev") || {}).value || "";
      } else {
        payload.discipline = (document.getElementById("tf-discipline") || {}).value || "";
      }
      if (statusIsDone(statusId) && !payload.doneDate) payload.doneDate = todayStr();

      if (isEdit) {
        Object.assign(t, payload);
      } else {
        state.data.tasks.push(
          normalizeTask({
            id: uid("task"),
            createdAt: nowIso(),
            ...payload,
          })
        );
      }
      if (payload.projectId) {
        const proj = getProject(payload.projectId);
        if (proj) proj.updatedAt = nowIso();
      }
      cacheDataLocally();
      closeOverlay();
      render();
      toast(localSaveHint(isEdit ? "Task updated" : "Task created"), "success");
    };
  }

  // ---------- Wire UI ----------
  function wire() {
    function on(id, event, handler) {
      const el = document.getElementById(id);
      if (!el) return;
      el[event] = handler;
    }
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.onclick = () => {
        state.taskFilters = blankTaskFilters();
        setView(btn.dataset.view);
      };
    });
    // Note: index.html has btn-export-excel only (no btn-export). Binding a missing
    // id throws and aborts wire()/bootstrap — that broke live Pages after v2.
    on("btn-settings", "onclick", openSettings);
    on("btn-load", "onclick", loadFromGithub);
    on("btn-save", "onclick", saveToGithub);
    on("btn-export", "onclick", exportJson);
    on("btn-export-excel", "onclick", exportExcel);
    on("btn-import", "onclick", () => {
      const fileInput = document.getElementById("import-file");
      if (fileInput) fileInput.click();
    });
    on("import-file", "onchange", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importJsonFile(f);
      e.target.value = "";
    });
    on("btn-new-project", "onclick", () => openProjectForm(null));
    on("global-search", "oninput", (e) => {
      state.search = e.target.value;
      render();
    });
    on("show-archived", "onchange", (e) => {
      state.showArchived = e.target.checked;
      if (state.view === "projects") renderProjects();
    });
  }

  function startApp() {
    wire();
    if (window.__LUMAX_STARTED) {
      updateAuthBadge();
      render();
      return;
    }
    window.__LUMAX_STARTED = true;
    bootstrap();
  }
  window.__lumaxStart = startApp;
  if (!window.__LUMAX_WAIT_FOR_REACT) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startApp);
    } else {
      startApp();
    }
  }
})();
