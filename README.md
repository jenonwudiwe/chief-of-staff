# Chief of Staff — deploy guide

This is your Chief of Staff app, packaged to run on Vercel. Follow the steps in order. Nothing here needs coding.

There are three short parts: get an API key, put the code on GitHub, deploy on Vercel.

---

## Part A — Get your Anthropic API key (about 5 minutes)

The Pre-reads and Process-a-meeting features call the AI. On your own site that needs an API key. This is a pay-as-you-go key, billed separately from your Claude.ai subscription. The calls are cheap (the app uses the small, fast model by default).

1. Go to **console.anthropic.com** and sign in, or create an account.
2. Open **Settings → Billing** and add a payment method with a little credit (a few dollars lasts a long time at this usage).
3. Open **API keys → Create Key**. Give it a name like "chief-of-staff".
4. Copy the key. It starts with `sk-ant-`. Keep it somewhere safe and private. You will paste it into Vercel later. Do not share it or put it in the code.

---

## Part B — Put the code on GitHub (about 5 minutes)

GitHub is just an online home for the files. Vercel reads the code from there.

1. Unzip the file I gave you. You now have a folder called **chief-of-staff** containing `index.html`, `package.json`, `vite.config.js`, a `src` folder, and an `api` folder.
2. Go to **github.com** and sign in, or create a free account.
3. Click the **+** at the top right → **New repository**.
4. Name it **chief-of-staff**. You can mark it Private. Leave everything else as is and click **Create repository**.
5. On the next page, click the link **"uploading an existing file"**.
6. Open the unzipped **chief-of-staff** folder on your computer. Select everything **inside** it (the files plus the `src` and `api` folders) and drag it all onto the GitHub upload area. Important: upload the contents, not the outer folder itself.
7. Wait for the files to finish uploading, then click **Commit changes**.

---

## Part C — Deploy on Vercel (about 3 minutes)

1. Go to **vercel.com** and sign in with your account.
2. Click **Add New → Project**.
3. Find your **chief-of-staff** repository and click **Import**. If GitHub isn't connected yet, Vercel will ask you to connect it once.
4. Vercel will detect it as a **Vite** app. Leave the build settings exactly as they are.
5. Open the **Environment Variables** section and add one:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your `sk-ant-...` key from Part A
   - Click **Add**.
   - (Optional) Add a second one — Name `CLAUDE_MODEL`, Value `claude-haiku-5-5` — if you ever want to change which model runs. For higher-quality summaries you can set it to `claude-sonnet-5-5` instead; it costs a bit more.
6. Click **Deploy**. Wait about a minute.
7. You'll get a link like **chief-of-staff-xxxx.vercel.app**. Open it. The app loads, and Pre-reads and Process-a-meeting now work because the key is in place.

### Give it a cleaner web address
In Vercel, open your project → **Settings → Domains**, or rename the project, to get **chief-of-staff.vercel.app** (if that exact name is taken, Vercel will suggest a close one).

---

## Making changes later

1. Tell me the change; I'll send you updated file(s).
2. In your GitHub repo, open the file to replace, click the pencil to edit, or re-upload the new file the same way as Part B step 5–7.
3. Vercel notices the change and rebuilds automatically. In a minute or two the live site updates.

---

## Good to know

- **Where your data lives:** on the deployed site, your data is saved in your browser on the device you're using (it isn't on a shared server). Use the same browser to keep your data; clearing browser data will reset it.
- **Cost:** each Pre-read or Process run uses your Anthropic key and costs a small amount. The default model is the cheapest one.
- **If the AI buttons show an error:** it's almost always the API key. Check that `ANTHROPIC_API_KEY` is set in Vercel (Settings → Environment Variables), then redeploy (Deployments → the latest one → Redeploy). If the error mentions the model, set `CLAUDE_MODEL` to a current model name from docs.claude.com.
