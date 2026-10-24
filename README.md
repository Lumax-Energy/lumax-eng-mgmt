# Lumax Energy — Engineering Management (v2.4.1)

Single-page static app for engineering project & task tracking. No build step. Works on **GitHub Pages** or any static host.

**v2.4.1** Tasks **Hide completed** actually hides the Completed list (no full-view rebuild, cache-bust `app.js?v=2.4.1`). Label shows count. Default on for first visit.

**v2.4** Mark as Done (status → Done + completed date = click day, Africa/Johannesburg) · SC Letter **SO No.** under Invoice No. · SC Letter **Structural Design** / **Foundation Design** blocks (Designed + Checked).

**v2.3** Executive / SCL pass: Researchy **6 KPI** traffic-light dashboard (Open projects · Overdue work · Ready for SC letter · SC letters issued · Commercial gaps · Municipal sign-off pending), Excel Dashboard sheet `KPI | Value | Light | Note`, **Structural Conformance Letter** label, structure-type defaults (Carport H-Max … Custom), editable task + project types in Settings, `municipalSignOff` (`pending` | `approved` | `n/a`), **Undo Create SC Letter** (restore snapshot; decrement seq only if last issued, else void). Preserves GitHub Load/Save SHA-safe sync, Create SC Letter gate, phase DnD, null-safe `wire()`, Excel navy polish.

## Go live (5 steps)

1. Invite engineers with at least **Write** on this repo.
2. Each person creates **their own** PAT (classic `repo`, or fine-grained Contents Read/Write + Metadata on this repo only).
3. Enable **GitHub Pages**: branch `main`, folder `/` (root) — or run `npx serve .` / `python3 -m http.server 8080` locally. Avoid `file://`.
4. Open the Pages (or local) URL → **Settings** → confirm owner/repo → paste PAT → **Load**.
5. SAMPLE projects are **fictional** — edit or delete after onboarding. Never commit real PATs. Do not paste real client PII into SAMPLE seed.

For host ranking and concrete Cloudflare / Render / Pages steps, see **[DEPLOY.md](./DEPLOY.md)**.

## Files

| Path | Purpose |
|------|---------|
| `index.html` | App shell (nav + vendor SheetJS style + JSZip) |
| `styles.css` | UI styles (ClickUp-ish navy Lumax) |
| `app.js` | App logic (vanilla JS) |
| `vendor/` | `xlsx-js-style` + `jszip` (offline-friendly) |
| `data/projects.json` | Shared data (synced via GitHub API) |
| `DEPLOY.md` | Go-live host ranking + Cloudflare / Render / Pages steps |

## Information architecture

**Top nav:** Dashboard · Projects · Tasks · search · Load / Save / Export Excel / Import / Settings

### Default phases (new projects, editable)

Intake · Concept · Design · Check · Drawings · Site investigation · Site/Construction support · Close-out · **Done**

**Current phase** = first phase with open tasks; if none, `activePhaseId` when set; else **Done** when present and (no tasks / all done); else last phase (never Intake by default).

Drag task cards onto **phase tabs** to change `phaseId`, or onto status columns to change status.

**Mark as Done** on a task card, task list row, or task editor sets status to **Done** and writes **completed date** (`doneDate`) to today in `Africa/Johannesburg`. Clicking again refreshes the completed date to today.

### Commercial / SCL project fields

| Field | Notes |
|-------|--------|
| `poNumber` | Purchase order |
| `popReference` | POP reference |
| `invoiceNumber` | INV — required to create SC Letter |
| `salesOrderNumber` | SO No. — shown on the SC Letter under Invoice No. |
| `structuralDesign` | `{ designed, checked }` — SC Letter block under Project Details |
| `foundationDesign` | `{ designed, checked }` — SC Letter block under Project Details |
| `address` | Site / project address — required |
| `contactPerson` | Required |
| `projectType` | Selectable list (Settings) + free text |
| `structureTypes[]` | Multi-select from Settings list (Tasks filter + Structure type chip) |
| `municipalSignOff` | `pending` \| `approved` \| `n/a` (migrates from legacy `engineeringSignOff` boolean) |
| `conformanceStatus` | `none` \| `pending` \| `approved` |
| `conformanceRef` | `LMX-SCL-YYYY-NNN` (legacy `LMX-SCF-*` still shown) |
| `conformanceIssuedAt` | ISO timestamp |
| `conformanceCert` | Snapshot at issue (for stable print / Word export) |
| `sclUndoSnapshot` | Pre-issue fields for **Undo Create SC Letter** |
| `sclHistory` | Issued / voided letter audit trail |

**Create SC Letter** (project detail): enabled only when INV + contact + address are set **and** current phase name is **Done** (case-insensitive). Allocates next ref from `settings.scfYear` / `settings.scfSeq`, sets status approved, downloads a Word `.docx` matching the Structural Compliance Form sample. **Undo Create SC Letter** restores the pre-issue snapshot. If the voided `LMX-SCL-YYYY-NNN` is the last allocated number (`scfSeq - 1`), `scfSeq` is decremented; otherwise the ref is marked voided in `sclHistory` / `settings.voidedLetters` and the sequence is left unchanged.

Engineer block defaults live in `settings.engineerDefaults` (editable in Settings) — SAMPLE uses fictional values only.

### Executive dashboard (6 KPIs)

Click a traffic-light card to filter:

1. Open projects  
2. Overdue work  
3. Ready for SC letter  
4. SC letters issued  
5. Commercial gaps  
6. Municipal sign-off pending  

Chips also include: Clients · Engineer · Structure type · Structural Conformance Letter · Site investigation.

### Task types

Defaults (editable in Settings — add / edit / remove): RDN · Design check · Drawing · Eng task · Site visit · Calculation · Review · Coordination · Other.

Load, Save and the task form never change a task's type or status. Removing a type only takes it out of the new-task list, for every engineer: its tasks keep it and show it as "(retired)". Removing a status that tasks still use asks first (with counts per engineer in team view) and moves those tasks only on OK: tasks on a removed done status go to the first remaining done status and keep their completed date, the others go to the first remaining open status and lose it. A type or status that is not in the team list still gets its own board column, filter entry and Excel sheet/column. While an engineer's own tasks still use a type or status the team list dropped, their file keeps its name (and a status's colour and done/open category) in `settings.retiredTaskTypes` / `settings.retiredTaskStatuses`. Those are for display only: they are never offered for new tasks and Save all never copies them back into the team list.

Tasks view includes a **Structure type** dropdown (project `structureTypes` / task override).

**Hide completed** (Tasks filter bar) hides the Completed archive under the open-task list. Open tasks always stay visible. Preference is stored in `localStorage` (`lumax-eng-mgmt-ui`).

### Structure types (defaults)

Carport H-Max · Carport Alu-Max · Carport Econo-Max · Carport Ergo-Max · Carport Ergo+ · GM Steel · GM Alu · SAT tracker · Rooftop ballast · Rooftop flush mount · Custom (+ add more in Settings).

### Excel export

Workbook sheets with shared navy header helper (`#0B1F3A`, white bold, freeze, autofilter, thin borders, approx widths):

1. Dashboard (`KPI | Value | Light | Note` + ops snapshot) · 2. All Tasks · 3. **Projects** · 4. **SCL** · 5. By Assignee · 6. By Client · 7. By Project · 8. RDN · 9. Design Checks · 10. Drawings · 11. Eng Tasks · 12. Summary

UI filters scope All Tasks + type sheets only; Dashboard / Projects / SCL / Summary / By-* use the full dataset.

## Multi-engineer sync

- **Load** — `GET` `data/projects.json` (reads SHA).
- **Save** — `PUT` with current SHA. Conflicts show toast with **Load & retry** (does not silently overwrite).
- PAT stored **only in localStorage** — never in `projects.json`.
- `normalizeData()` upgrades older payloads (Done phase, commercial fields, `municipalSignOff`, SCL settings, task types).
- `wire()` is null-safe for missing header buttons (preserves #3 fix).

### Several tabs in one browser

- Each tab keeps its local copy in one localStorage key, `lumax-eng-mgmt-sync` = `{v, sha, dirty, data, tab, at, id, parent}`, written in a single step. Data, GitHub SHA and the unsaved flag therefore always come from the same tab and moment. The merge base sits in `lumax-eng-mgmt-base` as `{sha, data}` and is used after a reload only if its `sha` matches the snapshot's. Otherwise there is no base, and a Save conflict asks before merging.
- The old keys (`lumax-eng-mgmt-data`, `-sha`, `-dirty`) are moved into the snapshot once at start-up and then removed. The unsaved flag is kept; the old base is dropped.
- When another tab saves or edits:
  - A tab with no unsaved changes takes over that copy ("Updated from another tab").
  - So does a tab whose latest copy the other tab built on.
  - Otherwise the tab shows a banner: *Your data was changed in another tab. Save this tab's changes (they will be merged) or Reload.* Edits are blocked ("Changed in another tab — Save or Reload first."), but **Save** still works and clears the banner. Reload asks first if there are unsaved changes and keeps a backup copy.
- The leader team view, a tab with an open form, and a tab in the middle of Load/Save always show the banner instead of taking over the other copy.

**Manual test checklist (several tabs)**

- [ ] **(a)** Open tabs A and B. In A, edit a task, add a new task and Save. In B, edit a different task, reload B, then Save. GitHub must have A's edit, A's new task and B's edit.
- [ ] **(a′)** Open tabs A and B. In B, open a project's edit form and leave it open. In A, edit a task. B shows the banner. Close B's form: edit buttons are hidden, the *Read-only* badge explains why, and **Save** is still visible. Save in B (the banner clears), then Save in A: A's edit ends up on GitHub.
- [ ] **(b)** Import a JSON file, reload, then Save. The *Remote data differs from this browser…* confirm must appear.
- [ ] **(c)** Change the Engineer ID (new repo), reload, then Save to the new repo. There must be no stale-SHA error (422 / *Merge & retry*).
- [ ] **(d)** With unsaved changes in a tab that shows the banner, click **Reload**. It asks first; Cancel keeps everything as it was.

## Sample data

`data/projects.json` ships with **≥4 clearly labeled SAMPLE** projects (fictional Demo clients / DEMO-* codes), multiple assignees, ≥2 in Site investigation, varied structure types, mixed task types, one project **ready to create** (INV+contact+address+Done), and one **already issued**. Safe to edit or delete after onboarding.

## Security reminders

- Do not commit PATs, passwords, or `.env` files.
- Do not share another engineer’s credentials; each person uses their own PAT.
- Treat `data/projects.json` as shared business data — coordinate Saves to avoid overwriting each other’s work.
- SAMPLE seed must stay fictional (no real client / engineer PII).

## Team setup (one private repo per engineer)

This app repo is **public code only** — never commit real project data here.

| Repo (all private, same owner) | Holds |
|---|---|
| `lumax-eng-mgmt-<engineer-id>` | That engineer's `data/projects.json` |
| `lumax-eng-mgmt-shared` | `team.json` (engineers, leader, soft-lock password hash), `settings.json` (shared statuses/types), `letters.json` (company-wide SC letter numbers) |

- **Settings → Engineer ID** (e.g. `lucian-du-plessis`) selects your repo. It locks after the first Save/Load; the display name can still change.
- One token with Contents read/write on all these repos is shared.
- **Team leader view:** anyone can tick "Team leader view" in Settings, then *Unlock leader view* with the leader password (password is a soft lock, not strong security). Load then reads every engineer's repo; Save writes each repo that changed. Use the Engineer filter to focus on one person.
- **Viewer:** choose Role → Viewer in Settings (no Engineer ID or repo needed), unlock with the leader password, then Load. Everything is read-only; Export Excel and Backup still cover every engineer.
- **Who can edit:** only engineers and team leaders with an Engineer ID whose own repo exists. Leaders without a repo get a read-only team view. Saving without an Engineer ID is blocked (it would otherwise target this public repo).
- Shared lists (statuses, task/project/structure types) can only be edited by the leader.
- SC letter numbers are reserved in `letters.json` before a letter is issued, so two engineers can never get the same number.
