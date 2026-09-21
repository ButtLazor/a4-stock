import { icon } from './icons.ts';
import { config } from './config.ts';
import { escapeHtml, stockCounts, stockStatus } from './stock.ts';
import type { StockFilter, StockItem } from './types.ts';
import './styles.css';

export function element<T extends HTMLElement = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

export function preference(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(`vmg-${key}`, value);
    return localStorage.getItem(`vmg-${key}`);
  } catch { return null; }
}

export function renderShell(page: 'viewer' | 'admin', content: string): void {
  const admin = page === 'admin';
  const overviewUrl = admin ? '../index.html' : './index.html';
  const adminUrl = admin ? './admin.html' : './admin/admin.html';
  document.documentElement.dataset.theme = preference('theme') ?? 'light';
  element('#app').innerHTML = `
    <a class="skip-link" href="#main">Skip to content</a>
    <aside class="sidebar" aria-label="Workspace navigation">
      <a class="brand" href="${overviewUrl}" aria-label="VMG stock overview">
        <span class="brand-mark">${icon('Package')}</span>
        <span class="brand-copy"><span class="wordmark">VMG<span style="color:#92a7ff">.</span></span><span class="brand-caption">Stock workspace</span></span>
      </a>
      <nav aria-label="Main navigation"><p class="nav-label">WORKSPACE</p><div class="nav-links">
        <a class="nav-link" href="${overviewUrl}" ${!admin ? 'aria-current="page"' : ''} title="Overview" aria-label="Overview">${icon('LayoutDashboard')}<span>Overview</span></a>
        <a class="nav-link" href="${adminUrl}" ${admin ? 'aria-current="page"' : ''} title="Manage stock" aria-label="Manage stock">${icon('SlidersHorizontal')}<span>Manage stock</span></a>
      </div></nav>
      <div class="stock-guide"><p class="nav-label">STATUS COLORS</p>
        <div class="guide-row"><span class="dot green"></span>Well stocked<span>Above guide</span></div>
        <div class="guide-row"><span class="dot amber"></span>Watch list<span>Between</span></div>
        <div class="guide-row"><span class="dot red"></span>Low stock<span>Below guide</span></div>
      </div>
      <div class="sidebar-footer"><div class="sidebar-note">${icon('Clock3')}<span>Malé, Maldives</span></div><p class="sidebar-subnote">Maldives Time · UTC+5</p></div>
    </aside>
    <div class="workspace">
      <header class="topbar"><div class="breadcrumb"><span class="breadcrumb-prefix">Workspace</span><span class="breadcrumb-divider">/</span><strong>${admin ? 'Manage stock' : 'Overview'}</strong></div>
        <div class="topbar-actions"><span class="connection" id="connection" data-state="loading" role="status"><span class="dot"></span><span id="connectionText">Connecting</span></span><span class="action-divider"></span>
          ${!admin ? `<button id="soundToggle" class="icon-button" type="button" aria-label="Disable sound alerts" title="Disable sound alerts" aria-pressed="true">${icon('Bell')}</button>` : ''}
          <button id="darkToggle" class="icon-button" type="button" aria-label="Switch to dark theme" title="Switch to dark theme" aria-pressed="false">${icon('Moon')}</button>
        </div>
      </header>
      <main class="main" id="main" tabindex="-1">${content}</main>
    </div>
    <div class="toast-region" id="toasts" aria-live="polite" aria-atomic="false"></div>`;
  const button = element<HTMLButtonElement>('#darkToggle');
  const syncThemeButton = (): void => {
    const dark = document.documentElement.dataset.theme === 'dark';
    button.innerHTML = icon(dark ? 'Sun' : 'Moon');
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
    button.title = button.getAttribute('aria-label')!;
  };
  syncThemeButton();
  button.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    preference('theme', next);
    syncThemeButton();
  });
}

export function metrics(): string {
  const cards: [StockFilter, string, string, string, string][] = [
    ['all', 'Items tracked', 'Across your inventory', 'Boxes', ''],
    ['healthy', 'Well stocked', 'Above each item guide', 'CircleCheck', 'green'],
    ['watch', 'Watch list', 'Between item limits', 'Clock3', 'amber'],
    ['low', 'Low stock', 'Below each item guide · includes zero', 'TriangleAlert', 'red'],
  ];
  return `<div class="metrics" aria-label="Inventory summary">${cards.map(([filter, label, note, symbol, tone]) => `
    <button type="button" class="metric metric-${tone}" data-filter="${filter}" aria-pressed="false" title="Show ${filter === 'all' ? 'all items' : label.toLowerCase()}">
      <span class="metric-top"><span class="metric-label">${label}</span><span class="metric-icon">${icon(symbol)}</span></span>
      <span class="metric-value" data-count="${filter}">—</span><span class="metric-note">${note}</span>
    </button>`).join('')}</div>`;
}

export function updateMetrics(items: StockItem[]): void {
  const counts = stockCounts(items);
  for (const [key, value] of Object.entries(counts)) element(`[data-count="${key}"]`).textContent = String(value);
  element('#itemCount').textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;
}

export function toolbar(): string {
  return `<div class="toolbar">
    <div class="filter-tabs" role="group" aria-label="Filter by stock level">
      <button class="filter-tab" type="button" data-filter="all" aria-pressed="true">All items</button>
      <button class="filter-tab" type="button" data-filter="watch" aria-pressed="false">Watch list</button>
      <button class="filter-tab" type="button" data-filter="low" aria-pressed="false">Low stock</button>
    </div>
    <div class="search-field">${icon('Search')}<label class="sr-only" for="search">Search stock items</label><input type="search" id="search" placeholder="Search items…" autocomplete="off"><button class="clear-search" id="clearSearch" type="button" title="Clear search" aria-label="Clear search" hidden>${icon('X')}</button></div>
  </div>`;
}

export function bindFilters(onChange: (query: string, filter: StockFilter) => void): () => void {
  let activeFilter: StockFilter = 'all';
  const search = element<HTMLInputElement>('#search');
  const clear = element<HTMLButtonElement>('#clearSearch');
  const update = (): void => {
    clear.hidden = !search.value;
    document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => {
      // Keep the "all items" summary neutral; tabs show the default selection.
      button.setAttribute('aria-pressed', String(button.dataset.filter === activeFilter && (!button.classList.contains('metric') || activeFilter !== 'all')));
    });
    onChange(search.value, activeFilter);
  };
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter as StockFilter;
    update();
  }));
  search.addEventListener('input', update);
  clear.addEventListener('click', () => { search.value = ''; update(); search.focus(); });
  return () => { search.value = ''; activeFilter = 'all'; update(); };
}

export function statusBadge(item: StockItem, extra = ''): string {
  const status = stockStatus(item.quantity, item.low_threshold, item.high_threshold);
  return `<span class="status-badge tone-${status.key} ${extra}">${icon(status.icon)}${status.label}</span>`;
}

export function skeletonRows(columns: number): string {
  return Array.from({ length: 3 }, () => `<tr class="skeleton-row" aria-hidden="true">${Array.from({ length: columns }, (_, index) => `<td><span class="skeleton ${index ? 'short' : ''}"></span></td>`).join('')}</tr>`).join('');
}

export function emptyState(title: string, message: string, action?: string): string {
  return `<div class="empty-state">${icon('Search')}<h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p>${action ? `<button type="button" class="button" id="emptyAction">${escapeHtml(action)}</button>` : ''}</div>`;
}

export function pageFooter(): string {
  return `<footer class="page-footer"><span class="timestamp">${icon('Clock3')}<span id="lastUpdated">Waiting for the first update</span></span><span>VMG · Inventory workspace</span></footer>`;
}

export function setConnection(state: 'loading' | 'live' | 'error', label: string): void {
  element('#connection').dataset.state = state;
  element('#connectionText').textContent = label;
}

export function updatedTime(): void {
  element('#lastUpdated').textContent = `Last synced ${new Date().toLocaleTimeString('en-GB', { timeZone: config.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit' })} MVT`;
}

export function showError(message: string | null): void {
  const container = element('#errorMessage');
  container.hidden = message === null;
  container.innerHTML = message ? `${icon('WifiOff')}<span>${escapeHtml(message)}</span>` : '';
}

export function toast(message: string, error = false): void {
  const node = document.createElement('div');
  node.className = `toast${error ? ' error' : ''}`;
  node.innerHTML = `${icon(error ? 'TriangleAlert' : 'CircleCheck')}<span>${escapeHtml(message)}</span>`;
  element('#toasts').append(node);
  window.setTimeout(() => node.remove(), error ? 8000 : 4000);
}

export function setRefreshing(active: boolean): void {
  const button = element<HTMLButtonElement>('#refreshButton');
  button.disabled = active;
  button.classList.toggle('is-loading', active);
}
