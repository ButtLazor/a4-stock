import { useEffect, useState } from 'react';
import type { ReactNode, Ref } from 'react';
import { Icon } from './Icon.tsx';
import { preference } from './preferences.ts';
import { cx } from './style.ts';

export type ConnectionState = 'loading' | 'live' | 'error';

export type ToastMessage = {
  id: number;
  message: string;
  error?: boolean;
};

type AppShellProps = {
  page: 'viewer' | 'admin';
  connection: { state: ConnectionState; label: string };
  children: ReactNode;
  mainRef?: Ref<HTMLElement>;
  sound?: { enabled: boolean; onToggle: () => void };
  toasts?: ToastMessage[];
};

export function AppShell({ page, connection, children, mainRef, sound, toasts = [] }: AppShellProps) {
  const admin = page === 'admin';
  const overviewUrl = admin ? '../index.html' : './index.html';
  const adminUrl = admin ? './admin.html' : './admin/admin.html';
  const [theme, setTheme] = useState(() => preference('theme') ?? 'light');
  const dark = theme === 'dark';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    preference('theme', theme);
  }, [theme]);

  return (
    <>
      <a className={cx('skip-link')} href="#main">Skip to content</a>
      <aside className={cx('sidebar')} aria-label="Workspace navigation">
        <a className={cx('brand')} href={overviewUrl} aria-label="VMG stock overview">
          <span className={cx('brand-mark')}><Icon name="Package" /></span>
          <span className={cx('brand-copy')}>
            <span className={cx('wordmark')}>VMG<span style={{ color: '#92a7ff' }}>.</span></span>
            <span className={cx('brand-caption')}>Stock workspace</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <p className={cx('nav-label')}>WORKSPACE</p>
          <div className={cx('nav-links')}>
            <a className={cx('nav-link')} href={overviewUrl} aria-current={!admin ? 'page' : undefined} title="Overview" aria-label="Overview"><Icon name="LayoutDashboard" /><span>Overview</span></a>
            <a className={cx('nav-link')} href={adminUrl} aria-current={admin ? 'page' : undefined} title="Manage stock" aria-label="Manage stock"><Icon name="SlidersHorizontal" /><span>Manage stock</span></a>
          </div>
        </nav>
        <div className={cx('stock-guide')}>
          <p className={cx('nav-label')}>STATUS COLORS</p>
          <div className={cx('guide-row')}><span className={cx('dot', 'green')} />Well stocked<span>Above guide</span></div>
          <div className={cx('guide-row')}><span className={cx('dot', 'amber')} />Watch list<span>Between</span></div>
          <div className={cx('guide-row')}><span className={cx('dot', 'red')} />Low stock<span>Below guide</span></div>
        </div>
        <div className={cx('sidebar-footer')}>
          <div className={cx('sidebar-note')}><Icon name="Clock3" /><span>Malé, Maldives</span></div>
          <p className={cx('sidebar-subnote')}>Maldives Time · UTC+5</p>
        </div>
      </aside>
      <div className={cx('workspace')}>
        <header className={cx('topbar')}>
          <div className={cx('breadcrumb')}><span className={cx('breadcrumb-prefix')}>Workspace</span><span className={cx('breadcrumb-divider')}>/</span><strong>{admin ? 'Manage stock' : 'Overview'}</strong></div>
          <div className={cx('topbar-actions')}>
            <span className={cx('connection')} data-state={connection.state} role="status"><span className={cx('dot')} /><span>{connection.label}</span></span>
            <span className={cx('action-divider')} />
            {sound ? (
              <button className={cx('icon-button')} type="button" aria-label={`${sound.enabled ? 'Disable' : 'Enable'} sound alerts`} title={`${sound.enabled ? 'Disable' : 'Enable'} sound alerts`} aria-pressed={sound.enabled} onClick={sound.onToggle}>
                <Icon name={sound.enabled ? 'Bell' : 'BellOff'} />
              </button>
            ) : null}
            <button className={cx('icon-button')} type="button" aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`} title={`Switch to ${dark ? 'light' : 'dark'} theme`} aria-pressed={dark} onClick={() => setTheme(dark ? 'light' : 'dark')}>
              <Icon name={dark ? 'Sun' : 'Moon'} />
            </button>
          </div>
        </header>
        <main className={cx('main')} id="main" tabIndex={-1} ref={mainRef}>{children}</main>
      </div>
      <div className={cx('toast-region')} aria-live="polite" aria-atomic="false">
        {toasts.map(toast => (
          <div className={cx('toast', toast.error && 'error')} key={toast.id}>
            <Icon name={toast.error ? 'TriangleAlert' : 'CircleCheck'} /><span>{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}
