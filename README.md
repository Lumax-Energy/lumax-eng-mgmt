# Lumax Energy — Engineering Management (v2.2)

Single-page static app for engineering project & task tracking. No build step. Works on **GitHub Pages** or any static host.

**v2.2** UX pass: Dashboard labels (Engineer / Structure type / Municipal sign-off / Conformance letter / SCL), **Create SC Letter** Word (.docx) download (`LMX-SCL-YYYY-NNN`), Tasks structure-type filter, phase drag-and-drop, Excel navy header polish. Preserves GitHub Load/Save JSON sync (null-safe `wire()` from #3). Legacy `LMX-SCF-*` refs remain readable.

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

### Commercial / SCL project fields

| Field | Notes |
|-------|--------|
| `poNumber` | Purchase order |
| `popReference` | POP reference |
| `invoiceNumber` | INV — required to create SC Letter |
| `address` | Site / project address — required |
| `contactPerson` | Required |
| `projectType` | Selectable list (Settings) + free text |
| `structureTypes[]` | Multi-select from Settings list (Tasks filter + Structure type chip) |
| `engineeringSignOff` | Displayed as **Municipal sign-off** (+ at/by) |
| `conformanceStatus` | `none` \| `pending` \| `approved` |
| `conformanceRef` | `LMX-SCL-YYYY-NNN` (legacy `LMX-SCF-*` still shown) |
| `conformanceIssuedAt` | ISO timestamp |
| `conformanceCert` | Snapshot at issue (for stable print / Word export) |

**Create SC Letter** (project detail): enabled only when INV + contact + address are set **and** current phase name is **Done** (case-insensitive). `sclGate(project)` recomputes on every detail render (including after project form Save). Allocates next ref from `settings.scfYear` / `settings.scfSeq`, sets status approved, downloads a Word `.docx` matching the Structural Compliance Form layout. Checklist + toast list blockers when disabled.

Engineer block defaults live in `settings.engineerDefaults` (editable in Settings) — SAMPLE uses fictional values only.

### Dashboard view chips

Clients · **Engineer** · **Structure type** · **Municipal sign-off** · **Conformance letter** · **SCL ready** · **SCL issued** · **Commercial gaps** · **Missing PO/POP/INV** · **Pending site investigation**

(Removed: Missing INV, Missing address.)

### Task types

| Type id | Label | Extra fields |
|---------|-------|----------------|
| `rdn` | RDN | Ref #, raised-by, response due |
| `design_check` | Design check | Checker, calc/drawing ref |
| `drawing` | Drawing | Drawing #, rev |
| `eng_task` | Eng task | Discipline |

Tasks view includes a **Structure type** dropdown (project `structureTypes` / task override).

### Excel export

Workbook sheets with shared navy header helper (`#0B1F3A`, white bold, freeze, autofilter, thin borders, approx widths):

1. Dashboard (title row) · 2. All Tasks · 3. **Projects** · 4. **SCL** · 5. By Assignee · 6. By Client · 7. By Project · 8. RDN · 9. Design Checks · 10. Drawings · 11. Eng Tasks · 12. Summary

UI filters scope All Tasks + type sheets only; Dashboard / Projects / SCL / Summary / By-* use the full dataset.

## Multi-engineer sync

- **Load** — `GET` `data/projects.json` (reads SHA).
- **Save** — `PUT` with current SHA. Conflicts show toast with **Load & retry** (does not silently overwrite).
- PAT stored **only in localStorage** — never in `projects.json`.
- `normalizeData()` upgrades older payloads (adds Done phase, commercial fields, SCL settings keys `scfYear`/`scfSeq`).
- `wire()` is null-safe for missing header buttons (preserves #3 fix).

## Sample data

`data/projects.json` ships with **≥4 clearly labeled SAMPLE** projects (fictional Demo clients / DEMO-* codes), multiple assignees, ≥2 in Site investigation, varied types (PV GM SteelCore, Rooftop ballast, SAT, Carport), mixed task types, one project **ready to create** (INV+contact+address+Done), and one **already issued** (may show legacy `LMX-SCF-2026-001`). Safe to edit or delete after onboarding.

## Security reminders

- Do not commit PATs, passwords, or `.env` files.
- Do not share another engineer’s credentials; each person uses their own PAT.
- Treat `data/projects.json` as shared business data — coordinate Saves to avoid overwriting each other’s work.
- SAMPLE seed must stay fictional (no real client / engineer PII).
