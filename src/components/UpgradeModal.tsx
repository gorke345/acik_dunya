import React from 'react';
import {
  PlayerProfileData,
  UpgradeType,
  getDerivedStats,
  getUpgradeCost,
  MAX_UPGRADE_TIER,
} from '../game/combatRules';
import { BIOME_META, BiomeId } from '../game/worldMath';

interface UpgradeModalProps {
  profile: PlayerProfileData;
  nearCampfire: boolean;
  onUpgrade: (type: UpgradeType) => void;
  onHealAtCampfire: () => void;
  onClose: () => void;
}

const BIOME_ORDER: BiomeId[] = ['meadow', 'plains', 'mountain', 'lake'];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  profile,
  nearCampfire,
  onUpgrade,
  onHealAtCampfire,
  onClose,
}) => {
  const stats = getDerivedStats(profile);

  const items: {
    type: UpgradeType;
    title: string;
    desc: string;
    tier: number;
    currentReadout: string;
  }[] = [
    {
      type: 'sword',
      title: 'Kılıç Gücü',
      desc: 'Her seviyede +7 Saldırı Gücü ve daha parlak runik kılıç görünümü.',
      tier: profile.swordTier,
      currentReadout: `${stats.attackPower} Saldırı`,
    },
    {
      type: 'armor',
      title: 'Zırh Dayanıklılığı',
      desc: 'Her seviyede +24 Maks. Can ve +3 Savunma zırhı ekler.',
      tier: profile.armorTier,
      currentReadout: `${stats.maxHp} Can · ${stats.defense} Sav.`,
    },
    {
      type: 'agility',
      title: 'Rüzgar Adımı',
      desc: 'Koşu hızını ve maksimum dayanıklılığı artırarak PvP avantajı sağlar.',
      tier: profile.agilityTier,
      currentReadout: `${stats.moveSpeed.toFixed(1)} Hız · ${stats.maxStamina} Enerji`,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-30 bg-[#090f14]/72 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Savaşçı Gelişim Ocağı"
    >
      <div className="w-full max-w-lg bg-[#121c24] border border-[#d6b166]/55 shadow-2xl p-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f6e8c6]">
              Savaşçı Gelişimi &amp; Keşif
            </h2>
            <p className="text-xs text-[#a9b7c4]">
              Seviye {profile.level} · Mevcut Altın:{' '}
              <span className="font-bold text-[#f2c863] tabular-nums">{profile.gold}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Gelişim penceresini kapat"
            className="px-3 py-1.5 bg-[#1b2934] hover:bg-[#253745] text-xs font-bold text-[#e6dec9] cursor-pointer"
          >
            Kapat
          </button>
        </div>

        {/* Upgrade Rows */}
        <div className="space-y-2.5 mb-4">
          {items.map((item) => {
            const isMax = item.tier >= MAX_UPGRADE_TIER;
            const cost = getUpgradeCost(item.tier);
            const canAfford = !isMax && profile.gold >= cost;

            return (
              <div
                key={item.type}
                className="flex items-center justify-between gap-3 bg-[#0c141a] border border-white/10 p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#f7f0df]">{item.title}</span>
                    <span className="text-[11px] font-bold text-[#e5be67] tabular-nums">
                      Kademe {item.tier}/{MAX_UPGRADE_TIER}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9eb0c0] mt-0.5">{item.desc}</p>
                  <div className="text-[11px] font-semibold text-[#7bd99c] mt-1 tabular-nums">
                    Mevcut: {item.currentReadout}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onUpgrade(item.type)}
                  className={`shrink-0 px-3.5 py-2 text-xs font-bold tabular-nums transition-colors ${
                    isMax
                      ? 'bg-[#22303c] text-[#8da0b0] cursor-not-allowed'
                      : canAfford
                      ? 'bg-[#c9963b] hover:bg-[#dda746] text-[#0e151c] cursor-pointer'
                      : 'bg-[#1a252e] text-[#7c8c99] cursor-not-allowed'
                  }`}
                >
                  {isMax ? 'MAKS' : `${cost} Altın`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Discovered Landforms Checklist */}
        <div className="bg-[#0c141a] border border-white/10 p-3 mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#b6c2cd] mb-2">
            Keşfedilen Yeryüzü Şekilleri ({profile.discoveredBiomes.length}/4)
          </div>
          <div className="grid grid-cols-2 gap-2">
            {BIOME_ORDER.map((id) => {
              const found = profile.discoveredBiomes.includes(id);
              const meta = BIOME_META[id];
              return (
                <div
                  key={id}
                  className={`px-2.5 py-1.5 border text-xs flex items-center justify-between ${
                    found
                      ? 'border-[#5cb85c]/45 bg-[#15281f] text-[#dff7e6]'
                      : 'border-white/10 bg-[#101820] text-[#778796]'
                  }`}
                >
                  <span className="font-semibold">{meta.name}</span>
                  <span className="text-[10px] font-bold">{found ? 'Keşfedildi' : '???'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {nearCampfire && (
          <button
            type="button"
            onClick={onHealAtCampfire}
            className="w-full py-2.5 px-4 bg-[#2f8f5b] hover:bg-[#38a66a] text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Kamp Ateşinde Tam İyileş
          </button>
        )}
      </div>
    </div>
  );
};
