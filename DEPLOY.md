# Deploy — Lumax Engineering Management

Static SPA (no build). Host `index.html`, `styles.css`, `app.js`, and `data/` from the repo root.

## Host ranking (private `Lumax-Energy` org repo)

1. **Prefer Cloudflare Pages (free)** — best fit for a **private** org repo on a free plan.
2. **Render Static Site** — solid free alternative; connect the GitHub repo and publish the root.
3. **Netlify Free** — **do not use for this private org repo.** Free Netlify does **not** support Git-connected **private org** repos (Netlify **Pro** required). Drop/deploy of a public zip is unrelated; do not recommend Netlify Free for Lumax-Energy private.
4. **GitHub Pages** — only if the repo is made **public**. On GitHub Free, **private repo + Pages** fails (API **422**). Public + Pages from `main` / `/` works.

## Security caveat (any public URL)

The app stores each engineer’s PAT in **browser `localStorage` only** and calls the GitHub API from the client. On any hosted URL, that token is **extractable** from the browser (DevTools / XSS). Rules:

- Each engineer uses **their own fine-grained PAT** (Contents Read/Write + Metadata on this repo).
- **Never** embed or commit a shared token.
- Prefer short-lived / rotatable tokens; revoke if leaked.

---

## A) Cloudflare Pages (recommended)

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorize Cloudflare for the **Lumax-Energy** org and select **`lumax-eng-mgmt`**.
3. Build settings:
   - **Production branch:** `main`
   - **Build command:** _(leave empty)_
   - **Build output directory:** `/` (repo root)
4. **Save and Deploy**. Open the `*.pages.dev` URL.
5. Optional: custom domain under the project’s **Custom domains**.
6. In the app: **Settings** → owner `Lumax-Energy` / repo `lumax-eng-mgmt` → paste **your** PAT → **Load**.

Re-deploys on every push to `main`.

---

## B) Render Static Site (#2)

1. Sign in at [dashboard.render.com](https://dashboard.render.com) → **New** → **Static Site**.
2. Connect GitHub; select **`Lumax-Energy/lumax-eng-mgmt`** (grant org access if prompted).
3. Settings:
   - **Branch:** `main`
   - **Root directory:** _(blank / repo root)_
   - **Build command:** _(empty)_ or `true`
   - **Publish directory:** `.` (root)
4. Create the site; open the `*.onrender.com` URL.
5. App **Settings** → PAT → **Load** (same as above).

---

## C) GitHub Pages (public repo only)

1. Repo **Settings → General → Danger Zone** → change visibility to **Public** (org admin), **or** keep private and use Cloudflare/Render instead.
2. **Settings → Pages** → Source: **Deploy from a branch** → Branch **`main`** / folder **`/` (root)** → Save.
3. Wait for the Pages build; open `https://<org>.github.io/lumax-eng-mgmt/` (or the custom Pages URL).
4. Private + Free plan → expect **422** / Pages disabled — use Cloudflare or Render.

---

## Local smoke check

```bash
npx serve .
# or: python3 -m http.server 8080
```

Avoid `file://` (seed JSON fetch + GitHub API CORS issues).
