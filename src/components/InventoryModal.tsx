import React, { useState } from 'react';
import {
  PlayerProfileData,
  getDerivedStats,
} from '../game/combatRules';
import {
  FOOD_ITEMS,
  FoodId,
  INVENTORY_ARMORS,
  INVENTORY_WEAPONS,
} from '../game/inventoryData';
import type { HudBuffEntry } from '../game/gameEngine';

interface InventoryModalProps {
  profile: PlayerProfileData;
  activeBuffs: HudBuffEntry[];
  onBuyWeapon: (weaponId: string) => void;
  onEquipWeapon: (weaponId: string) => void;
  onBuyArmor: (armorId: string) => void;
  onEquipArmor: (armorId: string) => void;
  onEatFood: (foodId: FoodId) => void;
  onClose: () => void;
}

type InvTab = 'weapons' | 'armors' | 'foods';

export const InventoryModal: React.FC<InventoryModalProps> = ({
  profile,
  activeBuffs,
  onBuyWeapon,
  onEquipWeapon,
  onBuyArmor,
  onEquipArmor,
  onEatFood,
  onClose,
}) => {
  const [tab, setTab] = useState<InvTab>('weapons');
  const stats = getDerivedStats(profile);

  const totalFoods = Object.values(profile.foodInventory).reduce((a, b) => a + (b || 0), 0);

  return (
    <div
      className="fixed inset-0 z-30 bg-[#070d12]/78 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Envanter"
      data-testid="inventory-modal"
    >
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-[#101922] border border-[#d6b166]/60 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 shrink-0">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f7e9c7]">
              Savaşçı Envanteri
            </h2>
            <p className="text-xs text-[#a8b8c7] tabular-nums">
              Altın: <strong className="text-[#f2c863]">{Math.round(profile.gold)}</strong> ·
              Saldırı: <strong className="text-[#ffba6b]">{stats.attackPower}</strong> ·
              Savunma: <strong className="text-[#7ac7f8]">{stats.defense}</strong> ·
              Maks. Can: <strong className="text-[#f27c77]">{stats.maxHp}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Envanteri kapat"
            className="px-3 py-1.5 bg-[#1b2935] hover:bg-[#263847] text-xs font-bold text-[#eae2cd] cursor-pointer"
          >
            Kapat [I]
          </button>
        </div>

        {/* Active Food Buffs Strip */}
        {activeBuffs.length > 0 && (
          <div className="px-5 py-2 bg-[#14231d] border-b border-[#56c27b]/35 flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#89eba8]">
              Aktif Yemek Güçlendirmeleri:
            </span>
            {activeBuffs.map((b) => (
              <span
                key={b.foodId}
                className="px-2 py-0.5 text-[11px] font-bold bg-[#0c1614] border tabular-nums"
                style={{ borderColor: b.accentColor, color: '#f3f0e4' }}
              >
                {b.nameTr} · {Math.ceil(b.remainingSec)}s
              </span>
            ))}
          </div>
        )}

        {/* Category Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#0a1118] p-1.5 border-b border-white/10 shrink-0" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'weapons'}
            data-testid="inv-tab-weapons"
            onClick={() => setTab('weapons')}
            className={`py-2 text-xs font-bold tracking-wide cursor-pointer ${
              tab === 'weapons'
                ? 'bg-[#c9963b] text-[#0d141b]'
                : 'text-[#c2cbd4] hover:text-white'
            }`}
          >
            Silahlar &amp; Kılıçlar ({profile.ownedWeapons.length}/{INVENTORY_WEAPONS.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'armors'}
            data-testid="inv-tab-armors"
            onClick={() => setTab('armors')}
            className={`py-2 text-xs font-bold tracking-wide cursor-pointer ${
              tab === 'armors'
                ? 'bg-[#c9963b] text-[#0d141b]'
                : 'text-[#c2cbd4] hover:text-white'
            }`}
          >
            Zırhlar ({profile.ownedArmors.length}/{INVENTORY_ARMORS.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'foods'}
            data-testid="inv-tab-foods"
            onClick={() => setTab('foods')}
            className={`py-2 text-xs font-bold tracking-wide cursor-pointer ${
              tab === 'foods'
                ? 'bg-[#c9963b] text-[#0d141b]'
                : 'text-[#c2cbd4] hover:text-white'
            }`}
          >
            Yemekler ({totalFoods})
          </button>
        </div>

        {/* Content List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {tab === 'weapons' &&
            INVENTORY_WEAPONS.map((w) => {
              const owned = profile.ownedWeapons.includes(w.id);
              const equipped = profile.equippedWeaponId === w.id;
              const isHiddenRelic = w.price === 0 && !owned && w.id !== 'starter_sword';
              const canBuy = !owned && !isHiddenRelic && profile.gold >= w.price;

              return (
                <div
                  key={w.id}
                  data-weapon-id={w.id}
                  className={`p-3 border flex items-center justify-between gap-3 ${
                    equipped
                      ? 'bg-[#1a2936] border-[#f2c863]'
                      : 'bg-[#0b131a] border-white/10'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="w-2.5 h-2.5 inline-block shrink-0"
                        style={{ backgroundColor: w.colorHex }}
                      />
                      <span className="text-sm font-bold text-[#f7f0df]">{w.nameTr}</span>
                      {w.ranged && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-[#123026] text-[#7df0b0]">
                          Menzilli
                        </span>
                      )}
                      {equipped && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-[#3a2c12] text-[#f7d377]">
                          Kuşanıldı
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#a5b5c4] mt-0.5">{w.sourceTr}</p>
                    <div className="text-[11px] font-semibold text-[#8ed4fa] mt-1 tabular-nums">
                      +{w.attackBonus} Saldırı · +{Math.round(w.critBonus * 100)}% Kritik ·{' '}
                      {w.ranged ? 'Uzak Menzil' : `+${w.reachBonus.toFixed(1)}m Menzil`}
                      {w.stunLightSec ? ` · ${w.stunLightSec}s Sersemletme` : ''}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {equipped ? (
                      <span className="px-3 py-1.5 text-[11px] font-bold uppercase bg-[#1f3b2b] text-[#8ef0b2]">
                        Aktif
                      </span>
                    ) : owned ? (
                      <button
                        type="button"
                        data-testid={`equip-weapon-${w.id}`}
                        onClick={() => onEquipWeapon(w.id)}
                        className="px-3.5 py-2 bg-[#3278b8] hover:bg-[#3f8cd1] text-white text-xs font-bold cursor-pointer"
                      >
                        Kuşan
                      </button>
                    ) : isHiddenRelic ? (
                      <span className="px-2.5 py-1.5 text-[10px] font-bold uppercase bg-[#1a222b] text-[#9eb0c0] block text-center">
                        Haritada Gizli
                      </span>
                    ) : (
                      <button
                        type="button"
                        data-testid={`buy-weapon-${w.id}`}
                        disabled={!canBuy}
                        onClick={() => onBuyWeapon(w.id)}
                        className={`px-3.5 py-2 text-xs font-bold tabular-nums ${
                          canBuy
                            ? 'bg-[#c9963b] hover:bg-[#dda746] text-[#0e151c] cursor-pointer'
                            : 'bg-[#1a252e] text-[#7c8c99] cursor-not-allowed'
                        }`}
                      >
                        {w.price} Altın
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {tab === 'armors' &&
            INVENTORY_ARMORS.map((a) => {
              const owned = profile.ownedArmors.includes(a.id);
              const equipped = profile.equippedArmorId === a.id;
              const canBuy = !owned && profile.gold >= a.price;

              return (
                <div
                  key={a.id}
                  data-armor-id={a.id}
                  className={`p-3 border flex items-center justify-between gap-3 ${
                    equipped
                      ? 'bg-[#1a2936] border-[#f2c863]'
                      : 'bg-[#0b131a] border-white/10'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 inline-block shrink-0"
                        style={{ backgroundColor: a.colorHex }}
                      />
                      <span className="text-sm font-bold text-[#f7f0df]">{a.nameTr}</span>
                      {equipped && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-[#3a2c12] text-[#f7d377]">
                          Giyili
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#a5b5c4] mt-0.5">{a.descriptionTr}</p>
                    <div className="text-[11px] font-semibold text-[#7ee3a5] mt-1 tabular-nums">
                      +{a.hpBonus} Can · +{a.defenseBonus} Savunma
                      {a.speedBonus !== 0
                        ? ` · ${a.speedBonus > 0 ? '+' : ''}${a.speedBonus.toFixed(1)} Hız`
                        : ''}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {equipped ? (
                      <span className="px-3 py-1.5 text-[11px] font-bold uppercase bg-[#1f3b2b] text-[#8ef0b2]">
                        Aktif
                      </span>
                    ) : owned ? (
                      <button
                        type="button"
                        data-testid={`equip-armor-${a.id}`}
                        onClick={() => onEquipArmor(a.id)}
                        className="px-3.5 py-2 bg-[#3278b8] hover:bg-[#3f8cd1] text-white text-xs font-bold cursor-pointer"
                      >
                        Giy
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid={`buy-armor-${a.id}`}
                        disabled={!canBuy}
                        onClick={() => onBuyArmor(a.id)}
                        className={`px-3.5 py-2 text-xs font-bold tabular-nums ${
                          canBuy
                            ? 'bg-[#c9963b] hover:bg-[#dda746] text-[#0e151c] cursor-pointer'
                            : 'bg-[#1a252e] text-[#7c8c99] cursor-not-allowed'
                        }`}
                      >
                        {a.price} Altın
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {tab === 'foods' && (
            <div className="space-y-2">
              <div className="text-xs text-[#b8c6d4] bg-[#0c161f] border border-white/10 px-3 py-2">
                Yemekleri <strong className="text-[#f5cf6e]">Kasaba Yemekhanesi</strong>&apos;nden
                satın alabilir, buradan istediğin zaman yiyerek özel güçlendirmeler kazanabilirsin.
              </div>
              {FOOD_ITEMS.map((f) => {
                const count = profile.foodInventory[f.id] || 0;
                const active = activeBuffs.find((b) => b.foodId === f.id);
                return (
                  <div
                    key={f.id}
                    data-food-id={f.id}
                    className="p-3 bg-[#0b131a] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 inline-block shrink-0"
                          style={{ backgroundColor: f.colorHex }}
                        />
                        <span className="text-sm font-bold text-[#f7f0df]">{f.nameTr}</span>
                        <span className="text-[11px] font-bold text-[#f0c766] tabular-nums">
                          x{count}
                        </span>
                        {active && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#173626] text-[#7ee8a8] tabular-nums">
                            Aktif ({Math.ceil(active.remainingSec)}s)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#9eb2c4] mt-0.5">{f.shortEffectTr} · {f.descriptionTr}</p>
                    </div>
                    <button
                      type="button"
                      data-testid={`eat-food-${f.id}`}
                      disabled={count <= 0}
                      onClick={() => onEatFood(f.id)}
                      className={`shrink-0 px-3.5 py-2 text-xs font-bold ${
                        count > 0
                          ? 'bg-[#2f8f5b] hover:bg-[#38a86b] text-white cursor-pointer'
                          : 'bg-[#1a252e] text-[#6d7d8a] cursor-not-allowed'
                      }`}
                    >
                      Ye
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
