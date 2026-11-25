import React from 'react';
import { PlayerProfileData } from '../game/combatRules';
import { HARBOR_SHIPS, ShipId } from '../game/inventoryData';

interface HarborModalProps {
  profile: PlayerProfileData;
  shipHp: number;
  shipMaxHp: number;
  convoyTier: number;
  convoyGoldNext: number;
  onBuyShip: (shipId: ShipId) => void;
  onSelectShip: (shipId: ShipId) => void;
  onLaunchShip: (shipId: ShipId) => void;
  onRepairShip: () => void;
  onClose: () => void;
}

export const HarborModal: React.FC<HarborModalProps> = ({
  profile,
  shipHp,
  shipMaxHp,
  convoyTier,
  convoyGoldNext,
  onBuyShip,
  onSelectShip,
  onLaunchShip,
  onRepairShip,
  onClose,
}) => {
  const needsRepair = profile.ownedShips.length > 0 && shipHp < shipMaxHp;

  return (
    <div
      className="fixed inset-0 z-30 bg-[#070d12]/78 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Ana Ada Limanı Denizci"
      data-testid="harbor-modal"
    >
      <div className="w-full max-w-xl bg-[#0e1922] border border-[#5cb6e5]/60 shadow-2xl p-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#e6f5ff]">
              Ana Ada Limanı — Liman Denizcisi
            </h2>
            <p className="text-xs text-[#9cb8cc] tabular-nums">
              Okyanus adalarına yelken aç! Altının:{' '}
              <strong className="text-[#f5c95d]">{Math.round(profile.gold)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Liman penceresini kapat"
            className="px-3 py-1.5 bg-[#192a38] hover:bg-[#233a4d] text-xs font-bold text-[#e2edf5] cursor-pointer"
          >
            Kapat
          </button>
        </div>

        {/* Ocean Routes & Trade Convoy Intel */}
        <div className="bg-[#09121a] border border-[#5cb6e5]/30 p-3 mb-3.5 text-xs text-[#b8d0e0] space-y-1">
          <div>
            <strong className="text-[#7fd6ff]">Okyanus Rotaları:</strong> En Kuzeyde dev{' '}
            <span className="text-[#bae6fd] font-semibold">Kuzey Kutbu (1000 Sv. Yeti &amp; Yeti Rünü)</span>,
            Güneyde <span className="text-[#f7d377]">Yüzen Kasaba</span>, Güneydoğuda{' '}
            <span className="text-[#ff8a6b]">Korsan Adası</span>, Güneybatıda{' '}
            <span className="text-[#c084fc]">Büyücü Adası</span>, Kuzeybatıda{' '}
            <span className="text-[#38bdf8]">Dev Girdap (Sualtı Şehri · Poseidon&apos;un Mızrağı)</span>, Kuzeydoğuda{' '}
            <span className="text-[#a8a29e]">Sisli Korku Ormanı (800+ Sv.)</span>.
          </div>
          <div className="text-[11px] text-[#f2cf78] tabular-nums">
            Ticaret Konvoyu Seviyesi: <strong>Seviye {convoyTier}/10</strong> · Batırma Ödülü:{' '}
            <strong>{convoyGoldNext.toLocaleString('tr-TR')} Altın</strong>
          </div>
        </div>

        {/* 2 Drivable Ships */}
        <div className="space-y-2.5 mb-4">
          {HARBOR_SHIPS.map((spec) => {
            const owned = profile.ownedShips.includes(spec.id);
            const active = profile.activeShipId === spec.id;
            const canBuy = !owned && profile.gold >= spec.price;

            return (
              <div
                key={spec.id}
                data-ship-id={spec.id}
                className={`p-3.5 border flex items-center justify-between gap-3 ${
                  active
                    ? 'bg-[#13293a] border-[#5cc8ff]'
                    : 'bg-[#091118] border-white/12'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#f5f9fc]">{spec.nameTr}</span>
                    {active && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-[#1b4a68] text-[#8be0ff]">
                        Seçili Gemi
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#9eb6c7] mt-0.5">{spec.descriptionTr}</p>
                  <div className="text-[11px] font-semibold text-[#7ee8b2] mt-1 tabular-nums">
                    Gövde: {spec.maxHp} Can · Hız: {spec.speed} · Top Hasarı: {spec.cannonDamage}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  {owned ? (
                    <>
                      {!active && (
                        <button
                          type="button"
                          data-testid={`select-ship-${spec.id}`}
                          onClick={() => onSelectShip(spec.id)}
                          className="px-3.5 py-1.5 bg-[#1e3a52] hover:bg-[#2a4f6e] text-xs font-bold text-[#dff2ff] cursor-pointer"
                        >
                          Seç
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid={`launch-ship-${spec.id}`}
                        onClick={() => onLaunchShip(spec.id)}
                        className="px-3.5 py-2 bg-[#1c85b8] hover:bg-[#239cd6] text-white text-xs font-bold cursor-pointer"
                      >
                        Denize Açıl
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      data-testid={`buy-ship-${spec.id}`}
                      disabled={!canBuy}
                      onClick={() => onBuyShip(spec.id)}
                      className={`px-3.5 py-2 text-xs font-bold tabular-nums ${
                        canBuy
                          ? 'bg-[#c9963b] hover:bg-[#dda746] text-[#0e151c] cursor-pointer'
                          : 'bg-[#1a252e] text-[#7c8c99] cursor-not-allowed'
                      }`}
                    >
                      {spec.price} Altın
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Repair Ship Button */}
        {needsRepair && (
          <button
            type="button"
            onClick={onRepairShip}
            className="w-full py-2.5 bg-[#2a7d52] hover:bg-[#339462] text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Gemiyi Ücretsiz Onar ({Math.round(shipHp)} / {Math.round(shipMaxHp)} Can)
          </button>
        )}
      </div>
    </div>
  );
};
