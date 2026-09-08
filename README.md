# Lumax Energy — Engineering Management (v2)

Single-page static app for engineering project & task tracking. No build step. Works on **GitHub Pages** or any static host.

**v2** adds: Dashboard · Projects · Tasks nav, configurable statuses, typed tasks (including standalone), richer default phases, and Excel export (SheetJS). GitHub Load/Save JSON sync is unchanged.

## Go live (5 steps)

1. Invite engineers with at least **Write** on this repo.
2. Each person creates **their own** PAT (classic `repo`, or fine-grained Contents Read/Write + Metadata on this repo only).
3. Enable **GitHub Pages**: branch `main`, folder `/` (root) — or run `npx serve .` / `python3 -m http.server 8080` locally. Avoid `file://`.
4. Open the Pages (or local) URL → **Settings** → confirm owner/repo → paste PAT → **Load**.
5. Sample project **DEMO-001 / Demo** is **fictional SAMPLE data** — edit or delete after onboarding. Never commit real PATs.

For host ranking and concrete Cloudflare / Render / Pages steps, see **[DEPLOY.md](./DEPLOY.md)**.

## Files

| Path | Purpose |
|------|---------|
| `index.html` | App shell (nav + SheetJS CDN) |
| `styles.css` | UI styles (ClickUp-ish navy Lumax) |
| `app.js` | App logic (vanilla JS) |
| `data/projects.json` | Shared data (synced via GitHub API) |
| `DEPLOY.md` | Go-live host ranking + Cloudflare / Render / Pages steps |

## v2 information architecture

**Top nav:** Dashboard · Projects · Tasks · search · Load / Save / Export Excel / Export JSON / Import / Settings

- **Dashboard** — open/overdue counts; open by status; by type; overdue/due-7d by assignee; projects at risk; my work; recent activity (links into filtered Tasks).
- **Projects** — card grid (client / code / SO / open·blocked·overdue). Drill-in: phase tabs + kanban board (columns = statuses).
- **Tasks** — flat backlog across projects + standalone; filter type · status · assignee · project · overdue; list or board.

### Default phases (new projects, editable per project)

Intake · Concept · Design · Check · Drawings · Site/Construction support · Close-out

### Default task statuses (global, editable in Settings)

Backlog · To do · Doing · In check · Blocked · Done  

Board columns follow this list (order = column order).

### Task types (required)

| Type id | Label | Extra fields |
|---------|-------|----------------|
| `rdn` | RDN | Ref #, raised-by, response due |
| `design_check` | Design check | Checker, calc/drawing ref |
| `drawing` | Drawing | Drawing #, rev |
| `eng_task` | Eng task | Discipline |

Shared fields: title, description, assignee, status, priority, due, phase, **project (nullable = standalone)**, blocked reason, done date.

### Excel export

One-click **Export Excel** (SheetJS CDN) downloads a single workbook with sheets in this order:

1. **Dashboard** — KPIs; open by status / type / assignee / client / project (always **full** dataset)
2. **All Tasks** — flat task rows (**filter-scoped** when UI filters/search are active)
3. **Projects** — code, name, client, SO, counts, at-risk (**full**)
4. **By Assignee** — all tasks sorted by assignee (**full**)
5. **By Client** — all tasks sorted by client (**full**)
6. **By Project** — all tasks sorted by project (**full**)
7. **RDN** — type split (**filter-scoped**)
8. **Design Checks** — type split (**filter-scoped**)
9. **Drawings** — type split (**filter-scoped**)
10. **Eng Tasks** — type split (**filter-scoped**)
11. **Summary** — type × status matrix + tallies (**full**)

Every sheet freezes the header row and enables autofilter. Empty sheets are still included. A toast notes when export is filter-scoped. **Export JSON** remains for backup/sync.

## Prefer Pages or a local static server

Opening `index.html` via `file://` often breaks:

- Fetching `./data/projects.json` (browser restrictions)
- Calling the GitHub API (CORS)

**Recommended:** GitHub Pages from `main` `/`, or `npx serve .` / `python3 -m http.server 8080`.

## Multi-engineer setup

### 1. Invite collaborators

Repo **Settings → Collaborators** (or org team). At least **Write** so engineers can update `data/projects.json` via the Contents API.

### 2. Personal Access Tokens (PAT)

**Never share passwords.** Each person uses **their own** PAT.

- Classic: scope **`repo`**
- Fine-grained: this repo, **Contents** Read/Write + **Metadata** Read

In the app: **Settings** → owner/repo + PAT. The PAT is stored **only in localStorage** — it is **never** written into `data/projects.json`.

### 3. Load / Save sync

- **Load** — `GET` `data/projects.json` (reads SHA).
- **Save** — `PUT` with current SHA (optimistic concurrency). Message: `Update engineering projects data`.
- If SHA is missing (never Loaded), Save fetches file metadata only to obtain the SHA — it does **not** replace on-screen data with remote. You may be asked to confirm if remote differs.
- Conflicts: GitHub rejects the write — **Load**, merge carefully, then **Save** again. The app does **not** silently refresh SHA on conflict and overwrite.
- A local cache of the last loaded data is kept in `localStorage` as a backup.
- `normalizeData()` upgrades v1 → v2 (maps old `todo`/`doing`/`done` strings to status ids; flattens nested project tasks into the top-level `tasks` array).

### 4. Offline Export / Import

- **Export JSON** downloads the current dataset.
- **Import** replaces the in-app dataset from a JSON file (then Save to GitHub when ready).
- **Export Excel** is the primary spreadsheet hand-off.

## Sample data

`data/projects.json` ships with a clearly labeled **SAMPLE** project (fictional Demo client / DEMO-001) plus one standalone SAMPLE RDN. Safe to edit or delete after onboarding.

## Security reminders

- Do not commit PATs, passwords, or `.env` files.
- Do not share another engineer’s credentials; each person uses their own PAT.
- Treat `data/projects.json` as shared business data — coordinate Saves to avoid overwriting each other’s work.
