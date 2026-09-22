import { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './AppShell.tsx';
import type { ConnectionState } from './AppShell.tsx';
import { getStock, subscribeToStockChanges } from './api.ts';
import { config } from './config.ts';
import { Icon } from './Icon.tsx';
import { preference } from './preferences.ts';
import { formatQuantity, stockChanged, stockStatus } from './stock.ts';
import { cx, styles } from './style.ts';
import type { StockItem } from './types.ts';

function formatUpdatedTime(date: Date | null): string {
  if (!date) return 'Waiting for the first update';

  return `Last synced ${date.toLocaleTimeString('en-GB', {
    timeZone: config.timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })} MVT`;
}

function ViewerApp() {
  const [items, setItems] = useState<StockItem[] | null>(null);
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());

  const [connection, setConnection] = useState<{
    state: ConnectionState;
    label: string;
  }>({
    state: 'loading',
    label: 'Connecting',
  });

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(
    () => preference('sound') !== 'false',
  );

  const itemsRef = useRef<StockItem[] | null>(null);
  const soundEnabledRef = useRef(soundEnabled);
  const mainRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    document.body.classList.add(styles['tv-dashboard']);

    return () => {
      document.body.classList.remove(styles['tv-dashboard']);
    };
  }, []);

  useEffect(() => {
    const audio = new Audio(
      `${import.meta.env.BASE_URL}assets/ding.wav`,
    );

    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    preference('sound', String(soundEnabled));
  }, [soundEnabled]);

  const playSound = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio) return;

    try {
      audio.currentTime = 0;
      await audio.play();
    } catch {
      // The browser may require one interaction before background audio works.
    }
  }, []);

  const updateTvSizing = useCallback((itemCount: number) => {
    if (
      itemCount < 1 ||
      !mainRef.current ||
      !footerRef.current
    ) {
      return;
    }

    const topbar = document.querySelector<HTMLElement>(
      `.${styles.topbar}`,
    );

    if (!topbar) return;

    const mainStyle = getComputedStyle(mainRef.current);

    const mainPadding =
      parseFloat(mainStyle.paddingTop) +
      parseFloat(mainStyle.paddingBottom);

    const availableHeight =
      window.innerHeight -
      topbar.offsetHeight -
      mainPadding -
      footerRef.current.offsetHeight -
      8;

    const rowGap = Math.max(
      4,
      Math.min(7, window.innerHeight * 0.005),
    );

    const rowHeight = Math.max(
      54,
      (availableHeight - rowGap * (itemCount + 1)) / itemCount,
    );

    const fontSize = Math.max(
      23,
      Math.min(56, rowHeight * 0.27),
    );

    document.documentElement.style.setProperty(
      '--tv-row-gap',
      `${rowGap}px`,
    );

    document.documentElement.style.setProperty(
      '--tv-row-height',
      `${rowHeight}px`,
    );

    document.documentElement.style.setProperty(
      '--tv-font-size',
      `${fontSize}px`,
    );
  }, []);

  useEffect(() => {
    if (!items?.length) return;

    const frame = requestAnimationFrame(() => {
      updateTvSizing(items.length);
    });

    const onResize = () => {
      updateTvSizing(items.length);
    };

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [items, updateTvSizing]);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let refreshQueued = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = async (): Promise<void> => {
      if (!active) return;

      if (inFlight) {
        refreshQueued = true;
        return;
      }

      if (timer) clearTimeout(timer);

      inFlight = true;

      try {
        const data = await getStock();

        if (!active) return;

        const previous = itemsRef.current;
        const changed = stockChanged(previous, data);

        if (changed) {
          const oldItems = new Map(
            (previous ?? []).map(item => [
              String(item.id),
              item,
            ]),
          );

          const quantityChanges =
            previous === null
              ? new Set<string>()
              : new Set(
                  data
                    .filter(item => {
                      const previousItem = oldItems.get(
                        String(item.id),
                      );

                      return (
                        previousItem?.quantity !== item.quantity
                      );
                    })
                    .map(item => String(item.id)),
                );

          setChangedIds(quantityChanges);
          itemsRef.current = data;
          setItems(data);
        }

        if (
          previous !== null &&
          changed &&
          soundEnabledRef.current
        ) {
          void playSound();
        }

        setConnection({
          state: 'live',
          label: 'Live updates',
        });

        setLastUpdated(new Date());
        setLoadError(false);
      } catch {
        if (!active) return;

        setConnection({
          state: 'error',
          label: 'Disconnected',
        });

        if (itemsRef.current === null) {
          setLoadError(true);
        }
      } finally {
        inFlight = false;

        if (!active) return;

        if (refreshQueued) {
          refreshQueued = false;
          void refresh();
        } else {
          /*
           * Keep polling even when the tab is hidden.
           * The browser may throttle the timer, but Supabase Realtime
           * will still request an immediate refresh.
           */
          timer = setTimeout(
            () => void refresh(),
            config.refreshMs,
          );
        }
      }
    };

    const onVisibility = () => {
      if (!document.hidden) {
        void refresh();
      }
    };

    const onOnline = () => {
      void refresh();
    };

    /*
     * Do not check document.hidden here.
     * Realtime changes must refresh the page and play the sound
     * even while the TV page is in another tab.
     */
    const unsubscribe = subscribeToStockChanges(() => {
      void refresh();
    });

    document.addEventListener(
      'visibilitychange',
      onVisibility,
    );

    window.addEventListener('online', onOnline);

    void refresh();

    return () => {
      active = false;

      if (timer) clearTimeout(timer);

      unsubscribe();

      document.removeEventListener(
        'visibilitychange',
        onVisibility,
      );

      window.removeEventListener('online', onOnline);
    };
  }, [playSound]);

  const toggleSound = () => {
    setSoundEnabled(enabled => {
      const next = !enabled;

      if (next) {
        void playSound();
      } else if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      return next;
    });
  };

  return (
    <AppShell
      page="viewer"
      connection={connection}
      mainRef={mainRef}
      sound={{
        enabled: soundEnabled,
        onToggle: toggleSound,
      }}
    >
      <section
        className={cx('tv-board')}
        aria-label="Live stock quantities"
      >
        <div className={cx('tv-table-wrap')}>
          {!loadError ? (
            <table
              className={cx('tv-stock-table')}
              aria-label="Item names and quantities"
              aria-busy={items === null}
              hidden={items?.length === 0}
            >
              <tbody>
                {items === null
                  ? Array.from(
                      { length: 3 },
                      (_, index) => (
                        <tr
                          className={cx('tv-loading-row')}
                          key={index}
                          aria-hidden="true"
                        >
                          <td>
                            <span
                              className={cx('tv-skeleton')}
                            />
                          </td>

                          <td>
                            <span
                              className={cx(
                                'tv-skeleton',
                                'tv-skeleton-short',
                              )}
                            />
                          </td>
                        </tr>
                      ),
                    )
                  : items.map(item => {
                      const status = stockStatus(
                        item.quantity,
                        item.low_threshold,
                        item.high_threshold,
                      ).key;

                      return (
                        <tr
                          className={cx(
                            changedIds.has(String(item.id)) &&
                              'tv-quantity-changed',
                          )}
                          key={item.id}
                        >
                          <td className={cx('tv-item-name')}>
                            {item.Item}
                          </td>

                          <td
                            className={cx(
                              'tv-quantity-cell',
                            )}
                          >
                            <span
                              className={cx(
                                'tv-quantity',
                                `tv-tone-${status}`,
                              )}
                            >
                              <span
                                className={cx(
                                  'tv-quantity-number',
                                )}
                              >
                                {formatQuantity(item.quantity)}
                              </span>

                              <span className={cx('tv-uom')}>
                                {item.uom?.toUpperCase() ||
                                  '—'}
                              </span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          ) : null}

          <p
            className={cx('tv-message')}
            role="status"
            hidden={
              !loadError && items?.length !== 0
            }
          >
            {loadError
              ? 'Unable to load stock'
              : 'No stock items'}
          </p>
        </div>

        <footer
          className={cx('tv-last-updated')}
          ref={footerRef}
        >
          <Icon name="Clock3" />

          <span>{formatUpdatedTime(lastUpdated)}</span>
        </footer>
      </section>
    </AppShell>
  );
}

const root = document.getElementById('app');

if (!root) {
  throw new Error('Missing application root.');
}

createRoot(root).render(
  <StrictMode>
    <ViewerApp />
  </StrictMode>,
);