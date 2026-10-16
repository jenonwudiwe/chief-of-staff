# Chief of Staff — deploy guide (v2, fixed)

This version is flattened so the important files sit at the top level and can't be dropped during upload. If you deployed the earlier version and it failed with "failed to resolve import /src/main.jsx", that was because the `src` folder didn't upload. This fixes it.

Three parts: get an API key, put the code on GitHub, deploy on Vercel.

---

## Part A — Get your Anthropic API key

The Pre-reads and Process-a-meeting features call the AI, which needs a key. Pay-as-you-go, separate from your Claude.ai subscription, and cheap at this usage.

1. Go to **console.anthropic.com**, sign in or create an account.
2. **Settings → Billing** → add a payment method with a little credit.
3. **API keys → Create Key** → name it → copy it. It starts with `sk-ant-`. Keep it private.

---

## Part B — Put the code on GitHub

If you already made the `chief-of-staff` repo for the first attempt, you can reuse it — just upload these new files over the old ones (GitHub replaces files with the same name). If not, create a new repo first (**+** → New repository → name it `chief-of-staff` → Create).

1. Unzip the file I gave you. Inside you'll see these files at the top level: `index.html`, `main.jsx`, `App.jsx`, `package.json`, `vite.config.js`, `.gitignore`, `README.md`, and one `api` folder.
2. In your repo, click **Add file → Upload files**.
3. Select **all** of those top-level files and drag them in. Then **also drag the `api` folder** in (or see the note below if the folder won't upload). Click **Commit changes**.
4. **Check the repo page.** You should see, listed in the repo: `App.jsx`, `main.jsx`, `index.html`, `package.json`, `vite.config.js`, and an `api` folder. If `App.jsx` or `main.jsx` is missing, the upload dropped them — upload again. This check is the thing that was wrong last time.

**If the `api` folder won't upload** (some browsers skip folders): in the repo click **Add file → Create new file**. In the filename box type exactly `api/claude.js` (typing the slash makes the folder). Paste the contents of the `api/claude.js` file from the unzipped folder into the editor, then **Commit changes**.

---

## Part C — Deploy on Vercel

If you already imported this repo on the first attempt, skip to step 4, then just redeploy (Deployments → latest → Redeploy) after the new files are committed.

1. Go to **vercel.com**, sign in.
2. **Add New → Project**.
3. Import your **chief-of-staff** repo (connect GitHub once if asked).
4. It detects a **Vite** app. Leave the build settings as they are.
5. Open **Environment Variables** and add: Name `ANTHROPIC_API_KEY`, Value your `sk-ant-...` key → **Add**. (Optional: Name `CLAUDE_MODEL`, Value `claude-haiku-5-5`.)
6. Click **Deploy**. Wait about a minute. Open the `...vercel.app` link.

---

## If a build still fails

Read the first red error line. The common ones:
- **"failed to resolve import ... main.jsx"** → `main.jsx` or `App.jsx` isn't in the repo. Re-upload them (Part B step 4).
- **AI buttons error, page otherwise fine** → the API key isn't set, or the `api` folder didn't upload. Confirm `ANTHROPIC_API_KEY` in Vercel and that `api/claude.js` is in the repo, then redeploy.

## Good to know

- **Your data** saves in the browser on the device you use. Same browser keeps your data.
- **Cost:** each Pre-read or Process run uses your API key; the default model is the cheapest.
- **Updates:** replace a file in GitHub; Vercel rebuilds automatically.
