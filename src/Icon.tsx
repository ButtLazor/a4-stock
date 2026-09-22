import { createElement } from 'react';
import type { SVGProps } from 'react';
import { cx } from './style.ts';

type IconNode = [string, Record<string, string | number>];

const icons: Record<string, IconNode[]> = {
  Package: [['path', { d: 'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z' }], ['path', { d: 'M12 22V12' }], ['polyline', { points: '3.29 7 12 12 20.71 7' }], ['path', { d: 'm7.5 4.27 9 5.15' }]],
  LayoutDashboard: [['rect', { width: 7, height: 9, x: 3, y: 3, rx: 1 }], ['rect', { width: 7, height: 5, x: 14, y: 3, rx: 1 }], ['rect', { width: 7, height: 9, x: 14, y: 12, rx: 1 }], ['rect', { width: 7, height: 5, x: 3, y: 16, rx: 1 }]],
  SlidersHorizontal: [['path', { d: 'M10 5H3' }], ['path', { d: 'M12 19H3' }], ['path', { d: 'M14 3v4' }], ['path', { d: 'M16 17v4' }], ['path', { d: 'M21 12h-9' }], ['path', { d: 'M21 19h-5' }], ['path', { d: 'M21 5h-7' }], ['path', { d: 'M8 10v4' }], ['path', { d: 'M8 12H3' }]],
  Search: [['path', { d: 'm21 21-4.34-4.34' }], ['circle', { cx: 11, cy: 11, r: 8 }]],
  RefreshCw: [['path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }], ['path', { d: 'M21 3v5h-5' }], ['path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }], ['path', { d: 'M8 16H3v5' }]],
  Moon: [['path', { d: 'M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401' }]],
  Sun: [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 2v2' }], ['path', { d: 'M12 20v2' }], ['path', { d: 'm4.93 4.93 1.41 1.41' }], ['path', { d: 'm17.66 17.66 1.41 1.41' }], ['path', { d: 'M2 12h2' }], ['path', { d: 'M20 12h2' }], ['path', { d: 'm6.34 17.66-1.41 1.41' }], ['path', { d: 'm19.07 4.93-1.41 1.41' }]],
  Bell: [['path', { d: 'M10.268 21a2 2 0 0 0 3.464 0' }], ['path', { d: 'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326' }]],
  BellOff: [['path', { d: 'M10.268 21a2 2 0 0 0 3.464 0' }], ['path', { d: 'M17 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 .258-1.742' }], ['path', { d: 'm2 2 20 20' }], ['path', { d: 'M8.668 3.01A6 6 0 0 1 18 8c0 2.687.77 4.653 1.707 6.05' }]],
  Check: [['path', { d: 'M20 6 9 17l-5-5' }]],
  CheckCheck: [['path', { d: 'M18 6 7 17l-5-5' }], ['path', { d: 'm22 10-7.5 7.5L13 16' }]],
  CircleCheck: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'm9 12 2 2 4-4' }]],
  TriangleAlert: [['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3' }], ['path', { d: 'M12 9v4' }], ['path', { d: 'M12 17h.01' }]],
  CircleX: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'm15 9-6 6' }], ['path', { d: 'm9 9 6 6' }]],
  X: [['path', { d: 'M18 6 6 18' }], ['path', { d: 'm6 6 12 12' }]],
  Minus: [['path', { d: 'M5 12h14' }]],
  Plus: [['path', { d: 'M5 12h14' }], ['path', { d: 'M12 5v14' }]],
  Trash2: [['path', { d: 'M10 11v6' }], ['path', { d: 'M14 11v6' }], ['path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }], ['path', { d: 'M3 6h18' }], ['path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }]],
  Pencil: [['path', { d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z' }], ['path', { d: 'm15 5 4 4' }]],
  Layers: [['path', { d: 'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z' }], ['path', { d: 'M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12' }], ['path', { d: 'M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17' }]],
  Clock3: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M12 6v6h4' }]],
  WifiOff: [['path', { d: 'M12 20h.01' }], ['path', { d: 'M8.5 16.429a5 5 0 0 1 7 0' }], ['path', { d: 'M5 12.859a10 10 0 0 1 5.17-2.69' }], ['path', { d: 'M19 12.859a10 10 0 0 0-2.007-1.523' }], ['path', { d: 'M2 8.82a15 15 0 0 1 4.177-2.643' }], ['path', { d: 'M22 8.82a15 15 0 0 0-11.288-3.764' }], ['path', { d: 'm2 2 20 20' }]],
  CircleHelp: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' }], ['path', { d: 'M12 17h.01' }]],
  LoaderCircle: [['path', { d: 'M21 12a9 9 0 1 1-6.219-8.56' }]],
  Pin: [['path', { d: 'M12 17v5' }], ['path', { d: 'M5 17h14' }], ['path', { d: 'M15 4.5V2H9v2.5a2 2 0 0 1-.4 1.2L7 7.83V13h10V7.83L15.4 5.7a2 2 0 0 1-.4-1.2' }]],
  Settings: [['path', { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' }], ['circle', { cx: 12, cy: 12, r: 3 }]],
};

type IconProps = SVGProps<SVGSVGElement> & { name: string };

export function Icon({ name, className, ...props }: IconProps) {
  const nodes = icons[name] ?? icons.Package;
  return (
    <svg
      className={[cx('icon'), className].filter(Boolean).join(' ')}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {nodes.map(([tag, attrs], index) => createElement(tag, { ...attrs, key: `${tag}-${index}` }))}
    </svg>
  );
}
