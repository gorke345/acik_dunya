import React from 'react';
import {
  CLASS_DEFINITIONS,
  DESERT_ARENA_REQUIRED_KILLS,
  HORSE_PRICE,
  PlayerProfileData,
  UpgradeType,
  getDerivedStats,
  getUpgradeCost,
  MAX_UPGRADE_TIER,
} from '../game/combatRules';
import { BIOME_META, BiomeId } from '../game/worldMath';

interface UpgradeModalProps {
  profile: PlayerProfileData;
  inTown: boolean;
  nearCampfire: boolean;
  onUpgrade: (type: UpgradeType) => void;
  onBuyHorse: () => void;
  onHealAtCampfire: () => void;
  onClose: () => void;
}

const BIOME_ORDER: BiomeId[] = [
  'meadow',
  'dark_forest',
  'plains',
  'mountain',
  'lake',
  'harbor',
  'ocean',
  'pirate_island',
  'wizard_island',
  'floating_town',
  'whirlpool',
  'underwater_city',
  'horror_forest',
];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  profile,
  inTown,
  nearCampfire,
  onUpgrade,
  onBuyHorse,
  onHealAtCampfire,
  onClose,
}) => {
  const stats = getDerivedStats(profile);
  const classDef = CLASS_DEFINITIONS[profile.playerClass];

  const items: {
    type: UpgradeType;
    title: string;
    desc: string;
    tier: number;
    currentReadout: string;
  }[] = [
    {
      type: 'sword',
      title: 'Silah Gücü',
      desc: `Her seviyede +7.5 temel saldırı gücü (${stats.activeWeaponNameTr}).`,
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

  const canBuyHorse = inTown && !profile.hasHorse && profile.gold >= HORSE_PRICE;

  return (
    <div
      className="fixed inset-0 z-30 bg-[#090f14]/72 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Kasaba Demirci ve Ahır"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#121c24] border border-[#d6b166]/55 shadow-2xl p-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f6e8c6]">
              Kasaba Demirci, Ahır &amp; Keşif
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

        {/* Town-Only Upgrade Notice */}
        {!inTown ? (
          <div
            data-testid="town-only-warning"
            className="bg-[#332211] border border-[#e3a244]/65 text-[#ffdca2] px-3 py-2 mb-3 text-xs font-semibold"
          >
            Yükseltmeler ve at alımı yalnızca Başlangıç Kasabası&apos;nda (Demirci &amp; Ahır) yapılabilir.
          </div>
        ) : (
          <div className="bg-[#12291e] border border-[#56c27b]/45 text-[#b6f0ca] px-3 py-1.5 mb-3 text-[11px] font-semibold">
            Başlangıç Kasabası&apos;ndasın — Demirci yükseltmeleri ve Kasaba Ahırı açık.
          </div>
        )}

        {/* Class & Signature Weapon Status */}
        <div
          className="bg-[#0c141a] border border-white/10 border-l-4 px-3 py-2 mb-3 flex items-center justify-between gap-3"
          style={{ borderLeftColor: classDef.colorHex }}
        >
          <div>
            <div className="text-xs font-extrabold text-[#f7f0df]">
              {classDef.nameTr} ·{' '}
              <span style={{ color: classDef.accentHex }}>{stats.activeWeaponNameTr}</span>
            </div>
            <div className="text-[11px] text-[#a5b5c4]">
              {profile.classWeaponUnlocked
                ? 'Sınıf silahı açıldı ve aktif!'
                : profile.playerClass === 'lancer'
                ? `${classDef.questTitleTr} (Dalga ${profile.desertArenaProgress}/${DESERT_ARENA_REQUIRED_KILLS}) · ${classDef.questLocationTr}`
                : `${classDef.questTitleTr} · ${classDef.questLocationTr}`}
            </div>
          </div>
          <span
            className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
              profile.classWeaponUnlocked
                ? 'bg-[#193826] text-[#7be6a0]'
                : 'bg-[#1d2833] text-[#c7d3de]'
            }`}
          >
            {profile.classWeaponUnlocked ? 'AÇILDI' : 'GÖREV'}
          </span>
        </div>

        {/* Town Stable: Rideable Horse (400 Gold) */}
        <div className="bg-[#171c22] border border-[#d6b166]/45 p-3 mb-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#f7e6bd]">Kasaba Ahırı · Binek Atı</span>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-[#2a2214] text-[#f0c766]">
                {HORSE_PRICE} Altın
              </span>
            </div>
            <p className="text-[11px] text-[#b4c2cf] mt-0.5">
              Büyük haritada %72 daha hızlı dörtnala gez. <strong className="text-[#f0d89e]">[F]</strong> Bin/İn ·{' '}
              <strong className="text-[#f0d89e]">[G]</strong> Yanına Çağır. At üstünde yetenekler kapalıdır.
            </p>
          </div>
          {profile.hasHorse ? (
            <span
              data-testid="horse-owned-badge"
              className="shrink-0 px-3 py-2 bg-[#173624] border border-[#56c27b]/45 text-[#85ebb0] text-[11px] font-bold uppercase text-center"
            >
              Sahipsin
            </span>
          ) : (
            <button
              type="button"
              data-testid="buy-horse-btn"
              disabled={!canBuyHorse}
              onClick={onBuyHorse}
              className={`shrink-0 px-3.5 py-2 text-xs font-bold tabular-nums transition-colors ${
                canBuyHorse
                  ? 'bg-[#c9963b] hover:bg-[#dda746] text-[#0e151c] cursor-pointer'
                  : 'bg-[#1a252e] text-[#7c8c99] cursor-not-allowed'
              }`}
            >
              {HORSE_PRICE} Altın
            </button>
          )}
        </div>

        {/* Upgrade Rows */}
        <div className="space-y-2 mb-3.5">
          {items.map((item) => {
            const isMax = item.tier >= MAX_UPGRADE_TIER;
            const cost = getUpgradeCost(item.tier);
            const canAfford = inTown && !isMax && profile.gold >= cost;

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
        <div className="bg-[#0c141a] border border-white/10 p-3 mb-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#b6c2cd] mb-2">
            Keşfedilen Bölgeler &amp; Adalar ({profile.discoveredBiomes.length}/{BIOME_ORDER.length})
          </div>
          <div className="grid grid-cols-2 gap-2">
            {BIOME_ORDER.map((id) => {
              const found = profile.discoveredBiomes.includes(id);
              const meta = BIOME_META[id];
              return (
                <div
                  key={id}
                  className={`px-2.5 py-1.5 border text-xs flex items-center justify-between gap-1 ${
                    found
                      ? 'border-[#5cb85c]/45 bg-[#15281f] text-[#dff7e6]'
                      : 'border-white/10 bg-[#101820] text-[#778796]'
                  }`}
                >
                  <span className="font-semibold truncate">{meta.name}</span>
                  <span className="text-[10px] font-bold shrink-0">
                    {found ? 'Keşfedildi' : '???'}
                  </span>
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
            Kasaba Ocağında Tam İyileş
          </button>
        )}
      </div>
    </div>
  );
};
