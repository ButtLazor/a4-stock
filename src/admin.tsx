import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './AppShell.tsx';
import type { ConnectionState, ToastMessage } from './AppShell.tsx';
import { addStock, getStock, removeStock, saveStockOrder, updateStock } from './api.ts';
import { config } from './config.ts';
import { Icon } from './Icon.tsx';
import {
  DEFAULT_HIGH_THRESHOLD,
  DEFAULT_LOW_THRESHOLD,
  filterStock,
  parseGuideLimit,
  parseQuantity,
  sortStockItems,
  stockCounts,
  stockStatus,
  swapDisplayOrder,
  validateStockGuide,
} from './stock.ts';
import { cx } from './style.ts';
import type { ItemId, StockFilter, StockInput, StockItem, StockPatch } from './types.ts';

const units = ['PCS', 'BUNDLE', 'REAM', 'BOX', 'ROLL'];
let toastSequence = 0;
type EditableField = 'quantity' | 'uom' | 'low_threshold' | 'high_threshold';
type ItemDetails = Pick<StockInput, 'Item' | 'uom' | 'quantity' | 'low_threshold' | 'high_threshold'>;

function formatUpdatedTime(date: Date | null): string {
  if (!date) return 'Waiting for the first update';
  return `Last synced ${date.toLocaleTimeString('en-GB', { timeZone: config.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit' })} MVT`;
}

function StatusBadge({ item }: { item: StockItem }) {
  const status = stockStatus(item.quantity, item.low_threshold, item.high_threshold);
  return <span className={cx('status-badge', `tone-${status.key}`)}><Icon name={status.icon} />{status.label}</span>;
}

function MetricCards({ items, filter, onFilter }: { items: StockItem[]; filter: StockFilter; onFilter: (filter: StockFilter) => void }) {
  const counts = stockCounts(items);
  const cards: Array<[StockFilter, string, string, string, string]> = [
    ['all', 'Items tracked', 'Across your inventory', 'Package', ''],
    ['healthy', 'Well stocked', 'Above each item guide', 'CircleCheck', 'green'],
    ['watch', 'Watch list', 'Between item limits', 'Clock3', 'amber'],
    ['low', 'Low stock', 'Below each item guide · includes zero', 'TriangleAlert', 'red'],
  ];
  return (
    <div className={cx('metrics')} aria-label="Inventory summary">
      {cards.map(([key, label, note, symbol, tone]) => (
        <button type="button" className={cx('metric', tone && `metric-${tone}`)} key={key} onClick={() => onFilter(key)} aria-pressed={filter === key && key !== 'all'} title={`Show ${key === 'all' ? 'all items' : label.toLowerCase()}`}>
          <span className={cx('metric-top')}><span className={cx('metric-label')}>{label}</span><span className={cx('metric-icon')}><Icon name={symbol} /></span></span>
          <span className={cx('metric-value')}>{counts[key]}</span><span className={cx('metric-note')}>{note}</span>
        </button>
      ))}
    </div>
  );
}

type StockRowProps = {
  item: StockItem;
  canMoveUp: boolean;
  canMoveDown: boolean;
  saving: boolean;
  onSaveField: (id: ItemId, field: EditableField, value: string) => Promise<boolean>;
  onEdit: (item: StockItem) => void;
  onDelete: (item: StockItem) => void;
  onTogglePin: (item: StockItem) => void;
  onMove: (item: StockItem, direction: -1 | 1) => void;
};

function StockRow({ item, canMoveUp, canMoveDown, saving, onSaveField, onEdit, onDelete, onTogglePin, onMove }: StockRowProps) {
  const [uom, setUom] = useState(item.uom ?? '');
  const [quantity, setQuantity] = useState(String(item.quantity ?? ''));
  const [low, setLow] = useState(String(item.low_threshold));
  const [high, setHigh] = useState(String(item.high_threshold));
  const id = String(item.id);
  const availableUnits = [...new Set([...units, item.uom ?? ''].filter(Boolean))];

  useEffect(() => setUom(item.uom ?? ''), [item.uom]);
  useEffect(() => setQuantity(String(item.quantity ?? '')), [item.quantity]);
  useEffect(() => setLow(String(item.low_threshold)), [item.low_threshold]);
  useEffect(() => setHigh(String(item.high_threshold)), [item.high_threshold]);

  const save = async (field: EditableField, value: string) => {
    const success = await onSaveField(item.id, field, value);
    if (!success) {
      if (field === 'uom') setUom(item.uom ?? '');
      if (field === 'quantity') setQuantity(String(item.quantity ?? ''));
      if (field === 'low_threshold') setLow(String(item.low_threshold));
      if (field === 'high_threshold') setHigh(String(item.high_threshold));
    }
  };
  const blurOnEnter = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
  };

  return (
    <tr className={cx(saving && 'row-saving', item.is_pinned && 'is-pinned-row')}>
      <td className={cx('item-cell-column')}>
        <div className={cx('item-cell')}><span className={cx('item-symbol')}><Icon name="Layers" /></span><div>
          <button type="button" className={cx('item-edit')} aria-label={`Edit ${item.Item}`} disabled={saving} onClick={() => onEdit(item)}><span>{item.Item}</span><Icon name="Pencil" /></button>
          <div className={cx('item-meta')}>{item.is_pinned ? 'Pinned · Click name to edit' : 'Click name to edit'}</div>
        </div></div>
      </td>
      <td className={cx('arrangement-cell')}>
        <span className={cx('mobile-field-label')}>Arrangement</span>
        <div className={cx('arrangement-controls')}>
          <button type="button" className={cx('pin-toggle', item.is_pinned && 'is-pinned')} aria-label={`${item.is_pinned ? 'Unpin' : 'Pin'} ${item.Item}`} aria-pressed={item.is_pinned} title={item.is_pinned ? 'Unpin from the top' : 'Pin to the top of the TV list'} disabled={saving} onClick={() => onTogglePin(item)}><Icon name="Pin" /></button>
          <div className={cx('move-controls')} role="group" aria-label={`Move ${item.Item}`}>
            <button type="button" className={cx('order-button')} aria-label={`Move ${item.Item} up`} title="Move up" disabled={saving || !canMoveUp} onClick={() => onMove(item, -1)}>↑</button>
            <button type="button" className={cx('order-button')} aria-label={`Move ${item.Item} down`} title="Move down" disabled={saving || !canMoveDown} onClick={() => onMove(item, 1)}>↓</button>
          </div>
        </div>
      </td>
      <td className={cx('uom-cell')}>
        <label className={cx('mobile-field-label')} htmlFor={`unit-${id}`}>Unit of measure</label>
        <select className={cx('table-select')} id={`unit-${id}`} value={uom} aria-label={`Unit for ${item.Item}`} disabled={saving} onChange={event => { setUom(event.target.value); void save('uom', event.target.value); }}>
          {!uom ? <option value="" disabled>Set unit</option> : null}
          {availableUnits.map(unit => <option value={unit} key={unit}>{unit}</option>)}
        </select>
      </td>
      <td className={cx('quantity-cell')}>
        <label className={cx('mobile-field-label')} htmlFor={`quantity-${id}`}>Quantity</label>
        <input className={cx('table-input')} id={`quantity-${id}`} type="number" value={quantity} min="0" step="1" inputMode="numeric" aria-label={`Quantity for ${item.Item}`} disabled={saving} onChange={event => setQuantity(event.target.value)} onBlur={() => void save('quantity', quantity)} onKeyDown={blurOnEnter} />
      </td>
      <td className={cx('guide-cell')}>
        <div className={cx('guide-fields')}>
          <label htmlFor={`low-${id}`}><span>Low below</span><input className={cx('table-input', 'guide-input')} id={`low-${id}`} type="number" value={low} min="0" step="1" inputMode="numeric" aria-label={`Low stock below for ${item.Item}`} disabled={saving} onChange={event => setLow(event.target.value)} onBlur={() => void save('low_threshold', low)} onKeyDown={blurOnEnter} /></label>
          <label htmlFor={`high-${id}`}><span>Well above</span><input className={cx('table-input', 'guide-input')} id={`high-${id}`} type="number" value={high} min="0" step="1" inputMode="numeric" aria-label={`Well stocked above for ${item.Item}`} disabled={saving} onChange={event => setHigh(event.target.value)} onBlur={() => void save('high_threshold', high)} onKeyDown={blurOnEnter} /></label>
        </div>
      </td>
      <td className={cx('row-status')}><span className={cx('mobile-field-label')}>Status</span><StatusBadge item={item} /></td>
      <td className={cx('row-actions')}><button type="button" className={cx('icon-button', 'delete-button')} aria-label={`Delete ${item.Item}`} title="Delete item" disabled={saving} onClick={() => onDelete(item)}><Icon name="Trash2" /></button></td>
    </tr>
  );
}

function useDialog(open: boolean, onClose: () => void, busy: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    const handleCancel = (event: Event) => {
      if (busy) event.preventDefault();
    };
    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [busy, onClose]);
  return ref;
}

type ItemDialogProps = {
  target: StockItem | null | undefined;
  busy: boolean;
  onClose: () => void;
  onSave: (details: ItemDetails) => Promise<boolean>;
};

function ItemDialog({ target, busy, onClose, onSave }: ItemDialogProps) {
  const open = target !== undefined;
  const dialogRef = useDialog(open, onClose, busy);
  const [name, setName] = useState('');
  const [uom, setUom] = useState('PCS');
  const [quantity, setQuantity] = useState('');
  const [low, setLow] = useState(String(DEFAULT_LOW_THRESHOLD));
  const [high, setHigh] = useState(String(DEFAULT_HIGH_THRESHOLD));
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(target?.Item ?? '');
    setUom(target?.uom ?? 'PCS');
    setQuantity(target ? String(target.quantity ?? '') : '');
    setLow(String(target?.low_threshold ?? DEFAULT_LOW_THRESHOLD));
    setHigh(String(target?.high_threshold ?? DEFAULT_HIGH_THRESHOLD));
    setError('');
    requestAnimationFrame(() => nameRef.current?.focus());
  }, [open, target]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const itemName = name.trim();
    if (!itemName) {
      setError('Enter an item name.');
      nameRef.current?.focus();
      return;
    }
    try {
      const parsedQuantity = parseQuantity(quantity);
      const lowThreshold = parseGuideLimit(low, 'Low-stock limit');
      const highThreshold = parseGuideLimit(high, 'Well-stocked limit');
      validateStockGuide(lowThreshold, highThreshold);
      setError('');
      const saved = await onSave({ Item: itemName, uom, quantity: parsedQuantity, low_threshold: lowThreshold, high_threshold: highThreshold });
      if (!saved) setError('The save could not be confirmed. Check your connection and refresh before trying again.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Enter valid item details.');
    }
  };

  const availableUnits = [...new Set([...units, uom].filter(Boolean))];
  return (
    <dialog ref={dialogRef} className={cx('modal')} aria-labelledby="itemModalTitle" aria-busy={busy}>
      <form className={cx('modal-content')} onSubmit={event => void submit(event)}>
        <div className={cx('modal-header')}><div><div className={cx('modal-title-icon')}><Icon name="Package" /></div><h2 id="itemModalTitle">{target ? 'Edit item' : 'Add a new item'}</h2><p className={cx('modal-description')}>{target ? 'Update the details for this item.' : 'Keep your inventory up to date.'}</p></div><button type="button" className={cx('icon-button')} aria-label="Close item form" disabled={busy} onClick={onClose}><Icon name="X" /></button></div>
        <div className={cx('form-error')} role="alert" hidden={!error}>{error}</div>
        <div className={cx('form-field')}><label htmlFor="itemName">Item name</label><input ref={nameRef} id="itemName" type="text" value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Paper One A4" required maxLength={250} autoComplete="off" disabled={busy} /></div>
        <div className={cx('field-row')}><div className={cx('form-field')}><label htmlFor="itemUom">Unit of measure</label><select id="itemUom" value={uom} onChange={event => setUom(event.target.value)} disabled={busy}>{availableUnits.map(unit => <option value={unit} key={unit}>{unit}</option>)}</select></div><div className={cx('form-field')}><label htmlFor="itemQuantity">Quantity</label><input id="itemQuantity" type="number" value={quantity} onChange={event => setQuantity(event.target.value)} inputMode="numeric" min="0" step="1" placeholder="0" required disabled={busy} /></div></div>
        <div className={cx('field-row')}><div className={cx('form-field')}><label htmlFor="itemLowThreshold">Low stock below</label><input id="itemLowThreshold" type="number" value={low} onChange={event => setLow(event.target.value)} inputMode="numeric" min="0" step="1" required disabled={busy} /></div><div className={cx('form-field')}><label htmlFor="itemHighThreshold">Well stocked above</label><input id="itemHighThreshold" type="number" value={high} onChange={event => setHigh(event.target.value)} inputMode="numeric" min="0" step="1" required disabled={busy} /></div></div>
        <p className={cx('field-hint')}>Use 0 for out of stock. Quantities between the two guide values appear on the watch list.</p>
        <div className={cx('modal-actions')}><button type="button" className={cx('button')} disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className={cx('button', 'button-primary')} disabled={busy}>{busy ? <Icon name="LoaderCircle" /> : <Icon name={target ? 'Check' : 'Plus'} />}{busy ? 'Saving…' : target ? 'Save changes' : 'Add item'}</button></div>
      </form>
    </dialog>
  );
}

function DeleteDialog({ target, busy, error, onClose, onConfirm }: { target: StockItem | undefined; busy: boolean; error: string; onClose: () => void; onConfirm: () => void }) {
  const dialogRef = useDialog(Boolean(target), onClose, busy);
  return (
    <dialog ref={dialogRef} className={cx('modal')} aria-labelledby="deleteTitle" aria-busy={busy}>
      <div className={cx('modal-content')}>
        <div className={cx('modal-header')}><div><div className={cx('modal-title-icon', 'danger')}><Icon name="Trash2" /></div><h2 id="deleteTitle">Delete this item?</h2></div><button type="button" className={cx('icon-button')} aria-label="Close delete confirmation" disabled={busy} onClick={onClose}><Icon name="X" /></button></div>
        <p className={cx('modal-description')}>“{target?.Item}” will be removed from your inventory. This cannot be undone.</p>
        <div className={cx('form-error')} role="alert" hidden={!error}>{error}</div>
        <div className={cx('modal-actions')}><button type="button" className={cx('button')} disabled={busy} onClick={onClose}>Keep item</button><button type="button" className={cx('button', 'button-danger')} disabled={busy} onClick={onConfirm}><Icon name="Trash2" />{busy ? 'Deleting…' : 'Delete item'}</button></div>
      </div>
    </dialog>
  );
}

function AdminApp() {
  const [items, setItemsState] = useState<StockItem[] | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [connection, setConnection] = useState<{ state: ConnectionState; label: string }>({ state: 'loading', label: 'Connecting' });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pageError, setPageError] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [itemTarget, setItemTarget] = useState<StockItem | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<StockItem | undefined>(undefined);
  const [deleteError, setDeleteError] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const itemsRef = useRef<StockItem[] | null>(null);
  const pendingRef = useRef<Set<string>>(new Set());
  const loadingRef = useRef(false);
  const modalSavingRef = useRef(false);
  const toastTimers = useRef<number[]>([]);

  const setItems = useCallback((next: StockItem[] | null) => {
    itemsRef.current = next;
    setItemsState(next);
  }, []);

  const pushToast = useCallback((message: string, error = false) => {
    const id = ++toastSequence;
    setToasts(current => [...current, { id, message, error }]);
    const timer = window.setTimeout(() => setToasts(current => current.filter(toast => toast.id !== id)), error ? 8000 : 4000);
    toastTimers.current.push(timer);
  }, []);

  useEffect(() => () => toastTimers.current.forEach(window.clearTimeout), []);

  const markPending = useCallback((ids: string[], active: boolean) => {
    const next = new Set(pendingRef.current);
    ids.forEach(id => active ? next.add(id) : next.delete(id));
    pendingRef.current = next;
    setPending(next);
  }, []);

  const loadStock = useCallback(async (manual = false) => {
    if (loadingRef.current || pendingRef.current.size || modalSavingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const data = sortStockItems(await getStock());
      setItems(data);
      setPageError('');
      setConnection({ state: 'live', label: 'Connected' });
      setLastUpdated(new Date());
      if (manual) pushToast('Inventory refreshed.');
    } catch {
      setConnection({ state: 'error', label: 'Disconnected' });
      setPageError(itemsRef.current ? 'Unable to refresh. Showing the last synced inventory. Try again when your connection returns.' : 'Unable to load inventory. Check your connection and try Refresh.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [pushToast, setItems]);

  useEffect(() => {
    void loadStock();
    const onOnline = () => void loadStock();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [loadStock]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (pendingRef.current.size || modalSavingRef.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  const visibleItems = useMemo(() => items ? filterStock(items, search, filter) : [], [items, search, filter]);

  const saveField = useCallback(async (id: ItemId, field: EditableField, rawValue: string): Promise<boolean> => {
    const current = itemsRef.current?.find(item => String(item.id) === String(id));
    const idKey = String(id);
    if (!current || pendingRef.current.has(idKey)) return false;
    let patch: StockPatch;
    try {
      if (field === 'uom') patch = { uom: rawValue };
      else if (field === 'quantity') patch = { quantity: parseQuantity(rawValue) };
      else {
        const value = parseGuideLimit(rawValue, field === 'low_threshold' ? 'Low-stock limit' : 'Well-stocked limit');
        const low = field === 'low_threshold' ? value : current.low_threshold;
        const high = field === 'high_threshold' ? value : current.high_threshold;
        validateStockGuide(low, high);
        patch = field === 'low_threshold' ? { low_threshold: value } : { high_threshold: value };
      }
    } catch (reason) {
      pushToast(reason instanceof Error ? reason.message : 'Enter a valid value.', true);
      return false;
    }
    if (patch[field] === current[field]) return true;
    markPending([idKey], true);
    try {
      const saved = await updateStock(id, patch);
      setItems(sortStockItems((itemsRef.current ?? []).map(item => String(item.id) === idKey ? saved : item)));
      setConnection({ state: 'live', label: 'Connected' });
      setPageError('');
      setLastUpdated(new Date());
      pushToast(`${saved.Item}: ${field === 'quantity' ? 'quantity' : field === 'uom' ? 'unit' : 'stock guide'} saved.`);
      return true;
    } catch {
      pushToast('Changes could not be confirmed. Refresh before retrying.', true);
      return false;
    } finally {
      markPending([idKey], false);
    }
  }, [markPending, pushToast, setItems]);

  const togglePin = useCallback(async (item: StockItem) => {
    const idKey = String(item.id);
    const currentItems = itemsRef.current;
    if (!currentItems || pendingRef.current.has(idKey)) return;
    const willBePinned = !item.is_pinned;
    const positions = currentItems.filter(candidate => candidate.is_pinned === willBePinned).map(candidate => candidate.display_order);
    const displayOrder = positions.length ? (willBePinned ? Math.min(...positions) - 10 : Math.max(...positions) + 10) : 0;
    markPending([idKey], true);
    try {
      const saved = await updateStock(item.id, { is_pinned: willBePinned, display_order: displayOrder });
      setItems(sortStockItems((itemsRef.current ?? []).map(candidate => String(candidate.id) === idKey ? saved : candidate)));
      setConnection({ state: 'live', label: 'Connected' });
      setPageError('');
      setLastUpdated(new Date());
      pushToast(`${saved.Item} ${willBePinned ? 'pinned to the top' : 'returned to the regular list'}.`);
    } catch {
      pushToast('The pinned position could not be saved. Refresh before retrying.', true);
    } finally {
      markPending([idKey], false);
    }
  }, [markPending, pushToast, setItems]);

  const moveItem = useCallback(async (item: StockItem, direction: -1 | 1) => {
    const currentItems = itemsRef.current;
    if (!currentItems) return;
    const group = sortStockItems(currentItems.filter(candidate => candidate.is_pinned === item.is_pinned));
    const currentIndex = group.findIndex(candidate => String(candidate.id) === String(item.id));
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= group.length) return;
    const changes = swapDisplayOrder(group[currentIndex], group[nextIndex]);
    const ids = changes.map(change => String(change.id));
    if (ids.some(id => pendingRef.current.has(id))) return;
    markPending(ids, true);
    let failed = false;
    try {
      const savedItems = await saveStockOrder(changes);
      const saved = new Map(savedItems.map(savedItem => [String(savedItem.id), savedItem]));
      setItems(sortStockItems((itemsRef.current ?? []).map(candidate => saved.get(String(candidate.id)) ?? candidate)));
      setConnection({ state: 'live', label: 'Connected' });
      setPageError('');
      setLastUpdated(new Date());
      pushToast(`${item.Item} moved ${direction < 0 ? 'up' : 'down'}.`);
    } catch (reason) {
      failed = true;
      console.error('Unable to save the new list order.', reason);
      pushToast('The new list order could not be saved. Refresh before retrying.', true);
    } finally {
      markPending(ids, false);
      if (failed) void loadStock();
    }
  }, [loadStock, markPending, pushToast, setItems]);

  const saveItem = useCallback(async (details: ItemDetails): Promise<boolean> => {
    modalSavingRef.current = true;
    setModalSaving(true);
    const current = itemTarget ?? undefined;
    const currentItems = itemsRef.current ?? [];
    const nextOrder = currentItems.length ? Math.max(...currentItems.map(item => item.display_order)) + 10 : 0;
    const input: StockInput = { ...details, is_pinned: current?.is_pinned ?? false, display_order: current?.display_order ?? nextOrder };
    try {
      const saved = current ? await updateStock(current.id, input) : await addStock(input);
      const next = current ? currentItems.map(item => String(item.id) === String(saved.id) ? saved : item) : [...currentItems, saved];
      setItems(sortStockItems(next));
      setConnection({ state: 'live', label: 'Connected' });
      setLastUpdated(new Date());
      setPageError('');
      setItemTarget(undefined);
      pushToast(current ? 'Item updated.' : 'Item added to your inventory.');
      return true;
    } catch {
      return false;
    } finally {
      modalSavingRef.current = false;
      setModalSaving(false);
    }
  }, [itemTarget, pushToast, setItems]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || modalSavingRef.current) return;
    modalSavingRef.current = true;
    setModalSaving(true);
    setDeleteError('');
    try {
      await removeStock(deleteTarget.id);
      setItems((itemsRef.current ?? []).filter(item => String(item.id) !== String(deleteTarget.id)));
      setDeleteTarget(undefined);
      setConnection({ state: 'live', label: 'Connected' });
      setLastUpdated(new Date());
      pushToast('Item deleted.');
    } catch {
      setDeleteError('The deletion could not be confirmed. Refresh the inventory before trying again.');
    } finally {
      modalSavingRef.current = false;
      setModalSaving(false);
    }
  }, [deleteTarget, pushToast, setItems]);

  const movement = (item: StockItem) => {
    const group = sortStockItems((items ?? []).filter(candidate => candidate.is_pinned === item.is_pinned));
    const index = group.findIndex(candidate => String(candidate.id) === String(item.id));
    return { canMoveUp: index > 0, canMoveDown: index >= 0 && index < group.length - 1 };
  };

  const resetFilters = () => {
    setSearch('');
    setFilter('all');
  };

  return (
    <AppShell page="admin" connection={connection} toasts={toasts}>
      <div className={cx('page-heading')}><div><p className={cx('eyebrow')}>INVENTORY MANAGEMENT</p><h1>Manage stock</h1><p className={cx('page-description')}>A little order. A smoother workday.</p></div><button type="button" className={cx('button', 'button-primary')} onClick={() => setItemTarget(null)}><Icon name="Plus" />Add item</button></div>
      <MetricCards items={items ?? []} filter={filter} onFilter={setFilter} />
      <div className={cx('status-message')} role="alert" hidden={!pageError}><Icon name="WifiOff" /><span>{pageError}</span></div>
      <section className={cx('inventory-panel')} aria-labelledby="inventoryTitle">
        <div className={cx('panel-heading')}><div><div className={cx('panel-title')}><h2 id="inventoryTitle">Your inventory</h2><span className={cx('count-badge')}>{items === null ? 'Loading' : `${items.length} ${items.length === 1 ? 'item' : 'items'}`}</span></div><p className={cx('panel-subtitle')}>Set the display order, quantities, units and stock guide for each item.</p></div><button type="button" className={cx('button', 'refresh-button', loading && 'is-loading')} disabled={loading || pending.size > 0} onClick={() => void loadStock(true)}><Icon name="RefreshCw" />Refresh</button></div>
        <div className={cx('toolbar')}>
          <div className={cx('filter-tabs')} role="group" aria-label="Filter by stock level">
            {([['all', 'All items'], ['watch', 'Watch list'], ['low', 'Low stock']] as Array<[StockFilter, string]>).map(([key, label]) => <button className={cx('filter-tab')} type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
          </div>
          <div className={cx('search-field')}><Icon name="Search" /><label className={cx('sr-only')} htmlFor="search">Search stock items</label><input type="search" id="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search items…" autoComplete="off" /><button className={cx('clear-search')} type="button" title="Clear search" aria-label="Clear search" hidden={!search} onClick={() => setSearch('')}><Icon name="X" /></button></div>
        </div>
        {items === null && !pageError ? (
          <table className={cx('stock-table', 'admin-table')} aria-label="Loading inventory" aria-busy="true"><tbody>{Array.from({ length: 3 }, (_, row) => <tr className={cx('skeleton-row')} aria-hidden="true" key={row}>{Array.from({ length: 7 }, (_, column) => <td key={column}><span className={cx('skeleton', column > 0 && 'short')} /></td>)}</tr>)}</tbody></table>
        ) : visibleItems.length ? (
          <table className={cx('stock-table', 'admin-table')} aria-label="Manage inventory" aria-busy={loading}>
            <thead><tr><th scope="col">Item name</th><th scope="col">Arrangement</th><th scope="col">Unit</th><th scope="col">Quantity</th><th scope="col">Stock guide</th><th scope="col">Status</th><th scope="col"><span className={cx('sr-only')}>Actions</span></th></tr></thead>
            <tbody>{visibleItems.map(item => { const state = movement(item); return <StockRow key={item.id} item={item} saving={pending.has(String(item.id))} {...state} onSaveField={saveField} onEdit={setItemTarget} onDelete={target => { setDeleteError(''); setDeleteTarget(target); }} onTogglePin={itemToPin => void togglePin(itemToPin)} onMove={(itemToMove, direction) => void moveItem(itemToMove, direction)} />; })}</tbody>
          </table>
        ) : (
          <div className={cx('empty-state')}><Icon name="Search" /><h3>{items?.length ? 'No matching items' : pageError ? 'Inventory could not load' : 'Make room for your first item'}</h3><p>{items?.length ? 'Try another search or stock level.' : pageError ? 'Your existing items have not been changed.' : 'Add an item to start tracking your stock.'}</p><button type="button" className={cx('button')} onClick={items?.length ? resetFilters : pageError ? () => void loadStock(true) : () => setItemTarget(null)}>{items?.length ? 'Clear filters' : pageError ? 'Try again' : 'Add item'}</button></div>
        )}
        <div className={cx('panel-footer')}><span role="status">{items === null ? 'Loading inventory…' : `Showing ${visibleItems.length} of ${items.length} ${items.length === 1 ? 'item' : 'items'}`}</span><span className={cx('save-note')}>{pending.size ? <Icon name="LoaderCircle" /> : <Icon name="CheckCheck" />}{pending.size ? 'Saving changes…' : 'Changes save automatically'}</span></div>
      </section>
      <footer className={cx('page-footer')}><span className={cx('timestamp')}><Icon name="Clock3" /><span>{formatUpdatedTime(lastUpdated)}</span></span><span>VMG · Inventory workspace</span></footer>
      <ItemDialog target={itemTarget} busy={modalSaving} onClose={() => { if (!modalSaving) setItemTarget(undefined); }} onSave={saveItem} />
      <DeleteDialog target={deleteTarget} busy={modalSaving} error={deleteError} onClose={() => { if (!modalSaving) setDeleteTarget(undefined); }} onConfirm={() => void confirmDelete()} />
    </AppShell>
  );
}

const root = document.getElementById('app');
if (!root) throw new Error('Missing application root.');
createRoot(root).render(<StrictMode><AdminApp /></StrictMode>);
