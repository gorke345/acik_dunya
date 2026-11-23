import React, { useState } from 'react';
import type { ChatMessage, RemotePlayerState } from '../services/multiplayer';

interface FriendsRoomModalProps {
  roomCode: string;
  partyCode: string;
  pvpEnabled: boolean;
  selfId: string;
  selfName: string;
  selfLevel: number;
  selfKills: number;
  remotePlayers: RemotePlayerState[];
  messages: ChatMessage[];
  connected: boolean;
  onSwitchRoom: (newRoom: string) => void;
  onUpdatePartyCode: (code: string) => void;
  onTogglePvp: (enabled: boolean) => void;
  onSendChat: (text: string) => void;
  onClose: () => void;
}

export const FriendsRoomModal: React.FC<FriendsRoomModalProps> = ({
  roomCode,
  partyCode,
  pvpEnabled,
  selfId,
  selfName,
  selfLevel,
  selfKills,
  remotePlayers,
  messages,
  connected,
  onSwitchRoom,
  onUpdatePartyCode,
  onTogglePvp,
  onSendChat,
  onClose,
}) => {
  const [roomInput, setRoomInput] = useState(roomCode);
  const [partyInput, setPartyInput] = useState(partyCode);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomCode);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    onSendChat(trimmed);
    setChatInput('');
  };

  return (
    <div
      className="fixed inset-0 z-30 bg-[#090f14]/72 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Arkadaşlar, Oda ve PvP Ayarları"
    >
      <div className="w-full max-w-2xl bg-[#121c24] border border-[#d6b166]/55 shadow-2xl p-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f6e8c6]">
              Arkadaşlar, Dünya Odası &amp; PvP
            </h2>
            <p className="text-xs text-[#a9b7c4]">
              Aktif Oda: <span className="font-mono font-bold text-[#f0c766]">{roomCode}</span> ·{' '}
              <span>{connected ? 'Canlı Bağlantı' : 'Yeniden bağlanıyor...'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Arkadaşlar penceresini kapat"
            className="px-3 py-1.5 bg-[#1b2934] hover:bg-[#253745] text-xs font-bold text-[#e6dec9] cursor-pointer"
          >
            Kapat
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          {/* Left Column: Room Sharing, Party Alliance & PvP Toggle */}
          <div className="space-y-3">
            <div className="bg-[#0c141a] border border-white/10 p-3 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#b6c2cd]">
                Arkadaşlarınla Aynı Dünyada Gez
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  maxLength={16}
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                  aria-label="Oda Kodu"
                  className="flex-1 px-2.5 py-1.5 bg-[#142029] border border-[#d6b166]/30 text-xs font-mono text-[#f7f0df]"
                />
                <button
                  type="button"
                  onClick={() => onSwitchRoom(roomInput)}
                  className="px-3 py-1.5 bg-[#c9963b] hover:bg-[#dba646] text-[#0e151c] font-bold text-xs cursor-pointer"
                >
                  Katıl
                </button>
              </div>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="w-full py-1.5 px-3 bg-[#1a2936] hover:bg-[#223647] border border-[#65b5e0]/40 text-xs font-semibold text-[#b8e2f8] cursor-pointer"
              >
                {copied ? 'Davet Bağlantısı Kopyalandı!' : 'Arkadaş Davet Linkini Kopyala'}
              </button>
            </div>

            <div className="bg-[#0c141a] border border-white/10 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#f7f0df]">Açık Dünya PvP Modu</div>
                  <div className="text-[11px] text-[#9eb0c0]">
                    Kapalıyken diğer oyuncularla barışçıl gezersin.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onTogglePvp(!pvpEnabled)}
                  className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${
                    pvpEnabled
                      ? 'bg-[#c43b3b] text-white'
                      : 'bg-[#2f8f5b] text-white'
                  }`}
                >
                  {pvpEnabled ? 'PvP AÇIK' : 'BARIŞÇIL'}
                </button>
              </div>

              <div className="pt-2 border-t border-white/10">
                <label htmlFor="party-code-input" className="block text-[11px] font-bold text-[#b6c2cd] mb-1">
                  Arkadaş İttifak / Grup Kodu (Dost Ateşi Kapalı)
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="party-code-input"
                    type="text"
                    maxLength={12}
                    value={partyInput}
                    onChange={(e) => setPartyInput(e.target.value.toUpperCase())}
                    placeholder="Örn: KARTAL"
                    className="flex-1 px-2.5 py-1.5 bg-[#142029] border border-white/15 text-xs font-mono text-[#f7f0df]"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdatePartyCode(partyInput)}
                    className="px-3 py-1.5 bg-[#2a5c80] hover:bg-[#34719c] text-white font-bold text-xs cursor-pointer"
                  >
                    Uygula
                  </button>
                </div>
              </div>
            </div>

            {/* Online Warriors in Room */}
            <div className="bg-[#0c141a] border border-white/10 p-3">
              {(() => {
                const otherPlayers = remotePlayers.filter((p) => p.id !== selfId);
                return (
                  <>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#b6c2cd] mb-2">
                      Odadaki Savaşçılar ({otherPlayers.length + 1})
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      <div className="flex items-center justify-between text-xs bg-[#16232e] px-2.5 py-1.5">
                        <span className="font-bold text-[#f6e8c6]">
                          {selfName} <span className="text-[10px] text-[#7be098]">(Sen)</span>
                        </span>
                        <span className="text-[11px] text-[#c7d3de] tabular-nums">
                          Sv.{selfLevel} · {selfKills} Zafer
                        </span>
                      </div>
                      {otherPlayers.map((p) => {
                        const isAlly =
                          partyCode && p.partyCode.toUpperCase() === partyCode.toUpperCase();
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between text-xs bg-[#111b23] px-2.5 py-1.5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 shrink-0"
                                style={{ backgroundColor: p.tunicColor }}
                              />
                              <span className="truncate font-semibold text-[#e6eff7]">
                                {p.displayName}
                              </span>
                              {isAlly && (
                                <span className="text-[10px] font-bold text-[#65d9ff]">GRUP</span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#a7b6c4] tabular-nums shrink-0">
                              Sv.{p.level} · {p.pvpKills} Zafer
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Right Column: Live Room Chat */}
          <div className="bg-[#0c141a] border border-white/10 p-3 flex flex-col h-[310px] md:h-auto">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#b6c2cd] mb-2">
              Dünya Sohbeti
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mb-2.5 text-xs">
              {messages.length === 0 ? (
                <div className="text-[#788a99] italic py-4 text-center">
                  Henüz mesaj yok. Arkadaşlarına selam ver!
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="leading-snug">
                    {m.system ? (
                      <span className="text-[#e5be67] font-semibold">{m.text}</span>
                    ) : (
                      <>
                        <span className="font-bold mr-1.5" style={{ color: m.tunicColor || '#e3b55a' }}>
                          {m.senderName}:
                        </span>
                        <span className="text-[#e8e3d5] break-words">{m.text}</span>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleChatSubmit} className="flex gap-1.5">
              <input
                type="text"
                maxLength={160}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Mesaj yaz..."
                aria-label="Sohbet mesajı"
                className="flex-1 px-2.5 py-1.5 bg-[#142029] border border-white/15 text-xs text-[#f7f0df] focus:outline-none focus:border-[#e3b55a]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#c9963b] hover:bg-[#dda746] text-[#0e151c] font-bold text-xs cursor-pointer"
              >
                Gönder
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
