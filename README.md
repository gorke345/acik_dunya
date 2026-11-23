# Yayla & Zirve — 3D Open-World PvP & Exploration RPG

A real-time multiplayer 3D open-world action RPG built with **Three.js**, **React**, **TypeScript**, **WebSockets**, and **Firebase**. Explore sculpted highland landforms with friends, level up your warrior, forge stronger gear, and engage in open-world PvP duels.

## Features

- **Sculpted 3D Open World (4 Distinct Landforms)**:
  - **Zümrüt Çayır (Emerald Meadow)** — Safe sanctuary campfire hub (*Taş Meydan*), healing plaza, and the *Yayla Watchtower*.
  - **Altın Ova (Golden Plains)** — Sunlit steppe featuring ancient stone arches and an open PvP duel ring.
  - **Bozdağ Zirvesi (Grey Mountain Peaks)** — Climbable alpine trails, pine forests, granite cliffs, and a snow-capped Summit Altar.
  - **Gümüş Göl & Vadi (Silver Lake & Valley)** — Shimmering lake shore, sandy beaches, and a wooden pier.
- **Guest Login & Persistent User Accounts**:
  - **User Login (Google / Firebase Auth + Firestore)** — Permanently saves character level, XP, gold, sword/armor/agility upgrade tiers, PvP kills, tunic color, discovered biomes, and last world coordinates across sessions.
  - **Guest Login** — Jump straight into the world with a custom nickname and cloak color (session-only, with an in-game option to link a Google account and save progress).
- **Real-Time Multiplayer & Friend Exploration**:
  - Room-based WebSocket server (`ws` + Express) with custom room codes and one-click invite link sharing (`?room=CODE`).
  - **Open PvP / Peaceful Toggle** and **Party Alliance Code** (prevents friendly fire so friends can explore together safely).
  - Server-validated PvP combat, knockbacks, kill feed, live room scoreboard, and world chat.
- **Combat, Progression & Autonomous Challengers**:
  - Light combo slash, heavy cleave shockwave, dodge dash with invulnerability frames, variable-height jump, hitstop, camera shake, pooled particles, and procedural Web Audio SFX.
  - Upgrade **Sword Power**, **Armor Durability**, and **Wind Step (Agility)** using earned gold.
  - Three distinct AI challenger archetypes (**Meadow Skirmisher**, **Plains Lancer**, **Mountain Warden**) with telegraphed attacks so solo exploration remains engaging.

## Controls

| Input | Action |
| --- | --- |
| `W A S D` / Arrow Keys | Move |
| Mouse Drag / `Q` `E` | Rotate Camera |
| Mouse Wheel | Zoom Camera |
| Left Click / `J` | Light Sword Slash |
| Right Click / `K` | Heavy Cleave Attack |
| `Shift` | Dodge Dash |
| `Space` | Jump |
| `U` (or `E` at Campfire) | Open Upgrade & Discovery Panel |
| `F` / `T` | Friends, Room, PvP & World Chat |
| `M` | Mute / Unmute Audio |
| `P` / `Esc` | Pause / Close Modal |

## Tech Stack

- **3D Engine**: Three.js (procedural heightmap terrain, `InstancedMesh` foliage/particles, `RoomEnvironment` PBR reflections, procedural canvas textures & Web Audio SFX)
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite
- **Multiplayer Backend**: Node.js, Express, `ws` WebSocket server
- **Auth & Cloud Persistence**: Firebase Authentication (Google Sign-In) & Cloud Firestore with hardened security rules (`firestore.rules`)

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation & Local Development

```bash
# Install dependencies
npm install

# Start the full-stack dev server (Express + WebSocket + Vite on port 3000)
npm run dev
```

Open `http://localhost:3000` in your browser. To invite friends locally or on a deployed host, share the URL with a room parameter such as `/?room=KARTAL`.

### Scripts

```bash
npm run dev     # Start Express + WebSocket + Vite dev server on port 3000
npm run build   # Build the frontend bundle into dist/
npm start       # Run the production Express + WebSocket server
npm run lint    # TypeScript type-check (tsc --noEmit)
```

### Running Unit Tests

```bash
npx tsx --test src/game/worldMath.test.ts src/game/combatRules.test.ts
```

## Deployment & Firebase Notes

- **Hosting**: Because multiplayer uses a persistent WebSocket server (`server.ts`), deploy on a Node.js-capable host (e.g. Cloud Run, Render, Railway, or Fly.io) rather than static-only hosting.
- **Firebase Authentication**: When deploying to a custom domain, add your domain under **Firebase Console → Authentication → Settings → Authorized domains** so Google Sign-In works seamlessly.
- **Security Rules**: Review and deploy `firestore.rules` to your Firebase project before sharing publicly.
