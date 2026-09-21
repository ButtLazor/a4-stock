import { addStock, getStock, removeStock, saveStockOrder, updateStock } from './api.ts';
import { icon } from './icons.ts';
import { DEFAULT_HIGH_THRESHOLD, DEFAULT_LOW_THRESHOLD, escapeHtml, filterStock, matchesFilter, parseGuideLimit, parseQuantity, sortStockItems, swapDisplayOrder, validateStockGuide } from './stock.ts';
import { bindFilters, element, emptyState, metrics, pageFooter, renderShell, setConnection, setRefreshing, showError, skeletonRows, statusBadge, toast, toolbar, updateMetrics, updatedTime } from './ui.ts';
import type { ItemId, StockFilter, StockItem, StockPatch } from './types.ts';

const units = ['PCS', 'BUNDLE', 'REAM', 'BOX', 'ROLL'];
const unitOptions = (selected = 'PCS'): string => [...new Set([...units, selected].filter(Boolean))].map(unit => `<option value="${escapeHtml(unit)}"${unit === selected ? ' selected' : ''}>${escapeHtml(unit)}</option>`).join('');

renderShell('admin', `
  <div class="page-heading"><div><p class="eyebrow">INVENTORY MANAGEMENT</p><h1>Manage stock</h1><p class="page-description">A little order. A smoother workday.</p></div><button type="button" class="button button-primary" id="addButton">${icon('Plus')}Add item</button></div>
  ${metrics()}
  <div class="status-message" id="errorMessage" role="alert" hidden></div>
  <section class="inventory-panel" aria-labelledby="inventoryTitle">
    <div class="panel-heading"><div><div class="panel-title"><h2 id="inventoryTitle">Your inventory</h2><span class="count-badge" id="itemCount">Loading</span></div><p class="panel-subtitle">Set the display order, quantities, units and stock guide for each item.</p></div><button type="button" class="button refresh-button" id="refreshButton">${icon('RefreshCw')}Refresh</button></div>
    ${toolbar()}
    <table class="stock-table admin-table" id="stockTable" aria-label="Manage inventory" aria-busy="true"><thead><tr><th scope="col">Item name</th><th scope="col">Arrangement</th><th scope="col">Unit</th><th scope="col">Quantity</th><th scope="col">Stock guide</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody id="stockBody">${skeletonRows(7)}</tbody></table>
    <div id="emptyState" hidden></div>
    <div class="panel-footer"><span id="resultCount" role="status">Loading inventory…</span><span class="save-note" id="saveState">${icon('CheckCheck')}Changes save automatically</span></div>
  </section>${pageFooter()}
  <dialog id="itemModal" class="modal" aria-labelledby="itemModalTitle">
    <form id="itemForm" class="modal-content">
      <div class="modal-header"><div><div class="modal-title-icon">${icon('Package')}</div><h2 id="itemModalTitle">Add a new item</h2><p class="modal-description" id="itemModalDescription">Keep your inventory up to date.</p></div><button type="button" class="icon-button" data-close="itemModal" aria-label="Close item form">${icon('X')}</button></div>
      <div id="itemError" class="form-error" role="alert" hidden></div>
      <div class="form-field"><label for="itemName">Item name</label><input id="itemName" name="name" type="text" placeholder="e.g. Paper One A4" required maxlength="250" autocomplete="off"></div>
      <div class="field-row"><div class="form-field"><label for="itemUom">Unit of measure</label><select id="itemUom" name="uom">${unitOptions()}</select></div><div class="form-field"><label for="itemQuantity">Quantity</label><input id="itemQuantity" name="quantity" type="number" inputmode="numeric" min="0" step="1" placeholder="0" required></div></div>
      <div class="field-row"><div class="form-field"><label for="itemLowThreshold">Low stock below</label><input id="itemLowThreshold" name="lowThreshold" type="number" inputmode="numeric" min="0" step="1" value="${DEFAULT_LOW_THRESHOLD}" required></div><div class="form-field"><label for="itemHighThreshold">Well stocked above</label><input id="itemHighThreshold" name="highThreshold" type="number" inputmode="numeric" min="0" step="1" value="${DEFAULT_HIGH_THRESHOLD}" required></div></div>
      <p class="field-hint">Use 0 for out of stock. Quantities between the two guide values appear on the watch list.</p>
      <div class="modal-actions"><button type="button" class="button" data-close="itemModal">Cancel</button><button type="submit" class="button button-primary" id="itemSubmit">${icon('Plus')}Add item</button></div>
    </form>
  </dialog>
  <dialog id="deleteModal" class="modal" aria-labelledby="deleteTitle">
    <div class="modal-content"><div class="modal-header"><div><div class="modal-title-icon danger">${icon('Trash2')}</div><h2 id="deleteTitle">Delete this item?</h2></div><button type="button" class="icon-button" data-close="deleteModal" aria-label="Close delete confirmation">${icon('X')}</button></div>
      <p class="modal-description" id="deleteDescription"></p><div id="deleteError" class="form-error" role="alert" hidden></div>
      <div class="modal-actions"><button type="button" class="button" data-close="deleteModal" id="deleteCancel">Keep item</button><button type="button" class="button button-danger" id="confirmDelete">${icon('Trash2')}Delete item</button></div>
    </div>
  </dialog>`);

let items: StockItem[] | null = null;
let search = '';
let filter: StockFilter = 'all';
let loading = false;
let editingId: ItemId | null = null;
let deletingId: ItemId | null = null;
let modalSaving = false;
const pending = new Set<string>();
const itemModal = element<HTMLDialogElement>('#itemModal');
const deleteModal = element<HTMLDialogElement>('#deleteModal');
const itemForm = element<HTMLFormElement>('#itemForm');
const itemName = element<HTMLInputElement>('#itemName');
const itemUom = element<HTMLSelectElement>('#itemUom');
const itemQuantity = element<HTMLInputElement>('#itemQuantity');
const itemLowThreshold = element<HTMLInputElement>('#itemLowThreshold');
const itemHighThreshold = element<HTMLInputElement>('#itemHighThreshold');
const findItem = (id: ItemId): StockItem | undefined => items?.find(item => String(item.id) === String(id));
const sorted = (data: StockItem[]): StockItem[] => sortStockItems(data);

function movementState(item: StockItem): { canMoveUp: boolean; canMoveDown: boolean } {
  const group = sorted((items ?? []).filter(candidate => candidate.is_pinned === item.is_pinned));
  const index = group.findIndex(candidate => String(candidate.id) === String(item.id));
  return { canMoveUp: index > 0, canMoveDown: index >= 0 && index < group.length - 1 };
}

function rowHtml(item: StockItem): string {
  const id = escapeHtml(item.id);
  const name = escapeHtml(item.Item);
  const saving = pending.has(String(item.id));
  const disabled = saving ? ' disabled' : '';
  const { canMoveUp, canMoveDown } = movementState(item);
  return `<tr data-id="${id}" class="${saving ? 'row-saving ' : ''}${item.is_pinned ? 'is-pinned-row' : ''}">
    <td class="item-cell-column"><div class="item-cell"><span class="item-symbol">${icon('Layers')}</span><div><button type="button" class="item-edit" data-action="edit" aria-label="Edit ${name}"${disabled}><span>${name}</span>${icon('Pencil')}</button><div class="item-meta">Click name to edit</div></div></div></td>
    <td class="arrangement-cell"><span class="mobile-field-label">Arrangement</span><div class="arrangement-controls"><button type="button" class="pin-toggle${item.is_pinned ? ' is-pinned' : ''}" data-action="toggle-pin" aria-label="${item.is_pinned ? 'Unpin' : 'Pin'} ${name}" aria-pressed="${item.is_pinned}" title="${item.is_pinned ? 'Unpin from the top' : 'Pin to the top of the TV list'}"${disabled}>${icon('Pin')}</button><div class="move-controls" role="group" aria-label="Move ${name}"><button type="button" class="order-button" data-action="move-up" aria-label="Move ${name} up" title="Move up"${saving || !canMoveUp ? ' disabled' : ''}>↑</button><button type="button" class="order-button" data-action="move-down" aria-label="Move ${name} down" title="Move down"${saving || !canMoveDown ? ' disabled' : ''}>↓</button></div></div></td>
    <td class="uom-cell"><label class="mobile-field-label" for="unit-${id}">Unit of measure</label><select class="table-select" id="unit-${id}" data-field="uom" aria-label="Unit for ${name}"${disabled}>${item.uom ? unitOptions(item.uom) : '<option value="" selected disabled>Set unit</option>' + unitOptions('')}</select></td>
    <td class="quantity-cell"><label class="mobile-field-label" for="quantity-${id}">Quantity</label><input class="table-input" id="quantity-${id}" type="number" data-field="quantity" value="${item.quantity ?? ''}" min="0" step="1" inputmode="numeric" aria-label="Quantity for ${name}"${disabled}></td>
    <td class="guide-cell"><div class="guide-fields"><label for="low-${id}"><span>Low below</span><input class="table-input guide-input" id="low-${id}" type="number" data-field="low_threshold" value="${item.low_threshold}" min="0" step="1" inputmode="numeric" aria-label="Low stock below for ${name}"${disabled}></label><label for="high-${id}"><span>Well above</span><input class="table-input guide-input" id="high-${id}" type="number" data-field="high_threshold" value="${item.high_threshold}" min="0" step="1" inputmode="numeric" aria-label="Well stocked above for ${name}"${disabled}></label></div></td>
    <td class="row-status"><span class="mobile-field-label">Status</span>${statusBadge(item)}</td>
    <td class="row-actions"><button type="button" class="icon-button delete-button" data-action="delete" aria-label="Delete ${name}" title="Delete item"${disabled}>${icon('Trash2')}</button></td>
  </tr>`;
}

function updateFooter(): void {
  if (!items) return;
  const visible = filterStock(items, search, filter);
  element('#resultCount').textContent = `Showing ${visible.length} of ${items.length} ${items.length === 1 ? 'item' : 'items'}`;
  element('#stockTable').hidden = !visible.length;
  element('#emptyState').hidden = !!visible.length;
  updateMetrics(items);
  if (!visible.length) {
    element('#emptyState').innerHTML = emptyState(items.length ? 'No matching items' : 'Make room for your first item', items.length ? 'Try another search or stock level.' : 'Add an item to start tracking your stock.', items.length ? 'Clear filters' : 'Add item');
    element('#emptyAction').addEventListener('click', items.length ? resetFilters : () => openItem());
  }
}

function render(): void {
  if (!items) return;
  element('#stockBody').innerHTML = filterStock(items, search, filter).map(rowHtml).join('');
  element('#stockTable').setAttribute('aria-busy', 'false');
  updateFooter();
}

const resetFilters = bindFilters((query, selected) => { search = query; filter = selected; render(); });

async function loadStock(manual = false): Promise<void> {
  if (loading || pending.size || modalSaving) return;
  loading = true;
  setRefreshing(true);
  try {
    items = await getStock();
    render();
    showError(null);
    setConnection('live', 'Connected');
    updatedTime();
    if (manual) toast('Inventory refreshed.');
  } catch {
    setConnection('error', 'Disconnected');
    showError(items ? 'Unable to refresh. Showing the last synced inventory. Try again when your connection returns.' : 'Unable to load inventory. Check your connection and try Refresh.');
    if (items === null) {
      element('#stockTable').hidden = true;
      const empty = element('#emptyState');
      empty.hidden = false;
      empty.innerHTML = emptyState('Inventory could not load', 'Your existing items have not been changed.', 'Try again');
      element('#emptyAction').addEventListener('click', () => void loadStock(true));
      element('#resultCount').textContent = 'Waiting for a connection';
      element('#itemCount').textContent = 'Unavailable';
    }
  } finally { loading = false; setRefreshing(false); }
}

function savingStatus(): void {
  element('#saveState').innerHTML = `${icon(pending.size ? 'LoaderCircle' : 'CheckCheck')}${pending.size ? 'Saving changes…' : 'Changes save automatically'}`;
  element<HTMLButtonElement>('#refreshButton').disabled = pending.size > 0 || loading;
}

type EditableField = 'quantity' | 'uom' | 'low_threshold' | 'high_threshold';

async function saveField(id: ItemId, field: EditableField, control: HTMLInputElement | HTMLSelectElement): Promise<void> {
  const current = findItem(id);
  if (!current || pending.has(String(id))) return;
  let patch: StockPatch;
  try {
    if (field === 'uom') patch = { uom: control.value };
    else if (field === 'quantity') patch = { quantity: parseQuantity(control.value) };
    else {
      const value = parseGuideLimit(control.value, field === 'low_threshold' ? 'Low-stock limit' : 'Well-stocked limit');
      const low = field === 'low_threshold' ? value : current.low_threshold;
      const high = field === 'high_threshold' ? value : current.high_threshold;
      validateStockGuide(low, high);
      patch = field === 'low_threshold' ? { low_threshold: value } : { high_threshold: value };
    }
  } catch (error) {
    control.value = String(current[field] ?? '');
    toast(error instanceof Error ? error.message : 'Enter a valid value.', true);
    return;
  }
  if (patch[field] === current[field]) return;
  const idKey = String(id);
  pending.add(idKey);
  const row = control.closest('tr')!;
  row.classList.add('row-saving');
  row.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input, select, button').forEach(input => input.disabled = true);
  savingStatus();
  try {
    const saved = await updateStock(id, patch);
    items = items!.map(item => String(item.id) === idKey ? saved : item);
    setConnection('live', 'Connected');
    showError(null);
    updatedTime();
    const savedLabel = field === 'quantity' ? 'quantity' : field === 'uom' ? 'unit' : 'stock guide';
    toast(`${saved.Item}: ${savedLabel} saved.`);
  } catch {
    toast('Changes could not be confirmed. Refresh before retrying.', true);
  } finally {
    pending.delete(idKey);
    // Replace only this row, so editing another item is never interrupted.
    const renderedRow = Array.from(element('#stockBody').querySelectorAll<HTMLTableRowElement>('tr')).find(tr => tr.dataset.id === idKey);
    const saved = findItem(id);
    if (renderedRow && saved) {
      if (matchesFilter(saved, filter) && filterStock([saved], search, filter).length) renderedRow.outerHTML = rowHtml(saved);
      else renderedRow.remove();
    }
    updateFooter();
    savingStatus();
  }
}

element('#stockBody').addEventListener('change', event => {
  const control = event.target;
  if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) return;
  const id = control.closest<HTMLTableRowElement>('tr')?.dataset.id;
  const field = control.dataset.field;
  if (id !== undefined && (field === 'quantity' || field === 'uom' || field === 'low_threshold' || field === 'high_threshold')) void saveField(id, field, control);
});
element('#stockBody').addEventListener('keydown', event => {
  if (event instanceof KeyboardEvent && event.key === 'Enter' && event.target instanceof HTMLInputElement) event.target.blur();
});

function mergeSaved(savedItems: StockItem[]): void {
  const saved = new Map(savedItems.map(item => [String(item.id), item]));
  items = sorted((items ?? []).map(item => saved.get(String(item.id)) ?? item));
}

async function togglePin(item: StockItem): Promise<void> {
  const idKey = String(item.id);
  if (!items || pending.has(idKey)) return;
  const willBePinned = !item.is_pinned;
  const positions = items.filter(candidate => candidate.is_pinned === willBePinned).map(candidate => candidate.display_order);
  const displayOrder = positions.length ? (willBePinned ? Math.min(...positions) - 10 : Math.max(...positions) + 10) : 0;
  pending.add(idKey);
  savingStatus();
  render();
  try {
    const saved = await updateStock(item.id, { is_pinned: willBePinned, display_order: displayOrder });
    mergeSaved([saved]);
    setConnection('live', 'Connected');
    showError(null);
    updatedTime();
    toast(`${saved.Item} ${willBePinned ? 'pinned to the top' : 'returned to the regular list'}.`);
  } catch {
    toast('The pinned position could not be saved. Refresh before retrying.', true);
  } finally {
    pending.delete(idKey);
    render();
    savingStatus();
  }
}

async function moveItem(item: StockItem, direction: -1 | 1): Promise<void> {
  if (!items) return;
  const group = sorted(items.filter(candidate => candidate.is_pinned === item.is_pinned));
  const currentIndex = group.findIndex(candidate => String(candidate.id) === String(item.id));
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= group.length || group.some(candidate => pending.has(String(candidate.id)))) return;
  const changes = swapDisplayOrder(group[currentIndex], group[nextIndex]);
  const affectedIds = changes.map(candidate => String(candidate.id));
  affectedIds.forEach(id => pending.add(id));
  savingStatus();
  render();
  let failed = false;
  try {
    mergeSaved(await saveStockOrder(changes));
    setConnection('live', 'Connected');
    showError(null);
    updatedTime();
    toast(`${item.Item} moved ${direction < 0 ? 'up' : 'down'}.`);
  } catch (error) {
    failed = true;
    console.error('Unable to save the new list order.', error);
    toast('The new list order could not be saved. Refresh before retrying.', true);
  } finally {
    affectedIds.forEach(id => pending.delete(id));
    savingStatus();
    if (failed) await loadStock();
    else render();
  }
}

element('#stockBody').addEventListener('click', event => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>('button[data-action]');
  const id = button?.closest<HTMLTableRowElement>('tr')?.dataset.id;
  if (id === undefined || !button || pending.has(id)) return;
  const item = findItem(id);
  if (!item) return;
  if (button.dataset.action === 'edit') openItem(item);
  else if (button.dataset.action === 'delete') openDelete(item);
  else if (button.dataset.action === 'toggle-pin') void togglePin(item);
  else if (button.dataset.action === 'move-up') void moveItem(item, -1);
  else if (button.dataset.action === 'move-down') void moveItem(item, 1);
});

function openItem(item?: StockItem): void {
  editingId = item?.id ?? null;
  itemForm.reset();
  itemName.value = item?.Item ?? '';
  itemUom.innerHTML = unitOptions(item?.uom ?? 'PCS');
  itemQuantity.value = item ? String(item.quantity ?? '') : '';
  itemLowThreshold.value = String(item?.low_threshold ?? DEFAULT_LOW_THRESHOLD);
  itemHighThreshold.value = String(item?.high_threshold ?? DEFAULT_HIGH_THRESHOLD);
  element('#itemModalTitle').textContent = item ? 'Edit item' : 'Add a new item';
  element('#itemModalDescription').textContent = item ? 'Update the details for this item.' : 'Keep your inventory up to date.';
  element('#itemSubmit').innerHTML = `${icon(item ? 'Check' : 'Plus')}${item ? 'Save changes' : 'Add item'}`;
  element('#itemError').hidden = true;
  itemModal.showModal();
  itemName.focus();
}

function openDelete(item: StockItem): void {
  deletingId = item.id;
  element('#deleteDescription').textContent = `“${item.Item}” will be removed from your inventory. This cannot be undone.`;
  element('#deleteError').hidden = true;
  deleteModal.showModal();
  element('#deleteCancel').focus();
}

function modalBusy(dialog: HTMLDialogElement, busy: boolean): void {
  modalSaving = busy;
  dialog.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button, input, select').forEach(control => control.disabled = busy);
  dialog.setAttribute('aria-busy', String(busy));
}

function modalError(selector: string, message: string): void {
  element(selector).textContent = message;
  element(selector).hidden = false;
}

document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(button => button.addEventListener('click', () => {
  if (!modalSaving) element<HTMLDialogElement>(`#${button.dataset.close}`).close();
}));
for (const dialog of [itemModal, deleteModal]) {
  dialog.addEventListener('cancel', event => { if (modalSaving) event.preventDefault(); });
}

itemForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (modalSaving) return;
  const name = itemName.value.trim();
  if (!name) { modalError('#itemError', 'Enter an item name.'); itemName.focus(); return; }
  let quantity: number;
  let lowThreshold: number;
  let highThreshold: number;
  try {
    quantity = parseQuantity(itemQuantity.value);
    lowThreshold = parseGuideLimit(itemLowThreshold.value, 'Low-stock limit');
    highThreshold = parseGuideLimit(itemHighThreshold.value, 'Well-stocked limit');
    validateStockGuide(lowThreshold, highThreshold);
  }
  catch (error) { modalError('#itemError', (error as Error).message); return; }
  const wasEditing = editingId !== null;
  const current = editingId !== null ? findItem(editingId) : undefined;
  const nextOrder = items?.length ? Math.max(...items.map(item => item.display_order)) + 10 : 0;
  const input = { Item: name, uom: itemUom.value, quantity, is_pinned: current?.is_pinned ?? false, display_order: current?.display_order ?? nextOrder, low_threshold: lowThreshold, high_threshold: highThreshold };
  modalBusy(itemModal, true);
  element('#itemError').hidden = true;
  element('#itemSubmit').textContent = 'Saving…';
  try {
    const saved = editingId !== null ? await updateStock(editingId, input) : await addStock(input);
    if (items !== null) items = sorted(wasEditing ? items.map(item => String(item.id) === String(saved.id) ? saved : item) : [...items, saved]);
    itemModal.close();
    render();
    setConnection('live', 'Connected');
    updatedTime();
    toast(wasEditing ? 'Item updated.' : 'Item added to your inventory.');
  } catch {
    modalError('#itemError', 'The save could not be confirmed. Check your connection and refresh the inventory before trying again.');
  } finally {
    modalBusy(itemModal, false);
    element('#itemSubmit').innerHTML = `${icon(wasEditing ? 'Check' : 'Plus')}${wasEditing ? 'Save changes' : 'Add item'}`;
    if (items === null && !itemModal.open) void loadStock();
  }
});

element('#confirmDelete').addEventListener('click', async () => {
  if (deletingId === null || modalSaving) return;
  modalBusy(deleteModal, true);
  element('#deleteError').hidden = true;
  try {
    await removeStock(deletingId);
    items = items!.filter(item => String(item.id) !== String(deletingId));
    deleteModal.close();
    render();
    toast('Item deleted.');
    setConnection('live', 'Connected');
    updatedTime();
    // The trigger row no longer exists, so return focus to a stable control.
    element('#addButton').focus();
  } catch { modalError('#deleteError', 'The deletion could not be confirmed. Refresh the inventory before trying again.'); }
  finally { modalBusy(deleteModal, false); }
});

element('#addButton').addEventListener('click', () => openItem());
element('#refreshButton').addEventListener('click', () => void loadStock(true));
window.addEventListener('online', () => void loadStock());
window.addEventListener('beforeunload', event => {
  if (pending.size || modalSaving) event.preventDefault();
});
void loadStock();
