import { getStock, subscribeToStockChanges } from './api.ts';
import { config } from './config.ts';
import { icon } from './icons.ts';
import { escapeHtml, formatQuantity, stockChanged, stockStatus } from './stock.ts';
import { element, preference, renderShell, setConnection, updatedTime } from './ui.ts';
import type { StockItem } from './types.ts';

renderShell('viewer', `
  <section class="tv-board" aria-label="Live stock quantities">
    <div class="tv-table-wrap">
      <table class="tv-stock-table" id="stockTable" aria-label="Item names and quantities" aria-busy="true">
        <tbody id="stockBody">
          <tr class="tv-loading-row"><td><span class="tv-skeleton"></span></td><td><span class="tv-skeleton tv-skeleton-short"></span></td></tr>
          <tr class="tv-loading-row"><td><span class="tv-skeleton"></span></td><td><span class="tv-skeleton tv-skeleton-short"></span></td></tr>
          <tr class="tv-loading-row"><td><span class="tv-skeleton"></span></td><td><span class="tv-skeleton tv-skeleton-short"></span></td></tr>
        </tbody>
      </table>
      <p class="tv-message" id="tvMessage" role="status" hidden></p>
    </div>
    <footer class="tv-last-updated">${icon('Clock3')}<span id="lastUpdated">Waiting for the first update</span></footer>
  </section>`);

document.body.classList.add('tv-dashboard');

const table = element<HTMLTableElement>('#stockTable');
const body = element<HTMLTableSectionElement>('#stockBody');
const message = element<HTMLParagraphElement>('#tvMessage');
const soundButton = element<HTMLButtonElement>('#soundToggle');

let items: StockItem[] | null = null;
let inFlight = false;
let refreshQueued = false;
let timer: ReturnType<typeof setTimeout>;
let soundEnabled = preference('sound') !== 'false';
const audio = new Audio(`${import.meta.env.BASE_URL}assets/ding.wav`);
audio.preload = 'auto';

function updateTvSizing(itemCount: number): void {
  if (itemCount < 1) return;

  const topbar = element<HTMLElement>('.topbar');
  const main = element<HTMLElement>('.main');
  const footer = element<HTMLElement>('.tv-last-updated');
  const mainStyle = getComputedStyle(main);
  const mainPadding = parseFloat(mainStyle.paddingTop) + parseFloat(mainStyle.paddingBottom);
  const availableHeight = window.innerHeight - topbar.offsetHeight - mainPadding - footer.offsetHeight - 8;
  const rowGap = Math.max(4, Math.min(7, window.innerHeight * 0.005));
  const rowHeight = Math.max(54, (availableHeight - rowGap * (itemCount + 1)) / itemCount);
  const fontSize = Math.max(23, Math.min(56, rowHeight * 0.27));

  document.documentElement.style.setProperty('--tv-row-gap', `${rowGap}px`);
  document.documentElement.style.setProperty('--tv-row-height', `${rowHeight}px`);
  document.documentElement.style.setProperty('--tv-font-size', `${fontSize}px`);
}

function syncSoundButton(): void {
  soundButton.innerHTML = icon(soundEnabled ? 'Bell' : 'BellOff');
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  soundButton.setAttribute('aria-label', `${soundEnabled ? 'Disable' : 'Enable'} sound alerts`);
  soundButton.title = soundButton.getAttribute('aria-label')!;
}

async function playSound(): Promise<void> {
  try {
    audio.currentTime = 0;
    await audio.play();
  } catch {
    // TVs and browsers can block audio until the page has been interacted with.
  }
}

soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  preference('sound', String(soundEnabled));
  syncSoundButton();
  if (soundEnabled) void playSound();
  else {
    audio.pause();
    audio.currentTime = 0;
  }
});
syncSoundButton();

function render(previous: StockItem[] = []): void {
  if (!items) return;

  if (items.length === 0) {
    table.hidden = true;
    message.hidden = false;
    message.textContent = 'No stock items';
    return;
  }

  const oldItems = new Map(previous.map(item => [String(item.id), item]));
  updateTvSizing(items.length);

  body.innerHTML = items.map(item => {
    const previousItem = oldItems.get(String(item.id));
    const changed = previousItem && previousItem.quantity !== item.quantity;
    const status = stockStatus(item.quantity, item.low_threshold, item.high_threshold).key;

    return `<tr${changed ? ' class="tv-quantity-changed"' : ''}>
      <td class="tv-item-name">${escapeHtml(item.Item)}</td>
      <td class="tv-quantity-cell">
        <span class="tv-quantity tv-tone-${status}">
          <span class="tv-quantity-number">${formatQuantity(item.quantity)}</span>
          <span class="tv-uom">${escapeHtml(item.uom?.toUpperCase() || '—')}</span>
        </span>
      </td>
    </tr>`;
  }).join('');

  requestAnimationFrame(() => updateTvSizing(items?.length ?? 0));

  table.hidden = false;
  table.setAttribute('aria-busy', 'false');
  message.hidden = true;
}

async function refresh(): Promise<void> {
  if (inFlight) {
    refreshQueued = true;
    return;
  }
  clearTimeout(timer);
  inFlight = true;

  try {
    const data = await getStock();
    const previous = items;
    items = data;
    const changed = stockChanged(previous, data);
    if (changed) render(previous ?? []);
    if (previous !== null && soundEnabled && changed) void playSound();
    setConnection('live', 'Live updates');
    updatedTime();
  } catch {
    setConnection('error', 'Disconnected');
    // Keep the last successful quantities visible if the connection drops.
    if (items === null) {
      table.hidden = true;
      message.hidden = false;
      message.textContent = 'Unable to load stock';
    }
  } finally {
    inFlight = false;
    if (refreshQueued) {
      refreshQueued = false;
      if (!document.hidden) void refresh();
    } else if (!document.hidden) {
      timer = setTimeout(() => void refresh(), config.refreshMs);
    }
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(timer);
  else void refresh();
});

window.addEventListener('online', () => void refresh());
window.addEventListener('resize', () => {
  if (items?.length) updateTvSizing(items.length);
});

const unsubscribeFromStock = subscribeToStockChanges(() => {
  if (!document.hidden) void refresh();
});
window.addEventListener('beforeunload', unsubscribeFromStock, { once: true });
void refresh();
