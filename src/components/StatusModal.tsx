import React from 'react';
import { PlayerProfileData } from '../game/combatRules';

interface StatusModalProps {
  kind: 'paused' | 'gameover';
  profile: PlayerProfileData;
  isGuest: boolean;
  killerName?: string;
  onResumeOrRespawn: () => void;
  onOpenUpgrade: () => void;
  onSaveNow: () => void;
  onUpgradeGuestAccount: () => void;
  onReturnToTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  kind,
  profile,
  isGuest,
  killerName,
  onResumeOrRespawn,
  onOpenUpgrade,
  onSaveNow,
  onUpgradeGuestAccount,
  onReturnToTitle,
}) => {
  const isDefeat = kind === 'gameover';

  return (
    <div
      className="fixed inset-0 z-30 bg-[#080d12]/76 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isDefeat ? 'Yenilgi Ekranı' : 'Oyun Duraklatıldı'}
    >
      <div className="w-full max-w-md bg-[#121c24] border border-[#d6b166]/55 shadow-2xl p-6 text-center">
        <h2 className="font-display text-2xl font-bold text-[#f6e8c6] mb-1">
          {isDefeat ? 'Savaşta Düştün' : 'Oyun Duraklatıldı'}
        </h2>
        <p className="text-xs text-[#b5c2ce] mb-5">
          {isDefeat
            ? `${killerName || 'Rakip'} seni alt etti. Taş Meydan Kampı'nda yeniden doğabilirsin.`
            : isGuest
            ? 'Misafir oturumundasın. İlerlemeni saklamak için hesabına giriş yapabilirsin.'
            : 'Kayıtlı hesabın bulut ile senkronize çalışıyor.'}
        </p>

        {/* 3 Tabular Stat Tiles */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-[#0b1319] border border-white/10 py-2.5 px-2">
            <div className="text-[10px] uppercase tracking-wider text-[#9db0c2]">Seviye</div>
            <div className="font-display text-lg font-bold text-[#f4e4bc] tabular-nums">
              {profile.level}
            </div>
          </div>
          <div className="bg-[#0b1319] border border-white/10 py-2.5 px-2">
            <div className="text-[10px] uppercase tracking-wider text-[#9db0c2]">Altın</div>
            <div className="font-display text-lg font-bold text-[#f0c766] tabular-nums">
              {profile.gold}
            </div>
          </div>
          <div className="bg-[#0b1319] border border-white/10 py-2.5 px-2">
            <div className="text-[10px] uppercase tracking-wider text-[#9db0c2]">Zafer</div>
            <div className="font-display text-lg font-bold text-[#e58572] tabular-nums">
              {profile.pvpKills}
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onResumeOrRespawn}
            className="w-full py-3 px-5 bg-[#c9963b] hover:bg-[#dda746] text-[#0e151c] font-display font-bold text-sm uppercase tracking-wider cursor-pointer"
          >
            {isDefeat ? 'Kampta Yeniden Doğ' : 'Devam Et'}
          </button>

          {!isDefeat && (
            <button
              type="button"
              onClick={onOpenUpgrade}
              className="w-full py-2.5 px-4 bg-[#1a2936] hover:bg-[#233647] border border-white/15 text-xs font-bold text-[#f2e4c2] cursor-pointer"
            >
              Savaşçı Gelişimi &amp; Keşif
            </button>
          )}

          {isGuest ? (
            <button
              type="button"
              onClick={onUpgradeGuestAccount}
              className="w-full py-2.5 px-4 bg-[#244e39] hover:bg-[#2d6248] border border-[#5cb85c]/45 text-xs font-bold text-[#e0f8e8] cursor-pointer"
            >
              Google ile Giriş Yap &amp; İlerlemeyi Kaydet
            </button>
          ) : (
            <button
              type="button"
              onClick={onSaveNow}
              className="w-full py-2.5 px-4 bg-[#1d3849] hover:bg-[#26485e] border border-[#65b5e0]/40 text-xs font-bold text-[#d5eefc] cursor-pointer"
            >
              Şimdi Buluta Kaydet
            </button>
          )}

          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full py-2 px-4 bg-transparent hover:bg-white/5 border border-white/15 text-xs font-semibold text-[#c0cbd6] cursor-pointer"
          >
            Ana Menüye Dön
          </button>
        </div>
      </div>
    </div>
  );
};
