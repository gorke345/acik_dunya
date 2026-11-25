import React from 'react';
import { PlayerProfileData } from '../game/combatRules';
import { FOOD_ITEMS, FoodId } from '../game/inventoryData';

interface TavernModalProps {
  profile: PlayerProfileData;
  onBuyFood: (foodId: FoodId, eatImmediately: boolean) => void;
  onClose: () => void;
}

export const TavernModal: React.FC<TavernModalProps> = ({
  profile,
  onBuyFood,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-30 bg-[#070d12]/78 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Kasaba Yemekhanesi"
      data-testid="tavern-modal"
    >
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-[#161310] border border-[#e3a857]/65 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 shrink-0">
          <div>
            <h2 className="font-display text-lg font-bold text-[#fae5be]">
              Kasaba Yemekhanesi — 10 Özel Yemek
            </h2>
            <p className="text-xs text-[#cbb99e] tabular-nums">
              Her yemek farklı bir alanda süreli güçlendirme sağlar · Altının:{' '}
              <strong className="text-[#f5c95d]">{Math.round(profile.gold)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yemekhaneyi kapat"
            className="px-3 py-1.5 bg-[#292119] hover:bg-[#382d22] text-xs font-bold text-[#f2e4cc] cursor-pointer"
          >
            Kapat
          </button>
        </div>

        {/* 10 Unique Foods Grid */}
        <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
          {FOOD_ITEMS.map((food) => {
            const owned = profile.foodInventory[food.id] || 0;
            const canAfford = profile.gold >= food.price;
            return (
              <div
                key={food.id}
                data-tavern-food={food.id}
                className="bg-[#0e0c0a] border border-[#e3a857]/25 p-3 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 shrink-0"
                        style={{ backgroundColor: food.colorHex }}
                      />
                      <span className="text-sm font-bold text-[#faf0dc] truncate">
                        {food.nameTr}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#f2c863] shrink-0 tabular-nums">
                      {food.price} Altın
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-[#85e8ad] mt-1">
                    {food.shortEffectTr}
                  </div>
                  <div className="text-[10px] text-[#9b8d7a] mt-0.5 tabular-nums">
                    Süre: {food.durationSec} sn · Çantanda: {owned} adet
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
                  <button
                    type="button"
                    data-testid={`tavern-buy-${food.id}`}
                    disabled={!canAfford}
                    onClick={() => onBuyFood(food.id, false)}
                    className={`flex-1 py-1.5 text-[11px] font-bold ${
                      canAfford
                        ? 'bg-[#c9963b] hover:bg-[#dea847] text-[#110d09] cursor-pointer'
                        : 'bg-[#211c17] text-[#6d6255] cursor-not-allowed'
                    }`}
                  >
                    Al (+1)
                  </button>
                  <button
                    type="button"
                    data-testid={`tavern-eat-${food.id}`}
                    disabled={!canAfford}
                    onClick={() => onBuyFood(food.id, true)}
                    className={`flex-1 py-1.5 text-[11px] font-bold ${
                      canAfford
                        ? 'bg-[#2f8f5b] hover:bg-[#3aa66b] text-white cursor-pointer'
                        : 'bg-[#1a221d] text-[#5e6e64] cursor-not-allowed'
                    }`}
                  >
                    Al &amp; Ye
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
