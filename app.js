/**
 * Lumax Energy — Engineering Management v2.4.1
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
  const LS_DIRTY = "lumax-eng-mgmt-dirty";
  const LS_BACKUP = "lumax-eng-mgmt-backup";
  const LS_LEADER = "lumax-eng-mgmt-leader-unlocked";
  const LS_BASE = "lumax-eng-mgmt-base";
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
    baseData: (function () {
      try {
        return JSON.parse(localStorage.getItem(LS_BASE) || "null");
      } catch (_) {
        return null;
      }
    })(),
    teamLoaded: false,
    engFilter: "all",
    bases: {},
    engSettings: {},
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
  // Keep fields this version doesn't model so an older client can't silently drop newer data.
  function extraFields(src, known, skip) {
    const out = {};
    Object.keys(src || {}).forEach((k) => {
      if (k === "__proto__" || k === "constructor" || k === "prototype") return;
      if (Object.prototype.hasOwnProperty.call(known, k) || (skip && skip.includes(k))) return;
      out[k] = src[k];
    });
    return out;
  }
  // Ids come from JSON files anyone with repo access can edit; keep them inert.
  function safeId(v) {
    return String(v == null ? "" : v).replace(/[^\w.:-]/g, "_");
  }
  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }
  function nowIso() {
    return new Date().toISOString();
  }
  // Calendar date (YYYY-MM-DD) of an instant in the business timezone, so UI, letters and due dates agree.
  function sastDate(v) {
    const d = v instanceof Date ? v : new Date(v || Date.now());
    if (isNaN(d)) return "";
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Johannesburg",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    } catch (_) {
      return d.toISOString().slice(0, 10);
    }
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
          engineerId: s.engineerId || "",
          engineerIdLocked: !!s.engineerIdLocked,
          role: s.role === "leader" ? "leader" : "engineer",
          sharedRepo: s.sharedRepo || "",
        };
      }
    } catch (_) {}
    return { owner: DEFAULT_OWNER, repo: DEFAULT_REPO, pat: "", engineerId: "", engineerIdLocked: false, role: "engineer", sharedRepo: "" };
  }
  function saveBrowserSettings() {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(state.settings));
  }
  function loadUiPrefs() {
    try {
      const raw = localStorage.getItem(LS_UI);
      if (raw) {
        const u = JSON.parse(raw);
        if (u && Object.prototype.hasOwnProperty.call(u, "hideCompleted")) {
          return { hideCompleted: !!u.hideCompleted };
        }
      }
    } catch (_) {}
    return { hideCompleted: true };
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
  let cacheWarned = false;
  // Any local cache write is an edit until a Load/Save/Import marks it clean.
  let dirty = (function () {
    try {
      return localStorage.getItem(LS_DIRTY) === "1";
    } catch (_) {
      return false;
    }
  })();
  function setDirty(v) {
    dirty = !!v;
    try {
      localStorage.setItem(LS_DIRTY, dirty ? "1" : "0");
    } catch (_) {}
    const b = document.getElementById("btn-save");
    if (b) b.classList.toggle("unsaved", dirty);
  }
  function cacheDataLocally() {
    try {
      localStorage.setItem(LS_DATA, JSON.stringify(state.data));
      if (state.fileSha) localStorage.setItem(LS_SHA, state.fileSha);
    } catch (e) {
      console.warn("localStorage cache failed", e);
      if (!cacheWarned) {
        cacheWarned = true;
        toast("Browser storage is full or blocked — changes are NOT cached locally. Save to GitHub or use Backup now.", "error");
      }
    }
    setDirty(true);
  }
  // Keep a copy of the current data before anything replaces it wholesale.
  function backupCurrentData() {
    try {
      localStorage.setItem(LS_BACKUP, JSON.stringify({ at: new Date().toISOString(), data: state.data }));
    } catch (e) {
      console.warn("backup failed", e);
    }
  }
  // The copy of my own file as it was on GitHub at state.fileSha; the reference for three-way merges.
  function setBase(data) {
    state.baseData = data ? JSON.parse(JSON.stringify(data)) : null;
    try {
      if (state.baseData) localStorage.setItem(LS_BASE, JSON.stringify(state.baseData));
      else localStorage.removeItem(LS_BASE);
    } catch (_) {}
  }
  // Anything that replaces state.data with something other than a full team load
  // makes the per-engineer bookkeeping meaningless; drop it so leader Save cannot act on it.
  function forgetTeamState() {
    state.bases = {};
    state.engSettings = {};
    state.teamLoaded = false;
  }
  function restoreBackup() {
    try {
      const b = JSON.parse(localStorage.getItem(LS_BACKUP) || "null");
      if (!b || !b.data) return false;
      state.data = normalizeData(b.data);
      // The restored copy is not what GitHub holds: next Save re-checks the remote first.
      forgetTeamState();
      state.fileSha = null;
      state.loadedThisSession = false;
      setBase(null);
      cacheDataLocally();
      render();
      return true;
    } catch (_) {
      return false;
    }
  }
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  function utf8FromBase64(b64) {
    const bin = atob(String(b64 || "").replace(/\s/g, ""));
    return new TextDecoder("utf-8").decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }
  // Contents API omits `content` for files over 1 MB; re-request the raw body.
  async function readRemoteText(meta, repo, path) {
    if (meta && meta.content) return utf8FromBase64(meta.content);
    const res = await fetch((repo ? repoFileUrl(repo, path) : contentsUrl()) + "?ref=main", {
      headers: Object.assign(ghHeaders(), { Accept: "application/vnd.github.raw+json" }),
    });
    if (!res.ok) throw new Error("Could not read file body (" + res.status + ")");
    return res.text();
  }
  // Three-way merge by record id. `base` = last synced copy (may be null).
  function mergeRecords(base, local, remote) {
    const key = (x) => JSON.stringify(stripTag(x));
    const bMap = new Map((base || []).map((r) => [r.id, r]));
    const lMap = new Map((local || []).map((r) => [r.id, r]));
    const rMap = new Map((remote || []).map((r) => [r.id, r]));
    const out = [];
    let conflicts = 0;
    const ids = new Set([...lMap.keys(), ...rMap.keys()]);
    ids.forEach((id) => {
      const b = bMap.get(id), l = lMap.get(id), r = rMap.get(id);
      if (l && r) {
        const lChanged = !b || key(l) !== key(b);
        const rChanged = !b || key(r) !== key(b);
        if (lChanged && rChanged && key(l) !== key(r)) {
          conflicts++;
          out.push(String(l.updatedAt || "") >= String(r.updatedAt || "") ? l : r);
        } else out.push(lChanged ? l : r);
      } else if (l && !r) {
        // gone remotely: keep if we edited it or never had a base to compare
        if (!b || key(l) !== key(b)) out.push(l);
      } else if (r && !l) {
        // deleted locally: honour it only if remote did not change it since base
        if (!b || key(r) !== key(b)) out.push(r);
      }
    });
    return { list: out, conflicts };
  }
  function mergeData(base, local, remote) {
    const p = mergeRecords(base && base.projects, local.projects, remote.projects);
    const t = mergeRecords(base && base.tasks, local.tasks, remote.tasks);
    const merged = Object.assign({}, remote, local, { projects: p.list, tasks: t.list });
    const bs = base && base.settings ? JSON.stringify(base.settings) : null;
    const settingsLocalChanged = bs === null || JSON.stringify(local.settings) !== bs;
    // Without a base we cannot tell who changed what; the settings in my own browser are mine, keep them.
    merged.settings = bs === null ? local.settings || remote.settings : settingsLocalChanged ? local.settings : remote.settings || local.settings;
    // Letter numbering must never go backwards: take the higher sequence.
    const ls = local.settings || {}, rs = remote.settings || {};
    if (ls.scfYear === rs.scfYear) merged.settings = Object.assign({}, merged.settings, { scfSeq: Math.max(ls.scfSeq || 1, rs.scfSeq || 1) });
    return { data: merged, conflicts: p.conflicts + t.conflicts };
  }
  function undoAction() {
    return {
      label: "Undo",
      onClick: async () => {
        if (!restoreBackup()) throw new Error("No backup available.");
      },
    };
  }
  function confirmDiscardUnsaved(what) {
    if (!dirty) return true;
    const ok = window.confirm(
      "You have unsaved changes. " + what + " will replace them (a backup copy is kept in this browser). Continue?"
    );
    // A dismissed (or browser-blocked) dialog must never look like "nothing happened".
    if (!ok) toast("Cancelled — nothing was changed. (If no dialog appeared, your browser may be blocking pop-ups for this page.)", "error");
    return ok;
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
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Inside the task form: only fill the fields so unsaved edits are not thrown away.
        const stSel = btn.closest("#overlay") && document.getElementById("tf-status");
        if (stSel) {
          stSel.value = doneStatusId();
          const dd = document.getElementById("tf-done");
          if (dd && !dd.value) dd.value = todayStr();
          toast("Status set to Done — click Save to keep it.", "success");
          return;
        }
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
      client === "Demo"
    );
  }
  function isOverdue(task) {
    if (!task.dueDate || statusIsDone(task.statusId)) return false;
    return task.dueDate < todayStr();
  }
  function isDueWithin(task, days) {
    if (!task.dueDate || statusIsDone(task.statusId)) return false;
    const day = 86400000;
    const d = Date.parse(task.dueDate + "T00:00:00Z");
    const now = Date.parse(todayStr() + "T00:00:00Z");
    return d >= now && d <= now + days * day;
  }
  function projectTasks(projectId) {
    return (state.data.tasks || []).filter((t) => t.projectId === projectId);
  }
  function allTasksFiltered(opts) {
    return (state.data.tasks || []).filter((t) => taskPassesTaskFilters(t, opts));
  }
  // Tasks of archived projects stay in the data but not in headline counts.
  function isLiveTask(t) {
    const p = t && t.projectId ? getProject(t.projectId) : null;
    return inScope(t) && !(p && p.archived);
  }

  function taskPassesTaskFilters(t, opts) {
    opts = opts || {};
    const q = (state.search || "").trim().toLowerCase();
    const f = state.taskFilters;
    if (!inScope(t)) return false;
    if (f.type && t.type !== f.type) return false;
    if (f.statusId && t.statusId !== f.statusId) return false;
    if (f.assignee === "__unassigned__") {
      if ((t.assignee || "").trim()) return false;
    } else if (f.assignee && (t.assignee || "").toLowerCase() !== f.assignee.toLowerCase()) return false;
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
    // YYYY-MM-DD sorts correctly as text; missing dates sink when ordering most-recent-first
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
      `<td><span class="type-chip">${escapeHtml(typeLabel(t.type))}</span>${isLeader() && t._eng ? ` <span class="pill">${escapeHtml(t._eng)}</span>` : ""}</td>` +
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
    // Open tasks stay above. Completed below: most recently completed first.
    // Always keep the node in the DOM; Hide completed toggles the hidden attribute
    // without replacing the checkbox (innerHTML replace on change looked like a no-op).
    if (f.statusId && statusIsDone(f.statusId)) return "";
    const completed = completedTasksMatchingFilters();
    const hiddenAttr = f.hideCompleted ? " hidden" : "";
    if (!completed.length) {
      return (
        `<div class="completed-by-month" id="completed-archive"${hiddenAttr}>` +
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
      `<div class="completed-by-month" id="completed-archive"${hiddenAttr}>` +
      `<h2>Completed <span class="stat-sub">(${completed.length})</span></h2>` +
      `<p class="hint">Most recently completed at the top. Uncheck Hide completed to show this list.</p>` +
      `<div class="tasks-table-wrap"><table class="tasks-table"><thead><tr>` +
      `<th>Type</th><th>Title</th><th>Project</th><th>Status</th><th>Assignee</th><th>Priority</th><th>Due</th><th>Completed</th><th></th>` +
      `</tr></thead><tbody>` +
      bodyRows +
      `</tbody></table></div>` +
      `</div>`
    );
  }

  function openTaskCount(project) {
    return projectTasks(project.id).filter((t) => statusIsOpen(t.statusId)).length;
  }
  function blockedCount(project) {
    return projectTasks(project.id).filter((t) => statusIsBlocked(t.statusId)).length;
  }
  function overdueCount(project) {
    return projectTasks(project.id).filter((t) => isOverdue(t)).length;
  }
  function projectAtRisk(project) {
    return blockedCount(project) > 0 || overdueCount(project) > 3;
  }
  function normalizeConformanceStatus(v) {
    const s = String(v || "none").toLowerCase();
    if (s === "pending" || s === "approved") return s;
    return "none";
  }
  function hasConformance(project) {
    const s = normalizeConformanceStatus(project && project.conformanceStatus);
    return s === "pending" || s === "approved";
  }
  function isSiteInvestigationName(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .trim()
      .includes("site investigation");
  }
  /**
   * Current phase resolution (Nightly):
   * 1) First phase that still has open tasks
   * 2) Else project.activePhaseId if it resolves
   * 3) Else Done phase when present and (no tasks OR all tasks done)
   * 4) Else last phase — never silently fall back to Intake when there is no open work
   */
  function projectCurrentPhase(project) {
    if (!project || !Array.isArray(project.phases) || !project.phases.length) return null;
    const phases = project.phases;
    const pts = projectTasks(project.id);
    for (let i = 0; i < phases.length; i++) {
      const ph = phases[i];
      const openInPhase = pts.some((t) => t.phaseId === ph.id && statusIsOpen(t.statusId));
      if (openInPhase) return ph;
    }
    // No open tasks
    if (project.activePhaseId) {
      const active = phases.find((ph) => ph.id === project.activePhaseId);
      if (active) return active;
    }
    const noTasks = pts.length === 0;
    const allDone = pts.length > 0 && pts.every((t) => statusIsDone(t.statusId));
    if (noTasks || allDone) {
      const donePh = phases.find((ph) => isDonePhaseName(ph.name));
      if (donePh) return donePh;
    }
    return phases[phases.length - 1];
  }
  function isDonePhaseName(name) {
    return /^done$/i.test(String(name || "").trim());
  }
  function projectInDonePhase(project) {
    if (!project) return false;
    const cur = projectCurrentPhase(project);
    return !!(cur && isDonePhaseName(cur.name));
  }
  function ensureDonePhase(phases) {
    const list = Array.isArray(phases) ? phases.slice() : [];
    if (!list.some((ph) => isDonePhaseName(ph.name))) {
      list.push({ id: uid("phase"), name: "Done" });
    }
    return list;
  }
  function projectInSiteInvestigation(project) {
    if (!project) return false;
    const cur = projectCurrentPhase(project);
    if (cur && isSiteInvestigationName(cur.name)) return true;
    // Also match if any phase named Site investigation has open tasks (active phase)
    return (project.phases || []).some((ph) => {
      if (!isSiteInvestigationName(ph.name)) return false;
      return projectTasks(project.id).some((t) => t.phaseId === ph.id && statusIsOpen(t.statusId));
    });
  }
  function getProjectTypes() {
    const list = (state.data.settings && state.data.settings.projectTypes) || [];
    return list.length ? list.slice() : DEFAULT_PROJECT_TYPES.slice();
  }
  function getStructureTypes() {
    const list = (state.data.settings && state.data.settings.structureTypes) || [];
    return list.length ? list.slice() : DEFAULT_STRUCTURE_TYPES.slice();
  }
  function getEngineerDefaults() {
    const e = (state.data.settings && state.data.settings.engineerDefaults) || {};
    return {
      name: e.name || DEFAULT_ENGINEER.name,
      ecsaNo: e.ecsaNo || DEFAULT_ENGINEER.ecsaNo,
      business: e.business || DEFAULT_ENGINEER.business,
      address: e.address || DEFAULT_ENGINEER.address,
      contact: e.contact || DEFAULT_ENGINEER.contact,
    };
  }
  function getTaskTypes() {
    const list = (state.data.settings && state.data.settings.taskTypes) || [];
    if (Array.isArray(list) && list.length) {
      return list.map((t) => ({
        id: String((t && t.id) || "").trim() || uid("tt"),
        name: String((t && t.name) || "").trim() || "Task",
      }));
    }
    return DEFAULT_TASK_TYPES.map((t) => ({ ...t }));
  }
  function normalizeMunicipalSignOff(v, legacyBool) {
    const s = String(v || "").toLowerCase().trim();
    if (s === "pending" || s === "approved" || s === "n/a" || s === "na") {
      return s === "na" ? "n/a" : s;
    }
    if (legacyBool === true || v === true) return "approved";
    if (legacyBool === false || v === false) return "n/a";
    return "pending";
  }
  function municipalSignOffLabel(v) {
    const s = normalizeMunicipalSignOff(v);
    if (s === "approved") return "Approved";
    if (s === "n/a") return "N/A";
    return "Pending";
  }
  function mapStructureTypeName(name) {
    const raw = String(name || "").trim();
    if (!raw) return "";
    if (DEFAULT_STRUCTURE_TYPES.includes(raw)) return raw;
    const mapped = STRUCTURE_TYPE_ALIASES[raw.toLowerCase()];
    if (mapped) return mapped;
    return raw;
  }
  function migrateStructureTypesList(list) {
    const out = [];
    const seen = new Set();
    function add(x) {
      const m = mapStructureTypeName(x);
      if (!m || seen.has(m)) return;
      seen.add(m);
      out.push(m);
    }
    DEFAULT_STRUCTURE_TYPES.forEach(add);
    (list || []).forEach(add);
    return out;
  }
  function kpiTrafficLight(id, value) {
    const n = Number(value) || 0;
    if (id === "open-projects") {
      if (n <= 0) return { light: "amber", note: "No active projects" };
      if (n <= 12) return { light: "green", note: "Active workload healthy" };
      if (n <= 25) return { light: "amber", note: "Elevated active project count" };
      return { light: "red", note: "High open project load" };
    }
    if (id === "overdue-work") {
      if (n === 0) return { light: "green", note: "No overdue tasks" };
      if (n <= 5) return { light: "amber", note: "Some tasks overdue" };
      return { light: "red", note: "Overdue backlog needs attention" };
    }
    if (id === "scf-ready") {
      if (n === 0) return { light: "green", note: "Nothing waiting on SC Letter" };
      if (n <= 3) return { light: "amber", note: "Letters ready to issue" };
      return { light: "red", note: "Backlog of ready SC Letters" };
    }
    if (id === "scf-issued") {
      if (n === 0) return { light: "amber", note: "No letters issued yet" };
      return { light: "green", note: "Letters on record" };
    }
    if (id === "commercial-gaps") {
      if (n === 0) return { light: "green", note: "Commercial fields complete" };
      if (n <= 3) return { light: "amber", note: "A few projects missing INV/contact/address" };
      return { light: "red", note: "Many commercial gaps" };
    }
    if (id === "muni-pending") {
      if (n === 0) return { light: "green", note: "No municipal sign-offs pending" };
      if (n <= 3) return { light: "amber", note: "Pending municipal sign-offs" };
      return { light: "red", note: "Many municipal sign-offs pending" };
    }
    return { light: "amber", note: "" };
  }
  function execDashboardKpis() {
    const projects = (state.data.projects || []).filter((p) => inScope(p) && !p.archived);
    const tasks = state.data.tasks || [];
    const openProjects = projects.length;
    const overdueTasks = tasks.filter((t) => isLiveTask(t) && isOverdue(t)).length;
    const ready = projects.filter((p) => isScfReady(p)).length;
    const issued = projects.filter((p) => isScfIssued(p)).length;
    const gaps = projects.filter((p) => missingCommercialFields(p).length > 0).length;
    const muniPending = projects.filter((p) => normalizeMunicipalSignOff(p.municipalSignOff, p.engineeringSignOff) === "pending").length;
    const rows = [
      { id: "open-projects", label: "Open projects", value: openProjects, view: "open-projects" },
      { id: "overdue-work", label: "Overdue work", value: overdueTasks, view: "overdue-work", tasksOverdue: true },
      { id: "scf-ready", label: "Ready for SC letter", value: ready, view: "scf-ready" },
      { id: "scf-issued", label: "SC letters issued", value: issued, view: "scf-issued" },
      { id: "commercial-gaps", label: "Commercial gaps", value: gaps, view: "commercial-gaps" },
      { id: "muni-pending", label: "Municipal sign-off pending", value: muniPending, view: "muni-pending" },
    ];
    return rows.map((r) => {
      const tl = kpiTrafficLight(r.id, r.value);
      return Object.assign({}, r, tl);
    });
  }
  function missingCommercialFields(project) {
    const missing = [];
    if (!project) return ["project"];
    if (!(project.invoiceNumber || "").trim()) missing.push("Invoice number");
    if (!(project.contactPerson || "").trim()) missing.push("Contact person");
    if (!(project.address || "").trim()) missing.push("Address");
    return missing;
  }
  function missingPoPopInv(project) {
    const missing = [];
    if (!project) return ["project"];
    if (!(project.poNumber || "").trim()) missing.push("PO number");
    if (!(project.popReference || "").trim()) missing.push("POP reference");
    if (!(project.invoiceNumber || "").trim()) missing.push("Invoice number");
    return missing;
  }
  function scfIssueBlockers(project) {
    const missing = missingCommercialFields(project);
    if (!projectInDonePhase(project)) missing.push("Done phase (current phase must be Done)");
    return missing;
  }
  /** Fresh gate checklist — always recompute from live project fields (no stale closure). */
  function sclGate(project) {
    return scfIssueBlockers(project);
  }
  function canIssueConformance(project) {
    return !!project && sclGate(project).length === 0 && normalizeConformanceStatus(project.conformanceStatus) !== "approved";
  }
  function isScfIssued(project) {
    return (
      !!project &&
      normalizeConformanceStatus(project.conformanceStatus) === "approved" &&
      !!(project.conformanceRef || "").trim()
    );
  }
  function isScfReady(project) {
    return !!project && scfIssueBlockers(project).length === 0 && !isScfIssued(project);
  }
  /** SCL / Structural Compliance Letter helpers (static). Internal settings keys remain scfYear/scfSeq. */
  class ScfHelper {
    static formatRef(year, seq) {
      const y = Number(year) || new Date().getFullYear();
      const n = Number(seq);
      const s = !Number.isFinite(n) || n < 1 ? 1 : Math.floor(n);
      return "LMX-SCL-" + y + "-" + String(s).padStart(3, "0");
    }
    static issueDateParts(d) {
      const dt = d instanceof Date ? d : new Date(d || Date.now());
      const [yyyy, mm, dd] = sastDate(dt).split("-");
      return { iso: dt.toISOString(), dateLabel: dd + "/" + mm + "/" + yyyy, year: Number(yyyy) };
    }
    static allocateRef(settings, issueDate, usedRefs) {
      const s = settings || {};
      const parts = ScfHelper.issueDateParts(issueDate);
      let year = Number(s.scfYear);
      let seq = Number(s.scfSeq);
      if (!Number.isFinite(year) || year < 2000) year = parts.year;
      if (!Number.isFinite(seq) || seq < 1) seq = 1;
      if (parts.year !== year) {
        year = parts.year;
        seq = 1;
      }
      // Never hand out a number that already exists (local, voided, or seen on GitHub).
      const used = usedRefs || new Set();
      while (used.has(ScfHelper.formatRef(year, seq).toUpperCase())) seq++;
      const ref = ScfHelper.formatRef(year, seq);
      s.scfYear = year;
      s.scfSeq = seq + 1;
      return { ref, year, seq, issuedAt: parts.iso, dateLabel: parts.dateLabel };
    }
    static blockers(project) {
      return sclGate(project);
    }
    static canIssue(project) {
      return canIssueConformance(project);
    }
    static snapshot(project, eng, meta) {
      const e = eng || getEngineerDefaults();
      return {
        ref: meta.ref,
        issuedAt: meta.issuedAt,
        dateLabel: meta.dateLabel,
        clientName: (project && project.clientName) || "",
        projectName: (project && project.projectName) || "",
        projectCode: (project && project.projectCode) || "",
        projectType: (project && project.projectType) || "",
        structureTypes: ((project && project.structureTypes) || []).slice(),
        address: (project && project.address) || "",
        contactPerson: (project && project.contactPerson) || "",
        invoiceNumber: (project && project.invoiceNumber) || "",
        salesOrderNumber: (project && project.salesOrderNumber) || "",
        poNumber: (project && project.poNumber) || "",
        popReference: (project && project.popReference) || "",
        drawingNumbers: ((project && project.drawingNumbers) || []).slice(),
        structuralDesign: normalizeDesignScope(project && project.structuralDesign),
        foundationDesign: normalizeDesignScope(project && project.foundationDesign),
        engineer: {
          name: e.name || "",
          ecsaNo: e.ecsaNo || "",
          business: e.business || "",
          address: e.address || "",
          contact: e.contact || "",
        },
      };
    }
    static certificateHtml(snap) {
      const s = snap || {};
      const eng = s.engineer || {};
      const drawings = (s.drawingNumbers || []).join(" + ") || "—";
      const pType = s.projectType || (s.structureTypes || [])[0] || "—";
      return (
        `<div class="scf-cert" id="scf-cert-print">` +
        `<div class="scf-cert-top">` +
        `<div class="scf-ref"><strong>Ref:</strong> ${escapeHtml(s.ref || "")}</div>` +
        `<div class="scf-date">${escapeHtml(s.dateLabel || "")}</div>` +
        `</div>` +
        `<h1 class="scf-title">STRUCTURAL COMPLIANCE FORM</h1>` +
        `<p class="scf-intro">As a practising Structural Engineer and registered as a Professional Engineer Technologist under the provisions of the Engineering Profession Act, 2000 (Act No. 46 of 2000), I hereby certify that the Photovoltaic Mounting system (${escapeHtml(pType)}) analysed complies with the National Building Regulations, SANS 10400-Part B — Structural Design Building Regulations.</p>` +
        `<div class="scf-grid">` +
        `<section><h2>Project Details</h2>` +
        `<table class="scf-table"><tbody>` +
        `<tr><th rowspan="2">Client Name</th><td rowspan="2">${escapeHtml(s.clientName || "—")}</td><th>Invoice No.</th><td>${escapeHtml(s.invoiceNumber || "—")}</td></tr>` +
        `<tr><th>SO No.</th><td>${escapeHtml(s.salesOrderNumber || "—")}</td></tr>` +
        `<tr><th>Project Name</th><td>${escapeHtml(s.projectName || "—")}</td><th>Drawing No.</th><td>${escapeHtml(drawings)}</td></tr>` +
        `<tr><th>Project Type</th><td colspan="3">${escapeHtml(pType)}</td></tr>` +
        `<tr><th>Address</th><td colspan="3">${escapeHtml(s.address || "—")}</td></tr>` +
        `<tr><th>Contact Person</th><td colspan="3">${escapeHtml(s.contactPerson || "—")}</td></tr>` +
        `</tbody></table>` +
        sclDesignBlocksHtml(s.structuralDesign, s.foundationDesign) +
        `</section>` +
        `<section><h2>Practising Engineer Details</h2>` +
        `<table class="scf-table"><tbody>` +
        `<tr><th>Pr. Engineer</th><td>${escapeHtml(eng.name || "—")}</td></tr>` +
        `<tr><th>ECSA No.</th><td>${escapeHtml(eng.ecsaNo || "—")}</td></tr>` +
        `<tr><th>Business Name</th><td>${escapeHtml(eng.business || "—")}</td></tr>` +
        `<tr><th>Business Address</th><td>${escapeHtml(eng.address || "—")}</td></tr>` +
        `<tr><th>Contact Details</th><td>${escapeHtml(eng.contact || "—")}</td></tr>` +
        `</tbody></table></section>` +
        `</div>` +
        `<div class="scf-notes">` +
        `<p>We respectfully direct the client's attention to the stipulations outlined in Regulation 11(2) of the Construction Regulations 2014, which are derived from the Occupational Health &amp; Safety Act No. 85 of 1993. This regulation mandates that any structure must undergo periodic inspection by competent individuals to ensure its ongoing safety and integrity.</p>` +
        `<p>It is imperative to note that this form does not imply acceptance of any site work performed by the contractor if it deviates from the building code or the contractual specifications outlined in the project documents.</p>` +
        `<p>This document is not a replacement or substitute for “Form 2” or “Form 4”. It is strongly recommended that you apply for building approval from the applicable local authority/Municipality.</p>` +
        `</div>` +
        `<div class="scf-sign">` +
        `<p>Yours faithfully,</p>` +
        `<p><strong>${escapeHtml(eng.name || "")}</strong><br/>Pr. Eng.<br/>${escapeHtml(eng.contact || "")}</p>` +
        `</div></div>`
      );
    }
  }
  /** Display refs as-is (legacy LMX-SCF-* remain readable). */
  function displayConformanceRef(ref) {
    return (ref || "").trim();
  }
  function uniqueStructureTypes() {
    const set = new Set(getStructureTypes());
    (state.data.projects || []).forEach((p) => {
      (p.structureTypes || []).forEach((s) => {
        const t = String(s || "").trim();
        if (t) set.add(t);
      });
    });
    (state.data.tasks || []).forEach((t) => {
      if (t.structureType) set.add(String(t.structureType).trim());
      (t.structureTypes || []).forEach((s) => {
        const x = String(s || "").trim();
        if (x) set.add(x);
      });
    });
    return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }
  function uniqueProjectTypes() {
    const set = new Set(getProjectTypes());
    (state.data.projects || []).forEach((p) => {
      const t = (p.projectType || "").trim();
      if (t) set.add(t);
      (p.structureTypes || []).forEach((s) => {
        if ((s || "").trim()) set.add(s.trim());
      });
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }
  function uniqueClients() {
    const set = new Set();
    (state.data.projects || []).forEach((p) => {
      const c = (p.clientName || "").trim();
      if (c) set.add(c);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }
  function uniqueAssignees() {
    const set = new Set();
    (state.data.tasks || []).forEach((t) => {
      const a = (t.assignee || "").trim();
      if (a) set.add(a);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }
  function getDashboardView(id) {
    return DASHBOARD_VIEWS.find((v) => v.id === id) || null;
  }
  function projectsMatchingFilters(extra) {
    const q = (state.search || "").trim().toLowerCase();
    const clientFilter = (extra && extra.client !== undefined ? extra.client : state.projectFilters.client) || "";
    const viewId = extra && extra.dashboardView !== undefined ? extra.dashboardView : state.dashboardView;
    let projects = (state.data.projects || []).filter((p) => inScope(p) && (state.showArchived || !p.archived));
    if (clientFilter) {
      projects = projects.filter((p) => (p.clientName || "").toLowerCase() === clientFilter.toLowerCase());
    }
    if (viewId === "open-projects") {
      projects = projects.filter((p) => !p.archived);
    } else if (viewId === "overdue-work") {
      projects = projects.filter((p) => overdueCount(p) > 0);
    } else if (viewId === "eng-signoff" || viewId === "muni-approved") {
      projects = projects.filter((p) => normalizeMunicipalSignOff(p.municipalSignOff, p.engineeringSignOff) === "approved");
    } else if (viewId === "muni-pending") {
      projects = projects.filter((p) => normalizeMunicipalSignOff(p.municipalSignOff, p.engineeringSignOff) === "pending");
    } else if (viewId === "conformance") {
      projects = projects.filter((p) => hasConformance(p));
    } else if (viewId === "scf-ready") {
      projects = projects.filter((p) => isScfReady(p));
    } else if (viewId === "scf-issued") {
      projects = projects.filter((p) => isScfIssued(p));
    } else if (viewId === "commercial-gaps") {
      projects = projects.filter((p) => missingCommercialFields(p).length > 0);
    } else if (viewId === "missing-po-pop-inv") {
      projects = projects.filter((p) => missingPoPopInv(p).length > 0);
    } else if (viewId === "site-investigation") {
      projects = projects.filter((p) => projectInSiteInvestigation(p));
    } else if (viewId && String(viewId).startsWith("type:")) {
      const want = String(viewId).slice(5).toLowerCase();
      projects = projects.filter((p) =>
        (p.structureTypes || []).some((s) => String(s).toLowerCase() === want)
      );
    }
    if (q) {
      projects = projects.filter((p) => {
        const hay = [
          p.clientName,
          p.projectCode,
          p.salesOrderNumber,
          p.projectName,
          p.poNumber,
          p.popReference,
          p.invoiceNumber,
          p.address,
          p.contactPerson,
          p.projectType,
          p.conformanceRef,
          (p.structureTypes || []).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    projects.sort((a, b) => (a.projectCode || "").localeCompare(b.projectCode || "", undefined, { numeric: true }));
    return projects;
  }
  function conformanceLabel(status) {
    const s = normalizeConformanceStatus(status);
    const found = CONFORMANCE_STATUSES.find((x) => x.id === s);
    return found ? found.name : s;
  }

  // ---------- Normalize / migrate ----------
  function normalizeData(json) {
    if (!json || typeof json !== "object") json = {};
    const version = Number(json.version) || 1;
    const settingsIn = json.settings && typeof json.settings === "object" ? json.settings : {};
    let taskStatuses = Array.isArray(settingsIn.taskStatuses) && settingsIn.taskStatuses.length
      ? settingsIn.taskStatuses.map(normalizeStatus)
      : DEFAULT_STATUSES.map((s) => ({ ...s }));


    const projectTypes =
      Array.isArray(settingsIn.projectTypes) && settingsIn.projectTypes.length
        ? settingsIn.projectTypes.map((x) => String(x || "").trim()).filter(Boolean)
        : DEFAULT_PROJECT_TYPES.slice();
    let structureTypes = migrateStructureTypesList(
      Array.isArray(settingsIn.structureTypes) ? settingsIn.structureTypes : []
    );
    const engIn = settingsIn.engineerDefaults && typeof settingsIn.engineerDefaults === "object"
      ? settingsIn.engineerDefaults
      : {};
    const engineerDefaults = {
      name: engIn.name || DEFAULT_ENGINEER.name,
      ecsaNo: engIn.ecsaNo || DEFAULT_ENGINEER.ecsaNo,
      business: engIn.business || DEFAULT_ENGINEER.business,
      address: engIn.address || DEFAULT_ENGINEER.address,
      contact: engIn.contact || DEFAULT_ENGINEER.contact,
    };
    let scfYear = Number(settingsIn.scfYear);
    if (!Number.isFinite(scfYear) || scfYear < 2000) scfYear = new Date().getFullYear();
    let scfSeq = Number(settingsIn.scfSeq);
    if (!Number.isFinite(scfSeq) || scfSeq < 1) scfSeq = 1;

    let taskTypes;
    if (Array.isArray(settingsIn.taskTypes) && settingsIn.taskTypes.length) {
      const seen = new Set();
      taskTypes = [];
      settingsIn.taskTypes.forEach((t) => {
        const id = safeId(String((t && t.id) || "").trim());
        const name = String((t && t.name) || "").trim();
        if (!id || !name || seen.has(id)) return;
        seen.add(id);
        taskTypes.push({ id, name });
      });
      DEFAULT_TASK_TYPES.forEach((d) => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          taskTypes.push({ ...d });
        }
      });
    } else {
      taskTypes = DEFAULT_TASK_TYPES.map((t) => ({ ...t }));
    }

    const data = {
      version: APP_VERSION,
      updatedAt: json.updatedAt || nowIso(),
      settings: {
        taskStatuses,
        taskTypes,
        myAssignee: settingsIn.myAssignee || "",
        projectTypes,
        structureTypes,
        engineerDefaults,
        scfYear,
        scfSeq,
        voidedLetters: Array.isArray(settingsIn.voidedLetters)
          ? settingsIn.voidedLetters.filter((x) => x && typeof x === "object").map((x) => ({
              ref: x.ref || "",
              projectId: x.projectId || "",
              issuedAt: x.issuedAt || null,
              voidedAt: x.voidedAt || null,
            }))
          : [],
      },
      projects: [],
      tasks: [],
    };

    // Projects
    const projectsIn = Array.isArray(json.projects) ? json.projects : [];
    data.projects = projectsIn.map((p) => normalizeProject(p, version === 1));

    // Tasks: v2 unified array, or migrate from nested + standaloneTasks
    if (Array.isArray(json.tasks) && json.tasks.length) {
      data.tasks = json.tasks.map((t) => normalizeTask(t, version === 1, taskStatuses, taskTypes));
    } else {
      const collected = [];
      projectsIn.forEach((p) => {
        (p.tasks || []).forEach((t) => {
          collected.push(normalizeTask({ ...t, projectId: p.id }, true, taskStatuses, taskTypes));
        });
      });
      (json.standaloneTasks || []).forEach((t) => {
        collected.push(normalizeTask({ ...t, projectId: t.projectId || null }, version === 1, taskStatuses, taskTypes));
      });
      data.tasks = collected;
    }

    // Strip nested tasks from projects (source of truth is data.tasks)
    data.projects.forEach((p) => {
      delete p.tasks;
    });

    // Keep any project-used structure types selectable (extras beyond defaults)
    const structSet = new Set(data.settings.structureTypes);
    data.projects.forEach((p) => {
      (p.structureTypes || []).forEach((s) => {
        const m = mapStructureTypeName(s);
        if (m && !structSet.has(m)) {
          structSet.add(m);
          data.settings.structureTypes.push(m);
        }
      });
    });

    return data;
  }

  function normalizeStatus(s) {
    const cat = s.category;
    const category = cat === "todo" || cat === "doing" || cat === "done" ? cat : null;
    return {
      id: s.id ? safeId(s.id) : uid("status"),
      name: s.name || "Status",
      color: s.color || "#6b7c93",
      category,
    };
  }

  function normalizeProject(p, fromV1) {
    let phases;
    if (Array.isArray(p.phases) && p.phases.length) {
      phases = p.phases.map((ph) => ({ id: ph.id ? safeId(ph.id) : uid("phase"), name: ph.name || "Phase" }));
    } else {
      phases = DEFAULT_PHASES.map((ph) => ({ id: uid("phase"), name: ph.name }));
    }
    phases = ensureDonePhase(phases);
    const municipalSignOff = normalizeMunicipalSignOff(p.municipalSignOff, p.engineeringSignOff);
    const engineeringSignOff = municipalSignOff === "approved";
    const structureTypes = Array.isArray(p.structureTypes)
      ? p.structureTypes.map((x) => mapStructureTypeName(x)).filter(Boolean)
      : [];
    // de-dupe structure types
    const structSeen = new Set();
    const structureTypesUnique = [];
    structureTypes.forEach((s) => {
      if (!structSeen.has(s)) {
        structSeen.add(s);
        structureTypesUnique.push(s);
      }
    });
    let sclUndoSnapshot = null;
    if (p.sclUndoSnapshot && typeof p.sclUndoSnapshot === "object") {
      sclUndoSnapshot = {
        conformanceStatus: normalizeConformanceStatus(p.sclUndoSnapshot.conformanceStatus),
        conformanceRef: p.sclUndoSnapshot.conformanceRef || "",
        conformanceIssuedAt: p.sclUndoSnapshot.conformanceIssuedAt || null,
        conformanceCert:
          p.sclUndoSnapshot.conformanceCert && typeof p.sclUndoSnapshot.conformanceCert === "object"
            ? p.sclUndoSnapshot.conformanceCert
            : null,
        activePhaseId: p.sclUndoSnapshot.activePhaseId ? safeId(p.sclUndoSnapshot.activePhaseId) : null,
      };
    }
    const sclHistory = Array.isArray(p.sclHistory)
      ? p.sclHistory
          .filter((h) => h && typeof h === "object")
          .map((h) => ({
            ref: h.ref || "",
            issuedAt: h.issuedAt || null,
            action: h.action || "issued",
            at: h.at || h.issuedAt || null,
            seq: Number.isFinite(Number(h.seq)) ? Number(h.seq) : undefined,
            year: Number.isFinite(Number(h.year)) ? Number(h.year) : undefined,
          }))
      : [];
    const proj = {
      id: p.id ? safeId(p.id) : uid("proj"),
      clientName: p.clientName || "",
      projectName: p.projectName || "",
      projectCode: p.projectCode || "",
      salesOrderNumber: p.salesOrderNumber || "",
      poNumber: p.poNumber || "",
      popReference: p.popReference || "",
      invoiceNumber: p.invoiceNumber || "",
      address: p.address || "",
      contactPerson: p.contactPerson || "",
      projectType: p.projectType || "",
      structureTypes: structureTypesUnique,
      drawingNumbers: Array.isArray(p.drawingNumbers) ? p.drawingNumbers.slice() : [],
      customFields: p.customFields && typeof p.customFields === "object" ? { ...p.customFields } : {},
      structuralDesign: normalizeDesignScope(p.structuralDesign),
      foundationDesign: normalizeDesignScope(p.foundationDesign),
      phases,
      municipalSignOff,
      engineeringSignOff,
      engineeringSignOffAt: engineeringSignOff ? p.engineeringSignOffAt || null : p.engineeringSignOffAt || null,
      engineeringSignOffBy: p.engineeringSignOffBy || "",
      conformanceStatus: normalizeConformanceStatus(p.conformanceStatus),
      conformanceRef: p.conformanceRef || "",
      conformanceIssuedAt: p.conformanceIssuedAt || null,
      conformanceCert: p.conformanceCert && typeof p.conformanceCert === "object" ? p.conformanceCert : null,
      sclUndoSnapshot,
      sclHistory,
      activePhaseId: p.activePhaseId ? safeId(p.activePhaseId) : null,
      archived: !!p.archived,
      createdAt: p.createdAt || nowIso(),
      updatedAt: p.updatedAt || nowIso(),
    };
    return Object.assign(extraFields(p, proj, ["tasks"]), proj);
  }

  function mapLegacyStatus(status, statusList) {
    if (!status) return "status-todo";
    if (V1_STATUS_MAP[status]) return V1_STATUS_MAP[status];
    if (String(status).startsWith("status-")) return status;
    const list = statusList || DEFAULT_STATUSES;
    const byName = list.find((s) => (s.name || "").toLowerCase() === String(status).toLowerCase());
    return byName ? byName.id : "status-todo";
  }

  function normalizeTask(t, fromV1, statusList, typeList) {
    let statusId = t.statusId ? safeId(t.statusId) : t.statusId;
    if (!statusId && t.status) statusId = mapLegacyStatus(t.status, statusList);
    if (!statusId) statusId = "status-todo";

    let type = t.type || t.typeId || "eng_task";
    if (type === "design-check") type = "design_check";
    type = safeId(type);
    // Validate against the incoming file's types, not whatever is currently loaded.
    const knownTypes = typeList || (state.data && state.data.settings && state.data.settings.taskTypes) || DEFAULT_TASK_TYPES;
    if (!knownTypes.some((x) => x.id === type) && !DEFAULT_TASK_TYPES.some((x) => x.id === type)) type = "eng_task";

    const task = {
      id: t.id ? safeId(t.id) : uid("task"),
      projectId: t.projectId == null || t.projectId === "" ? null : safeId(t.projectId),
      title: t.title || "",
      description: t.description || "",
      type,
      statusId,
      assignee: t.assignee || "",
      priority: ["low", "medium", "high"].includes(t.priority) ? t.priority : "medium",
      dueDate: t.dueDate || null,
      phaseId: t.phaseId ? safeId(t.phaseId) : null,
      blockedReason: t.blockedReason || "",
      doneDate: t.doneDate || null,
      // type-specific
      refNumber: t.refNumber || "",
      raisedBy: t.raisedBy || "",
      responseDue: t.responseDue || null,
      checker: t.checker || "",
      calcOrDrawingRef: t.calcOrDrawingRef || "",
      drawingNumber: t.drawingNumber || "",
      rev: t.rev || "",
      discipline: t.discipline || "",
      createdAt: t.createdAt || nowIso(),
      updatedAt: t.updatedAt || nowIso(),
    };
    return Object.assign(extraFields(t, task, ["status", "typeId"]), task);
  }

  // ---------- GitHub API (preserve SHA behaviour) ----------
  function ghHeaders(includeJson) {
    const h = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (state.settings.pat) h.Authorization = "Bearer " + state.settings.pat;
    if (includeJson) h["Content-Type"] = "application/json";
    return h;
  }
  function contentsUrl() {
    const { owner, repo } = state.settings;
    return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${DATA_PATH}`;
  }
  async function fetchGithubUser() {
    if (!state.settings.pat) {
      state.githubUser = null;
      updateAuthBadge();
      return;
    }
    try {
      const res = await fetch("https://api.github.com/user", { headers: ghHeaders(), cache: "no-store" });
      if (!res.ok) throw new Error("Auth failed (" + res.status + ")");
      state.githubUser = await res.json();
      updateAuthBadge();
    } catch (e) {
      state.githubUser = null;
      updateAuthBadge();
      toast("GitHub auth: " + e.message, "error");
    }
  }
  async function loadEngineerData() {
    if (!state.settings.pat) {
      toast("Set a Personal Access Token in Settings first.", "error");
      return false;
    }
    if (state.syncOp) {
      toast("Sync already in progress.", "error");
      return false;
    }
    if (!confirmDiscardUnsaved("Loading from GitHub")) return false;
    setSyncBusy("load");
    try {
      const res = await fetch(contentsUrl() + "?ref=main", { headers: ghHeaders(), cache: "no-store" });
      if (res.status === 404) {
        toast("data/projects.json not found on main. Using local/seed data.", "error");
        return false;
      }
      if (!res.ok) throw new Error("Load failed (" + res.status + ")");
      const meta = await res.json();
      const json = JSON.parse(await readRemoteText(meta));
      await overlaySharedSettings(json);
      const loaded = normalizeData(json);
      backupCurrentData();
      state.fileSha = meta.sha;
      state.data = loaded;
      setBase(loaded);
      forgetTeamState();
      state.loadedThisSession = true;
      cacheDataLocally();
      setDirty(false);
      lockEngineerId();
      markLastSync("Load");
      render();
      toast("Loaded from GitHub (" + state.settings.owner + "/" + state.settings.repo + ")", "success", undoAction());
      return true;
    } catch (e) {
      toast("GitHub load error: " + e.message + ". Prefer GitHub Pages or a local static server (CORS).", "error");
      return false;
    } finally {
      setSyncBusy(null);
    }
  }
  async function saveEngineerData() {
    const r = await saveEngineerDataOnce(false);
    // A silent merge happened; retry once with the fresh version.
    return r === "merged" ? saveEngineerDataOnce(true) : r;
  }
  async function tryAutoMerge() {
    try {
      const r = await fetch(contentsUrl() + "?ref=main", { headers: ghHeaders(), cache: "no-store" });
      if (!r.ok) return false;
      const meta = await r.json();
      const remote = normalizeData(JSON.parse(await readRemoteText(meta)));
      // Without a known base a silent merge could undo deletions; let the user decide.
      if (!state.baseData) return false;
      const { data, conflicts } = mergeData(state.baseData, state.data, remote);
      if (conflicts) return false;
      backupCurrentData();
      state.data = normalizeData(data);
      state.fileSha = meta.sha;
      setBase(remote);
      state.loadedThisSession = true;
      cacheDataLocally();
      render();
      toast("Merged newer changes from GitHub automatically.", "success");
      return true;
    } catch (_) {
      return false;
    }
  }
  async function saveEngineerDataOnce(skipAutoMerge) {
    if (!state.settings.pat) {
      toast("Set a Personal Access Token in Settings first.", "error");
      return false;
    }
    if (state.syncOp) {
      toast("Sync already in progress.", "error");
      return false;
    }
    if (holdsTeamData()) {
      toast("This browser holds the team-wide leader view. Unlock the leader view and click Load, or Load your own data, before saving.", "error");
      return false;
    }
    setSyncBusy("save");
    try {
      const shaWasMissing = !state.fileSha;
      if (shaWasMissing) {
        const getRes = await fetch(contentsUrl() + "?ref=main", { headers: ghHeaders(), cache: "no-store" });
        if (getRes.status === 401) {
          throw new Error("PAT invalid or expired. Update in Settings.");
        }
        if (getRes.status === 403) {
          throw new Error(
            "PAT lacks Contents write on Lumax-Energy/lumax-eng-mgmt (need classic repo or fine-grained Contents R/W)."
          );
        }
        if (getRes.status === 404) {
          state.fileSha = null;
        } else if (!getRes.ok) {
          const err = await getRes.json().catch(() => ({}));
          throw new Error(err.message || "Could not read file metadata (" + getRes.status + ")");
        } else {
          const meta = await getRes.json();
          const remoteSha = meta.sha;
          if (!state.loadedThisSession && meta.content) {
            const remoteStr = utf8FromBase64(meta.content);
            const localStr = JSON.stringify(dataForRepo(), null, 2);
            if (remoteStr !== localStr) {
              const ok = confirm(
                "Remote data differs from this browser. Save will overwrite GitHub with what's on screen. Continue?"
              );
              if (!ok) return false;
            }
          }
          state.fileSha = remoteSha;
        }
      }

      state.data.updatedAt = nowIso();
      state.data.version = APP_VERSION;
      const body = {
        message: "Update engineering projects data",
        content: btoa(unescape(encodeURIComponent(JSON.stringify(dataForRepo(), null, 2)))),
        branch: "main",
      };
      if (state.fileSha) body.sha = state.fileSha;

      const putRes = await fetch(contentsUrl(), {
        method: "PUT",
        headers: ghHeaders(true),
        body: JSON.stringify(body),
      });
      if (putRes.status === 404) {
        throw new Error("Repository " + state.settings.owner + "/" + state.settings.repo + " was not found, or the token cannot access it.");
      }
      if (putRes.status === 401) {
        throw new Error("PAT invalid or expired. Update in Settings.");
      }
      if (putRes.status === 403) {
        throw new Error(
          "PAT lacks Contents write on Lumax-Energy/lumax-eng-mgmt (need classic repo or fine-grained Contents R/W)."
        );
      }
      if (putRes.status === 409 || putRes.status === 422) {
        if (!skipAutoMerge && (await tryAutoMerge())) return "merged";
        const err = await putRes.json().catch(() => ({}));
        const msg = err.message || ("conflict (" + putRes.status + ")");
        const shortSha = (state.fileSha || "").slice(0, 7) || "local";
        toast(
          "Save conflict — GitHub file moved (your SHA " +
            shortSha +
            "…). Merge remote changes with yours, then Save. (" +
            msg +
            ")",
          "error",
          {
            label: "Merge & retry",
            onClick: async () => {
              const r = await fetch(contentsUrl() + "?ref=main", { headers: ghHeaders(), cache: "no-store" });
              if (!r.ok) throw new Error("Could not fetch remote (" + r.status + ") — nothing changed.");
              const meta = await r.json();
              const remote = normalizeData(JSON.parse(await readRemoteText(meta)));
              const { data, conflicts } = mergeData(state.baseData, state.data, remote);
              const question = !state.baseData
                ? "This browser doesn't know which version you last synced, so records deleted on either side may come back. A backup of your current data is kept. Merge anyway?"
                : conflicts
                ? conflicts + " record(s) were edited by both you and someone else; the most recently updated version of each will be kept. Continue?"
                : null;
              // Throwing keeps the toast (and its button) on screen so the user can retry.
              if (question && !window.confirm(question)) throw new Error("Merge cancelled — nothing was changed.");
              backupCurrentData();
              state.data = normalizeData(data);
              state.fileSha = meta.sha;
              setBase(remote);
              state.loadedThisSession = true;
              cacheDataLocally();
              render();
              await saveToGithub();
            },
          }
        );
        return false;
      }
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error(err.message || "Save failed (" + putRes.status + ")");
      }
      const result = await putRes.json();
      state.fileSha = result.content && result.content.sha;
      setBase(dataForRepo());
      cacheDataLocally();
      setDirty(false);
      markLastSync("Save");
      toast("Saved to GitHub", "success");
      lockEngineerId();
      registerEngineer();
      return true;
    } catch (e) {
      toast("GitHub save error: " + e.message, "error");
      return false;
    } finally {
      setSyncBusy(null);
    }
  }

  // ---------- Team: one private repo per engineer + a shared repo ----------
  const SHARED_TEAM = "team.json";
  const SHARED_SETTINGS = "settings.json";
  const SHARED_LETTERS = "letters.json";
  const SHARED_KEYS = ["taskStatuses", "taskTypes", "projectTypes", "structureTypes"];
  let leaderUnlocked = (function () {
    try {
      return sessionStorage.getItem(LS_LEADER) === "1";
    } catch (_) {
      return false;
    }
  })();
  function slugifyId(v) {
    return String(v || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  function engineerRepo(id) {
    return DEFAULT_REPO + "-" + id;
  }
  function myEngineerId() {
    return state.settings.engineerId || "";
  }
  function sharedRepoName() {
    return state.settings.sharedRepo || DEFAULT_REPO + "-shared";
  }
  function isLeader() {
    return state.settings.role === "leader" && leaderUnlocked && !!myEngineerId();
  }
  function lockEngineerId() {
    if (myEngineerId() && !state.settings.engineerIdLocked) {
      state.settings.engineerIdLocked = true;
      saveBrowserSettings();
    }
  }
  function stripTag(r) {
    const c = Object.assign({}, r);
    delete c._eng;
    return c;
  }
  function dataForRepo() {
    return Object.assign({}, state.data, {
      projects: (state.data.projects || []).map(stripTag),
      tasks: (state.data.tasks || []).map(stripTag),
    });
  }
  function holdsTeamData() {
    const me = myEngineerId();
    return (state.data.projects || []).concat(state.data.tasks || []).some((r) => r._eng && r._eng !== me);
  }
  // Leader view: which engineer's work is on screen ("all" or an engineer id).
  function inScope(r) {
    if (!isLeader() || !state.engFilter || state.engFilter === "all") return true;
    return (r._eng || myEngineerId()) === state.engFilter;
  }
  function newRecordTag(projectId) {
    if (!isLeader()) return {};
    const proj = projectId ? getProject(projectId) : null;
    if (proj) return { _eng: proj._eng || myEngineerId() };
    return { _eng: state.engFilter && state.engFilter !== "all" ? state.engFilter : myEngineerId() };
  }
  function repoFileUrl(repo, path) {
    return (
      "https://api.github.com/repos/" +
      encodeURIComponent(state.settings.owner) +
      "/" +
      encodeURIComponent(repo) +
      "/contents/" +
      path.split("/").map(encodeURIComponent).join("/")
    );
  }
  async function ghReadFile(repo, path) {
    const r = await fetch(repoFileUrl(repo, path) + "?ref=main", { headers: ghHeaders(), cache: "no-store" });
    if (r.status === 404) return null;
    if (r.status === 401 || r.status === 403) throw new Error("Token rejected for " + repo + " (need Contents read/write).");
    if (!r.ok) throw new Error(repo + "/" + path + ": read failed (" + r.status + ")");
    const meta = await r.json();
    return { sha: meta.sha, text: await readRemoteText(meta, repo, path) };
  }
  async function ghWriteFile(repo, path, text, sha, message) {
    const body = { message, content: btoa(unescape(encodeURIComponent(text))), branch: "main" };
    if (sha) body.sha = sha;
    const r = await fetch(repoFileUrl(repo, path), { method: "PUT", headers: ghHeaders(true), body: JSON.stringify(body) });
    if (r.status === 409 || r.status === 422) return { conflict: true };
    if (r.status === 404) throw new Error("Repository " + state.settings.owner + "/" + repo + " not found, or the token cannot access it.");
    if (r.status === 401 || r.status === 403) throw new Error("Token rejected for " + repo + " (need Contents read/write).");
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.message || "write failed (" + r.status + ")");
    }
    const j = await r.json();
    return { sha: j.content && j.content.sha };
  }
  // Read-modify-write a small shared JSON file, retrying on conflicts. `mutate` returns undefined for "no change".
  async function ghUpdateJson(repo, path, mutate, message) {
    for (let i = 0; i < 4; i++) {
      const cur = await ghReadFile(repo, path);
      const obj = cur ? JSON.parse(cur.text) : null;
      const next = mutate(obj);
      if (next === undefined) return obj;
      const res = await ghWriteFile(repo, path, JSON.stringify(next, null, 2), cur && cur.sha, message);
      if (!res.conflict) return next;
    }
    throw new Error("Could not update " + path + " (repeated conflicts). Try again.");
  }
  async function sha256Hex(str) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  async function loadTeam() {
    const f = await ghReadFile(sharedRepoName(), SHARED_TEAM);
    return f ? JSON.parse(f.text) : null;
  }
  // After an engineer's first successful save, list them in the shared team file (best effort).
  async function registerEngineer() {
    const id = myEngineerId();
    if (!id || !state.settings.pat) return;
    try {
      await ghUpdateJson(
        sharedRepoName(),
        SHARED_TEAM,
        (t) => {
          t = t && typeof t === "object" ? t : {};
          t.engineers = Array.isArray(t.engineers) ? t.engineers : [];
          const name = getEngineerDefaults().name || id;
          const ex = t.engineers.find((e) => e.id === id);
          if (ex && ex.name === name) return undefined;
          if (ex) ex.name = name;
          else t.engineers.push({ id, name });
          return t;
        },
        "Register engineer " + id
      );
    } catch (e) {
      console.warn("registerEngineer failed", e);
    }
  }
  // Shared lists (statuses, task/project/structure types) live in the shared repo so the team stays consistent.
  async function overlaySharedSettings(json) {
    if (!myEngineerId() || !state.settings.pat) return;
    try {
      const f = await ghReadFile(sharedRepoName(), SHARED_SETTINGS);
      if (!f) return;
      const sh = JSON.parse(f.text);
      json.settings = json.settings && typeof json.settings === "object" ? json.settings : {};
      SHARED_KEYS.forEach((k) => {
        if (Array.isArray(sh[k]) && sh[k].length) json.settings[k] = sh[k];
      });
    } catch (e) {
      toast("Could not read shared settings (" + e.message + ") — using your saved copy.", "error");
    }
  }
  async function pushSharedSettings() {
    if (!isLeader()) return;
    const st = state.data.settings || {};
    await ghUpdateJson(
      sharedRepoName(),
      SHARED_SETTINGS,
      (cur) => {
        const next = { updatedAt: nowIso(), by: myEngineerId() };
        SHARED_KEYS.forEach((k) => (next[k] = st[k]));
        const a = JSON.stringify(SHARED_KEYS.map((k) => (cur || {})[k]));
        const b = JSON.stringify(SHARED_KEYS.map((k) => next[k]));
        return a === b ? undefined : next;
      },
      "Update shared settings"
    );
  }
  function askPassword(title, hint, needConfirm) {
    return new Promise((resolve) => {
      showOverlay(
        `<div class="panel" role="dialog"><h2>${escapeHtml(title)}</h2>` +
          (hint ? `<p class="hint">${escapeHtml(hint)}</p>` : "") +
          `<div class="form-group"><label>Password</label><input id="pw-1" type="password" autocomplete="off" /></div>` +
          (needConfirm ? `<div class="form-group"><label>Repeat password</label><input id="pw-2" type="password" autocomplete="off" /></div>` : "") +
          `<div class="panel-actions"><button type="button" class="btn btn-secondary" id="pw-cancel">Cancel</button><button type="button" class="btn" id="pw-ok">OK</button></div></div>`
      );
      let done = false;
      const finish = (v) => {
        if (done) return;
        done = true;
        overlayCloseHook = null;
        closeOverlay();
        resolve(v);
      };
      overlayCloseHook = () => finish(null);
      const ok = () => {
        const a = document.getElementById("pw-1").value;
        if (!a) return;
        if (needConfirm && a !== document.getElementById("pw-2").value) {
          toast("Passwords do not match.", "error");
          return;
        }
        finish(a);
      };
      document.getElementById("pw-ok").onclick = ok;
      document.getElementById("pw-cancel").onclick = () => finish(null);
      document.getElementById("pw-1").onkeydown = (e) => {
        if (e.key === "Enter") ok();
      };
    });
  }
  // Soft lock only: it keeps engineers out of the leader view but is not strong security.
  async function unlockLeader() {
    if (!state.settings.pat || !myEngineerId()) {
      toast("Set the token and your Engineer ID in Settings first.", "error");
      return false;
    }
    let team;
    try {
      team = await loadTeam();
    } catch (e) {
      toast(e.message, "error");
      return false;
    }
    if (!team || !team.pw) {
      if (team && team.leader && team.leader !== myEngineerId()) {
        toast("A different leader (" + team.leader + ") is already set up.", "error");
        return false;
      }
      const pw = await askPassword("Create leader password", "This soft lock keeps engineers out of the leader view. It is not strong security.", true);
      if (!pw) return false;
      try {
        const salt = uid("salt");
        const hash = await sha256Hex(salt + pw);
        await ghUpdateJson(
          sharedRepoName(),
          SHARED_TEAM,
          (t) => {
            t = t && typeof t === "object" ? t : {};
            t.engineers = Array.isArray(t.engineers) ? t.engineers : [];
            t.leader = myEngineerId();
            t.pw = { salt, hash };
            return t;
          },
          "Set leader password"
        );
      } catch (e) {
        toast(e.message, "error");
        return false;
      }
    } else {
      if (team.leader && team.leader !== myEngineerId()) {
        toast("Only the team leader (" + team.leader + ") can unlock this view.", "error");
        return false;
      }
      const pw = await askPassword("Leader password", "", false);
      if (pw == null) return false;
      if ((await sha256Hex(team.pw.salt + pw)) !== team.pw.hash) {
        toast("Wrong password.", "error");
        return false;
      }
    }
    leaderUnlocked = true;
    try {
      sessionStorage.setItem(LS_LEADER, "1");
    } catch (_) {}
    updateLeaderUi();
    toast("Leader view unlocked. Click Load to read every engineer's repo.", "success");
    return true;
  }
  function lockLeader() {
    leaderUnlocked = false;
    try {
      sessionStorage.removeItem(LS_LEADER);
    } catch (_) {}
    state.engFilter = "all";
    forgetTeamState();
    updateLeaderUi();
    render();
    toast("Leader view locked. Load your own data before saving.", "success");
  }
  function updateLeaderUi() {
    const btn = document.getElementById("btn-leader");
    const sel = document.getElementById("eng-filter");
    const isLeaderRole = state.settings.role === "leader" && !!myEngineerId();
    if (btn) {
      btn.classList.toggle("hidden", !isLeaderRole);
      btn.textContent = leaderUnlocked ? "Lock leader view" : "Unlock leader view";
    }
    if (sel) {
      const show = isLeader();
      sel.classList.toggle("hidden", !show);
      if (show) {
        const ids = new Set([myEngineerId()]);
        Object.keys(state.bases || {}).forEach((i) => ids.add(i));
        (state.data.projects || []).concat(state.data.tasks || []).forEach((r) => r._eng && ids.add(r._eng));
        sel.innerHTML =
          `<option value="all">All engineers</option>` +
          [...ids].sort().map((i) => `<option value="${escapeHtml(i)}"${state.engFilter === i ? " selected" : ""}>${escapeHtml(i)}</option>`).join("");
        sel.value = state.engFilter || "all";
      }
    }
  }
  async function loadAllFromGithub() {
    if (!state.settings.pat) {
      toast("Set a Personal Access Token in Settings first.", "error");
      return false;
    }
    if (state.syncOp) {
      toast("Sync already in progress.", "error");
      return false;
    }
    if (!confirmDiscardUnsaved("Loading every engineer's data")) return false;
    setSyncBusy("load");
    try {
      const team = await loadTeam();
      const ids = new Set(((team && team.engineers) || []).map((e) => e.id));
      ids.add(myEngineerId());
      const projects = [];
      const tasks = [];
      const bases = {};
      const engSettings = {};
      let mine = null;
      for (const id of ids) {
        const f = await ghReadFile(engineerRepo(id), DATA_PATH);
        if (id === myEngineerId()) {
          // No file of my own yet: keep the settings in this browser rather than resetting to SAMPLE defaults.
          const json = f ? JSON.parse(f.text) : { settings: state.data.settings };
          await overlaySharedSettings(json);
          mine = normalizeData(json);
        }
        if (!f) {
          bases[id] = { sha: null, snapshot: null };
          continue;
        }
        const d = id === myEngineerId() ? mine : normalizeData(JSON.parse(f.text));
        bases[id] = { sha: f.sha, snapshot: JSON.parse(JSON.stringify(d)) };
        engSettings[id] = d.settings;
        d.projects.forEach((p) => projects.push(Object.assign({}, p, { _eng: id })));
        d.tasks.forEach((t) => tasks.push(Object.assign({}, t, { _eng: id })));
      }
      // Record ids must be unique across the team, or edits/deletes could hit the wrong engineer's record.
      const dupes = [projects, tasks].map((list) => {
        const seen = new Map();
        const d = new Set();
        list.forEach((r) => {
          if (seen.has(r.id) && seen.get(r.id) !== r._eng) d.add(r.id);
          seen.set(r.id, r._eng);
        });
        return d.size;
      });
      if (dupes[0] || dupes[1]) {
        toast(
          "Load stopped: " + (dupes[0] + dupes[1]) + " record id(s) exist in more than one engineer's repo (usually from a shared old file). Remove the duplicates from one repo first — nothing was changed.",
          "error"
        );
        return false;
      }
      backupCurrentData();
      state.data = Object.assign({}, mine || normalizeData({}), { projects, tasks });
      if (bases[myEngineerId()] && bases[myEngineerId()].sha) syncOwnMarkers(bases[myEngineerId()].sha, mine);
      state.bases = bases;
      state.engSettings = engSettings;
      state.teamLoaded = true;
      state.loadedThisSession = true;
      cacheDataLocally();
      setDirty(false);
      markLastSync("Load (all)");
      updateLeaderUi();
      render();
      toast("Loaded " + ids.size + " engineer repo(s)", "success", undoAction());
      return true;
    } catch (e) {
      toast("Leader load error: " + e.message, "error");
      return false;
    } finally {
      setSyncBusy(null);
    }
  }
  // Engineer mode and leader mode must agree on which version of my own file was last synced.
  function syncOwnMarkers(sha, data) {
    state.fileSha = sha;
    setBase(Object.assign({}, data, { projects: (data.projects || []).map(stripTag), tasks: (data.tasks || []).map(stripTag) }));
    state.loadedThisSession = true;
    try {
      localStorage.setItem(LS_SHA, sha);
    } catch (_) {}
  }
  // An engineer's own settings (name, ECSA no, letter sequence) are never replaced by the leader's.
  function settingsFor(id) {
    if (id === myEngineerId()) return state.data.settings;
    if (state.engSettings[id]) return state.engSettings[id];
    const shared = {};
    SHARED_KEYS.forEach((k) => (shared[k] = (state.data.settings || {})[k]));
    return normalizeData({ settings: shared }).settings;
  }
  function engineerSlice(id) {
    const me = myEngineerId();
    const own = (r) => (r._eng || me) === id;
    return {
      version: APP_VERSION,
      updatedAt: null,
      settings: settingsFor(id),
      projects: (state.data.projects || []).filter(own).map(stripTag),
      tasks: (state.data.tasks || []).filter(own).map(stripTag),
    };
  }
  async function saveEngineerFile(id) {
    const cmp = (x) => JSON.stringify(Object.assign({}, x, { updatedAt: 0, version: 0 }));
    let slice = engineerSlice(id);
    const base = (state.bases && state.bases[id]) || { sha: null, snapshot: null };
    if (base.snapshot ? cmp(slice) === cmp(base.snapshot) : !slice.projects.length && !slice.tasks.length) return "unchanged";
    const before = base.snapshot ? base.snapshot.projects.length + base.snapshot.tasks.length : 0;
    if (before && !slice.projects.length && !slice.tasks.length) {
      const ok = window.confirm(
        "Saving would remove ALL " + before + " projects and tasks from " + id + "'s repo. Continue only if you really deleted everything of theirs."
      );
      if (!ok) return "skipped";
    }
    let sha = base.sha;
    for (let attempt = 0; attempt < 2; attempt++) {
      slice.updatedAt = nowIso();
      const res = await ghWriteFile(engineerRepo(id), DATA_PATH, JSON.stringify(slice, null, 2), sha, "Update engineering projects data");
      if (!res.conflict) {
        state.bases[id] = { sha: res.sha, snapshot: JSON.parse(JSON.stringify(slice)) };
        if (id === myEngineerId()) syncOwnMarkers(res.sha, slice);
        return "saved";
      }
      const f = await ghReadFile(engineerRepo(id), DATA_PATH);
      const remote = f ? normalizeData(JSON.parse(f.text)) : normalizeData({});
      const merged = mergeData(base.snapshot, slice, remote).data;
      const me = myEngineerId();
      // Another engineer's settings are theirs: take the newest from GitHub. Mine follow the merge.
      if (id === me) state.data.settings = merged.settings;
      else if (f) state.engSettings[id] = remote.settings;
      const tag = (r) => Object.assign({}, r, { _eng: id });
      state.data.projects = (state.data.projects || []).filter((r) => (r._eng || me) !== id).concat(merged.projects.map(tag));
      state.data.tasks = (state.data.tasks || []).filter((r) => (r._eng || me) !== id).concat(merged.tasks.map(tag));
      slice = engineerSlice(id);
      sha = f && f.sha;
      base.snapshot = f ? JSON.parse(JSON.stringify(remote)) : null;
      base.sha = sha;
      state.bases[id] = base;
    }
    return "conflict";
  }
  async function saveAllToGithub() {
    if (!state.settings.pat) {
      toast("Set a Personal Access Token in Settings first.", "error");
      return false;
    }
    if (state.syncOp) {
      toast("Sync already in progress.", "error");
      return false;
    }
    if (!state.teamLoaded) {
      toast("Click Load first: the leader view must read every engineer's repo in this session before it can save.", "error");
      return false;
    }
    setSyncBusy("save");
    try {
      const ids = new Set(Object.keys(state.bases || {}));
      ids.add(myEngineerId());
      (state.data.projects || []).concat(state.data.tasks || []).forEach((r) => ids.add(r._eng || myEngineerId()));
      let saved = 0;
      const conflicted = [];
      const skipped = [];
      for (const id of ids) {
        const r = await saveEngineerFile(id);
        if (r === "saved") saved++;
        else if (r === "conflict") conflicted.push(id);
        else if (r === "skipped") skipped.push(id);
      }
      await pushSharedSettings();
      cacheDataLocally();
      if (conflicted.length || skipped.length) {
        toast(
          "Saved " + saved + " repo(s)." +
            (conflicted.length ? " " + conflicted.join(", ") + " changed again during save — click Save once more." : "") +
            (skipped.length ? " Not saved (you cancelled): " + skipped.join(", ") + "." : ""),
          "error"
        );
        return false;
      }
      setDirty(false);
      markLastSync("Save (all)");
      toast(saved ? "Saved " + saved + " engineer repo(s)" : "Nothing to save", "success");
      render();
      return true;
    } catch (e) {
      toast("Leader save error: " + e.message, "error");
      return false;
    } finally {
      setSyncBusy(null);
    }
  }
  function loadFromGithub() {
    return isLeader() ? loadAllFromGithub() : loadEngineerData();
  }
  function saveToGithub() {
    return isLeader() ? saveAllToGithub() : saveEngineerData();
  }
  // Company-wide letter numbers: reserved in the shared repo before the letter is issued.
  async function reserveLetterSeq(project, usedLocal) {
    if (!state.settings.pat || !myEngineerId()) return null;
    const year = ScfHelper.issueDateParts(new Date()).year;
    let result = null;
    await ghUpdateJson(
      sharedRepoName(),
      SHARED_LETTERS,
      (reg) => {
        reg = reg && typeof reg === "object" ? reg : {};
        reg.entries = Array.isArray(reg.entries) ? reg.entries : [];
        const used = new Set(reg.entries.map((e) => String(e.ref).toUpperCase()));
        const st = state.data.settings || {};
        let seq = Number(st.scfYear) === year ? Math.max(1, Number(st.scfSeq) || 1) : 1;
        reg.entries.forEach((e) => {
          const m = parseSclRef(e.ref);
          if (m && m.year === year && m.seq >= seq) seq = m.seq + 1;
        });
        usedLocal.forEach((r) => {
          if (!used.has(r)) {
            reg.entries.push({ ref: r, engineerId: myEngineerId(), at: nowIso(), seeded: true });
            used.add(r);
          }
        });
        while (used.has(ScfHelper.formatRef(year, seq).toUpperCase())) seq++;
        const ref = ScfHelper.formatRef(year, seq);
        reg.entries.push({ ref, engineerId: myEngineerId(), projectId: project.id, at: nowIso() });
        result = { ref, year, seq };
        return reg;
      },
      "Reserve letter number"
    );
    return result;
  }

  function exportJson() {
    state.data.updatedAt = nowIso();
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "projects.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Exported projects.json", "success");
  }

  function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        if (!json || typeof json !== "object" || (!Array.isArray(json.projects) && !Array.isArray(json.tasks))) {
          throw new Error("not a Lumax backup (no projects/tasks list). Nothing was changed.");
        }
        if (!confirmDiscardUnsaved("Importing this file")) return;
        const imported = normalizeData(json);
        backupCurrentData();
        state.data = imported;
        // Imported data is not what GitHub holds: force the "remote differs" check on next Save.
        state.fileSha = null;
        state.loadedThisSession = false;
        setBase(null);
        forgetTeamState();
        cacheDataLocally();
        state.view = "dashboard";
        state.selectedProjectId = null;
        render();
        toast("Imported JSON file", "success", undoAction());
      } catch (e) {
        toast("Import failed: " + e.message, "error");
      }
    };
    reader.readAsText(file);
  }

  async function bootstrap() {
    const cached = loadCachedData();
    // A parsed cache — even an empty one — wins, so deleting everything doesn't resurrect the sample seed.
    if (cached && typeof cached === "object") {
      state.data = normalizeData(cached);
    } else {
      try {
        const res = await fetch("./data/projects.json", { cache: "no-store" });
        if (res.ok) {
          state.data = normalizeData(await res.json());
          cacheDataLocally();
          setDirty(false);
        }
      } catch (_) {}
    }
    setDirty(dirty);
    updateAuthBadge();
    updateLeaderUi();
    if (state.settings.pat) fetchGithubUser();
    render();
  }

  function updateAuthBadge() {
    const badge = document.getElementById("auth-badge");
    if (!badge) return;
    if (state.githubUser) {
      badge.textContent = "@" + state.githubUser.login;
      badge.classList.add("ok");
    } else if (state.settings.pat) {
      badge.textContent = "PAT set (not verified)";
      badge.classList.remove("ok");
    } else {
      badge.textContent = "Not signed in";
      badge.classList.remove("ok");
    }
  }

  // ---------- Excel export (SheetJS) ----------
  function exportExcel() {
    if (typeof XLSX === "undefined") {
      toast("SheetJS failed to load. Check CDN / network.", "error");
      return;
    }

    const statuses = getStatuses();
    const allProjects = state.data.projects || [];
    const allTasks = state.data.tasks || [];

    // Filters apply ONLY to All Tasks + type split sheets.
    // Dashboard / Projects / Summary / By-* grouping sheets use the full dataset.
    const filterActive = !!(
      state.taskFilters &&
      (state.taskFilters.type ||
        state.taskFilters.statusId ||
        state.taskFilters.assignee ||
        state.taskFilters.overdueOnly ||
        state.taskFilters.projectId ||
        state.taskFilters.client ||
        state.taskFilters.structureType ||
        (state.search || "").trim())
    );
    // An export is a record: completed tasks are always included.
    const filteredTasks = filterActive ? allTasksFiltered({ skipHideCompleted: true }) : allTasks.slice();

    function statusName(id) {
      const s = getStatus(id);
      return s ? s.name : id || "";
    }
    function projectOf(t) {
      return t.projectId ? getProject(t.projectId) : null;
    }
    function phaseName(t, p) {
      if (!p || !t.phaseId) return "";
      const ph = (p.phases || []).find((x) => x.id === t.phaseId);
      return ph ? ph.name : "";
    }
    function taskRow(t) {
      const p = projectOf(t);
      return {
        "Project code": p ? p.projectCode : "(standalone)",
        "Project name": p ? p.projectName : "",
        Client: p ? p.clientName : "",
        Type: typeLabel(t.type),
        Title: t.title,
        Status: statusName(t.statusId),
        Phase: phaseName(t, p),
        Assignee: t.assignee || "",
        Priority: t.priority || "",
        Due: t.dueDate || "",
        Overdue: isOverdue(t) ? "yes" : "no",
        "Ref #": t.refNumber || "",
        "Raised by": t.raisedBy || "",
        "Response due": t.responseDue || "",
        Checker: t.checker || "",
        "Calc/Drawing ref": t.calcOrDrawingRef || "",
        "Drawing #": t.drawingNumber || "",
        Rev: t.rev || "",
        Discipline: t.discipline || "",
        "Blocked reason": t.blockedReason || "",
        "Done date": t.doneDate || "",
        Description: t.description || "",
        Standalone: t.projectId ? "no" : "yes",
        Updated: t.updatedAt || "",
      };
    }
    function sheetFromRows(rows, fallbackHeaders) {
      if (rows && rows.length) return XLSX.utils.json_to_sheet(rows);
      const headers = fallbackHeaders || ["(empty)"];
      return XLSX.utils.aoa_to_sheet([headers]);
    }
    /** Shared navy header + freeze/autofilter/borders/widths (Researchy polish). */
    function applyNavyHeader(ws, opts) {
      opts = opts || {};
      if (!ws || !ws["!ref"]) return ws;
      const range = XLSX.utils.decode_range(ws["!ref"]);
      const headerRow = opts.headerRow != null ? opts.headerRow : 0;
      const titleRows = opts.titleRows || 0;
      const navy = "0B1F3A";
      const borderColor = "CCCCCC";
      const zebra = "F5F7FA";
      const thin = { style: "thin", color: { rgb: borderColor } };
      const border = { top: thin, bottom: thin, left: thin, right: thin };
      const colMax = {};
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          let cell = ws[addr];
          if (!cell) {
            cell = { t: "s", v: "" };
            ws[addr] = cell;
          }
          if (cell.v == null) cell.v = "";
          const str = String(cell.v);
          colMax[C] = Math.max(colMax[C] || 0, Math.min(str.length, 40));
          const isHeader = R === headerRow;
          const isTitle = R < headerRow && R < titleRows;
          const base = cell.s && typeof cell.s === "object" ? Object.assign({}, cell.s) : {};
          if (isHeader) {
            cell.s = Object.assign({}, base, {
              fill: { patternType: "solid", fgColor: { rgb: navy } },
              font: { bold: true, color: { rgb: "FFFFFF" }, name: "Calibri", sz: 11 },
              alignment: { wrapText: true, vertical: "center", horizontal: "left" },
              border: border,
            });
          } else if (isTitle) {
            cell.s = Object.assign({}, base, {
              font: { bold: true, color: { rgb: navy }, name: "Calibri", sz: R === 0 ? 14 : 11 },
              alignment: { wrapText: true, vertical: "center" },
            });
          } else {
            const zebraFill = opts.zebra !== false && R > headerRow && (R - headerRow) % 2 === 0;
            cell.s = Object.assign({}, base, {
              font: { name: "Calibri", sz: 11, color: { rgb: "1A2332" } },
              alignment: { wrapText: true, vertical: "top" },
              border: border,
              fill: zebraFill ? { patternType: "solid", fgColor: { rgb: zebra } } : base.fill,
            });
          }
        }
      }
      const freezeAt = headerRow + 1;
      ws["!freeze"] = {
        xSplit: 0,
        ySplit: freezeAt,
        topLeftCell: XLSX.utils.encode_cell({ r: freezeAt, c: 0 }),
        activePane: "bottomLeft",
        state: "frozen",
      };
      // Autofilter on header..data (skip pure title-only sheets without header)
      if (range.e.r >= headerRow) {
        const af = {
          s: { r: headerRow, c: range.s.c },
          e: { r: range.e.r, c: range.e.c },
        };
        ws["!autofilter"] = { ref: XLSX.utils.encode_range(af) };
      }
      const cols = [];
      for (let C = range.s.c; C <= range.e.c; C++) {
        const w = Math.max(10, Math.min(42, (colMax[C] || 8) + 2));
        cols.push({ wch: w });
      }
      ws["!cols"] = cols;
      return ws;
    }
    function appendSheet(wb, name, ws, polishOpts) {
      applyNavyHeader(ws, polishOpts || {});
      XLSX.utils.book_append_sheet(wb, ws, name);
    }

    // ---- 1 Dashboard (full dataset KPIs) ----
    const liveTasks = allTasks.filter(isLiveTask);
    const openAll = liveTasks.filter((t) => statusIsOpen(t.statusId));
    const overdueAll = liveTasks.filter((t) => isOverdue(t));
    const due7All = liveTasks.filter((t) => isDueWithin(t, 7));
    const blockedAll = liveTasks.filter((t) => statusIsBlocked(t.statusId));
    const standaloneOpen = liveTasks.filter((t) => !t.projectId && statusIsOpen(t.statusId));
    const activeProjects = allProjects.filter((p) => !p.archived);
    const riskProjects = activeProjects.filter((p) => projectAtRisk(p));

    const dash = [];
    dash.push(["Lumax Energy — Engineering Management — Dashboard"]);
    dash.push(["Exported at", nowIso()]);
    dash.push(["Filter note", filterActive
      ? "Active UI filters apply to All Tasks + type sheets only. This Dashboard sheet is the FULL dataset."
      : "No task filters active — all task sheets use the full dataset."]);
    dash.push([]);
    dash.push(["KPI", "Value", "Light", "Note"]);
    const excelKpis = execDashboardKpis();
    excelKpis.forEach((k) => {
      dash.push([k.label, k.value, k.light, k.note]);
    });
    dash.push([]);
    dash.push(["Operational snapshot"]);
    dash.push(["Open tasks", openAll.length]);
    dash.push(["Due in 7 days", due7All.length]);
    dash.push(["Blocked", blockedAll.length]);
    dash.push(["Standalone open", standaloneOpen.length]);
    dash.push(["Projects at risk", riskProjects.length]);
    dash.push(["Total tasks", allTasks.length]);
    dash.push([]);

    dash.push(["Open by status"]);
    dash.push(["Status", "Count"]);
    statuses.forEach((s) => {
      dash.push([s.name, openAll.filter((t) => t.statusId === s.id).length]);
    });
    dash.push([]);

    dash.push(["Open by type"]);
    dash.push(["Type", "Count"]);
    getTaskTypes().forEach((ty) => {
      dash.push([ty.name, openAll.filter((t) => t.type === ty.id).length]);
    });
    dash.push([]);

    dash.push(["Overdue / due-7d by assignee"]);
    dash.push(["Assignee", "Overdue", "Due in 7d", "Open"]);
    const assigneeKeys = [...new Set(allTasks.map((t) => t.assignee || "(unassigned)"))].sort((a, b) =>
      a.localeCompare(b)
    );
    assigneeKeys.forEach((a) => {
      const match = (t) => (t.assignee || "(unassigned)") === a;
      dash.push([
        a,
        overdueAll.filter(match).length,
        due7All.filter(match).length,
        openAll.filter(match).length,
      ]);
    });
    dash.push([]);

    dash.push(["Open by client"]);
    dash.push(["Client", "Open", "Overdue", "Blocked"]);
    const clientKeys = [...new Set(allProjects.map((p) => p.clientName || "(no client)"))].sort((a, b) =>
      a.localeCompare(b)
    );
    clientKeys.forEach((c) => {
      const pids = new Set(allProjects.filter((p) => (p.clientName || "(no client)") === c).map((p) => p.id));
      const cts = allTasks.filter((t) => t.projectId && pids.has(t.projectId));
      dash.push([
        c,
        cts.filter((t) => statusIsOpen(t.statusId)).length,
        cts.filter((t) => isOverdue(t)).length,
        cts.filter((t) => statusIsBlocked(t.statusId)).length,
      ]);
    });
    // standalone as pseudo-client row
    const stAlone = allTasks.filter((t) => !t.projectId);
    dash.push([
      "(standalone)",
      stAlone.filter((t) => statusIsOpen(t.statusId)).length,
      stAlone.filter((t) => isOverdue(t)).length,
      stAlone.filter((t) => statusIsBlocked(t.statusId)).length,
    ]);
    dash.push([]);

    dash.push(["Open by project"]);
    dash.push(["Project code", "Project name", "Client", "Open", "Overdue", "Blocked", "At risk"]);
    allProjects
      .slice()
      .sort((a, b) => (a.projectCode || "").localeCompare(b.projectCode || ""))
      .forEach((p) => {
        dash.push([
          p.projectCode,
          p.projectName,
          p.clientName,
          openTaskCount(p),
          overdueCount(p),
          blockedCount(p),
          projectAtRisk(p) ? "yes" : "no",
        ]);
      });

    // ---- 2 All Tasks (filtered) ----
    const allTaskRows = filteredTasks.map(taskRow);

    // ---- 3 Projects (full) ----
    const projRows = allProjects
      .slice()
      .sort((a, b) => (a.projectCode || "").localeCompare(b.projectCode || ""))
      .map((p) => {
        const pts = projectTasks(p.id);
        const cur = projectCurrentPhase(p);
        return {
          Code: p.projectCode,
          Name: p.projectName,
          Client: p.clientName,
          "Sales order": p.salesOrderNumber,
          "PO number": p.poNumber || "",
          "POP reference": p.popReference || "",
          INV: p.invoiceNumber || "",
          Address: p.address || "",
          Contact: p.contactPerson || "",
          Type: p.projectType || "",
          "Structure types": (p.structureTypes || []).join("; "),
          "Phase count": (p.phases || []).length,
          "Current phase": cur ? cur.name : "",
          "Municipal sign-off": normalizeMunicipalSignOff(p.municipalSignOff, p.engineeringSignOff),
          "Municipal sign-off at": p.engineeringSignOffAt || "",
          "Municipal sign-off by": p.engineeringSignOffBy || "",
          Conformance: conformanceLabel(p.conformanceStatus),
          "Conformance ref": p.conformanceRef || "",
          "Conformance issued at": p.conformanceIssuedAt || "",
          "Open tasks": pts.filter((t) => statusIsOpen(t.statusId)).length,
          Overdue: pts.filter((t) => isOverdue(t)).length,
          Blocked: pts.filter((t) => statusIsBlocked(t.statusId)).length,
          "At risk": projectAtRisk(p) ? "yes" : "no",
          Archived: p.archived ? "yes" : "no",
          Updated: p.updatedAt,
        };
      });

    // ---- 4 By Assignee (full, sorted) ----
    const byAssigneeRows = allTasks
      .slice()
      .sort((a, b) => {
        const aa = (a.assignee || "(unassigned)").toLowerCase();
        const bb = (b.assignee || "(unassigned)").toLowerCase();
        if (aa !== bb) return aa.localeCompare(bb);
        return String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999"));
      })
      .map((t) => {
        const row = taskRow(t);
        row.Assignee = t.assignee || "(unassigned)";
        return row;
      });

    // ---- 5 By Client (full, sorted) ----
    const byClientRows = allTasks
      .slice()
      .sort((a, b) => {
        const pa = projectOf(a);
        const pb = projectOf(b);
        const ca = pa ? pa.clientName || "(no client)" : "(standalone)";
        const cb = pb ? pb.clientName || "(no client)" : "(standalone)";
        if (ca !== cb) return ca.localeCompare(cb);
        return (pa ? pa.projectCode || "" : "").localeCompare(pb ? pb.projectCode || "" : "");
      })
      .map((t) => taskRow(t));

    // ---- 6 By Project (full, sorted) ----
    const byProjectRows = allTasks
      .slice()
      .sort((a, b) => {
        const pa = projectOf(a);
        const pb = projectOf(b);
        const ca = pa ? pa.projectCode || pa.projectName || "" : "(standalone)";
        const cb = pb ? pb.projectCode || pb.projectName || "" : "(standalone)";
        if (ca !== cb) return ca.localeCompare(cb);
        return String(a.title || "").localeCompare(String(b.title || ""));
      })
      .map((t) => taskRow(t));

    // ---- 7–10 type splits (filtered) ----
    function typeRows(typeId) {
      return filteredTasks.filter((t) => t.type === typeId).map(taskRow);
    }

    // ---- 11 Summary type×status (full dataset) ----
    const summary = [];
    summary.push(["Type × Status matrix (FULL dataset)"]);
    summary.push(["Exported at", nowIso()]);
    summary.push([]);
    summary.push(["Type \\ Status"].concat(statuses.map((s) => s.name)).concat(["Total"]));
    getTaskTypes().forEach((ty) => {
      const row = [ty.name];
      let total = 0;
      statuses.forEach((s) => {
        const n = allTasks.filter((t) => t.type === ty.id && t.statusId === s.id).length;
        row.push(n);
        total += n;
      });
      row.push(total);
      summary.push(row);
    });
    const totRow = ["Total"];
    let grand = 0;
    statuses.forEach((s) => {
      const n = allTasks.filter((t) => t.statusId === s.id).length;
      totRow.push(n);
      grand += n;
    });
    totRow.push(grand);
    summary.push(totRow);
    summary.push([]);
    summary.push(["Metric", "Count"]);
    summary.push(["Total tasks", allTasks.length]);
    summary.push(["Open", openAll.length]);
    summary.push(["Overdue", overdueAll.length]);
    summary.push(["Blocked", blockedAll.length]);
    summary.push(["Standalone", allTasks.filter((t) => !t.projectId).length]);
    if (filterActive) {
      summary.push([]);
      summary.push(["Note", "UI filters were active: All Tasks + RDN/Design Checks/Drawings/Eng Tasks sheets are filter-scoped. Dashboard, Projects, By Assignee/Client/Project, and Summary use the full dataset."]);
    }

    const emptyHeaders = Object.keys(taskRow({
      title: "", type: "eng_task", statusId: "status-todo", projectId: null,
      assignee: "", priority: "", dueDate: null, phaseId: null,
      refNumber: "", raisedBy: "", responseDue: null, checker: "", calcOrDrawingRef: "",
      drawingNumber: "", rev: "", discipline: "", blockedReason: "", doneDate: null,
      description: "", updatedAt: "",
    }));

    const scfRows = allProjects
      .slice()
      .sort((a, b) => (a.projectCode || "").localeCompare(b.projectCode || ""))
      .map((p) => {
        const eng = getEngineerDefaults();
        return {
          "Conformance ref": p.conformanceRef || "",
          Status: conformanceLabel(p.conformanceStatus),
          Issued: p.conformanceIssuedAt || "",
          Client: p.clientName || "",
          "Project name": p.projectName || "",
          "Project code": p.projectCode || "",
          INV: p.invoiceNumber || "",
          PO: p.poNumber || "",
          POP: p.popReference || "",
          Address: p.address || "",
          Contact: p.contactPerson || "",
          Type: p.projectType || "",
          "Structure types": (p.structureTypes || []).join("; "),
          Drawings: (p.drawingNumbers || []).join("; "),
          "Eng name": eng.name,
          "ECSA no": eng.ecsaNo,
          Business: eng.business,
        };
      });

    const wb = XLSX.utils.book_new();
    // 1 Dashboard 2 All Tasks 3 Projects 4 SCL 5 By Assignee 6 By Client 7 By Project
    // 8 RDN 9 Design Checks 10 Drawings 11 Eng Tasks 12 Summary
    // Dashboard: title row 0, KPI header around row with "KPI","Value" — find first header-ish row
    const dashWs = XLSX.utils.aoa_to_sheet(dash);
    let dashHeaderRow = 0;
    for (let i = 0; i < dash.length; i++) {
      if (dash[i] && dash[i][0] === "KPI" && dash[i][1] === "Value") {
        dashHeaderRow = i;
        break;
      }
    }
    appendSheet(wb, "Dashboard", dashWs, { headerRow: dashHeaderRow, titleRows: Math.min(3, dashHeaderRow), zebra: false });
    appendSheet(wb, "All Tasks", sheetFromRows(allTaskRows, emptyHeaders));
    appendSheet(wb, "Projects", sheetFromRows(projRows, ["Code", "Name", "Client", "PO number", "INV", "Conformance ref"]));
    appendSheet(wb, "SCL", sheetFromRows(scfRows, ["Conformance ref", "Status", "Client", "INV"]));
    appendSheet(wb, "By Assignee", sheetFromRows(byAssigneeRows, emptyHeaders));
    appendSheet(wb, "By Client", sheetFromRows(byClientRows, emptyHeaders));
    appendSheet(wb, "By Project", sheetFromRows(byProjectRows, emptyHeaders));
    appendSheet(wb, "RDN", sheetFromRows(typeRows("rdn"), emptyHeaders));
    appendSheet(wb, "Design Checks", sheetFromRows(typeRows("design_check"), emptyHeaders));
    appendSheet(wb, "Drawings", sheetFromRows(typeRows("drawing"), emptyHeaders));
    appendSheet(wb, "Eng Tasks", sheetFromRows(typeRows("eng_task"), emptyHeaders));
    const summaryWs = XLSX.utils.aoa_to_sheet(summary);
    let sumHeader = 0;
    for (let i = 0; i < summary.length; i++) {
      if (summary[i] && String(summary[i][0] || "").indexOf("Type") === 0) {
        sumHeader = i;
        break;
      }
    }
    appendSheet(wb, "Summary", summaryWs, { headerRow: sumHeader, titleRows: Math.min(3, sumHeader), zebra: false });

    XLSX.writeFile(wb, "lumax-eng-mgmt.xlsx");
    toast(
      filterActive
        ? "Exported Excel (All Tasks + type sheets filter-scoped; Dashboard/Projects/SCL/Summary/By-* full)"
        : "Exported Excel workbook (12 sheets)",
      "success"
    );
  }

  // ---------- Render shell ----------
  function render() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      const active =
        btn.dataset.view === state.view ||
        (state.view === "detail" && btn.dataset.view === "projects");
      btn.classList.toggle("active", active);
    });
    ["dashboard", "projects", "tasks", "detail"].forEach((v) => {
      const el = document.getElementById("view-" + v);
      if (el) el.classList.toggle("hidden", state.view !== v);
    });

    if (state.view === "dashboard") renderDashboard();
    else if (state.view === "projects") renderProjects();
    else if (state.view === "tasks") renderTasksView();
    else if (state.view === "detail") renderDetail();
  }

  function setView(view) {
    state.view = view;
    if (view !== "detail") state.selectedProjectId = null;
    render();
  }

  // ---------- Dashboard ----------
  function renderViewChips(activeId, opts) {
    opts = opts || {};
    const showClear = !!(activeId || (state.projectFilters && state.projectFilters.client));
    return (
      `<div class="view-chips" role="toolbar" aria-label="Dashboard views">` +
      DASHBOARD_VIEWS.map((v) => {
        const active = activeId === v.id;
        return (
          `<button type="button" class="view-chip${active ? " active" : ""}" data-dash-view="${escapeHtml(v.id)}" title="${escapeHtml(v.hint || "")}">` +
          `${escapeHtml(v.label)}</button>`
        );
      }).join("") +
      (showClear
        ? `<button type="button" class="view-chip clear" data-dash-view="" title="Clear view filters">Clear</button>`
        : "") +
      (state.projectFilters.client
        ? `<span class="view-chip-meta">Client: <strong>${escapeHtml(state.projectFilters.client)}</strong></span>`
        : "") +
      `</div>`
    );
  }

  function bindViewChips(root) {
    root.querySelectorAll("[data-dash-view]").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.dashView || null;
        activateDashboardView(id);
      };
    });
  }

  function activateDashboardView(id) {
    if (!id) {
      state.dashboardView = null;
      state.projectFilters.client = "";
      state.projectFilters.dashboardView = null;
      render();
      return;
    }
    if (String(id).startsWith("type:")) {
      state.dashboardView = id;
      state.projectFilters.dashboardView = id;
      if (state.view === "dashboard" || state.view === "projects") render();
      else setView("projects");
      return;
    }
    const def = getDashboardView(id);
    if (!def) return;

    if (def.kind === "browse-clients" || def.kind === "browse-assignees" || def.kind === "browse-project-types") {
      state.dashboardView = id;
      state.projectFilters.dashboardView = null;
      // Browse lists live on the dashboard
      if (state.view !== "dashboard") setView("dashboard");
      else render();
      return;
    }

    if (def.kind === "filter-projects") {
      // Toggle same chip off
      if (state.dashboardView === id) {
        state.dashboardView = null;
        state.projectFilters.dashboardView = null;
      } else {
        state.dashboardView = id;
        state.projectFilters.dashboardView = id;
      }
      if (state.view === "dashboard" || state.view === "projects") render();
      else setView("projects");
      return;
    }
  }

  function renderDashboard() {
    const root = document.getElementById("view-dashboard");
    const viewDef = state.dashboardView ? getDashboardView(state.dashboardView) : null;

    // Browse / filtered view panels take over when a chip is active
    if (viewDef && viewDef.kind === "browse-clients") {
      const clients = uniqueClients();
      root.innerHTML =
        renderViewChips(state.dashboardView) +
        `<div class="dash-view-panel">` +
        `<h2>Clients <span class="stat-sub">(${clients.length})</span></h2>` +
        `<p class="hint">Click a client to open Projects filtered by that client.</p>` +
        `<div class="browse-chip-grid">` +
        (clients.length
          ? clients
              .map(
                (c) =>
                  `<button type="button" class="browse-card" data-client="${escapeHtml(c)}">` +
                  `<div class="browse-card-title">${escapeHtml(c)}</div>` +
                  `<div class="stat-sub">${(state.data.projects || []).filter((p) => (p.clientName || "") === c && !p.archived).length} active project(s)</div>` +
                  `</button>`
              )
              .join("")
          : `<div class="empty-state">No clients yet</div>`) +
        `</div></div>`;
      bindViewChips(root);
      root.querySelectorAll("[data-client]").forEach((btn) => {
        btn.onclick = () => {
          state.projectFilters.client = btn.dataset.client;
          state.dashboardView = null;
          state.projectFilters.dashboardView = null;
          state.taskFilters.client = btn.dataset.client;
          setView("projects");
        };
      });
      return;
    }

    if (viewDef && viewDef.kind === "browse-assignees") {
      const assignees = uniqueAssignees();
      root.innerHTML =
        renderViewChips(state.dashboardView) +
        `<div class="dash-view-panel">` +
        `<h2>Engineer <span class="stat-sub">(${assignees.length})</span></h2>` +
        `<p class="hint">Click an assignee to open Tasks filtered by that person.</p>` +
        `<div class="browse-chip-grid">` +
        (assignees.length
          ? assignees
              .map((a) => {
                const openN = (state.data.tasks || []).filter(
                  (t) => (t.assignee || "") === a && statusIsOpen(t.statusId)
                ).length;
                return (
                  `<button type="button" class="browse-card" data-assignee="${escapeHtml(a)}">` +
                  `<div class="browse-card-title">${escapeHtml(a)}</div>` +
                  `<div class="stat-sub">${openN} open task(s)</div>` +
                  `</button>`
                );
              })
              .join("")
          : `<div class="empty-state">No assignees yet</div>`) +
        `</div></div>`;
      bindViewChips(root);
      root.querySelectorAll("[data-assignee]").forEach((btn) => {
        btn.onclick = () => {
          state.taskFilters = blankTaskFilters({
            assignee: btn.dataset.assignee,
          });
          state.dashboardView = null;
          setView("tasks");
        };
      });
      return;
    }

    if (viewDef && (viewDef.kind === "browse-structure-types" || viewDef.kind === "browse-project-types")) {
      const types = uniqueStructureTypes();
      root.innerHTML =
        renderViewChips(state.dashboardView) +
        `<div class="dash-view-panel">` +
        `<h2>Structure type <span class="stat-sub">(${types.length})</span></h2>` +
        `<p class="hint">Click a structure type to list matching projects (filtered by structureTypes).</p>` +
        `<div class="browse-chip-grid">` +
        (types.length
          ? types
              .map((t) => {
                const n = (state.data.projects || []).filter((p) => {
                  if (p.archived) return false;
                  return (p.structureTypes || []).includes(t);
                }).length;
                return (
                  `<button type="button" class="browse-card" data-ptype="${escapeHtml(t)}">` +
                  `<div class="browse-card-title">${escapeHtml(t)}</div>` +
                  `<div class="stat-sub">${n} active project(s)</div>` +
                  `</button>`
                );
              })
              .join("")
          : `<div class="empty-state">No structure types yet — add some in Settings</div>`) +
        `</div></div>`;
      bindViewChips(root);
      root.querySelectorAll("[data-ptype]").forEach((btn) => {
        btn.onclick = () => {
          state.dashboardView = "type:" + btn.dataset.ptype;
          state.projectFilters.dashboardView = state.dashboardView;
          setView("projects");
        };
      });
      return;
    }

    if (String(state.dashboardView || "").startsWith("type:")) {
      const want = String(state.dashboardView).slice(5);
      const projects = projectsMatchingFilters();
      root.innerHTML =
        renderViewChips("project-types") +
        `<div class="dash-view-panel">` +
        `<h2>Type: ${escapeHtml(want)} <span class="stat-sub">(${projects.length})</span></h2>` +
        `<p class="hint">Projects with this projectType or structure type. Open in Projects to continue.</p>` +
        `<div class="project-grid" id="dash-filtered-projects"></div>` +
        `<div class="dash-view-actions"><button type="button" class="btn btn-secondary btn-sm" id="btn-open-filtered-projects">Open in Projects</button></div>` +
        `</div>`;
      const grid = root.querySelector("#dash-filtered-projects");
      if (!projects.length) {
        grid.innerHTML = '<div class="empty-state">No projects match this type.</div>';
      } else {
        grid.innerHTML = projects
          .map((p) => {
            const cur = projectCurrentPhase(p);
            return (
              `<article class="project-card${p.archived ? " archived" : ""}${projectAtRisk(p) ? " at-risk" : ""}" data-id="${escapeHtml(p.id)}" tabindex="0" role="button">` +
              `<div class="code">${escapeHtml(p.projectCode || "—")}</div>` +
              `<h3>${escapeHtml(p.projectName || "Untitled")}</h3>` +
              `<div class="meta">${escapeHtml(p.clientName || "No client")} · ${escapeHtml(p.projectType || "—")}</div>` +
              (isScfIssued(p) ? `<span class="pill conformance">${escapeHtml(p.conformanceRef)}</span> ` : "") +
              (cur ? `<div class="stat-sub">Current: ${escapeHtml(cur.name)}</div>` : "") +
              `</article>`
            );
          })
          .join("");
        grid.querySelectorAll(".project-card").forEach((card) => {
          card.addEventListener("click", () => openProject(card.dataset.id));
          card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openProject(card.dataset.id);
            }
          });
        });
      }
      bindViewChips(root);
      const openBtn = root.querySelector("#btn-open-filtered-projects");
      if (openBtn) openBtn.onclick = () => setView("projects");
      return;
    }

    if (viewDef && viewDef.kind === "filter-projects") {
      const projects = projectsMatchingFilters();
      root.innerHTML =
        renderViewChips(state.dashboardView) +
        `<div class="dash-view-panel">` +
        `<h2>${escapeHtml(viewDef.label)} <span class="stat-sub">(${projects.length})</span></h2>` +
        `<p class="hint">${escapeHtml(viewDef.hint || "")}` +
        (viewDef.id === "conformance"
          ? ' — <em>Conformance letter</em> means status is <strong>pending</strong> or <strong>approved</strong> (not none).'
          : "") +
        (viewDef.id === "scf-ready"
          ? " — Requires invoice, contact, address, and current phase <strong>Done</strong>."
          : "") +
        (viewDef.id === "scf-issued"
          ? " — Approved with an <strong>LMX-SCL-YYYY-NNN</strong> reference (legacy LMX-SCF-* still shown)."
          : "") +
        (viewDef.id === "site-investigation"
          ? " — Current phase = first phase with open tasks; if all tasks done, terminal phase."
          : "") +
        `</p>` +
        `<div class="project-grid" id="dash-filtered-projects"></div>` +
        `<div class="dash-view-actions"><button type="button" class="btn btn-secondary btn-sm" id="btn-open-filtered-projects">Open in Projects</button></div>` +
        `</div>`;
      const grid = root.querySelector("#dash-filtered-projects");
      if (!projects.length) {
        grid.innerHTML = '<div class="empty-state">No projects match this view.</div>';
      } else {
        grid.innerHTML = projects
          .map((p) => {
            const cur = projectCurrentPhase(p);
            return (
              `<article class="project-card${p.archived ? " archived" : ""}${projectAtRisk(p) ? " at-risk" : ""}" data-id="${escapeHtml(p.id)}" tabindex="0" role="button">` +
              `<div class="code">${escapeHtml(p.projectCode || "—")}</div>` +
              `<h3>${escapeHtml(p.projectName || "Untitled")}</h3>` +
              `<div class="meta">${escapeHtml(p.clientName || "No client")} · SO ${escapeHtml(p.salesOrderNumber || "—")}</div>` +
              (normalizeMunicipalSignOff(p.municipalSignOff, p.engineeringSignOff) === "approved" ? '<span class="pill signoff">Municipal approved</span> ' : normalizeMunicipalSignOff(p.municipalSignOff, p.engineeringSignOff) === "pending" ? '<span class="pill muni-pending">Municipal pending</span> ' : "") +
              (isLeader() && p._eng ? `<span class="pill">${escapeHtml(p._eng)}</span> ` : "") +
              (hasConformance(p) ? `<span class="pill conformance">${escapeHtml(conformanceLabel(p.conformanceStatus))}</span> ` : "") +
              (cur ? `<div class="stat-sub">Current: ${escapeHtml(cur.name)}</div>` : "") +
              `</article>`
            );
          })
          .join("");
        grid.querySelectorAll(".project-card").forEach((card) => {
          card.addEventListener("click", () => openProject(card.dataset.id));
          card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openProject(card.dataset.id);
            }
          });
        });
      }
      bindViewChips(root);
      const openBtn = root.querySelector("#btn-open-filtered-projects");
      if (openBtn) openBtn.onclick = () => setView("projects");
      return;
    }

    const tasks = (state.data.tasks || []).filter(isLiveTask);
    const statuses = getStatuses();
    const open = tasks.filter((t) => statusIsOpen(t.statusId));
    const overdue = tasks.filter((t) => isOverdue(t));
    const due7 = tasks.filter((t) => isDueWithin(t, 7));
    const myName = (state.data.settings.myAssignee || "").trim();

    // Open by status
    const byStatus = statuses.map((s) => ({
      s,
      n: open.filter((t) => t.statusId === s.id).length,
    })).filter((x) => statusIsOpen(x.s.id) || x.n > 0);
    const maxStatus = Math.max(1, ...byStatus.map((x) => x.n));

    // Overdue / due-7d by assignee
    const assigneeMap = {};
    overdue.concat(due7).forEach((t) => {
      const a = t.assignee || "(unassigned)";
      if (!assigneeMap[a]) assigneeMap[a] = { overdue: 0, due7: 0 };
    });
    overdue.forEach((t) => {
      const a = t.assignee || "(unassigned)";
      assigneeMap[a].overdue++;
    });
    due7.forEach((t) => {
      const a = t.assignee || "(unassigned)";
      assigneeMap[a].due7++;
    });
    const assigneeRows = Object.entries(assigneeMap).sort((a, b) => b[1].overdue - a[1].overdue);

    // By type
    const byType = getTaskTypes().map((ty) => ({
      ty,
      n: tasks.filter((t) => t.type === ty.id && statusIsOpen(t.statusId)).length,
    }));

    // Projects at risk
    const risk = (state.data.projects || []).filter((p) => !p.archived && projectAtRisk(p));

    // My work
    const myWork = myName
      ? tasks.filter((t) => statusIsOpen(t.statusId) && (t.assignee || "").toLowerCase() === myName.toLowerCase())
      : [];

    // Recent activity
    const recent = tasks
      .slice()
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
      .slice(0, 8);

    const signOffN = (state.data.projects || []).filter((p) => !p.archived && normalizeMunicipalSignOff(p.municipalSignOff, p.engineeringSignOff) === "approved").length;
    const confN = (state.data.projects || []).filter((p) => inScope(p) && !p.archived && hasConformance(p)).length;
    const siteN = (state.data.projects || []).filter((p) => !p.archived && projectInSiteInvestigation(p)).length;
    const execKpis = execDashboardKpis();

    root.innerHTML =
      `<div class="exec-kpi-grid" id="exec-kpi-grid">` +
      execKpis
        .map((k) => {
          return (
            `<button type="button" class="kpi-card light-${escapeHtml(k.light)}" data-kpi="${escapeHtml(k.id)}" data-view="${escapeHtml(k.view || "")}"` +
            (k.tasksOverdue ? ' data-overdue="1"' : "") +
            `>` +
            `<div class="kpi-card-top"><span class="kpi-light" title="${escapeHtml(k.light)}"></span><h3>${escapeHtml(k.label)}</h3></div>` +
            `<div class="stat-big">${k.value}</div>` +
            `<div class="stat-sub">${escapeHtml(k.note)}</div>` +
            `</button>`
          );
        })
        .join("") +
      `</div>` +
      renderViewChips(state.dashboardView) +
      `<div class="dash-grid">` +
      `<div class="dash-card span-4"><h3>Open tasks</h3><div class="stat-big">${open.length}</div><div class="stat-sub">${overdue.length} overdue · ${due7.length} due in 7d</div></div>` +
      `<div class="dash-card span-4"><h3>Standalone</h3><div class="stat-big">${tasks.filter((t) => !t.projectId && statusIsOpen(t.statusId)).length}</div><div class="stat-sub">open without project</div></div>` +
      `<div class="dash-card span-4"><h3>Active projects</h3><div class="stat-big">${(state.data.projects || []).filter((p) => inScope(p) && !p.archived).length}</div><div class="stat-sub">${risk.length} at risk · ${signOffN} municipal approved · ${siteN} site inv. · ${confN} SC letter</div></div>` +
      `<div class="dash-card span-6"><h3>Open by status</h3><div class="status-bars">` +
      byStatus
        .map((x) => {
          const pct = Math.round((x.n / maxStatus) * 100);
          return (
            `<div class="bar-row"><div class="bar-label"><button type="button" class="linkish dash-filter-status" data-status="${escapeHtml(x.s.id)}">${escapeHtml(x.s.name)}</button><span>${x.n}</span></div>` +
            `<div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${escapeHtml(x.s.color || "#2f80ed")}"></div></div></div>`
          );
        })
        .join("") +
      `</div></div>` +
      `<div class="dash-card span-6"><h3>By type (open)</h3>` +
      byType
        .map(
          (x) =>
            `<div class="stat-row"><button type="button" class="linkish dash-filter-type" data-type="${escapeHtml(x.ty.id)}">${escapeHtml(x.ty.name)}</button><span>${x.n}</span></div>`
        )
        .join("") +
      `</div>` +
      `<div class="dash-card span-6"><h3>Overdue / due-7d by assignee</h3>` +
      (assigneeRows.length
        ? assigneeRows
            .map(
              ([a, c]) =>
                `<div class="stat-row"><button type="button" class="linkish dash-filter-assignee" data-assignee="${escapeHtml(a === "(unassigned)" ? "__unassigned__" : a)}">${escapeHtml(a)}</button><span>${c.overdue} overdue · ${c.due7} due-7d</span></div>`
            )
            .join("")
        : `<div class="stat-sub">No upcoming deadlines</div>`) +
      `</div>` +
      `<div class="dash-card span-6"><h3>Projects at risk</h3>` +
      (risk.length
        ? `<ul class="risk-list">` +
          risk
            .map((p) => {
              return (
                `<li><button type="button" class="linkish dash-open-project" data-id="${escapeHtml(p.id)}">${escapeHtml(p.projectCode || p.projectName)}</button> ` +
                `<span class="risk-badge">${blockedCount(p)} blocked · ${overdueCount(p)} overdue</span></li>`
              );
            })
            .join("") +
          `</ul>`
        : `<div class="stat-sub">None — nice work</div>`) +
      `</div>` +
      `<div class="dash-card span-6"><h3>My work${myName ? " — " + escapeHtml(myName) : ""}</h3>` +
      (!myName
        ? `<div class="stat-sub">Set “My name” in Settings to filter your tasks.</div>`
        : myWork.length
          ? `<ul class="mywork-list">` +
            myWork
              .slice(0, 10)
              .map((t) => {
                return `<li><button type="button" class="linkish dash-open-task" data-id="${escapeHtml(t.id)}">${escapeHtml(t.title)}</button> <span class="type-chip">${escapeHtml(typeLabel(t.type))}</span></li>`;
              })
              .join("") +
            `</ul>`
          : `<div class="stat-sub">No open tasks assigned to you</div>`) +
      `</div>` +
      `<div class="dash-card span-6"><h3>Recent activity</h3>` +
      `<ul class="activity-list">` +
      recent
        .map((t) => {
          const when = t.updatedAt ? new Date(t.updatedAt).toLocaleString() : "";
          return `<li><button type="button" class="linkish dash-open-task" data-id="${escapeHtml(t.id)}">${escapeHtml(t.title)}</button><div class="stat-sub">${escapeHtml(when)}</div></li>`;
        })
        .join("") +
      `</ul></div></div>`;

    bindViewChips(root);
    root.querySelectorAll(".dash-filter-status").forEach((btn) => {
      btn.onclick = () => {
        state.taskFilters = blankTaskFilters({ statusId: btn.dataset.status });
        setView("tasks");
      };
    });
    root.querySelectorAll(".dash-filter-type").forEach((btn) => {
      btn.onclick = () => {
        state.taskFilters = blankTaskFilters({ type: btn.dataset.type });
        setView("tasks");
      };
    });
    root.querySelectorAll(".dash-filter-assignee").forEach((btn) => {
      btn.onclick = () => {
        state.taskFilters = blankTaskFilters({ assignee: btn.dataset.assignee, overdueOnly: true });
        setView("tasks");
      };
    });
    root.querySelectorAll(".dash-open-project").forEach((btn) => {
      btn.onclick = () => openProject(btn.dataset.id);
    });
    root.querySelectorAll(".dash-open-task").forEach((btn) => {
      btn.onclick = () => openTaskForm(btn.dataset.id);
    });
    root.querySelectorAll("#exec-kpi-grid .kpi-card").forEach((btn) => {
      btn.onclick = () => {
        if (btn.dataset.overdue === "1") {
          state.taskFilters = blankTaskFilters({ overdueOnly: true });
          state.dashboardView = null;
          setView("tasks");
          return;
        }
        const view = btn.dataset.view || "";
        if (view) {
          state.dashboardView = view;
          state.projectFilters.dashboardView = view;
          setView("projects");
          return;
        }
        // Open projects → projects list
        state.dashboardView = null;
        state.projectFilters.dashboardView = null;
        setView("projects");
      };
    });
  }

  // ---------- Projects ----------
  function renderProjects() {
    const root = document.getElementById("view-projects");
    const toolbar = root.querySelector(".toolbar");
    // Ensure chips row exists above the grid
    let chipsHost = document.getElementById("projects-view-chips");
    if (!chipsHost) {
      chipsHost = document.createElement("div");
      chipsHost.id = "projects-view-chips";
      root.insertBefore(chipsHost, toolbar ? toolbar.nextSibling : root.firstChild);
    }
    // Keep filter-project chips in sync with dashboardViews (browse chips still useful)
    const filterViews = DASHBOARD_VIEWS.filter(
      (v) => v.kind === "filter-projects" || v.kind === "browse-clients" || v.kind === "browse-project-types"
    );
    const activeId = state.dashboardView;
    chipsHost.innerHTML =
      `<div class="view-chips" role="toolbar" aria-label="Project views">` +
      filterViews
        .map((v) => {
          const active = activeId === v.id || (v.id === "clients" && !!state.projectFilters.client);
          return `<button type="button" class="view-chip${active ? " active" : ""}" data-proj-view="${escapeHtml(v.id)}" title="${escapeHtml(v.hint || "")}">${escapeHtml(v.label)}</button>`;
        })
        .join("") +
      (activeId || state.projectFilters.client
        ? `<button type="button" class="view-chip clear" data-proj-view="" title="Clear filters">Clear</button>`
        : "") +
      (state.projectFilters.client
        ? `<span class="view-chip-meta">Client: <strong>${escapeHtml(state.projectFilters.client)}</strong></span>`
        : "") +
      (activeId === "conformance"
        ? `<span class="view-chip-meta hint-inline">Structural Conformance Letter = pending | approved · Municipal = pending | approved | n/a</span>`
        : "") +
      (activeId && String(activeId).startsWith("type:")
        ? `<span class="view-chip-meta">Type: <strong>${escapeHtml(String(activeId).slice(5))}</strong></span>`
        : "") +
      `</div>`;

    chipsHost.querySelectorAll("[data-proj-view]").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.projView || "";
        if (!id) {
          state.dashboardView = null;
          state.projectFilters.client = "";
          state.projectFilters.dashboardView = null;
          state.taskFilters.client = "";
          renderProjects();
          return;
        }
        const def = getDashboardView(id);
        if (!def) return;
        if (def.kind === "browse-clients" || def.kind === "browse-project-types") {
          state.dashboardView = def.id;
          setView("dashboard");
          return;
        }
        if (state.dashboardView === id) {
          state.dashboardView = null;
          state.projectFilters.dashboardView = null;
        } else {
          state.dashboardView = id;
          state.projectFilters.dashboardView = id;
        }
        renderProjects();
      };
    });

    let projects = projectsMatchingFilters();

    const grid = document.getElementById("project-grid");
    if (!projects.length) {
      const hasAny = (state.data.projects || []).length > 0;
      grid.innerHTML =
        '<div class="empty-state">' +
        (state.search
          ? "No projects match this search."
          : state.dashboardView || state.projectFilters.client
            ? "No projects match this view filter."
            : hasAny
              ? "No projects to show. Enable Show archived, or create a new project."
              : "No projects yet. Create one, Load from GitHub, or Import JSON.") +
        "</div>";
      return;
    }
    grid.innerHTML = projects
      .map((p) => {
        const open = openTaskCount(p);
        const blocked = blockedCount(p);
        const overdue = overdueCount(p);
        const cur = projectCurrentPhase(p);
        return (
          `<article class="project-card${p.archived ? " archived" : ""}${projectAtRisk(p) ? " at-risk" : ""}" data-id="${escapeHtml(p.id)}" tabindex="0" role="button">` +
          `<div class="code">${escapeHtml(p.projectCode || "—")}</div>` +
          `<h3>${escapeHtml(p.projectName || "Untitled")}</h3>` +
          `<div class="meta">${escapeHtml(p.clientName || "No client")} · SO ${escapeHtml(p.salesOrderNumber || "—")}` +
          (p.projectType ? ` · ${escapeHtml(p.projectType)}` : "") +
          `</div>` +
          (isSample(p) ? '<span class="sample-tag">SAMPLE</span>' : "") +
          (p.archived ? '<span class="sample-tag" style="background:#eee;color:#555">ARCHIVED</span>' : "") +
          (normalizeMunicipalSignOff(p.municipalSignOff, p.engineeringSignOff) === "approved" ? '<span class="pill signoff">Municipal approved</span>' : normalizeMunicipalSignOff(p.municipalSignOff, p.engineeringSignOff) === "pending" ? '<span class="pill muni-pending">Municipal pending</span>' : "") +
          (isScfIssued(p)
            ? `<span class="pill conformance issued">${escapeHtml(displayConformanceRef(p.conformanceRef) || "SCL issued")}</span>`
            : hasConformance(p)
              ? `<span class="pill conformance">${escapeHtml(conformanceLabel(p.conformanceStatus))}</span>`
              : "") +
          (isScfReady(p) ? '<span class="pill scf-ready">SCL ready</span>' : "") +
          (!(p.invoiceNumber || "").trim() ? '<span class="pill gap">No INV</span>' : "") +
          (!(p.address || "").trim() ? '<span class="pill gap">No address</span>' : "") +
          (cur ? `<div class="stat-sub">Phase: ${escapeHtml(cur.name)}` +
            (p.poNumber || p.popReference || p.invoiceNumber
              ? ` · PO ${escapeHtml(p.poNumber || "—")} · INV ${escapeHtml(p.invoiceNumber || "—")}`
              : "") +
            `</div>`
            : "") +
          `<div class="task-summary">` +
          `<span class="pill open">${open} open</span>` +
          (blocked ? `<span class="pill blocked">${blocked} blocked</span>` : "") +
          (overdue ? `<span class="pill overdue">${overdue} overdue</span>` : "") +
          `</div></article>`
        );
      })
      .join("");

    grid.querySelectorAll(".project-card").forEach((card) => {
      card.addEventListener("click", () => openProject(card.dataset.id));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openProject(card.dataset.id);
        }
      });
    });
  }

  function openProject(id) {
    state.selectedProjectId = id;
    state.selectedPhaseId = "all";
    state.view = "detail";
    render();
  }

  function renderDetail() {
    const p = getProject(state.selectedProjectId);
    if (!p) {
      setView("projects");
      return;
    }
    const root = document.getElementById("view-detail");
    const drawings =
      (p.drawingNumbers || []).map((d) => `<span>${escapeHtml(d)}</span>`).join("") ||
      "<em style='color:var(--muted)'>None</em>";
    const customs = Object.entries(p.customFields || {})
      .map(([k, v]) => `<span><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</span>`)
      .join("");

    const phaseTabs =
      `<button type="button" class="phase-tab${state.selectedPhaseId === "all" ? " active" : ""}" data-phase="all">All</button>` +
      (p.phases || [])
        .map(
          (ph) =>
            `<button type="button" class="phase-tab${state.selectedPhaseId === ph.id ? " active" : ""}" data-phase="${escapeHtml(ph.id)}">${escapeHtml(ph.name)}</button>`
        )
        .join("") +
      `<button type="button" class="btn btn-secondary btn-sm" id="btn-edit-phases">Edit phases</button>`;

    const filtered = projectTasks(p.id).filter(
      (t) => state.selectedPhaseId === "all" || t.phaseId === state.selectedPhaseId
    );

    const blockers = sclGate(p);
    const issued = isScfIssued(p);
    const issueEnabled = blockers.length === 0 && !issued;

    root.innerHTML =
      `<div class="detail-header">` +
      `<div class="breadcrumb"><button type="button" id="btn-back">← All projects</button></div>` +
      `<h2>${escapeHtml(p.projectName)}${isSample(p) ? ' <span class="sample-tag">SAMPLE</span>' : ""}</h2>` +
      `<div class="detail-meta">` +
      `<span><strong>Client:</strong> ${escapeHtml(p.clientName)}</span>` +
      `<span><strong>Code:</strong> ${escapeHtml(p.projectCode)}</span>` +
      `<span><strong>SO:</strong> ${escapeHtml(p.salesOrderNumber)}</span>` +
      `<span><strong>PO:</strong> ${escapeHtml(p.poNumber || "—")}</span>` +
      `<span><strong>POP:</strong> ${escapeHtml(p.popReference || "—")}</span>` +
      `<span><strong>INV:</strong> ${escapeHtml(p.invoiceNumber || "—")}</span>` +
      `<span><strong>Type:</strong> ${escapeHtml(p.projectType || "—")}</span>` +
      ((p.structureTypes || []).length
        ? `<span><strong>Structures:</strong> ${escapeHtml((p.structureTypes || []).join(", "))}</span>`
        : "") +
      `<span><strong>Address:</strong> ${escapeHtml(p.address || "—")}</span>` +
      `<span><strong>Contact:</strong> ${escapeHtml(p.contactPerson || "—")}</span>` +
      `<span><strong>Municipal sign-off:</strong> ${escapeHtml(municipalSignOffLabel(p.municipalSignOff || p.engineeringSignOff))}` +
      (normalizeMunicipalSignOff(p.municipalSignOff, p.engineeringSignOff) === "approved" && (p.engineeringSignOffBy || p.engineeringSignOffAt)
        ? ` (${escapeHtml([p.engineeringSignOffBy, p.engineeringSignOffAt].filter(Boolean).join(" · "))})`
        : "") +
      `</span>` +
      `<span><strong>Structural Conformance Letter:</strong> ${escapeHtml(conformanceLabel(p.conformanceStatus))}` +
      (p.conformanceRef ? ` · ${escapeHtml(p.conformanceRef)}` : "") +
      (p.conformanceIssuedAt ? ` · ${escapeHtml(sastDate(p.conformanceIssuedAt))}` : "") +
      `</span>` +
      (() => {
        const cur = projectCurrentPhase(p);
        return cur ? `<span><strong>Current phase:</strong> ${escapeHtml(cur.name)}</span>` : "";
      })() +
      (p.archived ? "<span><strong>Status:</strong> Archived</span>" : "") +
      `</div>` +
      `<div class="drawings-list"><strong>Drawings:</strong> ${drawings}</div>` +
      (customs ? `<div class="custom-fields-list" style="margin-top:0.4rem">${customs}</div>` : "") +
      `<div class="scf-gate">` +
      `<div class="scf-gate-title"><strong>Structural Conformance Letter</strong>` +
      (issued
        ? ` — issued <code>${escapeHtml(displayConformanceRef(p.conformanceRef) || "")}</code>`
        : issueEnabled
          ? " — ready to create"
          : " — Create SC Letter disabled until checklist is complete") +
      `</div>` +
      (issued
        ? ""
        : `<ul class="scf-checklist">` +
          [
            ["Invoice number (INV)", !!(p.invoiceNumber || "").trim()],
            ["Contact person", !!(p.contactPerson || "").trim()],
            ["Address", !!(p.address || "").trim()],
            ["Current phase is Done", projectInDonePhase(p)],
          ]
            .map(
              ([label, ok]) =>
                `<li class="${ok ? "ok" : "missing"}">${ok ? "✓" : "○"} ${escapeHtml(label)}</li>`
            )
            .join("") +
          `</ul>`) +
      `</div>` +
      `<div class="detail-actions" style="margin-top:0.85rem">` +
      `<button type="button" class="btn btn-sm" id="btn-new-task">+ Task</button>` +
      `<button type="button" class="btn btn-secondary btn-sm" id="btn-edit-project">Edit project</button>` +
      `<button type="button" class="btn btn-sm" id="btn-issue-scf"${issueEnabled ? "" : " disabled"} title="${escapeHtml(issueEnabled ? "Create Structural Conformance Letter (LMX-SCL-YYYY-NNN)" : blockers.length ? "Missing: " + blockers.join(", ") : "Already issued")}">Create SC Letter</button>` +
      (issued && p.sclUndoSnapshot
        ? `<button type="button" class="btn btn-secondary btn-sm" id="btn-undo-scf" title="Restore pre-issue snapshot">Undo Create SC Letter</button>`
        : "") +
      (issued || (p.conformanceCert && p.conformanceCert.ref)
        ? `<button type="button" class="btn btn-secondary btn-sm" id="btn-preview-scf">View / print SCL</button>`
        : issueEnabled
          ? `<button type="button" class="btn btn-secondary btn-sm" id="btn-preview-scf" title="Draft preview (not issued)">Preview draft SCL</button>`
          : "") +
      `<button type="button" class="btn btn-secondary btn-sm" id="btn-archive">${p.archived ? "Unarchive" : "Archive"}</button>` +
      `</div></div>` +
      `<div class="phase-tabs" id="phase-drop-targets">${phaseTabs}</div>` +
      `<div class="board" id="project-board"></div>`;

    renderBoard(document.getElementById("project-board"), filtered, p);

    root.querySelector("#btn-back").addEventListener("click", () => setView("projects"));
    root.querySelector("#btn-new-task").addEventListener("click", () => openTaskForm(null, { projectId: p.id }));
    root.querySelector("#btn-edit-project").addEventListener("click", () => openProjectForm(p.id));
    const issueBtn = root.querySelector("#btn-issue-scf");
    if (issueBtn) issueBtn.addEventListener("click", () => issueConformance(p));
    const undoBtn = root.querySelector("#btn-undo-scf");
    if (undoBtn) undoBtn.addEventListener("click", () => undoConformance(p));
    const prevBtn = root.querySelector("#btn-preview-scf");
    if (prevBtn) prevBtn.addEventListener("click", () => openScfPreview(p));
    root.querySelector("#btn-archive").addEventListener("click", () => {
      p.archived = !p.archived;
      p.updatedAt = nowIso();
      cacheDataLocally();
      toast(p.archived ? "Project archived" : "Project unarchived", "success");
      if (p.archived) setView("projects");
      else render();
    });
    root.querySelector("#btn-edit-phases").addEventListener("click", () => openPhasesForm(p));
    root.querySelectorAll(".phase-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        state.selectedPhaseId = tab.dataset.phase;
        renderDetail();
      });
    });
    bindPhaseDropTargets(root, p);
  }

  function renderBoard(container, tasks, projectCtx) {
    const statuses = getStatuses();
    container.innerHTML = statuses
      .map((st) => {
        const colTasks = tasks.filter((t) => t.statusId === st.id);
        const cards = colTasks
          .map((t) => {
            const phase =
              projectCtx && (projectCtx.phases || []).find((ph) => ph.id === t.phaseId);
            const proj = t.projectId ? getProject(t.projectId) : null;
            return (
              `<div class="task-card${isOverdue(t) ? " overdue" : ""}" data-task="${escapeHtml(t.id)}" draggable="true" tabindex="0" role="button">` +
              `<div style="margin-bottom:0.25rem"><span class="type-chip">${escapeHtml(typeLabel(t.type))}</span></div>` +
              `<h4>${escapeHtml(t.title)}</h4>` +
              (t.description ? `<div class="desc">${escapeHtml(t.description)}</div>` : "") +
              `<div class="task-meta">` +
              (t.assignee ? `<span>${escapeHtml(t.assignee)}</span>` : "") +
              (t.dueDate ? `<span>Due ${escapeHtml(t.dueDate)}</span>` : "") +
              (t.priority ? `<span class="priority ${escapeHtml(t.priority)}">${escapeHtml(t.priority)}</span>` : "") +
              (t.doneDate ? `<span>Completed ${escapeHtml(t.doneDate)}</span>` : "") +
              (phase && state.selectedPhaseId === "all" ? `<span>${escapeHtml(phase.name)}</span>` : "") +
              (!projectCtx && proj ? `<span>${escapeHtml(proj.projectCode || proj.projectName)}</span>` : "") +
              (!projectCtx && !proj ? `<span>Standalone</span>` : "") +
              `</div>` +
              markDoneButtonHtml(t) +
              `</div>`
            );
          })
          .join("");
        return (
          `<div class="column status-drop" data-status="${escapeHtml(st.id)}">` +
          `<div class="column-header"><span class="dot" style="background:${escapeHtml(st.color || "#6b7c93")}"></span><span>${escapeHtml(st.name)}</span><span class="count">${colTasks.length}</span></div>` +
          (cards || '<div class="column-empty">No tasks</div>') +
          `</div>`
        );
      })
      .join("");

    container.querySelectorAll(".task-card").forEach((card) => {
      card.addEventListener("click", () => openTaskForm(card.dataset.task));
      card.addEventListener("keydown", (e) => {
        if (e.target !== card) return; // let nested buttons (Mark as Done) handle their own keys
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openTaskForm(card.dataset.task);
        }
      });
      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", card.dataset.task);
        e.dataTransfer.effectAllowed = "move";
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
    });
    bindMarkDoneButtons(container);
    container.querySelectorAll(".status-drop").forEach((col) => {
      col.addEventListener("dragover", (e) => {
        e.preventDefault();
        col.classList.add("drop-hover");
      });
      col.addEventListener("dragleave", () => col.classList.remove("drop-hover"));
      col.addEventListener("drop", (e) => {
        e.preventDefault();
        col.classList.remove("drop-hover");
        const taskId = e.dataTransfer.getData("text/plain");
        const t = getTask(taskId);
        const statusId = col.dataset.status;
        if (!t || !statusId || t.statusId === statusId) return;
        t.statusId = statusId;
        if (statusIsDone(statusId)) t.doneDate = todayStr();
        else t.doneDate = null;
        t.updatedAt = nowIso();
        cacheDataLocally();
        toast(localSaveHint("Moved to " + ((getStatus(statusId) || {}).name || statusId)), "success");
        render();
      });
    });
  }

  function bindPhaseDropTargets(root, project) {
    if (!project) return;
    root.querySelectorAll(".phase-tab[data-phase]").forEach((tab) => {
      const phaseId = tab.dataset.phase;
      if (!phaseId || phaseId === "all") return;
      tab.addEventListener("dragover", (e) => {
        e.preventDefault();
        tab.classList.add("drop-hover");
      });
      tab.addEventListener("dragleave", () => tab.classList.remove("drop-hover"));
      tab.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        tab.classList.remove("drop-hover");
        const taskId = e.dataTransfer.getData("text/plain");
        const t = getTask(taskId);
        if (!t || t.projectId !== project.id) {
          toast("Drop a task from this project onto a phase", "error");
          return;
        }
        if (t.phaseId === phaseId) return;
        t.phaseId = phaseId;
        t.updatedAt = nowIso();
        project.updatedAt = nowIso();
        cacheDataLocally();
        const ph = (project.phases || []).find((x) => x.id === phaseId);
        toast(localSaveHint("Phase → " + ((ph && ph.name) || phaseId)), "success");
        renderDetail();
      });
    });
  }

  // ---------- Tasks nav ----------
  function renderTasksView() {
    const root = document.getElementById("view-tasks");
    const statuses = getStatuses();
    const assignees = [...new Set((state.data.tasks || []).map((t) => t.assignee).filter(Boolean))].sort();
    const f = state.taskFilters;

    const structureTypes = uniqueStructureTypes();
    const completedArchiveCount = completedTasksMatchingFilters().length;
    const filterBar =
      `<div class="filter-row">` +
      `<select id="tf-filter-type"><option value="">All types</option>${getTaskTypes().map((ty) => `<option value="${escapeHtml(ty.id)}"${f.type === ty.id ? " selected" : ""}>${escapeHtml(ty.name)}</option>`).join("")}</select>` +
      `<select id="tf-filter-status"><option value="">All statuses</option>${statuses.map((s) => `<option value="${escapeHtml(s.id)}"${f.statusId === s.id ? " selected" : ""}>${escapeHtml(s.name)}</option>`).join("")}</select>` +
      `<select id="tf-filter-assignee"><option value="">All assignees</option><option value="__unassigned__"${f.assignee === "__unassigned__" ? " selected" : ""}>(unassigned)</option>${assignees.map((a) => `<option value="${escapeHtml(a)}"${f.assignee === a ? " selected" : ""}>${escapeHtml(a)}</option>`).join("")}</select>` +
      `<select id="tf-filter-project"><option value="">All projects</option><option value="__standalone__"${f.projectId === "__standalone__" ? " selected" : ""}>Standalone only</option>${(state.data.projects || []).map((p) => `<option value="${escapeHtml(p.id)}"${f.projectId === p.id ? " selected" : ""}>${escapeHtml(p.projectCode || p.projectName)}</option>`).join("")}</select>` +
      `<select id="tf-filter-structure" title="Structure type"><option value="">All structure types</option>${structureTypes.map((s) => `<option value="${escapeHtml(s)}"${f.structureType === s ? " selected" : ""}>${escapeHtml(s)}</option>`).join("")}</select>` +
      `<label class="checkbox-label"><input type="checkbox" id="tf-filter-overdue"${f.overdueOnly ? " checked" : ""}/> Overdue</label>` +
      `<label class="checkbox-label hide-completed-label" title="Hide the Completed list below the open tasks. Open tasks always stay visible."><input type="checkbox" id="tf-filter-hide-completed"${f.hideCompleted ? " checked" : ""}/> Hide completed${completedArchiveCount ? " (" + completedArchiveCount + ")" : ""}</label>` +
      
      `<div class="spacer"></div>` +
      `<div class="view-toggle">` +
      `<button type="button" class="btn btn-secondary btn-sm${state.tasksMode === "list" ? " active" : ""}" id="btn-tasks-list">List</button>` +
      `<button type="button" class="btn btn-secondary btn-sm${state.tasksMode === "board" ? " active" : ""}" id="btn-tasks-board">Board</button>` +
      `</div>` +
      `<button type="button" class="btn btn-sm" id="btn-new-standalone">+ Task</button>` +
      `</div>`;

    const tasks = allTasksFiltered().sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")));
    const completedArchiveHtml = renderCompletedByMonthHtml();

    let body = "";
    if (state.tasksMode === "board") {
      body = `<div class="board" id="tasks-board"></div>`;
    } else {
      body =
        `<div class="tasks-table-wrap"><table class="tasks-table"><thead><tr>` +
        `<th>Type</th><th>Title</th><th>Project</th><th>Status</th><th>Assignee</th><th>Priority</th><th>Due</th><th>Completed</th><th></th>` +
        `</tr></thead><tbody>` +
        (tasks.length
          ? tasks.map(taskTableRowHtml).join("")
          : `<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:1.5rem">No tasks match filters</td></tr>`) +
        `</tbody></table></div>`;
    }

    root.innerHTML = filterBar + body + completedArchiveHtml;

    if (state.tasksMode === "board") {
      renderBoard(document.getElementById("tasks-board"), tasks, null);
    }
    root.querySelectorAll("tbody tr[data-task]").forEach((row) => {
      row.tabIndex = 0;
      row.addEventListener("click", () => openTaskForm(row.dataset.task));
      row.addEventListener("keydown", (e) => {
        if (e.target === row && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          openTaskForm(row.dataset.task);
        }
      });
    });
    bindMarkDoneButtons(root);

    function syncFilters() {
      state.taskFilters.type = document.getElementById("tf-filter-type").value;
      state.taskFilters.statusId = document.getElementById("tf-filter-status").value;
      state.taskFilters.assignee = document.getElementById("tf-filter-assignee").value;
      state.taskFilters.projectId = document.getElementById("tf-filter-project").value;
      const stEl = document.getElementById("tf-filter-structure");
      state.taskFilters.structureType = stEl ? stEl.value : "";
      state.taskFilters.overdueOnly = document.getElementById("tf-filter-overdue").checked;
      const hideEl = document.getElementById("tf-filter-hide-completed");
      if (hideEl) state.taskFilters.hideCompleted = hideEl.checked;
      saveUiPrefs();
      renderTasksView();
    }
    ["tf-filter-type", "tf-filter-status", "tf-filter-assignee", "tf-filter-project", "tf-filter-structure"].forEach((id) => {
      document.getElementById(id).onchange = syncFilters;
    });
    document.getElementById("tf-filter-overdue").onchange = syncFilters;
    const hideCompletedEl = document.getElementById("tf-filter-hide-completed");
    if (hideCompletedEl) {
      hideCompletedEl.onchange = (e) => {
        e.stopPropagation();
        state.taskFilters.hideCompleted = !!e.target.checked;
        saveUiPrefs();
        const archive = document.getElementById("completed-archive");
        if (archive) archive.hidden = !!e.target.checked;
      };
    }
    document.getElementById("btn-tasks-list").onclick = () => {
      state.tasksMode = "list";
      renderTasksView();
    };
    document.getElementById("btn-tasks-board").onclick = () => {
      state.tasksMode = "board";
      renderTasksView();
    };
    document.getElementById("btn-new-standalone").onclick = () => openTaskForm(null, { projectId: null });
  }

  // ---------- Forms / modals ----------
  let overlayCloseHook = null;
  let overlayReturnFocus = null;
  let overlayDownOnBackdrop = false;
  function showOverlay(html) {
    const ov = document.getElementById("overlay");
    if (ov.classList.contains("hidden")) overlayReturnFocus = document.activeElement;
    ov.innerHTML = html;
    ov.classList.remove("hidden");
    const panel = ov.querySelector(".panel");
    if (panel) {
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.tabIndex = -1;
      const first = panel.querySelector("input, select, textarea, button");
      (first || panel).focus();
    }
    // Only close when the press AND the release both happen on the backdrop, so a
    // text-selection drag that ends outside the panel cannot discard a half-filled form.
    ov.onmousedown = (e) => {
      overlayDownOnBackdrop = e.target === ov;
    };
    ov.onclick = (e) => {
      if (e.target === ov && overlayDownOnBackdrop) closeOverlay();
      overlayDownOnBackdrop = false;
    };
    ov.onkeydown = (e) => {
      if (e.key === "Escape") {
        closeOverlay();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...ov.querySelectorAll("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter(
        (x) => !x.disabled && x.offsetParent !== null
      );
      if (!items.length) return;
      const firstEl = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
  }
  function closeOverlay() {
    if (overlayCloseHook) {
      const h = overlayCloseHook;
      overlayCloseHook = null;
      h();
    }
    const ov = document.getElementById("overlay");
    ov.classList.add("hidden");
    ov.innerHTML = "";
    ov.onclick = null;
    ov.onmousedown = null;
    ov.onkeydown = null;
    if (overlayReturnFocus && overlayReturnFocus.focus) {
      try {
        overlayReturnFocus.focus();
      } catch (_) {}
    }
    overlayReturnFocus = null;
  }


  function xmlEscape(s) {
    return String(s == null ? "" : s)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
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

  function usedLetterRefs(extra) {
    const set = new Set((extra || []).map((r) => String(r).toUpperCase()));
    (state.data.projects || []).forEach((p) => {
      if (p.conformanceRef) set.add(String(p.conformanceRef).trim().toUpperCase());
      (p.sclHistory || []).forEach((h) => h && h.ref && set.add(String(h.ref).trim().toUpperCase()));
    });
    ((state.data.settings || {}).voidedLetters || []).forEach((v) => v && v.ref && set.add(String(v.ref).trim().toUpperCase()));
    return set;
  }
  // Letter refs already on GitHub; null when it can't be checked.
  async function remoteLetterRefs() {
    if (!state.settings.pat) return null;
    try {
      const r = await fetch(contentsUrl() + "?ref=main", { headers: ghHeaders(), cache: "no-store" });
      if (!r.ok) return null;
      const remote = normalizeData(JSON.parse(await readRemoteText(await r.json())));
      const refs = [];
      (remote.projects || []).forEach((p) => {
        if (p.conformanceRef) refs.push(p.conformanceRef.trim());
        (p.sclHistory || []).forEach((h) => h && h.ref && refs.push(h.ref));
      });
      ((remote.settings || {}).voidedLetters || []).forEach((v) => v && v.ref && refs.push(v.ref));
      return refs;
    } catch (_) {
      return null;
    }
  }
  async function issueConformance(project) {
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
    let reserved = null;
    if (myEngineerId() && state.settings.pat) {
      try {
        reserved = await reserveLetterSeq(project, [...usedLetterRefs([])]);
      } catch (e) {
        toast("Shared letter register unavailable: " + e.message, "error");
        if (!confirm("Could not reserve a letter number in the shared register.\n\nIssuing now risks a duplicate number. Continue anyway?")) return;
      }
    }
    const remoteRefs = reserved ? [] : await remoteLetterRefs();
    if (
      !reserved &&
      remoteRefs === null &&
      !confirm(
        "Could not check GitHub for letter numbers already issued by others.\n\nIf someone else has issued a letter, this number could be a duplicate. Continue anyway?"
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
    if (reserved) {
      settings.scfYear = reserved.year;
      settings.scfSeq = reserved.seq;
    }
    const meta = ScfHelper.allocateRef(settings, new Date(), usedLetterRefs(remoteRefs || []));
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
    // Reserve the number on GitHub before the letter leaves the building.
    if (state.settings.pat) {
      const saved = await saveToGithub();
      if (
        !saved &&
        !confirm(
          meta.ref + " is not saved to GitHub yet, so another engineer could be given the same number.\n\nDownload the letter anyway? (Save again afterwards.)"
        )
      ) {
        return;
      }
    }
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
      // A letter may already have been downloaded or sent, so its number is never recycled:
      // an undone letter is always recorded as voided and the sequence keeps moving forward.
      void year; void seq;
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
        `<div class="form-group"><label>Engineer ID</label>` +
        `<input id="set-eng-id" value="${escapeHtml(s.engineerId || "")}" placeholder="e.g. lucian-du-plessis"${s.engineerIdLocked ? " readonly" : ""} />` +
        `<p class="hint">${
          s.engineerId
            ? "Your data repo: <code>" + escapeHtml(s.owner) + "/" + escapeHtml(engineerRepo(s.engineerId)) + "</code>. " + (s.engineerIdLocked ? "The ID is locked because it has been used." : "Locked after the first Save or Load.")
            : "Leave empty to keep using the single shared repo below (legacy). Set it to save into <code>" + escapeHtml(DEFAULT_REPO) + "-&lt;id&gt;</code>."
        }</p></div>` +
        `<div class="form-group" id="set-repo-wrap"${s.engineerId ? ' style="display:none"' : ""}><label>Repository (legacy single repo)</label><input id="set-repo" value="${escapeHtml(s.repo)}" /></div>` +
        `<div class="form-group"><label>Shared repo (settings, letter numbers, team list)</label><input id="set-shared-repo" value="${escapeHtml(s.sharedRepo || DEFAULT_REPO + "-shared")}" /></div>` +
        `<div class="form-group"><label class="checkbox-label"><input type="checkbox" id="set-role-leader"${s.role === "leader" ? " checked" : ""}/> I am the team leader (unlock with a password to see all engineers)</label></div>` +
        `<div class="form-group"><label>Personal Access Token (PAT)</label>` +
        `<input id="set-pat" type="password" autocomplete="off" value="" placeholder="${s.pat ? "•••• token saved — paste to replace" : "ghp_… or github_pat_…"}" />` +
        `<p class="hint">Stored only in this browser's localStorage — never written to projects.json. Each engineer uses their own PAT.</p>` +
        (s.pat ? `<button type="button" class="btn btn-secondary btn-sm" id="set-remove-pat">Remove saved token</button>` : "") +
        `</div>` +
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
        `<input class="tt-id" value="${escapeHtml((tt && tt.id) || "")}" placeholder="id (e.g. site_visit)" style="max-width:28%"${tt && tt.id ? ' readonly title="Ids are fixed once created (tasks reference them). Remove and re-add to change."' : ""} />` +
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

    if (s.engineerId && !isLeader()) {
      [box, ttBox, ptBox, stTypeBox].forEach((b) => b.querySelectorAll("input,select,button").forEach((x) => (x.disabled = true)));
      ["set-add-status", "set-add-task-type", "set-add-project-type", "set-add-structure-type"].forEach((id) => {
        const b = document.getElementById(id);
        if (b) b.style.display = "none";
      });
      const note = document.createElement("p");
      note.className = "hint";
      note.textContent = "Statuses, task types, project types and structure types are shared by the whole team and can only be changed by the team leader.";
      box.parentNode.insertBefore(note, box);
    }
    document.getElementById("set-cancel").onclick = closeOverlay;
    const rmPat = document.getElementById("set-remove-pat");
    if (rmPat) {
      rmPat.onclick = () => {
        if (!confirm("Remove the saved GitHub token from this browser? You can paste it again later.")) return;
        state.settings.pat = "";
        state.githubUser = null;
        saveBrowserSettings();
        updateAuthBadge();
        closeOverlay();
        toast("Token removed from this browser.", "success");
      };
    }
    document.getElementById("set-save").onclick = () => {
      if (!s.engineerIdLocked && slugifyId(document.getElementById("set-eng-id").value) === "shared") {
        toast('"shared" is reserved for the team repo. Choose another Engineer ID.', "error");
        return;
      }
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
      // Everything validated: from here on, apply.
      const ownerNext = document.getElementById("set-owner").value.trim() || DEFAULT_OWNER;
      const engIdNext = s.engineerIdLocked ? s.engineerId : slugifyId(document.getElementById("set-eng-id").value);
      const repoNext = engIdNext ? engineerRepo(engIdNext) : document.getElementById("set-repo").value.trim() || DEFAULT_REPO;
      if (ownerNext !== state.settings.owner || repoNext !== state.settings.repo) {
        state.fileSha = null;
        state.loadedThisSession = false;
        setBase(null);
      }
      state.settings.owner = ownerNext;
      state.settings.repo = repoNext;
      state.settings.engineerId = engIdNext;
      state.settings.sharedRepo = document.getElementById("set-shared-repo").value.trim();
      const wasLeader = state.settings.role === "leader";
      state.settings.role = document.getElementById("set-role-leader").checked ? "leader" : "engineer";
      if (state.settings.role !== "leader" && leaderUnlocked) {
        leaderUnlocked = false;
        try {
          sessionStorage.removeItem(LS_LEADER);
        } catch (_) {}
      }
      const nextPat = document.getElementById("set-pat").value.trim();
      if (nextPat) state.settings.pat = nextPat;
      saveBrowserSettings();
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
      updateLeaderUi();
      toast(localSaveHint("Settings saved"), "success");
      if (state.settings.role === "leader" && !wasLeader && !leaderUnlocked) unlockLeader();
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
        `<select id="pf-conformance"${p && p.conformanceRef ? " disabled" : ""}>` +
        CONFORMANCE_STATUSES.map((s) => {
          const cur = p ? normalizeConformanceStatus(p.conformanceStatus) : "none";
          return `<option value="${escapeHtml(s.id)}"${cur === s.id ? " selected" : ""}>${escapeHtml(s.name)}</option>`;
        }).join("") +
        `</select>` +
        `<p class="hint">${p && p.conformanceRef ? "Locked: a letter reference exists. Use Undo on the project to void it." : "Create via <strong>Create SC Letter</strong> on the project (sets approved + LMX-SCL ref)."}</p></div>` +
        `</div>` +
        `<div class="form-row" id="pf-signoff-extra">` +
        `<div class="form-group"><label>Sign-off at</label><input type="date" id="pf-signoff-at" value="${escapeHtml(p && p.engineeringSignOffAt ? String(p.engineeringSignOffAt).slice(0, 10) : "")}" /></div>` +
        `<div class="form-group"><label>Sign-off by</label><input id="pf-signoff-by" value="${escapeHtml(p ? p.engineeringSignOffBy || "" : "")}" placeholder="Name" /></div>` +
        `</div>` +
        (p && p.conformanceRef
          ? `<p class="hint">Conformance ref: <strong>${escapeHtml(p.conformanceRef)}</strong>` +
            (p.conformanceIssuedAt ? ` · issued ${escapeHtml(sastDate(p.conformanceIssuedAt))}` : "") +
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
        if (!confirm("Delete this project and unlink its tasks (tasks become standalone)? You can Undo right afterwards.")) return;
        backupCurrentData();
        const doomed = getProject(projectId);
        if (doomed && doomed.conformanceRef) {
          const st = state.data.settings;
          if (!Array.isArray(st.voidedLetters)) st.voidedLetters = [];
          st.voidedLetters.push({ ref: doomed.conformanceRef, projectId, issuedAt: doomed.conformanceIssuedAt || null, voidedAt: nowIso() });
        }
        state.data.tasks.forEach((t) => {
          if (t.projectId === projectId) t.projectId = null;
        });
        state.data.projects = state.data.projects.filter((x) => x.id !== projectId);
        cacheDataLocally();
        closeOverlay();
        setView("projects");
        toast("Project deleted", "success", undoAction());
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
      const conformanceStatus =
        isEdit && p && p.conformanceRef
          ? normalizeConformanceStatus(p.conformanceStatus)
          : normalizeConformanceStatus(document.getElementById("pf-conformance").value);
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
        Object.assign(np, newRecordTag());
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
      (ty) => `<option value="${escapeHtml(ty.id)}"${initialType === ty.id ? " selected" : ""}>${escapeHtml(ty.name)}</option>`
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
      if (!statusIsDone(statusId)) payload.doneDate = null;

      if (isEdit) {
        Object.assign(t, payload);
        // Moving a task onto another engineer's project moves it into that engineer's repo.
        if (isLeader() && payload.projectId) Object.assign(t, newRecordTag(payload.projectId));
      } else {
        state.data.tasks.push(
          normalizeTask({
            id: uid("task"),
            createdAt: nowIso(),
            ...payload,
            ...newRecordTag(payload.projectId),
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
    on("btn-leader", "onclick", () => (leaderUnlocked ? lockLeader() : unlockLeader()));
    on("eng-filter", "onchange", (e) => {
      state.engFilter = e.target.value;
      render();
    });
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
      clearTimeout(searchTimer);
      searchTimer = setTimeout(render, 200);
    });
    on("show-archived", "onchange", (e) => {
      state.showArchived = e.target.checked;
      if (state.view === "projects") renderProjects();
    });
  }

  let searchTimer = null;
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
