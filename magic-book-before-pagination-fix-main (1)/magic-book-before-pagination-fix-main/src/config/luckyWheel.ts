/**
 * Тест вариантов входа в игру:
 * - `panel` — полноэкранная панель (как панель гимна), вариант A
 * - `route` — переход на `/luck`, вариант B (прямая ссылка для сдачи: `…/luck`)
 */
export type LuckyWheelEntryMode = "panel" | "route";

/** Переключите на `"route"` и проверьте кнопки «Крутим удачу?» — откроется URL `/luck`. */
export const LUCKY_WHEEL_ENTRY: LuckyWheelEntryMode = "panel";

/** Сколько оборотов за одну сессию (ТЗ: 3–4). */
export const LUCKY_SPINS_PER_GAME = 4;
