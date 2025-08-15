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
// Keep SMS in defaults; we’ll skip rendering it if hasSms=false
export const DEFAULT_ORDER: OptionKey[] = [
  'Send',
  'Messages',
  'Notifications',
  'Subscriptions',
  'SMS/MMS',
];

export function normalizeOrder(order: unknown): OptionKey[] {
  const allowed = new Set<OptionKey>(DEFAULT_ORDER);
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

export async function getOptionOrder(): Promise<OptionKey[]> {
  const pb = await getLocal<any>('pb_settings');
  return normalizeOrder(pb?.optionOrder ?? DEFAULT_ORDER);
}

/** Build buttons; first rendered one is active. SMS shown only if hasSms=true */
export function buildTabButtonsHTML(order: OptionKey[], hasSms: boolean): string {
  const renderOrder = order.filter(k => (k === 'SMS/MMS' ? hasSms : true));
  return renderOrder
    .map((key, idx) => {
      const def = TAB_DEF[key];
      const active = idx === 0 ? ' active' : '';
      return `<button class="tab-button${active}" data-tab="${def.tab}">${def.label}</button>`;
    })
    .join('');
}

export function activateInitialPane(root: ParentNode): string | undefined {
  const firstBtn = root.querySelector<HTMLButtonElement>(
    '.tab-navigation .tab-button'
  );
  const firstTab = firstBtn?.dataset.tab;
  if (!firstTab) return;

  root.querySelectorAll<HTMLElement>('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.dataset.tab === firstTab);
  });
  return firstTab;
}
