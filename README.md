# VMG Stock — TypeScript rewrite

A redesigned stock viewer and management page, built with TypeScript and Vite. The existing Supabase project, `stock_items` table, and `id`, `Item`, `uom`, `quantity` fields are retained.

## Replace the files in Codespaces

Copy the contents of this folder into your repository root, alongside your existing `.git` folder. Keep your repository's own Git history and settings.

The old `script.v6.js`, root `styles.css`, `admin/dashboard.js`, and `admin/admin.css` are replaced by the files under `src/`; remove those four old files. The existing `index.html` and `admin/admin.html` are replaced with the new versions. The audio file now lives at `public/assets/ding.wav`.

Use Node.js **22.18 or newer**. In the Codespaces terminal:

```bash
npm ci
npm run dev
```

Open the forwarded port shown by Vite (normally **5173**). The stock viewer is at `/`; management is at `/admin/admin.html`.

## Project structure

```text
a4-stock-typescript/
  index.html                  Viewer entry page
  admin/
    admin.html                Management entry page
  src/
    viewer.ts                 Live refresh, search, filters and alerts
    admin.ts                  Add, edit, delete and inline saves
    api.ts                    Typed Supabase queries
    config.ts                 Existing project connection and refresh settings
    types.ts                  Stock and database types
    stock.ts                  Stock bands, filtering and validation
    ui.ts                     Shared layout, controls, theme and messages
    icons.ts                  Local SVG icons
    styles.css                Responsive light and dark themes
  public/
    favicon.svg
    assets/
      ding.wav
      lucide-LICENSE.txt
      dm-sans-LICENSE.txt
      manrope-LICENSE.txt
  tests/
    stock.test.ts             Stock rules and refresh regression checks
  dist/                       Built static website, ready to upload
  .env.example
  .gitignore
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
  README.md
```

## Production build

```bash
npm run build
```

Publish the **contents of `dist/`** on your existing static host. For a repository-based deployment, use `npm run build` as the build command and `dist` as the output directory. The included `dist/` is already built. TypeScript source pages must be run through Vite; opening the source HTML directly is not supported.

## Existing connection

`src/config.ts` contains your original Supabase URL and public anon key. No database migration is required. To override them, copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then restart Vite or rebuild.

## Behavior

- The home page is a full-screen TV board showing only the item name and quantity with UOM. It refreshes every three seconds while the tab is visible and refreshes immediately on return.
- Stock bands are unchanged: above 700 is well stocked; 200–700 is the watch list; below 200 is low; zero is out of stock.
- Counts represent inventory items, so different units are not added together.
- Quantity and unit changes save on change/blur; pressing Enter saves a quantity. Clicking an item name opens its edit dialog. Deletion requires confirmation.
- Failed reads show an error and retain the last synced data. A failed or unconfirmed save displays an error; refresh the data before retrying.
- Existing units, including units outside the standard dropdown list, are retained.
- No sample inventory is included in the application.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

The project uses strict TypeScript checking. Tests cover threshold boundaries, zero/invalid quantities, filtering, HTML escaping and detection of renamed or deleted items during refresh.
