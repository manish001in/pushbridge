import { getLocal } from '../../background/storage';

export type OptionKey =
  | 'Send'
  | 'Messages'
  | 'Notifications'
  | 'Subscriptions'
  | 'SMS/MMS';

export const TAB_DEF: Record<OptionKey, { tab: string; label: string }> = {
  Send: { tab: 'composer', label: 'Send' },
  Messages: { tab: 'pushes', label: 'Messages' },
  Notifications: { tab: 'notifications', label: 'Notifications Mirroring' },
  Subscriptions: { tab: 'channels', label: 'Subscriptions' },
  'SMS/MMS': { tab: 'messages', label: 'SMS/MMS' },
};

export const DEFAULT_ORDER: OptionKey[] = [
  'Send',
  'Messages',
  'Notifications',
  'Subscriptions',
  'SMS/MMS',
];

const allowed = new Set<OptionKey>(DEFAULT_ORDER);

/** Keep only valid keys, de-dupe, then append any missing in DEFAULT_ORDER order */
export function normalizeOrder(order: unknown): OptionKey[] {
  const seen = new Set<OptionKey>();
  const out: OptionKey[] = [];

  if (Array.isArray(order)) {
    for (const v of order) {
      if (typeof v === 'string' && allowed.has(v as OptionKey) && !seen.has(v as OptionKey)) {
        const k = v as OptionKey;
        seen.add(k);
        out.push(k);
      }
    }
  }
  for (const k of DEFAULT_ORDER) if (!seen.has(k)) out.push(k);
  return out;
}

/** Keep only valid keys, de-dupe */
export function normalizeHidden(list: unknown): OptionKey[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<OptionKey>();
  for (const v of list) {
    if (typeof v === 'string' && allowed.has(v as OptionKey)) {
      seen.add(v as OptionKey);
    }
  }
  return Array.from(seen);
}

/** Read optionOrder from storage and normalize */
export async function getOptionOrder(): Promise<OptionKey[]> {
  const pb = await getLocal<any>('pb_settings');
  return normalizeOrder(pb?.optionOrder ?? DEFAULT_ORDER);
}

/** Read hiddenTabs from storage and normalize */
export async function getHiddenTabs(): Promise<OptionKey[]> {
  const pb = await getLocal<any>('pb_settings');
  return normalizeHidden(pb?.hiddenTabs ?? []);
}

/**
 * Build tab buttons HTML.
 * Filters out hidden tabs and SMS when hasSms=false.
 * First visible button gets .active.
 */
export function buildTabButtonsHTML(
  order: OptionKey[],
  hasSms: boolean,
  hiddenTabs: OptionKey[] = []
): string {
  const hidden = new Set(hiddenTabs);
  const renderOrder = order.filter(k => {
    if (hidden.has(k)) return false;
    if (k === 'SMS/MMS' && !hasSms) return false;
    return true;
  });

  return renderOrder
    .map((key, idx) => {
      const def = TAB_DEF[key];
      const active = idx === 0 ? ' active' : '';
      return `<button class="tab-button${active}" data-tab="${def.tab}">${def.label}</button>`;
    })
    .join('');
}

/**
 * Optional: activate the pane that matches the first generated .tab-button.
 * Call this after you have appended your .tab-pane elements.
 */
export function activateInitialPane(root: ParentNode): string | undefined {
  const firstBtn = root.querySelector<HTMLButtonElement>('.tab-navigation .tab-button');
  const firstTab = firstBtn?.dataset.tab;
  if (!firstTab) return;

  root.querySelectorAll<HTMLElement>('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.dataset.tab === firstTab);
  });
  return firstTab;
}