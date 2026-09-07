/**
 * Lumax Energy — Engineering Management
 * Vanilla JS SPA with GitHub Contents API sync + localStorage cache.
 */
(function () {
  "use strict";

  const LS_DATA = "lumax-eng-mgmt-data";
  const LS_SETTINGS = "lumax-eng-mgmt-settings";
  const LS_SHA = "lumax-eng-mgmt-sha";
  const DEFAULT_OWNER = "Lumax-Energy";
  const DEFAULT_REPO = "lumax-eng-mgmt";
  const DATA_PATH = "data/projects.json";
  const DEFAULT_PHASES = [
    { id: "phase-foundation", name: "Foundation" },
    { id: "phase-building", name: "Building" },
    { id: "phase-inspection", name: "Inspection" },
  ];

  let state = {
    data: { version: 1, updatedAt: null, projects: [] },
    view: "list", // list | detail
    selectedProjectId: null,
    selectedPhaseId: "all",
    showArchived: false,
    search: "",
    settings: loadSettings(),
    githubUser: null,
    fileSha: localStorage.getItem(LS_SHA) || null,
    editingProjectId: null,
    editingTaskId: null,
  };

  // ---------- Utils ----------
  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }
  function nowIso() {
    return new Date().toISOString();
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
    setTimeout(() => el.remove(), 4200);
  }
  function loadSettings() {
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
  function saveSettings() {
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
    return state.data.projects.find((p) => p.id === id);
  }
  function taskCounts(project) {
    const c = { todo: 0, doing: 0, done: 0 };
    (project.tasks || []).forEach((t) => {
      if (c[t.status] != null) c[t.status]++;
    });
    return c;
  }
  function isSample(project) {
    return (
      (project.projectName || "").includes("SAMPLE") ||
      project.projectCode === "DEMO-001" ||
      project.clientName === "Demo Client"
    );
  }

  // ---------- GitHub API ----------
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
      cacheDataLocally();
      render();
      toast("Loaded from GitHub (" + state.settings.owner + "/" + state.settings.repo + ")", "success");
    } catch (e) {
      toast("GitHub load error: " + e.message + ". Prefer GitHub Pages or a local static server (CORS).", "error");
    }
  }
  async function saveToGithub() {
    if (!state.settings.pat) {
      toast("Set a Personal Access Token in Settings first.", "error");
      return;
    }
    try {
      // Refresh SHA to reduce conflicts
      let sha = state.fileSha;
      const getRes = await fetch(contentsUrl() + "?ref=main", { headers: ghHeaders() });
      if (getRes.ok) {
        const meta = await getRes.json();
        sha = meta.sha;
      } else if (getRes.status !== 404) {
        throw new Error("Could not read current SHA (" + getRes.status + ")");
      }

      state.data.updatedAt = nowIso();
      const body = {
        message: "Update engineering projects data",
        content: btoa(unescape(encodeURIComponent(JSON.stringify(state.data, null, 2)))),
        branch: "main",
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(contentsUrl(), {
        method: "PUT",
        headers: ghHeaders(true),
        body: JSON.stringify(body),
      });
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error(err.message || "Save failed (" + putRes.status + ")");
      }
      const result = await putRes.json();
      state.fileSha = result.content && result.content.sha;
      cacheDataLocally();
      toast("Saved to GitHub", "success");
    } catch (e) {
      toast("GitHub save error: " + e.message, "error");
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
        state.view = "list";
        state.selectedProjectId = null;
        render();
        toast("Imported JSON file", "success");
      } catch (e) {
        toast("Import failed: " + e.message, "error");
      }
    };
    reader.readAsText(file);
  }

  function normalizeData(json) {
    const data = {
      version: json.version || 1,
      updatedAt: json.updatedAt || nowIso(),
      projects: Array.isArray(json.projects) ? json.projects.map(normalizeProject) : [],
    };
    return data;
  }
  function normalizeProject(p) {
    return {
      id: p.id || uid("proj"),
      clientName: p.clientName || "",
      projectName: p.projectName || "",
      projectCode: p.projectCode || "",
      salesOrderNumber: p.salesOrderNumber || "",
      drawingNumbers: Array.isArray(p.drawingNumbers) ? p.drawingNumbers.slice() : [],
      customFields: p.customFields && typeof p.customFields === "object" ? { ...p.customFields } : {},
      phases:
        Array.isArray(p.phases) && p.phases.length
          ? p.phases.map((ph) => ({ id: ph.id || uid("phase"), name: ph.name || "Phase" }))
          : DEFAULT_PHASES.map((ph) => ({ ...ph, id: uid("phase") })),
      tasks: Array.isArray(p.tasks) ? p.tasks.map(normalizeTask) : [],
      archived: !!p.archived,
      createdAt: p.createdAt || nowIso(),
      updatedAt: p.updatedAt || nowIso(),
    };
  }
  function normalizeTask(t) {
    return {
      id: t.id || uid("task"),
      title: t.title || "",
      description: t.description || "",
      assignee: t.assignee || "",
      status: ["todo", "doing", "done"].includes(t.status) ? t.status : "todo",
      priority: ["low", "medium", "high"].includes(t.priority) ? t.priority : "medium",
      dueDate: t.dueDate || null,
      phaseId: t.phaseId || null,
    };
  }

  // ---------- Seed / bootstrap ----------
  async function bootstrap() {
    const cached = loadCachedData();
    if (cached && Array.isArray(cached.projects) && cached.projects.length) {
      state.data = normalizeData(cached);
    } else {
      try {
        const res = await fetch("./data/projects.json", { cache: "no-store" });
        if (res.ok) {
          state.data = normalizeData(await res.json());
          cacheDataLocally();
        }
      } catch (_) {
        // file:// or missing seed — empty until import
      }
    }
    updateAuthBadge();
    if (state.settings.pat) fetchGithubUser();
    render();
  }

  function updateAuthBadge() {
    const badge = document.getElementById("auth-badge");
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

  // ---------- Render ----------
  function render() {
    const listView = document.getElementById("view-list");
    const detailView = document.getElementById("view-detail");
    if (state.view === "detail" && state.selectedProjectId && getProject(state.selectedProjectId)) {
      listView.classList.add("hidden");
      detailView.classList.remove("hidden");
      renderDetail();
    } else {
      state.view = "list";
      listView.classList.remove("hidden");
      detailView.classList.add("hidden");
      renderList();
    }
  }

  function renderList() {
    const q = (state.search || "").trim().toLowerCase();
    let projects = state.data.projects.filter((p) => state.showArchived || !p.archived);
    if (q) {
      projects = projects.filter((p) => {
        const hay = [p.clientName, p.projectCode, p.salesOrderNumber, p.projectName]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    projects.sort((a, b) => (a.projectCode || "").localeCompare(b.projectCode || ""));

    const grid = document.getElementById("project-grid");
    if (!projects.length) {
      grid.innerHTML =
        '<div class="empty-state">No projects found. Create one or Load from GitHub / Import JSON.</div>';
      return;
    }
    grid.innerHTML = projects
      .map((p) => {
        const c = taskCounts(p);
        return (
          `<article class="project-card${p.archived ? " archived" : ""}" data-id="${escapeHtml(p.id)}" tabindex="0" role="button">` +
          `<div class="code">${escapeHtml(p.projectCode || "—")}</div>` +
          `<h3>${escapeHtml(p.projectName || "Untitled")}</h3>` +
          `<div class="meta">${escapeHtml(p.clientName || "No client")} · SO ${escapeHtml(p.salesOrderNumber || "—")}</div>` +
          (isSample(p) ? '<span class="sample-tag">SAMPLE</span>' : "") +
          (p.archived ? '<span class="sample-tag" style="background:#eee;color:#555">ARCHIVED</span>' : "") +
          `<div class="task-summary">` +
          `<span class="pill todo">${c.todo} todo</span>` +
          `<span class="pill doing">${c.doing} doing</span>` +
          `<span class="pill done">${c.done} done</span>` +
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
    if (!p) return;
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

    const filteredTasks = (p.tasks || []).filter(
      (t) => state.selectedPhaseId === "all" || t.phaseId === state.selectedPhaseId
    );

    function column(status, label) {
      const tasks = filteredTasks.filter((t) => t.status === status);
      const cards = tasks
        .map((t) => {
          const phase = (p.phases || []).find((ph) => ph.id === t.phaseId);
          return (
            `<div class="task-card" data-task="${escapeHtml(t.id)}" tabindex="0" role="button">` +
            `<h4>${escapeHtml(t.title)}</h4>` +
            (t.description ? `<div class="desc">${escapeHtml(t.description)}</div>` : "") +
            `<div class="task-meta">` +
            (t.assignee ? `<span>${escapeHtml(t.assignee)}</span>` : "") +
            (t.dueDate ? `<span>Due ${escapeHtml(t.dueDate)}</span>` : "") +
            (t.priority ? `<span class="priority ${escapeHtml(t.priority)}">${escapeHtml(t.priority)}</span>` : "") +
            (phase && state.selectedPhaseId === "all" ? `<span>${escapeHtml(phase.name)}</span>` : "") +
            `</div></div>`
          );
        })
        .join("");
      return (
        `<div class="column ${status}">` +
        `<div class="column-header"><span>${label}</span><span class="count">${tasks.length}</span></div>` +
        (cards || '<div style="font-size:0.85rem;color:var(--muted);padding:0.5rem">No tasks</div>') +
        `</div>`
      );
    }

    root.innerHTML =
      `<div class="detail-header">` +
      `<div class="breadcrumb"><button type="button" id="btn-back">← All projects</button></div>` +
      `<h2>${escapeHtml(p.projectName)}${isSample(p) ? ' <span class="sample-tag">SAMPLE</span>' : ""}</h2>` +
      `<div class="detail-meta">` +
      `<span><strong>Client:</strong> ${escapeHtml(p.clientName)}</span>` +
      `<span><strong>Code:</strong> ${escapeHtml(p.projectCode)}</span>` +
      `<span><strong>SO:</strong> ${escapeHtml(p.salesOrderNumber)}</span>` +
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
      `<div class="board">${column("todo", "To do")}${column("doing", "Doing")}${column("done", "Done")}</div>`;

    root.querySelector("#btn-back").addEventListener("click", () => {
      state.view = "list";
      state.selectedProjectId = null;
      render();
    });
    root.querySelector("#btn-new-task").addEventListener("click", () => openTaskForm(null));
    root.querySelector("#btn-edit-project").addEventListener("click", () => openProjectForm(p.id));
    root.querySelector("#btn-archive").addEventListener("click", () => {
      p.archived = !p.archived;
      p.updatedAt = nowIso();
      cacheDataLocally();
      toast(p.archived ? "Project archived" : "Project unarchived", "success");
      if (p.archived) {
        state.view = "list";
        state.selectedProjectId = null;
      }
      render();
    });
    root.querySelector("#btn-edit-phases").addEventListener("click", () => openPhasesForm(p));
    root.querySelectorAll(".phase-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        state.selectedPhaseId = tab.dataset.phase;
        renderDetail();
      });
    });
    root.querySelectorAll(".task-card").forEach((card) => {
      card.addEventListener("click", () => openTaskForm(card.dataset.task));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openTaskForm(card.dataset.task);
        }
      });
    });
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
    showOverlay(
      `<div class="panel wide" role="dialog" aria-label="Settings">` +
        `<h2>Settings — GitHub sync</h2>` +
        `<div class="form-group"><label>GitHub owner</label>` +
        `<input id="set-owner" value="${escapeHtml(s.owner)}" /></div>` +
        `<div class="form-group"><label>Repository</label>` +
        `<input id="set-repo" value="${escapeHtml(s.repo)}" /></div>` +
        `<div class="form-group"><label>Personal Access Token (PAT)</label>` +
        `<input id="set-pat" type="password" autocomplete="off" value="${escapeHtml(s.pat)}" placeholder="ghp_… or github_pat_…" />` +
        `<p class="hint">Stored only in this browser's localStorage. Never written to projects.json. Use classic <code>repo</code> scope, or fine-grained Contents Read/Write + Metadata on this repo. Each engineer uses their own PAT.</p></div>` +
        `<p class="sync-info">Data file path: <code>${DATA_PATH}</code>. Load/Save use the Contents API (GET + PUT with SHA).</p>` +
        `<div class="panel-actions">` +
        `<button type="button" class="btn btn-secondary" id="set-cancel">Cancel</button>` +
        `<button type="button" class="btn" id="set-save">Save settings</button>` +
        `</div></div>`
    );
    document.getElementById("set-cancel").onclick = closeOverlay;
    document.getElementById("set-save").onclick = () => {
      state.settings.owner = document.getElementById("set-owner").value.trim() || DEFAULT_OWNER;
      state.settings.repo = document.getElementById("set-repo").value.trim() || DEFAULT_REPO;
      state.settings.pat = document.getElementById("set-pat").value.trim();
      saveSettings();
      closeOverlay();
      updateAuthBadge();
      toast("Settings saved locally", "success");
      if (state.settings.pat) fetchGithubUser();
      else {
        state.githubUser = null;
        updateAuthBadge();
      }
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
        `<div class="form-group"><label>Drawing numbers</label>` +
        `<div class="dyn-list" id="pf-drawings"></div>` +
        `<button type="button" class="btn btn-secondary btn-sm" id="pf-add-drawing" style="margin-top:0.4rem">+ Drawing</button></div>` +
        `<div class="form-group"><label>Custom fields</label>` +
        `<div class="dyn-list" id="pf-customs"></div>` +
        `<button type="button" class="btn btn-secondary btn-sm" id="pf-add-custom" style="margin-top:0.4rem">+ Field</button>` +
        `<p class="hint">Key/value pairs for extensible project metadata.</p></div>` +
        `<div class="panel-actions">` +
        (isEdit
          ? `<button type="button" class="btn btn-danger" id="pf-delete" style="margin-right:auto">Delete</button>`
          : "") +
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

    if (isEdit) {
      document.getElementById("pf-delete").onclick = () => {
        if (!confirm("Permanently delete this project and all its tasks?")) return;
        state.data.projects = state.data.projects.filter((x) => x.id !== projectId);
        cacheDataLocally();
        closeOverlay();
        state.view = "list";
        state.selectedProjectId = null;
        render();
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
      const drawingNumbers = [...drawBox.querySelectorAll(".pf-draw-val")]
        .map((i) => i.value.trim())
        .filter(Boolean);
      const customFields = {};
      custBox.querySelectorAll(".dyn-row").forEach((row) => {
        const k = row.querySelector(".pf-cf-key").value.trim();
        const v = row.querySelector(".pf-cf-val").value.trim();
        if (k) customFields[k] = v;
      });

      if (isEdit) {
        Object.assign(p, {
          clientName,
          projectName,
          projectCode,
          salesOrderNumber,
          drawingNumbers,
          customFields,
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
          phases: DEFAULT_PHASES.map((ph) => ({ id: uid("phase"), name: ph.name })),
          tasks: [],
          archived: false,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
        state.data.projects.push(np);
      }
      cacheDataLocally();
      closeOverlay();
      render();
      toast(isEdit ? "Project updated" : "Project created", "success");
    };
  }

  function openPhasesForm(project) {
    showOverlay(
      `<div class="panel" role="dialog">` +
        `<h2>Edit phases</h2>` +
        `<div class="dyn-list" id="ph-list"></div>` +
        `<button type="button" class="btn btn-secondary btn-sm" id="ph-add" style="margin-top:0.5rem">+ Phase</button>` +
        `<p class="hint">Default phases are Foundation, Building, Inspection. Renaming keeps linked tasks.</p>` +
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
        `<input class="ph-name" value="${escapeHtml(name || "")}" placeholder="Phase name" />` +
        `<button type="button" class="btn btn-secondary btn-sm ph-rm">×</button>`;
      row.querySelector(".ph-rm").onclick = () => row.remove();
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
      (project.tasks || []).forEach((t) => {
        if (t.phaseId && !validIds.has(t.phaseId)) t.phaseId = null;
      });
      if (state.selectedPhaseId !== "all" && !validIds.has(state.selectedPhaseId)) {
        state.selectedPhaseId = "all";
      }
      project.updatedAt = nowIso();
      cacheDataLocally();
      closeOverlay();
      render();
      toast("Phases updated", "success");
    };
  }

  function openTaskForm(taskId) {
    const p = getProject(state.selectedProjectId);
    if (!p) return;
    const isEdit = !!taskId;
    const t = isEdit ? (p.tasks || []).find((x) => x.id === taskId) : null;
    const phaseOpts = (p.phases || [])
      .map(
        (ph) =>
          `<option value="${escapeHtml(ph.id)}"${t && t.phaseId === ph.id ? " selected" : ""}>${escapeHtml(ph.name)}</option>`
      )
      .join("");

    showOverlay(
      `<div class="panel" role="dialog">` +
        `<h2>${isEdit ? "Edit task" : "New task"}</h2>` +
        `<div class="form-group"><label>Title</label><input id="tf-title" value="${escapeHtml(t ? t.title : "")}" /></div>` +
        `<div class="form-group"><label>Description</label><textarea id="tf-desc">${escapeHtml(t ? t.description : "")}</textarea></div>` +
        `<div class="form-row">` +
        `<div class="form-group"><label>Assignee</label><input id="tf-assignee" value="${escapeHtml(t ? t.assignee : "")}" /></div>` +
        `<div class="form-group"><label>Status</label>` +
        `<select id="tf-status">` +
        ["todo", "doing", "done"]
          .map(
            (s) =>
              `<option value="${s}"${(t ? t.status : "todo") === s ? " selected" : ""}>${s}</option>`
          )
          .join("") +
        `</select></div></div>` +
        `<div class="form-row">` +
        `<div class="form-group"><label>Priority</label>` +
        `<select id="tf-priority">` +
        ["low", "medium", "high"]
          .map(
            (pr) =>
              `<option value="${pr}"${(t ? t.priority : "medium") === pr ? " selected" : ""}>${pr}</option>`
          )
          .join("") +
        `</select></div>` +
        `<div class="form-group"><label>Due date</label>` +
        `<input type="date" id="tf-due" value="${escapeHtml(t && t.dueDate ? t.dueDate : "")}" /></div></div>` +
        `<div class="form-group"><label>Phase</label>` +
        `<select id="tf-phase"><option value="">— None —</option>${phaseOpts}</select></div>` +
        `<div class="panel-actions">` +
        (isEdit
          ? `<button type="button" class="btn btn-danger" id="tf-delete" style="margin-right:auto">Delete</button>`
          : "") +
        `<button type="button" class="btn btn-secondary" id="tf-cancel">Cancel</button>` +
        `<button type="button" class="btn" id="tf-save">Save</button>` +
        `</div></div>`
    );

    // Preselect phase from tab when creating
    if (!isEdit && state.selectedPhaseId !== "all") {
      document.getElementById("tf-phase").value = state.selectedPhaseId;
    }

    document.getElementById("tf-cancel").onclick = closeOverlay;
    if (isEdit) {
      document.getElementById("tf-delete").onclick = () => {
        if (!confirm("Delete this task?")) return;
        p.tasks = p.tasks.filter((x) => x.id !== taskId);
        p.updatedAt = nowIso();
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
      const payload = {
        title,
        description: document.getElementById("tf-desc").value.trim(),
        assignee: document.getElementById("tf-assignee").value.trim(),
        status: document.getElementById("tf-status").value,
        priority: document.getElementById("tf-priority").value,
        dueDate: document.getElementById("tf-due").value || null,
        phaseId: document.getElementById("tf-phase").value || null,
      };
      if (isEdit) {
        Object.assign(t, payload);
      } else {
        p.tasks.push(normalizeTask({ id: uid("task"), ...payload }));
      }
      p.updatedAt = nowIso();
      cacheDataLocally();
      closeOverlay();
      render();
      toast(isEdit ? "Task updated" : "Task created", "success");
    };
  }

  // ---------- Wire UI ----------
  function wire() {
    document.getElementById("btn-settings").onclick = openSettings;
    document.getElementById("btn-load").onclick = loadFromGithub;
    document.getElementById("btn-save").onclick = saveToGithub;
    document.getElementById("btn-export").onclick = exportJson;
    document.getElementById("btn-import").onclick = () => document.getElementById("import-file").click();
    document.getElementById("import-file").onchange = (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importJsonFile(f);
      e.target.value = "";
    };
    document.getElementById("btn-new-project").onclick = () => openProjectForm(null);
    document.getElementById("search").oninput = (e) => {
      state.search = e.target.value;
      if (state.view === "list") renderList();
    };
    document.getElementById("show-archived").onchange = (e) => {
      state.showArchived = e.target.checked;
      if (state.view === "list") renderList();
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    wire();
    bootstrap();
  });
})();
