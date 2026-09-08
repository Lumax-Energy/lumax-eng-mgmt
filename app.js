/**
 * Lumax Energy — Engineering Management v2
 * Vanilla JS SPA: Dashboard · Projects · Tasks + GitHub Contents sync + Excel export.
 */
(function () {
  "use strict";

  const LS_DATA = "lumax-eng-mgmt-data";
  const LS_SETTINGS = "lumax-eng-mgmt-settings";
  const LS_SHA = "lumax-eng-mgmt-sha";
  const DEFAULT_OWNER = "Lumax-Energy";
  const DEFAULT_REPO = "lumax-eng-mgmt";
  const DATA_PATH = "data/projects.json";
  const APP_VERSION = 2;

  const DEFAULT_PHASES = [
    { id: "phase-intake", name: "Intake" },
    { id: "phase-concept", name: "Concept" },
    { id: "phase-design", name: "Design" },
    { id: "phase-check", name: "Check" },
    { id: "phase-drawings", name: "Drawings" },
    { id: "phase-site-investigation", name: "Site investigation" },
    { id: "phase-site", name: "Site/Construction support" },
    { id: "phase-closeout", name: "Close-out" },
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
      label: "Engineering assignees",
      kind: "browse-assignees",
      hint: "Unique assignees from all tasks",
    },
    {
      id: "eng-signoff",
      label: "Eng sign-off",
      kind: "filter-projects",
      hint: "Projects with engineering sign-off",
    },
    {
      id: "conformance",
      label: "Has conformance",
      kind: "filter-projects",
      hint: "Pending or approved (not none)",
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

  const DEFAULT_STATUSES = [
    { id: "status-backlog", name: "Backlog", color: "#6b7c93", category: "todo" },
    { id: "status-todo", name: "To do", color: "#5c6b7e", category: "todo" },
    { id: "status-doing", name: "Doing", color: "#2f80ed", category: "doing" },
    { id: "status-in-check", name: "In check", color: "#9b59b6", category: "doing" },
    { id: "status-blocked", name: "Blocked", color: "#c0392b", category: null },
    { id: "status-done", name: "Done", color: "#1a7f4b", category: "done" },
  ];

  const TASK_TYPES = [
    { id: "rdn", name: "RDN" },
    { id: "design_check", name: "Design check" },
    { id: "drawing", name: "Drawing" },
    { id: "eng_task", name: "Eng task" },
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
    taskFilters: { type: "", statusId: "", assignee: "", overdueOnly: false, projectId: "", client: "" },
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
        myAssignee: "",
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
    return new Date().toISOString().slice(0, 10);
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function toast(msg, type) {
    const bar = document.getElementById("status-bar");
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = msg;
    bar.appendChild(el);
    setTimeout(() => el.remove(), type === "error" ? 7000 : 4200);
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
  function statusIsBlocked(statusId) {
    const s = getStatus(statusId);
    return s && (s.id === "status-blocked" || (s.name || "").toLowerCase() === "blocked");
  }
  function statusIsOpen(statusId) {
    return !statusIsDone(statusId);
  }
  function typeLabel(typeId) {
    const t = TASK_TYPES.find((x) => x.id === typeId);
    return t ? t.name : typeId || "—";
  }
  function isSample(project) {
    return (
      (project.projectName || "").includes("SAMPLE") ||
      project.projectCode === "DEMO-001" ||
      project.clientName === "Demo Client" ||
      project.clientName === "Demo"
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
    const q = (state.search || "").trim().toLowerCase();
    const f = state.taskFilters;
    return (state.data.tasks || []).filter((t) => {
      if (f.type && t.type !== f.type) return false;
      if (f.statusId && t.statusId !== f.statusId) return false;
      if (f.assignee && (t.assignee || "").toLowerCase() !== f.assignee.toLowerCase()) return false;
      if (f.projectId === "__standalone__" && t.projectId) return false;
      if (f.projectId && f.projectId !== "__standalone__" && t.projectId !== f.projectId) return false;
      if (f.client) {
        const p = t.projectId ? getProject(t.projectId) : null;
        if (!p || (p.clientName || "").toLowerCase() !== f.client.toLowerCase()) return false;
      }
      if (f.overdueOnly && !isOverdue(t)) return false;
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
          p && p.projectCode,
          p && p.projectName,
          p && p.clientName,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
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
  /** Current phase = first phase with open tasks, else first phase. */
  function projectCurrentPhase(project) {
    if (!project || !Array.isArray(project.phases) || !project.phases.length) return null;
    for (let i = 0; i < project.phases.length; i++) {
      const ph = project.phases[i];
      const openInPhase = projectTasks(project.id).some(
        (t) => t.phaseId === ph.id && statusIsOpen(t.statusId)
      );
      if (openInPhase) return ph;
    }
    return project.phases[0];
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
    let projects = (state.data.projects || []).filter((p) => state.showArchived || !p.archived);
    if (clientFilter) {
      projects = projects.filter((p) => (p.clientName || "").toLowerCase() === clientFilter.toLowerCase());
    }
    if (viewId === "eng-signoff") {
      projects = projects.filter((p) => !!p.engineeringSignOff);
    } else if (viewId === "conformance") {
      projects = projects.filter((p) => hasConformance(p));
    } else if (viewId === "site-investigation") {
      projects = projects.filter((p) => projectInSiteInvestigation(p));
    }
    if (q) {
      projects = projects.filter((p) => {
        const hay = [p.clientName, p.projectCode, p.salesOrderNumber, p.projectName].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    projects.sort((a, b) => (a.projectCode || "").localeCompare(b.projectCode || ""));
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

    // Ensure core ids exist after v1 upgrade
    const ids = new Set(taskStatuses.map((s) => s.id));
    DEFAULT_STATUSES.forEach((d) => {
      if (!ids.has(d.id)) {
        // only inject mapped ones if missing aliases
      }
    });

    const data = {
      version: APP_VERSION,
      updatedAt: json.updatedAt || nowIso(),
      settings: {
        taskStatuses,
        myAssignee: settingsIn.myAssignee || "",
      },
      projects: [],
      tasks: [],
    };

    // Projects
    const projectsIn = Array.isArray(json.projects) ? json.projects : [];
    data.projects = projectsIn.map((p) => normalizeProject(p, version === 1));

    // Tasks: v2 unified array, or migrate from nested + standaloneTasks
    if (Array.isArray(json.tasks) && json.tasks.length) {
      data.tasks = json.tasks.map((t) => normalizeTask(t, version === 1, taskStatuses));
    } else {
      const collected = [];
      projectsIn.forEach((p) => {
        (p.tasks || []).forEach((t) => {
          collected.push(normalizeTask({ ...t, projectId: p.id }, true, taskStatuses));
        });
      });
      (json.standaloneTasks || []).forEach((t) => {
        collected.push(normalizeTask({ ...t, projectId: t.projectId || null }, version === 1, taskStatuses));
      });
      data.tasks = collected;
    }

    // Strip nested tasks from projects (source of truth is data.tasks)
    data.projects.forEach((p) => {
      delete p.tasks;
    });

    return data;
  }

  function normalizeStatus(s) {
    const cat = s.category;
    const category = cat === "todo" || cat === "doing" || cat === "done" ? cat : null;
    return {
      id: s.id || uid("status"),
      name: s.name || "Status",
      color: s.color || "#6b7c93",
      category,
    };
  }

  function normalizeProject(p, fromV1) {
    let phases;
    if (Array.isArray(p.phases) && p.phases.length) {
      phases = p.phases.map((ph) => ({ id: ph.id || uid("phase"), name: ph.name || "Phase" }));
    } else {
      phases = DEFAULT_PHASES.map((ph) => ({ id: uid("phase"), name: ph.name }));
    }
    const engineeringSignOff = !!p.engineeringSignOff;
    return {
      id: p.id || uid("proj"),
      clientName: p.clientName || "",
      projectName: p.projectName || "",
      projectCode: p.projectCode || "",
      salesOrderNumber: p.salesOrderNumber || "",
      drawingNumbers: Array.isArray(p.drawingNumbers) ? p.drawingNumbers.slice() : [],
      customFields: p.customFields && typeof p.customFields === "object" ? { ...p.customFields } : {},
      phases,
      engineeringSignOff,
      engineeringSignOffAt: engineeringSignOff ? p.engineeringSignOffAt || null : p.engineeringSignOffAt || null,
      engineeringSignOffBy: p.engineeringSignOffBy || "",
      conformanceStatus: normalizeConformanceStatus(p.conformanceStatus),
      archived: !!p.archived,
      createdAt: p.createdAt || nowIso(),
      updatedAt: p.updatedAt || nowIso(),
    };
  }

  function mapLegacyStatus(status, statusList) {
    if (!status) return "status-todo";
    if (V1_STATUS_MAP[status]) return V1_STATUS_MAP[status];
    if (String(status).startsWith("status-")) return status;
    const list = statusList || DEFAULT_STATUSES;
    const byName = list.find((s) => (s.name || "").toLowerCase() === String(status).toLowerCase());
    return byName ? byName.id : "status-todo";
  }

  function normalizeTask(t, fromV1, statusList) {
    let statusId = t.statusId;
    if (!statusId && t.status) statusId = mapLegacyStatus(t.status, statusList);
    if (!statusId) statusId = "status-todo";

    let type = t.type || t.typeId || "eng_task";
    if (type === "design-check") type = "design_check";
    if (!TASK_TYPES.some((x) => x.id === type)) type = "eng_task";

    const task = {
      id: t.id || uid("task"),
      projectId: t.projectId == null || t.projectId === "" ? null : t.projectId,
      title: t.title || "",
      description: t.description || "",
      type,
      statusId,
      assignee: t.assignee || "",
      priority: ["low", "medium", "high"].includes(t.priority) ? t.priority : "medium",
      dueDate: t.dueDate || null,
      phaseId: t.phaseId || null,
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
    if (statusIsDone(task.statusId) && !task.doneDate) {
      // leave null; user can set
    }
    return task;
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
      const res = await fetch("https://api.github.com/user", { headers: ghHeaders() });
      if (!res.ok) throw new Error("Auth failed (" + res.status + ")");
      state.githubUser = await res.json();
      updateAuthBadge();
    } catch (e) {
      state.githubUser = null;
      updateAuthBadge();
      toast("GitHub auth: " + e.message, "error");
    }
  }
  async function loadFromGithub() {
    if (!state.settings.pat) {
      toast("Set a Personal Access Token in Settings first.", "error");
      return;
    }
    if (state.syncOp) {
      toast("Sync already in progress.", "error");
      return;
    }
    setSyncBusy("load");
    try {
      const res = await fetch(contentsUrl() + "?ref=main", { headers: ghHeaders() });
      if (res.status === 404) {
        toast("data/projects.json not found on main. Using local/seed data.", "error");
        return;
      }
      if (!res.ok) throw new Error("Load failed (" + res.status + ")");
      const meta = await res.json();
      state.fileSha = meta.sha;
      const json = JSON.parse(atob(meta.content.replace(/\n/g, "")));
      state.data = normalizeData(json);
      state.loadedThisSession = true;
      cacheDataLocally();
      markLastSync("Load");
      render();
      toast("Loaded from GitHub (" + state.settings.owner + "/" + state.settings.repo + ")", "success");
    } catch (e) {
      toast("GitHub load error: " + e.message + ". Prefer GitHub Pages or a local static server (CORS).", "error");
    } finally {
      setSyncBusy(null);
    }
  }
  async function saveToGithub() {
    if (!state.settings.pat) {
      toast("Set a Personal Access Token in Settings first.", "error");
      return;
    }
    if (state.syncOp) {
      toast("Sync already in progress.", "error");
      return;
    }
    setSyncBusy("save");
    try {
      const shaWasMissing = !state.fileSha;
      if (shaWasMissing) {
        const getRes = await fetch(contentsUrl() + "?ref=main", { headers: ghHeaders() });
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
            let remoteStr = "";
            try {
              remoteStr = decodeURIComponent(escape(atob(meta.content.replace(/\n/g, ""))));
            } catch (_) {
              remoteStr = atob(meta.content.replace(/\n/g, ""));
            }
            const localStr = JSON.stringify(state.data, null, 2);
            if (remoteStr !== localStr) {
              const ok = confirm(
                "Remote data differs from this browser. Save will overwrite GitHub with what's on screen. Continue?"
              );
              if (!ok) return;
            }
          }
          state.fileSha = remoteSha;
        }
      }

      state.data.updatedAt = nowIso();
      state.data.version = APP_VERSION;
      const body = {
        message: "Update engineering projects data",
        content: btoa(unescape(encodeURIComponent(JSON.stringify(state.data, null, 2)))),
        branch: "main",
      };
      if (state.fileSha) body.sha = state.fileSha;

      const putRes = await fetch(contentsUrl(), {
        method: "PUT",
        headers: ghHeaders(true),
        body: JSON.stringify(body),
      });
      if (putRes.status === 401) {
        throw new Error("PAT invalid or expired. Update in Settings.");
      }
      if (putRes.status === 403) {
        throw new Error(
          "PAT lacks Contents write on Lumax-Energy/lumax-eng-mgmt (need classic repo or fine-grained Contents R/W)."
        );
      }
      if (putRes.status === 409 || putRes.status === 422) {
        const err = await putRes.json().catch(() => ({}));
        const msg = err.message || ("conflict (" + putRes.status + ")");
        throw new Error(
          "Conflict — someone else saved first. Load, merge carefully, then Save again. (" + msg + ")"
        );
      }
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error(err.message || "Save failed (" + putRes.status + ")");
      }
      const result = await putRes.json();
      state.fileSha = result.content && result.content.sha;
      cacheDataLocally();
      markLastSync("Save");
      toast("Saved to GitHub", "success");
    } catch (e) {
      toast("GitHub save error: " + e.message, "error");
    } finally {
      setSyncBusy(null);
    }
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
        state.data = normalizeData(json);
        cacheDataLocally();
        state.view = "dashboard";
        state.selectedProjectId = null;
        render();
        toast("Imported JSON file", "success");
      } catch (e) {
        toast("Import failed: " + e.message, "error");
      }
    };
    reader.readAsText(file);
  }

  async function bootstrap() {
    const cached = loadCachedData();
    if (cached && ((cached.projects && cached.projects.length) || (cached.tasks && cached.tasks.length))) {
      state.data = normalizeData(cached);
    } else {
      try {
        const res = await fetch("./data/projects.json", { cache: "no-store" });
        if (res.ok) {
          state.data = normalizeData(await res.json());
          cacheDataLocally();
        }
      } catch (_) {}
    }
    updateAuthBadge();
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
        (state.search || "").trim())
    );
    const filteredTasks = filterActive ? allTasksFiltered() : allTasks.slice();

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
    function freezeAndFilter(ws) {
      if (!ws["!ref"]) return;
      ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
      // SheetJS uses !autofilter
      ws["!autofilter"] = { ref: ws["!ref"] };
    }
    function appendSheet(wb, name, ws) {
      freezeAndFilter(ws);
      XLSX.utils.book_append_sheet(wb, ws, name);
    }

    // ---- 1 Dashboard (full dataset KPIs) ----
    const openAll = allTasks.filter((t) => statusIsOpen(t.statusId));
    const overdueAll = allTasks.filter((t) => isOverdue(t));
    const due7All = allTasks.filter((t) => isDueWithin(t, 7));
    const blockedAll = allTasks.filter((t) => statusIsBlocked(t.statusId));
    const standaloneOpen = allTasks.filter((t) => !t.projectId && statusIsOpen(t.statusId));
    const activeProjects = allProjects.filter((p) => !p.archived);
    const riskProjects = activeProjects.filter((p) => projectAtRisk(p));

    const dash = [];
    dash.push(["Lumax Eng Mgmt — Dashboard export"]);
    dash.push(["Exported at", nowIso()]);
    dash.push(["Filter note", filterActive
      ? "Active UI filters apply to All Tasks + type sheets only. This Dashboard sheet is the FULL dataset."
      : "No task filters active — all task sheets use the full dataset."]);
    dash.push([]);
    dash.push(["KPI", "Value"]);
    dash.push(["Open tasks", openAll.length]);
    dash.push(["Overdue", overdueAll.length]);
    dash.push(["Due in 7 days", due7All.length]);
    dash.push(["Blocked", blockedAll.length]);
    dash.push(["Standalone open", standaloneOpen.length]);
    dash.push(["Active projects", activeProjects.length]);
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
    TASK_TYPES.forEach((ty) => {
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
          "Phase count": (p.phases || []).length,
          "Current phase": cur ? cur.name : "",
          "Eng sign-off": p.engineeringSignOff ? "yes" : "no",
          "Eng sign-off at": p.engineeringSignOffAt || "",
          "Eng sign-off by": p.engineeringSignOffBy || "",
          Conformance: conformanceLabel(p.conformanceStatus),
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
    TASK_TYPES.forEach((ty) => {
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

    const wb = XLSX.utils.book_new();
    // Exact order per Researchy:
    // 1 Dashboard 2 All Tasks 3 Projects 4 By Assignee 5 By Client 6 By Project
    // 7 RDN 8 Design Checks 9 Drawings 10 Eng Tasks 11 Summary
    appendSheet(wb, "Dashboard", XLSX.utils.aoa_to_sheet(dash));
    appendSheet(wb, "All Tasks", sheetFromRows(allTaskRows, emptyHeaders));
    appendSheet(wb, "Projects", sheetFromRows(projRows, ["Code", "Name", "Client", "Eng sign-off", "Conformance"]));
    appendSheet(wb, "By Assignee", sheetFromRows(byAssigneeRows, emptyHeaders));
    appendSheet(wb, "By Client", sheetFromRows(byClientRows, emptyHeaders));
    appendSheet(wb, "By Project", sheetFromRows(byProjectRows, emptyHeaders));
    appendSheet(wb, "RDN", sheetFromRows(typeRows("rdn"), emptyHeaders));
    appendSheet(wb, "Design Checks", sheetFromRows(typeRows("design_check"), emptyHeaders));
    appendSheet(wb, "Drawings", sheetFromRows(typeRows("drawing"), emptyHeaders));
    appendSheet(wb, "Eng Tasks", sheetFromRows(typeRows("eng_task"), emptyHeaders));
    appendSheet(wb, "Summary", XLSX.utils.aoa_to_sheet(summary));

    XLSX.writeFile(wb, "lumax-eng-mgmt.xlsx");
    toast(
      filterActive
        ? "Exported Excel (All Tasks + type sheets filter-scoped; Dashboard/Projects/Summary/By-* full)"
        : "Exported Excel workbook (11 sheets)",
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
    const def = id ? getDashboardView(id) : null;
    if (!id) {
      state.dashboardView = null;
      state.projectFilters.client = "";
      state.projectFilters.dashboardView = null;
      render();
      return;
    }
    if (!def) return;

    if (def.kind === "browse-clients" || def.kind === "browse-assignees") {
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
        `<h2>Engineering assignees <span class="stat-sub">(${assignees.length})</span></h2>` +
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
          state.taskFilters = {
            type: "",
            statusId: "",
            assignee: btn.dataset.assignee,
            overdueOnly: false,
            projectId: "",
            client: "",
          };
          state.dashboardView = null;
          setView("tasks");
        };
      });
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
          ? ' — <em>Has conformance</em> means status is <strong>pending</strong> or <strong>approved</strong> (not none).'
          : "") +
        (viewDef.id === "site-investigation"
          ? " — Current phase = first phase with open tasks, else first phase."
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
              (p.engineeringSignOff ? '<span class="pill signoff">Eng sign-off</span> ' : "") +
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

    const tasks = state.data.tasks || [];
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
    const byType = TASK_TYPES.map((ty) => ({
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

    const signOffN = (state.data.projects || []).filter((p) => !p.archived && p.engineeringSignOff).length;
    const confN = (state.data.projects || []).filter((p) => !p.archived && hasConformance(p)).length;
    const siteN = (state.data.projects || []).filter((p) => !p.archived && projectInSiteInvestigation(p)).length;

    root.innerHTML =
      renderViewChips(state.dashboardView) +
      `<div class="dash-grid">` +
      `<div class="dash-card span-3"><h3>Open tasks</h3><div class="stat-big">${open.length}</div><div class="stat-sub">${overdue.length} overdue · ${due7.length} due in 7d</div></div>` +
      `<div class="dash-card span-3"><h3>Standalone</h3><div class="stat-big">${tasks.filter((t) => !t.projectId && statusIsOpen(t.statusId)).length}</div><div class="stat-sub">open without project</div></div>` +
      `<div class="dash-card span-3"><h3>Blocked</h3><div class="stat-big">${tasks.filter((t) => statusIsBlocked(t.statusId)).length}</div><div class="stat-sub">need unblock</div></div>` +
      `<div class="dash-card span-3"><h3>Active projects</h3><div class="stat-big">${(state.data.projects || []).filter((p) => !p.archived).length}</div><div class="stat-sub">${risk.length} at risk · ${signOffN} sign-off · ${confN} conformance · ${siteN} site inv.</div></div>` +
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
                `<div class="stat-row"><button type="button" class="linkish dash-filter-assignee" data-assignee="${escapeHtml(a === "(unassigned)" ? "" : a)}">${escapeHtml(a)}</button><span>${c.overdue} overdue · ${c.due7} due-7d</span></div>`
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
        state.taskFilters = { type: "", statusId: btn.dataset.status, assignee: "", overdueOnly: false, projectId: "", client: "" };
        setView("tasks");
      };
    });
    root.querySelectorAll(".dash-filter-type").forEach((btn) => {
      btn.onclick = () => {
        state.taskFilters = { type: btn.dataset.type, statusId: "", assignee: "", overdueOnly: false, projectId: "", client: "" };
        setView("tasks");
      };
    });
    root.querySelectorAll(".dash-filter-assignee").forEach((btn) => {
      btn.onclick = () => {
        state.taskFilters = { type: "", statusId: "", assignee: btn.dataset.assignee, overdueOnly: true, projectId: "", client: "" };
        setView("tasks");
      };
    });
    root.querySelectorAll(".dash-open-project").forEach((btn) => {
      btn.onclick = () => openProject(btn.dataset.id);
    });
    root.querySelectorAll(".dash-open-task").forEach((btn) => {
      btn.onclick = () => openTaskForm(btn.dataset.id);
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
    const filterViews = DASHBOARD_VIEWS.filter((v) => v.kind === "filter-projects" || v.kind === "browse-clients");
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
        ? `<span class="view-chip-meta hint-inline">Has conformance = pending | approved</span>`
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
        if (def.kind === "browse-clients") {
          // On projects page: cycle client via prompt-less browse — jump to dashboard clients view
          state.dashboardView = "clients";
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
          `<div class="meta">${escapeHtml(p.clientName || "No client")} · SO ${escapeHtml(p.salesOrderNumber || "—")}</div>` +
          (isSample(p) ? '<span class="sample-tag">SAMPLE</span>' : "") +
          (p.archived ? '<span class="sample-tag" style="background:#eee;color:#555">ARCHIVED</span>' : "") +
          (p.engineeringSignOff ? '<span class="pill signoff">Eng sign-off</span>' : "") +
          (hasConformance(p) ? `<span class="pill conformance">${escapeHtml(conformanceLabel(p.conformanceStatus))}</span>` : "") +
          (cur ? `<div class="stat-sub">Phase: ${escapeHtml(cur.name)}</div>` : "") +
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

    root.innerHTML =
      `<div class="detail-header">` +
      `<div class="breadcrumb"><button type="button" id="btn-back">← All projects</button></div>` +
      `<h2>${escapeHtml(p.projectName)}${isSample(p) ? ' <span class="sample-tag">SAMPLE</span>' : ""}</h2>` +
      `<div class="detail-meta">` +
      `<span><strong>Client:</strong> ${escapeHtml(p.clientName)}</span>` +
      `<span><strong>Code:</strong> ${escapeHtml(p.projectCode)}</span>` +
      `<span><strong>SO:</strong> ${escapeHtml(p.salesOrderNumber)}</span>` +
      `<span><strong>Eng sign-off:</strong> ${p.engineeringSignOff ? "Yes" : "No"}` +
      (p.engineeringSignOff && (p.engineeringSignOffBy || p.engineeringSignOffAt)
        ? ` (${escapeHtml([p.engineeringSignOffBy, p.engineeringSignOffAt].filter(Boolean).join(" · "))})`
        : "") +
      `</span>` +
      `<span><strong>Conformance:</strong> ${escapeHtml(conformanceLabel(p.conformanceStatus))}</span>` +
      (() => {
        const cur = projectCurrentPhase(p);
        return cur ? `<span><strong>Current phase:</strong> ${escapeHtml(cur.name)}</span>` : "";
      })() +
      (p.archived ? "<span><strong>Status:</strong> Archived</span>" : "") +
      `</div>` +
      `<div class="drawings-list"><strong>Drawings:</strong> ${drawings}</div>` +
      (customs ? `<div class="custom-fields-list" style="margin-top:0.4rem">${customs}</div>` : "") +
      `<div class="detail-actions" style="margin-top:0.85rem">` +
      `<button type="button" class="btn btn-sm" id="btn-new-task">+ Task</button>` +
      `<button type="button" class="btn btn-secondary btn-sm" id="btn-edit-project">Edit project</button>` +
      `<button type="button" class="btn btn-secondary btn-sm" id="btn-archive">${p.archived ? "Unarchive" : "Archive"}</button>` +
      `</div></div>` +
      `<div class="phase-tabs">${phaseTabs}</div>` +
      `<div class="board" id="project-board"></div>`;

    renderBoard(document.getElementById("project-board"), filtered, p);

    root.querySelector("#btn-back").addEventListener("click", () => setView("projects"));
    root.querySelector("#btn-new-task").addEventListener("click", () => openTaskForm(null, { projectId: p.id }));
    root.querySelector("#btn-edit-project").addEventListener("click", () => openProjectForm(p.id));
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
              `<div class="task-card${isOverdue(t) ? " overdue" : ""}" data-task="${escapeHtml(t.id)}" tabindex="0" role="button">` +
              `<div style="margin-bottom:0.25rem"><span class="type-chip">${escapeHtml(typeLabel(t.type))}</span></div>` +
              `<h4>${escapeHtml(t.title)}</h4>` +
              (t.description ? `<div class="desc">${escapeHtml(t.description)}</div>` : "") +
              `<div class="task-meta">` +
              (t.assignee ? `<span>${escapeHtml(t.assignee)}</span>` : "") +
              (t.dueDate ? `<span>Due ${escapeHtml(t.dueDate)}</span>` : "") +
              (t.priority ? `<span class="priority ${escapeHtml(t.priority)}">${escapeHtml(t.priority)}</span>` : "") +
              (phase && state.selectedPhaseId === "all" ? `<span>${escapeHtml(phase.name)}</span>` : "") +
              (!projectCtx && proj ? `<span>${escapeHtml(proj.projectCode || proj.projectName)}</span>` : "") +
              (!projectCtx && !proj ? `<span>Standalone</span>` : "") +
              `</div></div>`
            );
          })
          .join("");
        return (
          `<div class="column">` +
          `<div class="column-header"><span class="dot" style="background:${escapeHtml(st.color || "#6b7c93")}"></span><span>${escapeHtml(st.name)}</span><span class="count">${colTasks.length}</span></div>` +
          (cards || '<div class="column-empty">No tasks</div>') +
          `</div>`
        );
      })
      .join("");

    container.querySelectorAll(".task-card").forEach((card) => {
      card.addEventListener("click", () => openTaskForm(card.dataset.task));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openTaskForm(card.dataset.task);
        }
      });
    });
  }

  // ---------- Tasks nav ----------
  function renderTasksView() {
    const root = document.getElementById("view-tasks");
    const statuses = getStatuses();
    const assignees = [...new Set((state.data.tasks || []).map((t) => t.assignee).filter(Boolean))].sort();
    const f = state.taskFilters;

    const filterBar =
      `<div class="filter-row">` +
      `<select id="tf-filter-type"><option value="">All types</option>${TASK_TYPES.map((ty) => `<option value="${ty.id}"${f.type === ty.id ? " selected" : ""}>${escapeHtml(ty.name)}</option>`).join("")}</select>` +
      `<select id="tf-filter-status"><option value="">All statuses</option>${statuses.map((s) => `<option value="${s.id}"${f.statusId === s.id ? " selected" : ""}>${escapeHtml(s.name)}</option>`).join("")}</select>` +
      `<select id="tf-filter-assignee"><option value="">All assignees</option>${assignees.map((a) => `<option value="${escapeHtml(a)}"${f.assignee === a ? " selected" : ""}>${escapeHtml(a)}</option>`).join("")}</select>` +
      `<select id="tf-filter-project"><option value="">All projects</option><option value="__standalone__"${f.projectId === "__standalone__" ? " selected" : ""}>Standalone only</option>${(state.data.projects || []).map((p) => `<option value="${escapeHtml(p.id)}"${f.projectId === p.id ? " selected" : ""}>${escapeHtml(p.projectCode || p.projectName)}</option>`).join("")}</select>` +
      `<label class="checkbox-label"><input type="checkbox" id="tf-filter-overdue"${f.overdueOnly ? " checked" : ""}/> Overdue</label>` +
      `<div class="spacer"></div>` +
      `<div class="view-toggle">` +
      `<button type="button" class="btn btn-secondary btn-sm${state.tasksMode === "list" ? " active" : ""}" id="btn-tasks-list">List</button>` +
      `<button type="button" class="btn btn-secondary btn-sm${state.tasksMode === "board" ? " active" : ""}" id="btn-tasks-board">Board</button>` +
      `</div>` +
      `<button type="button" class="btn btn-sm" id="btn-new-standalone">+ Task</button>` +
      `</div>`;

    const tasks = allTasksFiltered().sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")));

    let body = "";
    if (state.tasksMode === "board") {
      body = `<div class="board" id="tasks-board"></div>`;
    } else {
      body =
        `<div class="tasks-table-wrap"><table class="tasks-table"><thead><tr>` +
        `<th>Type</th><th>Title</th><th>Project</th><th>Status</th><th>Assignee</th><th>Priority</th><th>Due</th>` +
        `</tr></thead><tbody>` +
        (tasks.length
          ? tasks
              .map((t) => {
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
                  `</tr>`
                );
              })
              .join("")
          : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:1.5rem">No tasks match filters</td></tr>`) +
        `</tbody></table></div>`;
    }

    root.innerHTML = filterBar + body;

    if (state.tasksMode === "board") {
      renderBoard(document.getElementById("tasks-board"), tasks, null);
    } else {
      root.querySelectorAll("tbody tr[data-task]").forEach((row) => {
        row.addEventListener("click", () => openTaskForm(row.dataset.task));
      });
    }

    function syncFilters() {
      state.taskFilters.type = document.getElementById("tf-filter-type").value;
      state.taskFilters.statusId = document.getElementById("tf-filter-status").value;
      state.taskFilters.assignee = document.getElementById("tf-filter-assignee").value;
      state.taskFilters.projectId = document.getElementById("tf-filter-project").value;
      state.taskFilters.overdueOnly = document.getElementById("tf-filter-overdue").checked;
      renderTasksView();
    }
    ["tf-filter-type", "tf-filter-status", "tf-filter-assignee", "tf-filter-project"].forEach((id) => {
      document.getElementById(id).onchange = syncFilters;
    });
    document.getElementById("tf-filter-overdue").onchange = syncFilters;
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

  function openSettings() {
    const s = state.settings;
    const ds = state.data.settings || {};
    const statuses = getStatuses();
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
        `<div class="settings-section"><h3>Task statuses (board columns)</h3>` +
        `<div class="dyn-list" id="set-statuses"></div>` +
        `<button type="button" class="btn btn-secondary btn-sm" id="set-add-status" style="margin-top:0.4rem">+ Status</button>` +
        `<p class="hint">Category maps open/done semantics. Order = board column order.</p></div>` +
        `<p class="sync-info">Task types are fixed: RDN, Design check, Drawing, Eng task (with type-specific fields). Data path: <code>${DATA_PATH}</code>.</p>` +
        `<div class="panel-actions">` +
        `<button type="button" class="btn btn-secondary" id="set-cancel">Cancel</button>` +
        `<button type="button" class="btn" id="set-save">Save settings</button>` +
        `</div></div>`
    );

    const box = document.getElementById("set-statuses");
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

    showOverlay(
      `<div class="panel wide" role="dialog">` +
        `<h2>${isEdit ? "Edit project" : "New project"}</h2>` +
        `<div class="form-row">` +
        `<div class="form-group"><label>Client name</label><input id="pf-client" value="${escapeHtml(p ? p.clientName : "")}" /></div>` +
        `<div class="form-group"><label>Project code</label><input id="pf-code" value="${escapeHtml(p ? p.projectCode : "")}" /></div>` +
        `</div>` +
        `<div class="form-group"><label>Project name</label><input id="pf-name" value="${escapeHtml(p ? p.projectName : "")}" /></div>` +
        `<div class="form-group"><label>Sales order number</label><input id="pf-so" value="${escapeHtml(p ? p.salesOrderNumber : "")}" /></div>` +
        `<div class="form-row">` +
        `<div class="form-group"><label class="checkbox-label"><input type="checkbox" id="pf-eng-signoff"${p && p.engineeringSignOff ? " checked" : ""}/> Engineering sign-off</label>` +
        `<p class="hint">Toggle when engineering has signed off this project.</p></div>` +
        `<div class="form-group"><label>Conformance</label>` +
        `<select id="pf-conformance">` +
        CONFORMANCE_STATUSES.map((s) => {
          const cur = p ? normalizeConformanceStatus(p.conformanceStatus) : "none";
          return `<option value="${s.id}"${cur === s.id ? " selected" : ""}>${escapeHtml(s.name)}</option>`;
        }).join("") +
        `</select>` +
        `<p class="hint">“Has conformance” views include <strong>pending</strong> and <strong>approved</strong>.</p></div>` +
        `</div>` +
        `<div class="form-row" id="pf-signoff-extra">` +
        `<div class="form-group"><label>Sign-off at</label><input type="date" id="pf-signoff-at" value="${escapeHtml(p && p.engineeringSignOffAt ? String(p.engineeringSignOffAt).slice(0, 10) : "")}" /></div>` +
        `<div class="form-group"><label>Sign-off by</label><input id="pf-signoff-by" value="${escapeHtml(p ? p.engineeringSignOffBy || "" : "")}" placeholder="Name" /></div>` +
        `</div>` +
        `<div class="form-group"><label>Drawing numbers</label>` +
        `<div class="dyn-list" id="pf-drawings"></div>` +
        `<button type="button" class="btn btn-secondary btn-sm" id="pf-add-drawing" style="margin-top:0.4rem">+ Drawing</button></div>` +
        `<div class="form-group"><label>Custom fields</label>` +
        `<div class="dyn-list" id="pf-customs"></div>` +
        `<button type="button" class="btn btn-secondary btn-sm" id="pf-add-custom" style="margin-top:0.4rem">+ Field</button></div>` +
        (!isEdit
          ? `<p class="hint">New projects get default phases: Intake → Concept → Design → Check → Drawings → Site investigation → Site/Construction support → Close-out.</p>`
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
      const on = document.getElementById("pf-eng-signoff").checked;
      const wrap = document.getElementById("pf-signoff-extra");
      if (wrap) wrap.style.opacity = on ? "1" : "0.55";
    }
    document.getElementById("pf-eng-signoff").onchange = syncSignOffExtra;
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
      const engineeringSignOff = document.getElementById("pf-eng-signoff").checked;
      let engineeringSignOffAt = document.getElementById("pf-signoff-at").value || null;
      let engineeringSignOffBy = document.getElementById("pf-signoff-by").value.trim();
      if (engineeringSignOff && !engineeringSignOffAt) engineeringSignOffAt = todayStr();
      if (!engineeringSignOff) {
        // Keep historical values but off flag is authoritative for views
      }
      const conformanceStatus = normalizeConformanceStatus(document.getElementById("pf-conformance").value);

      if (isEdit) {
        Object.assign(p, {
          clientName,
          projectName,
          projectCode,
          salesOrderNumber,
          drawingNumbers,
          customFields,
          engineeringSignOff,
          engineeringSignOffAt,
          engineeringSignOffBy,
          conformanceStatus,
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
          engineeringSignOff,
          engineeringSignOffAt,
          engineeringSignOffBy,
          conformanceStatus,
          phases: DEFAULT_PHASES.map((ph) => ({ id: uid("phase"), name: ph.name })),
          archived: false,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
        state.data.projects.push(np);
      }
      cacheDataLocally();
      closeOverlay();
      render();
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

    const typeOpts = TASK_TYPES.map(
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
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.onclick = () => {
        state.taskFilters = { type: "", statusId: "", assignee: "", overdueOnly: false, projectId: "" };
        setView(btn.dataset.view);
      };
    });
    document.getElementById("btn-settings").onclick = openSettings;
    document.getElementById("btn-load").onclick = loadFromGithub;
    document.getElementById("btn-save").onclick = saveToGithub;
    document.getElementById("btn-export").onclick = exportJson;
    document.getElementById("btn-export-excel").onclick = exportExcel;
    document.getElementById("btn-import").onclick = () => document.getElementById("import-file").click();
    document.getElementById("import-file").onchange = (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importJsonFile(f);
      e.target.value = "";
    };
    document.getElementById("btn-new-project").onclick = () => openProjectForm(null);
    document.getElementById("global-search").oninput = (e) => {
      state.search = e.target.value;
      render();
    };
    document.getElementById("show-archived").onchange = (e) => {
      state.showArchived = e.target.checked;
      if (state.view === "projects") renderProjects();
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    wire();
    bootstrap();
  });
})();
