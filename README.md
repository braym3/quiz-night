# Quiz Night! 🥳

This is a real-time, interactive web-based quiz application built with **React** and **Firebase**. It uses **Node.js** as the development environment and build tool.

## Features

### Question types
Text input (with fuzzy matching - typos and "the"-prefixes count, the host sees a "close" badge to overrule), multiple choice, true/false, image questions, ordering (drag to reorder), music (song/artist/decade with partial credit), NYT-style Connections, logo wall, **Closest Wins** (nearest-number tiebreaker with a number line on the TV), and **Guess Who** (players secretly answer a prompt in the lobby - e.g. "worst film you secretly love?" - and it becomes a whodunnit round, generated automatically).

### Party features
- **Emoji reactions** float across the presenter screen (throttled to 1/sec per player)
- **Intro title-cards** on the TV as each player joins the lobby
- **Lobby poll** - players predict tonight's winner; results show on the welcome screen
- **Live answer pile** - after answering, players watch friends' avatars pop in as they lock in
- **Streak toasts** - 3+ correct in a row gets celebrated on the big screen
- **Awards ceremony** before the podium: Fastest Finger ⚡, Hot Streak 🔥, Confidently Wrong 🤡, The Overthinker 🐢, and the Wooden Spoon 🥄 - computed from real answer data
- **Roast lines & custom waiting messages** - configurable per quiz in the builder
- **TV sound** - countdown ticks, reveal stings, leaderboard risers, podium fanfare (Web Audio, mute toggle bottom-right)

### Quizmaster tools
- Auto-scoring with one-tap guard, speed-bonus support, and per-player score history
- Answer clustering when moderating ("koala ×4 - Accept all")
- Host-only notes per question, on-deck preview of what's next
- Per-round auto-start timers, pause/resume, keyboard shortcuts
- Quiz builder with question/round banks, media library, themes (8), import/export, duplication, and reordering of rounds and questions

### Under the hood
Real-time sync via Firebase RTDB, 8 visual themes with per-theme effects, Framer Motion animations, wake locks so screens don't sleep mid-round, PWA manifest (add to home screen), error boundaries, and mobile-first player UI.

## Setup

### 1. Firebase project
Create a project in the [Firebase Console](https://console.firebase.google.com) with a **Realtime Database** and **Storage** enabled, then register a web app to get your config.

### 2. Environment variables
Copy `.env.example` to `.env` and fill in your Firebase config values.

### 3. Install & run
```bash
npm install
npm start
```

### 4. Deploy the database & storage rules (required)
The app writes to paths that the security rules must allow (`liveGame/reactions`, `liveGame/poll`, `liveGame/lobbyAnswers`, per-player `history`/`streak`). Deploy the rules in this repo whenever they change:

```bash
npm install -g firebase-tools   # one-time
firebase login                  # one-time
firebase deploy --only database,storage
```

Run this from the project root (this folder) - `firebase.json` and `.firebaserc` point the CLI at the right project and rule files.

**No CLI? Use the console instead:** Firebase Console → Realtime Database → Rules → paste the contents of `database.rules.json` → Publish (and Storage → Rules → paste `storage.rules`).

## Deploying the app

The app is a static build, hosted on Vercel (`vercel.json` handles the SPA rewrite). Pushing to the connected git branch redeploys automatically. To build by hand:

```bash
npm run build
```

## Running a quiz night

1. **Build** a quiz in the quizmaster view (`/?role=master` → Manage Quizzes) and hit **Activate**.
2. **TV**: open `/presenter` on the big screen - it shows a QR code for joining (and keeps it in the corner through round 1 for latecomers).
3. **Players** scan the QR, pick an avatar, and while waiting can vote in the winner poll and answer the Guess Who prompt (if the quiz has one).
4. **Run it** from your phone or laptop: start rounds, reveal answers, tap **Auto-score** after each reveal (this is what pushes points + history to players' phones and powers the awards).
5. The quiz ends with the awards ceremony and podium. **Restart quiz** clears answers, streaks, and history for a rematch.

### Tips
- Add **roast lines** and **host notes** in the builder - that's where the personality lives.
- Set an **auto timer** per round so the clock starts itself with each question.
- A **Guess Who** round needs no questions written - just set the round type and a prompt; questions generate from lobby answers when you start the round.
- Fuzzy matching accepts near-misses automatically; use the **-5** quick button if it was too generous, or **Accept all** on a cluster if it was too strict.
