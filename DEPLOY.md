# PropEdge AI — How to Put It Online (Plain-Step Guide)

This guide gets your app from a folder on your computer to a real, working website
that anyone can open. No coding needed — just clicking and copying.

It takes about 10–15 minutes the first time. You'll do it once, and after that any
change is automatic.

---

## First, the one thing to understand

Your app has two halves:

- **The part you see** (the chat screen) — this is what shows up in a preview.
- **The part that does the work** (the `/api` folder) — this is what actually talks
  to Claude, GPT, and Gemini. It only runs on a real web host.

That second half is why the preview showed a "Connection error." A preview can show
the screen but can't run the worker. **Vercel runs both halves**, which is why we use it.

You picked "bring your own key," so **you do NOT need to enter any API keys into
Vercel.** Each person who uses the app pastes their own key once, right in the app.

---

## What you need before you start

- The `propedge` folder (unzipped — not the .zip).
- A free **GitHub** account → github.com
- A free **Vercel** account → vercel.com (sign up using your GitHub account; it's easier)

---

## Step 1 — Put your project on GitHub

GitHub is where your code lives online. Vercel reads from it.

The easiest way (no terminal, all clicks):

1. Go to **github.com** and sign in.
2. Click the **+** in the top-right corner → **New repository**.
3. Name it `propedge-ai`. Leave everything else as-is. Click **Create repository**.
4. On the next page, click the link that says **"uploading an existing file"**.
5. Open your `propedge` folder on your computer, select everything inside it, and
   drag it all into the browser window.
   - Important: drag the *contents* (the `api` folder, `src` folder, `index.html`,
     etc.) — not the outer `propedge` folder itself.
6. Wait for the upload to finish, then click **Commit changes** (the green button).

Done. Your code is now on GitHub.

---

## Step 2 — Deploy on Vercel

1. Go to **vercel.com** and sign in (use "Continue with GitHub").
2. Click **Add New…** → **Project**.
3. You'll see your `propedge-ai` repository in the list. Click **Import** next to it.
4. Vercel will recognize it's a Vite app automatically. **Don't change any settings.**
   - You can skip the "Environment Variables" section entirely — you don't need it.
5. Click **Deploy**.
6. Wait about a minute. When it finishes, you'll see a celebration screen with a
   preview image. Click it (or the **Visit** button) to open your live app.

Your app now has a real web address, something like:
`https://propedge-ai.vercel.app`

That link is yours to share, bookmark, or open on any phone or computer.

---

## Step 3 — Use it

1. Open your `vercel.app` link.
2. Pick a model up top (Claude, GPT, or Gemini). A red dot means it needs a key.
3. Paste your API key for that model when the bar appears, and hit save.
4. Type a question to an agent and send. It should reply.

Where to get keys (each has a free starting credit):

| Model  | Get a key at                                  |
|--------|-----------------------------------------------|
| Claude | console.anthropic.com → API Keys              |
| GPT    | platform.openai.com → API Keys                |
| Gemini | aistudio.google.com → Get API Key             |

Your key is saved in your own browser, so you only paste it once per device. The
"change key" button up top lets you swap it later if needed.

---

## Making changes later

Any time you update a file on GitHub (or re-upload), Vercel automatically rebuilds
and updates your live site within a minute. You never have to redeploy by hand.

---

## If something goes wrong

- **"Connection error / API endpoint isn't responding"** → You're looking at a
  preview, not your `vercel.app` link. Open the real Vercel link.
- **"API key was rejected"** → The key was typed wrong or has expired. Click
  "change key" and paste a fresh one.
- **The whole page is blank on Vercel** → Make sure in Step 1 you uploaded the
  *contents* of the folder, so that `index.html` and the `api` folder sit at the top
  level of the repository, not inside an extra `propedge` folder.

---

## Optional: testing on your own computer first

You do **not** need this to go live — it's only if you want to tinker locally.

Plain `npm run dev` will NOT work fully, because it skips the `/api` worker (this is
the same reason the preview failed). Instead:

```bash
npm install
npm i -g vercel
vercel dev
```

`vercel dev` runs both halves together at http://localhost:3000, so the chat actually
works locally.
