import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { canDealPvpDamage, calculateDamage } from './src/game/combatRules.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

export interface ServerPlayer {
  id: string;
  room: string;
  displayName: string;
  tunicColor: string;
  isGuest: boolean;
  level: number;
  swordTier: number;
  armorTier: number;
  weaponKind: 'sword' | 'mace' | 'bow' | 'spear';
  attackPower: number;
  defense: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  anim: 'idle' | 'run' | 'jump' | 'slash' | 'heavy' | 'dash' | 'ko';
  pvpEnabled: boolean;
  partyCode: string;
  pvpKills: number;
  lastAttackAt: number;
  ws: WebSocket;
}

const rooms = new Map<string, Map<string, ServerPlayer>>();

function sanitizeRoomCode(raw: unknown): string {
  if (typeof raw !== 'string') return 'ANA-DUNYA';
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 16);
  return cleaned.length >= 2 ? cleaned : 'ANA-DUNYA';
}

function serializePlayer(p: ServerPlayer) {
  return {
    id: p.id,
    displayName: p.displayName,
    tunicColor: p.tunicColor,
    isGuest: p.isGuest,
    level: p.level,
    swordTier: p.swordTier,
    armorTier: p.armorTier,
    weaponKind: p.weaponKind,
    x: p.x,
    y: p.y,
    z: p.z,
    yaw: p.yaw,
    hp: p.hp,
    maxHp: p.maxHp,
    anim: p.anim,
    pvpEnabled: p.pvpEnabled,
    partyCode: p.partyCode,
    pvpKills: p.pvpKills,
  };
}

function broadcastToRoom(roomCode: string, payload: unknown, excludeId?: string) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const msg = JSON.stringify(payload);
  for (const player of room.values()) {
    if (excludeId && player.id === excludeId) continue;
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(msg);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    let totalPlayers = 0;
    for (const r of rooms.values()) totalPlayers += r.size;
    res.json({ ok: true, rooms: rooms.size, players: totalPlayers });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let currentPlayer: ServerPlayer | null = null;

    ws.on('message', (rawBuf) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(rawBuf.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = data.type;

      if (type === 'join') {
        const id =
          typeof data.id === 'string' && data.id.length >= 2
            ? data.id.slice(0, 64)
            : `p_${Math.random().toString(36).slice(2, 10)}`;
        const roomCode = sanitizeRoomCode(data.room);

        // Leave previous room if re-joining
        if (currentPlayer) {
          const prevRoom = rooms.get(currentPlayer.room);
          if (prevRoom) {
            prevRoom.delete(currentPlayer.id);
            broadcastToRoom(currentPlayer.room, {
              type: 'player:left',
              id: currentPlayer.id,
            });
            if (prevRoom.size === 0) rooms.delete(currentPlayer.room);
          }
        }

        if (!rooms.has(roomCode)) {
          rooms.set(roomCode, new Map());
        }
        const room = rooms.get(roomCode)!;

        const maxHp = Math.max(80, Math.min(25000, Number(data.maxHp) || 100));
        const hp = Math.max(1, Math.min(maxHp, Number(data.hp) || maxHp));
        const validWeapons = ['sword', 'mace', 'bow', 'spear'] as const;
        const weaponKind =
          typeof data.weaponKind === 'string' &&
          (validWeapons as readonly string[]).includes(data.weaponKind)
            ? (data.weaponKind as ServerPlayer['weaponKind'])
            : 'sword';

        currentPlayer = {
          id,
          room: roomCode,
          displayName:
            typeof data.displayName === 'string'
              ? data.displayName.trim().slice(0, 24) || 'Gezgin'
              : 'Gezgin',
          tunicColor:
            typeof data.tunicColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(data.tunicColor)
              ? data.tunicColor
              : '#2b74c7',
          isGuest: Boolean(data.isGuest),
          level: Math.max(1, Math.min(500, Number(data.level) || 1)),
          swordTier: Math.max(1, Math.min(10, Number(data.swordTier) || 1)),
          armorTier: Math.max(1, Math.min(10, Number(data.armorTier) || 1)),
          weaponKind,
          attackPower: Math.max(8, Math.min(3500, Number(data.attackPower) || 16)),
          defense: Math.max(0, Math.min(1500, Number(data.defense) || 4)),
          x: Number(data.x) || 0,
          y: Number(data.y) || 1.15,
          z: Number(data.z) || 12,
          yaw: Number(data.yaw) || 0,
          hp,
          maxHp,
          anim: 'idle',
          pvpEnabled: data.pvpEnabled !== false,
          partyCode:
            typeof data.partyCode === 'string'
              ? data.partyCode.trim().toUpperCase().slice(0, 12)
              : '',
          pvpKills: Math.max(0, Number(data.pvpKills) || 0),
          lastAttackAt: 0,
          ws,
        };

        room.set(id, currentPlayer);

        // Send initial room snapshot to the joining player
        const snapshot = Array.from(room.values()).map(serializePlayer);
        ws.send(
          JSON.stringify({
            type: 'room:state',
            room: roomCode,
            selfId: id,
            players: snapshot,
          })
        );

        // Broadcast join to others in room
        broadcastToRoom(
          roomCode,
          {
            type: 'player:joined',
            player: serializePlayer(currentPlayer),
          },
          id
        );
        return;
      }

      if (!currentPlayer) return;
      const room = rooms.get(currentPlayer.room);
      if (!room) return;

      if (type === 'state') {
        currentPlayer.x = Math.max(-310, Math.min(310, Number(data.x) || currentPlayer.x));
        currentPlayer.y = Math.max(-10, Math.min(80, Number(data.y) || currentPlayer.y));
        currentPlayer.z = Math.max(-310, Math.min(310, Number(data.z) || currentPlayer.z));
        currentPlayer.yaw = Number(data.yaw) || 0;
        if (typeof data.anim === 'string') {
          currentPlayer.anim = data.anim as ServerPlayer['anim'];
        }
        if (typeof data.level === 'number') {
          currentPlayer.level = Math.max(1, Math.min(500, Math.round(data.level)));
        }
        if (typeof data.swordTier === 'number') {
          currentPlayer.swordTier = Math.max(1, Math.min(10, Math.round(data.swordTier)));
        }
        if (typeof data.armorTier === 'number') {
          currentPlayer.armorTier = Math.max(1, Math.min(10, Math.round(data.armorTier)));
        }
        if (
          typeof data.weaponKind === 'string' &&
          (data.weaponKind === 'sword' ||
            data.weaponKind === 'mace' ||
            data.weaponKind === 'bow' ||
            data.weaponKind === 'spear')
        ) {
          currentPlayer.weaponKind = data.weaponKind;
        }
        if (typeof data.attackPower === 'number') {
          currentPlayer.attackPower = Math.max(8, Math.min(3500, data.attackPower));
        }
        if (typeof data.defense === 'number') {
          currentPlayer.defense = Math.max(0, Math.min(1500, data.defense));
        }
        if (typeof data.maxHp === 'number') {
          currentPlayer.maxHp = Math.max(80, Math.min(25000, Math.round(data.maxHp)));
        }
        if (typeof data.hp === 'number') {
          currentPlayer.hp = Math.max(0, Math.min(currentPlayer.maxHp, Math.round(data.hp)));
        }
        if (typeof data.pvpEnabled === 'boolean') {
          currentPlayer.pvpEnabled = data.pvpEnabled;
        }
        if (typeof data.partyCode === 'string') {
          currentPlayer.partyCode = data.partyCode.trim().toUpperCase().slice(0, 12);
        }
        if (typeof data.tunicColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(data.tunicColor)) {
          currentPlayer.tunicColor = data.tunicColor;
        }
        if (typeof data.displayName === 'string') {
          const clean = data.displayName.trim().slice(0, 24);
          if (clean.length >= 2) currentPlayer.displayName = clean;
        }
        if (typeof data.pvpKills === 'number') {
          currentPlayer.pvpKills = Math.max(0, Math.round(data.pvpKills));
        }

        broadcastToRoom(
          currentPlayer.room,
          {
            type: 'player:updated',
            player: serializePlayer(currentPlayer),
          },
          currentPlayer.id
        );
        return;
      }

      if (type === 'attack') {
        const now = Date.now();
        if (now - currentPlayer.lastAttackAt < 240) return;
        currentPlayer.lastAttackAt = now;

        const isHeavy = Boolean(data.heavy);
        const reach = isHeavy ? 4.6 : 3.4;
        const multiplier = isHeavy ? 1.65 : 1.0;

        broadcastToRoom(
          currentPlayer.room,
          {
            type: 'player:attack',
            id: currentPlayer.id,
            heavy: isHeavy,
            x: currentPlayer.x,
            y: currentPlayer.y,
            z: currentPlayer.z,
            yaw: currentPlayer.yaw,
          },
          currentPlayer.id
        );

        // Server-authoritative PvP hit detection against other players in the room
        for (const target of room.values()) {
          if (target.id === currentPlayer.id || target.hp <= 0) continue;
          const dx = target.x - currentPlayer.x;
          const dz = target.z - currentPlayer.z;
          const dist = Math.hypot(dx, dz);
          if (dist > reach) continue;

          const check = canDealPvpDamage(currentPlayer, target);
          if (!check.allowed) continue;

          const isCrit = Math.random() < 0.16;
          const dmg = calculateDamage(currentPlayer.attackPower, target.defense, multiplier, isCrit);
          target.hp = Math.max(0, target.hp - dmg);

          const invDist = dist > 0.01 ? 1 / dist : 1;
          const knock = isHeavy ? 7.5 : 4.2;

          broadcastToRoom(currentPlayer.room, {
            type: 'pvp:hit',
            attackerId: currentPlayer.id,
            attackerName: currentPlayer.displayName,
            targetId: target.id,
            targetName: target.displayName,
            damage: dmg,
            isCrit,
            isHeavy,
            targetHp: target.hp,
            knockX: dx * invDist * knock,
            knockZ: dz * invDist * knock,
          });

          if (target.hp <= 0) {
            currentPlayer.pvpKills += 1;
            broadcastToRoom(currentPlayer.room, {
              type: 'pvp:kill',
              killerId: currentPlayer.id,
              killerName: currentPlayer.displayName,
              victimId: target.id,
              victimName: target.displayName,
              rewardXp: 85 + target.level * 15,
              rewardGold: 45 + target.level * 10,
            });
          }
        }
        return;
      }

      if (type === 'chat') {
        const text = typeof data.text === 'string' ? data.text.trim().slice(0, 160) : '';
        if (!text) return;
        broadcastToRoom(currentPlayer.room, {
          type: 'chat:msg',
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          senderId: currentPlayer.id,
          senderName: currentPlayer.displayName,
          tunicColor: currentPlayer.tunicColor,
          text,
          ts: Date.now(),
        });
      }
    });

    ws.on('close', () => {
      if (!currentPlayer) return;
      const room = rooms.get(currentPlayer.room);
      if (room) {
        room.delete(currentPlayer.id);
        broadcastToRoom(currentPlayer.room, {
          type: 'player:left',
          id: currentPlayer.id,
        });
        if (room.size === 0) {
          rooms.delete(currentPlayer.room);
        }
      }
      currentPlayer = null;
    });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Yayla & Zirve server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server boot error:', err);
  process.exit(1);
});
