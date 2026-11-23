export interface RemotePlayerState {
  id: string;
  displayName: string;
  tunicColor: string;
  isGuest: boolean;
  level: number;
  swordTier: number;
  armorTier: number;
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
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  tunicColor: string;
  text: string;
  ts: number;
  system?: boolean;
}

export interface PvpHitEvent {
  attackerId: string;
  attackerName: string;
  targetId: string;
  targetName: string;
  damage: number;
  isCrit: boolean;
  isHeavy: boolean;
  targetHp: number;
  knockX: number;
  knockZ: number;
}

export interface PvpKillEvent {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  rewardXp: number;
  rewardGold: number;
}

export interface MultiplayerCallbacks {
  onRoomState: (room: string, selfId: string, players: RemotePlayerState[]) => void;
  onPlayerJoined: (player: RemotePlayerState) => void;
  onPlayerUpdated: (player: RemotePlayerState) => void;
  onPlayerLeft: (id: string) => void;
  onPlayerAttack: (ev: { id: string; heavy: boolean; x: number; y: number; z: number; yaw: number }) => void;
  onPvpHit: (ev: PvpHitEvent) => void;
  onPvpKill: (ev: PvpKillEvent) => void;
  onChat: (msg: ChatMessage) => void;
  onConnectionChange: (connected: boolean) => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private callbacks: MultiplayerCallbacks;
  private joinPayload: Record<string, unknown> | null = null;
  private reconnectTimer: number | null = null;
  private closedManually = false;

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(joinPayload: Record<string, unknown>) {
    this.closedManually = false;
    this.joinPayload = joinPayload;
    this.openSocket();
  }

  private openSocket() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.callbacks.onConnectionChange(true);
        if (this.joinPayload) {
          ws.send(JSON.stringify({ type: 'join', ...this.joinPayload }));
        }
      };

      ws.onmessage = (event) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(event.data)) as Record<string, unknown>;
        } catch {
          return;
        }

        switch (msg.type) {
          case 'room:state':
            this.callbacks.onRoomState(
              String(msg.room || 'ANA-DUNYA'),
              String(msg.selfId || ''),
              (msg.players as RemotePlayerState[]) || []
            );
            break;
          case 'player:joined':
            if (msg.player) this.callbacks.onPlayerJoined(msg.player as RemotePlayerState);
            break;
          case 'player:updated':
            if (msg.player) this.callbacks.onPlayerUpdated(msg.player as RemotePlayerState);
            break;
          case 'player:left':
            if (typeof msg.id === 'string') this.callbacks.onPlayerLeft(msg.id);
            break;
          case 'player:attack':
            this.callbacks.onPlayerAttack({
              id: String(msg.id || ''),
              heavy: Boolean(msg.heavy),
              x: Number(msg.x) || 0,
              y: Number(msg.y) || 0,
              z: Number(msg.z) || 0,
              yaw: Number(msg.yaw) || 0,
            });
            break;
          case 'pvp:hit':
            this.callbacks.onPvpHit(msg as unknown as PvpHitEvent);
            break;
          case 'pvp:kill':
            this.callbacks.onPvpKill(msg as unknown as PvpKillEvent);
            break;
          case 'chat:msg':
            this.callbacks.onChat(msg as unknown as ChatMessage);
            break;
        }
      };

      ws.onclose = () => {
        this.callbacks.onConnectionChange(false);
        if (!this.closedManually) {
          this.reconnectTimer = window.setTimeout(() => this.openSocket(), 2500);
        }
      };

      ws.onerror = () => {
        // handled via onclose reconnect
      };
    } catch {
      this.callbacks.onConnectionChange(false);
    }
  }

  public switchRoom(newRoom: string, updatedJoinPayload: Record<string, unknown>) {
    this.joinPayload = { ...updatedJoinPayload, room: newRoom };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'join', ...this.joinPayload }));
    } else {
      this.openSocket();
    }
  }

  public sendState(payload: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'state', ...payload }));
    }
  }

  public sendAttack(heavy: boolean) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'attack', heavy }));
    }
  }

  public sendChat(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'chat', text }));
    }
  }

  public disconnect() {
    this.closedManually = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }
}
