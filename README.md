# Lumax Energy — Engineering Management

Single-page static app for engineering project & task tracking. No build step. Works on **GitHub Pages** or any static host.

## Go live (5 steps)

1. Invite engineers with at least **Write** on this repo.
2. Each person creates **their own** PAT (classic `repo`, or fine-grained Contents Read/Write + Metadata on this repo only).
3. Enable **GitHub Pages**: branch `main`, folder `/` (root) — or run `npx serve .` / `python3 -m http.server 8080` locally. Avoid `file://`.
4. Open the Pages (or local) URL → **Settings** → confirm owner/repo → paste PAT → **Load**.
5. Sample project **DEMO-001 / Demo Client** is **fictional SAMPLE data** — edit or delete after onboarding. Never commit real PATs.


## Files

| Path | Purpose |
|------|---------|
| `index.html` | App shell |
| `styles.css` | UI styles |
| `app.js` | App logic (vanilla JS) |
| `data/projects.json` | Shared project/task data (synced via GitHub API) |

## Prefer Pages or a local static server

Opening `index.html` via `file://` often breaks:

- Fetching `./data/projects.json` (browser restrictions)
- Calling the GitHub API (CORS)

**Recommended:**

1. Enable **GitHub Pages** from branch `main`, folder `/` (root).
2. Or run a local static server, e.g. `npx serve .` or `python3 -m http.server 8080` from this directory.

## Multi-engineer setup

### 1. Invite collaborators

1. Open the repo on GitHub (default: `Lumax-Energy/lumax-eng-mgmt`).
2. **Settings → Collaborators** (or org team access).
3. Invite each engineer with at least **Write** access so they can update `data/projects.json` via the Contents API.

### 2. Personal Access Tokens (PAT)

**Never share passwords.** Each person creates and uses **their own** PAT.

**Option A — Classic token**

- GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Scope: **`repo`** (full control of private repositories; required for private repos)

**Option B — Fine-grained token**

- Fine-grained PAT on this repository only
- Permissions:
  - **Contents:** Read and Write
  - **Metadata:** Read-only

In the app: **Settings** → paste owner/repo (defaults `Lumax-Energy` / `lumax-eng-mgmt`) and your PAT. The PAT is stored **only in localStorage** in your browser — it is **never** written into `data/projects.json`, never committed, and must never be logged or pasted into chat.

When a PAT is set, the header shows the authenticated user from `GET /user`.

### 3. Load / Save sync

- **Load** — `GET` `data/projects.json` via GitHub Contents API (reads SHA).
- **Save** — `PUT` with the current SHA (optimistic concurrency). Message: `Update engineering projects data`.
- Conflicts: Save uses the SHA from your last successful **Load**/**Save**. If someone else saved first, GitHub rejects the write — **Load**, merge carefully, then **Save** again. The app does **not** silently refresh SHA and overwrite.
- A local cache of the last loaded data is kept in `localStorage` as a backup.

### 4. Offline Export / Import

- **Export** downloads the current data as `projects.json`.
- **Import** replaces the in-app dataset from a JSON file (then Save to GitHub when ready).

### 5. Enable GitHub Pages

1. Repo **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **`main`** / folder **`/` (root)**
4. Open the Pages URL; use Load/Save from there (same origin is not required for the GitHub API when using a PAT from the browser — if CORS blocks `file://`, Pages avoids that class of issue for loading seed JSON).

## Data model (summary)

- **Projects:** client name, project name, project code, drawing numbers, sales order number, extensible custom fields, phases (default Foundation / Building / Inspection — editable), archive flag.
- **Tasks:** title, description, assignee, status (`todo` | `doing` | `done`), optional due date & priority; linked to project and optional phase.

## Sample data

`data/projects.json` ships with a clearly labeled **SAMPLE** project: fictional client **Demo Client**, code **DEMO-001**, one sales order, several drawings, and phases with a few tasks. Safe to edit or delete after onboarding.

## Security reminders

- Do not commit PATs, passwords, or `.env` files.
- Do not share another engineer’s credentials; each person uses their own PAT.
- Treat `data/projects.json` as shared business data — coordinate Saves to avoid overwriting each other’s work.
