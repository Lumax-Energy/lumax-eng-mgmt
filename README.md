# Lumax Energy — Engineering Management (v2.3)

Single-page static app for engineering project & task tracking. No build step. Works on **GitHub Pages** or any static host.

**v2.3** Executive / SCL pass: Researchy **6 KPI** traffic-light dashboard (Open projects · Overdue work · Ready for SC letter · SC letters issued · Commercial gaps · Municipal sign-off pending), Excel Dashboard sheet `KPI | Value | Light | Note`, **Structural Conformance Letter** label, structure-type defaults (Carport H-Max … Custom), editable task + project types in Settings, `municipalSignOff` (`pending` | `approved` | `n/a`), **Undo Create SC Letter** (void + keep sequence advanced). Preserves GitHub Load/Save SHA-safe sync, Create SC Letter gate, phase DnD, null-safe `wire()`, Excel navy polish.

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
| `municipalSignOff` | `pending` \| `approved` \| `n/a` (migrates from legacy `engineeringSignOff` boolean) |
| `conformanceStatus` | `none` \| `pending` \| `approved` |
| `conformanceRef` | `LMX-SCL-YYYY-NNN` (legacy `LMX-SCF-*` still shown) |
| `conformanceIssuedAt` | ISO timestamp |
| `conformanceCert` | Snapshot at issue (for stable print / Word export) |
| `sclUndoSnapshot` | Pre-issue fields for **Undo Create SC Letter** |
| `sclHistory` | Issued / voided letter audit trail |

**Create SC Letter** (project detail): enabled only when INV + contact + address are set **and** current phase name is **Done** (case-insensitive). Allocates next ref from `settings.scfYear` / `settings.scfSeq`, sets status approved, downloads a Word `.docx` matching the Structural Compliance Form sample. **Undo Create SC Letter** restores the pre-issue snapshot and voids the letter record without reusing the sequence number.

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

Tasks view includes a **Structure type** dropdown (project `structureTypes` / task override).

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

## Sample data

`data/projects.json` ships with **≥4 clearly labeled SAMPLE** projects (fictional Demo clients / DEMO-* codes), multiple assignees, ≥2 in Site investigation, varied structure types, mixed task types, one project **ready to create** (INV+contact+address+Done), and one **already issued**. Safe to edit or delete after onboarding.

## Security reminders

- Do not commit PATs, passwords, or `.env` files.
- Do not share another engineer’s credentials; each person uses their own PAT.
- Treat `data/projects.json` as shared business data — coordinate Saves to avoid overwriting each other’s work.
- SAMPLE seed must stay fictional (no real client / engineer PII).
