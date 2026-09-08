# Lumax Energy — Engineering Management (v2.1)

Single-page static app for engineering project & task tracking. No build step. Works on **GitHub Pages** or any static host.

**v2.1** adds commercial fields (PO / POP / INV / address / contact / project type), terminal **Done** phase, **Structural Compliance Form (SCF)** issue + printable HTML preview (`LMX-SCF-YYYY-NNN`), richer dashboard chips, and Excel Projects + SCF sheets. GitHub Load/Save JSON sync is preserved (null-safe `wire()` from #3).

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
| `index.html` | App shell (nav + SheetJS CDN) |
| `styles.css` | UI styles (ClickUp-ish navy Lumax) |
| `app.js` | App logic (vanilla JS) |
| `data/projects.json` | Shared data (synced via GitHub API) |
| `DEPLOY.md` | Go-live host ranking + Cloudflare / Render / Pages steps |

## Information architecture

**Top nav:** Dashboard · Projects · Tasks · search · Load / Save / Export Excel / Import / Settings

### Default phases (new projects, editable)

Intake · Concept · Design · Check · Drawings · Site investigation · Site/Construction support · Close-out · **Done**

**Current phase** = first phase with open tasks; if none, `activePhaseId` when set; else **Done** when present and (no tasks / all done); else last phase (never Intake by default).

### Commercial / SCF project fields

| Field | Notes |
|-------|--------|
| `poNumber` | Purchase order |
| `popReference` | POP reference |
| `invoiceNumber` | INV — required to issue SCF |
| `address` | Site / project address — required to issue |
| `contactPerson` | Required to issue |
| `projectType` | Selectable list (Settings) + free text |
| `structureTypes[]` | Multi-select from Settings list |
| `engineeringSignOff` | Eng sign-off flag + at/by |
| `conformanceStatus` | `none` \| `pending` \| `approved` |
| `conformanceRef` | `LMX-SCF-YYYY-NNN` (never bare `008`) |
| `conformanceIssuedAt` | ISO timestamp |
| `conformanceCert` | Snapshot at issue (for stable print preview) |

**Issue conformance** (project detail): enabled only when INV + contact + address are set **and** current phase name is **Done** (case-insensitive). Allocates next ref from `settings.scfYear` / `settings.scfSeq`, sets status approved, opens printable HTML SCF preview. Blocked state shows a checklist; missing fields are listed in a toast via **Missing fields…** / issue attempt.

Engineer block defaults live in `settings.engineerDefaults` (editable in Settings) — SAMPLE uses fictional values only.

### Dashboard view chips

Clients · Assignees · By project type · Eng sign-off · Has conformance · **SCF ready** · **SCF issued** · **Commercial gaps** · **Missing PO/POP/INV** · Missing INV · Missing address · Site investigation

### Task types

| Type id | Label | Extra fields |
|---------|-------|----------------|
| `rdn` | RDN | Ref #, raised-by, response due |
| `design_check` | Design check | Checker, calc/drawing ref |
| `drawing` | Drawing | Drawing #, rev |
| `eng_task` | Eng task | Discipline |

### Excel export

Workbook sheets (header freeze + autofilter):

1. Dashboard · 2. All Tasks · 3. **Projects** (PO/POP/INV/Address/Contact/Type/Conformance ref) · 4. **SCF** · 5. By Assignee · 6. By Client · 7. By Project · 8. RDN · 9. Design Checks · 10. Drawings · 11. Eng Tasks · 12. Summary

UI filters scope All Tasks + type sheets only; Dashboard / Projects / SCF / Summary / By-* use the full dataset.

## Multi-engineer sync

- **Load** — `GET` `data/projects.json` (reads SHA).
- **Save** — `PUT` with current SHA. Conflicts show toast with **Load & retry** (does not silently overwrite).
- PAT stored **only in localStorage** — never in `projects.json`.
- `normalizeData()` upgrades older payloads (adds Done phase, commercial fields, SCF settings).
- `wire()` is null-safe for missing header buttons (preserves #3 fix).

## Sample data

`data/projects.json` ships with **≥4 clearly labeled SAMPLE** projects (fictional Demo clients / DEMO-* codes), multiple assignees, ≥2 in Site investigation, varied types (PV GM SteelCore, Rooftop ballast, SAT, Carport), mixed task types, one project **ready to issue** (INV+contact+address+Done), and one **already issued** as `LMX-SCF-2026-001`. Safe to edit or delete after onboarding.

## Security reminders

- Do not commit PATs, passwords, or `.env` files.
- Do not share another engineer’s credentials; each person uses their own PAT.
- Treat `data/projects.json` as shared business data — coordinate Saves to avoid overwriting each other’s work.
- SAMPLE seed must stay fictional (no real client / engineer PII).
