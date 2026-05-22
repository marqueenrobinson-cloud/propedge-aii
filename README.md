# PropEdge AI — Vercel Deployment Guide

## Project Structure
```
propedge/
├── api/
│   ├── claude.js      ← Anthropic API route
│   ├── openai.js      ← OpenAI API route
│   └── gemini.js      ← Google Gemini API route
├── src/
│   ├── main.jsx       ← React entry point
│   └── App.jsx        ← Main app with model switcher
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

---

## Step 1 — Get Your API Keys

| Provider | URL | Free Tier |
|---|---|---|
| **Claude** | console.anthropic.com → API Keys | $5 free credits |
| **GPT-4** | platform.openai.com → API Keys | $5 free credits |
| **Gemini** | aistudio.google.com → Get API Key | Generous free tier |

---

## Step 2 — Push to GitHub

1. Create a free account at **github.com**
2. Create a new repository called `propedge-ai`
3. In your terminal, inside the `propedge/` folder:

```bash
git init
git add .
git commit -m "Initial PropEdge AI"
git remote add origin https://github.com/YOUR_USERNAME/propedge-ai.git
git push -u origin main
```

---

## Step 3 — Deploy to Vercel

1. Go to **vercel.com** and sign up (free)
2. Click **"Add New Project"**
3. Import your `propedge-ai` GitHub repo
4. Vercel auto-detects Vite — click **Deploy**

---

## Step 4 — API Keys (Bring-Your-Own-Key)

This app is set up so each user enters their own API key in the browser — it's saved
locally on their device and used for their requests. **You do not need to add any
environment variables in Vercel.** Just deploy and share the link; users paste their
own key on first use (and can swap it with the "change key" button).

Optional fallback: if you'd rather cover the cost for everyone, you *can* set these
in Vercel (Settings → Environment Variables), and the app will use them when a user
hasn't entered their own key. Most setups leave these blank.

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | (optional) your Claude API key |
| `OPENAI_API_KEY` | (optional) your OpenAI API key |
| `GEMINI_API_KEY` | (optional) your Google Gemini API key |

---

## Step 5 — Done! 🎉

Your app is live at: `https://propedge-ai.vercel.app`

The app also lets users enter their own API keys in the browser (stored locally) — so you can share it without exposing yours.

---

## How the Model Switcher Works

- Click **✦ Claude**, **◆ GPT-4o**, or **✸ Gemini** in the top bar
- Each model maintains **separate conversation history** per agent
- Red dot (●) means that model needs an API key
- All API calls go through secure serverless functions — keys are never exposed in frontend code

---

## Local Development

To run the full app (chat actually works) on your computer, use the Vercel CLI —
it runs the frontend AND the `/api` serverless functions together:

```bash
npm install
npm i -g vercel
vercel dev
```

Then open the URL it prints (usually http://localhost:3000).

Note: plain `npm run dev` only serves the frontend and skips the `/api` routes, so
chat requests will fail with a connection error. Use `vercel dev` instead.

For full plain-language deploy steps, see **DEPLOY.md**.
