# Design System: Optimasi Produksi Bakery

## 1. Overview

The interface is a restrained bakery-academic dashboard for an Operational Research production optimization project. It helps evaluators read the solver result, inspect the OR formulation, review ingredient usage, and safely manage the data that drives the backend solver.

The design serves the task. It uses warm bakery identity through cream surfaces, tan primary controls, brown accents, a croissant mark, and selective serif display type, while preserving product-dashboard clarity for tables, forms, and equations.

## 2. Color Direction

The current visual direction should avoid heavy espresso blocks and overly orange caramel. The updated direction uses a softer bakery palette based on the user-approved seed colors: cocoa text, cream background, tan primary, almond secondary, and walnut accent.

Recommended strategy: restrained product palette with one warm surface color and one stronger brown accent. Most surfaces stay light and readable. Tan is used for primary controls and selected surfaces. Walnut brown is used for charts, section emphasis, focus rings, and moments that need stronger contrast. Cocoa is used for text and structure.

### Recommended Palette

Use OKLCH custom properties in `frontend/src/index.css`.

- `--background: oklch(0.9885 0.0048 81.9)` from `#fdfbf7`
- `--foreground: oklch(0.2365 0.0326 54.4)` from `#2b1a0d`
- `--card: oklch(0.998 0.002 82)`
- `--card-foreground: oklch(0.2365 0.0326 54.4)`
- `--popover: oklch(0.998 0.002 82)`
- `--primary: oklch(0.8058 0.0607 65)` from `#ddb892`
- `--primary-foreground: oklch(0.2365 0.0326 54.4)`
- `--secondary: oklch(0.9138 0.0196 62.2)` from `#ede0d4`
- `--secondary-foreground: oklch(0.2365 0.0326 54.4)`
- `--muted: oklch(0.955 0.012 72)`
- `--muted-foreground: oklch(0.43 0.034 54)`
- `--accent: oklch(0.4888 0.0647 50.8)` from `#7f5539`
- `--accent-foreground: oklch(0.9885 0.0048 81.9)`
- `--destructive: oklch(0.52 0.16 25)`
- `--border: oklch(0.855 0.022 62)`
- `--input: oklch(0.82 0.024 62)`
- `--ring: oklch(0.4888 0.0647 50.8)`
- `--success: oklch(0.46 0.10 145)`
- `--warning: oklch(0.64 0.14 68)`
- `--header-glow: oklch(0.8058 0.0607 65)`
- `--header-bg-start: oklch(0.9885 0.0048 81.9)`
- `--header-bg-end: oklch(0.9138 0.0196 62.2)`
- `--header-foreground: oklch(0.2365 0.0326 54.4)`
- `--header-muted: oklch(0.43 0.034 54)`
- `--mark-background: oklch(0.8058 0.0607 65)`
- `--mark-foreground: oklch(0.2365 0.0326 54.4)`
- `--mark-shadow: oklch(0.4888 0.0647 50.8)`

### Color Roles

- Background: cream near-white. It should feel clean, not parchment-heavy.
- Card and popover: almost white, used for data tables, forms, dialogs, and cards.
- Primary: tan. Use for filled primary controls, selected tabs, the croissant mark, and light result surfaces.
- Accent: walnut brown. Use for charts, section headings, focus rings, and emphasis that requires stronger contrast.
- Header: cream-to-almond surface. The header should feel warm and clean, not like a dark hero block.
- Foreground: cocoa ink. Keep body text dark enough for WCAG AA contrast on light warm surfaces.
- Success, warning, and destructive: semantic only. Do not use these colors as decoration.

### Alternatives Considered

- Dark espresso header: credible but too heavy for the requested brighter bakery tone.
- Orange caramel interface: visually louder, but it makes the dashboard feel less academic.
- Tan-only dashboard: warm, but without the walnut accent it becomes too flat for charts and active states.

The recommended palette keeps the bakery identity while making the page brighter, calmer, easier to present, and more aligned with the user-selected bakery colors.

## 3. Typography

Use Inter/system sans through Tailwind for operational UI. Use the serif stack `Georgia, Cambria, Times New Roman, ui-serif` only for display moments.

- Page title: serif, 36px desktop, 700 weight, tight line height.
- Main result number: serif, large, 700 weight.
- Section title: sans, 20px, 700 weight.
- Card title: sans, 16px, 700 weight, tight but not clipped.
- Body/table text: sans, 14px to 15px, 450 to 550 weight.
- Labels: sans, 12px to 13px, 650 weight.
- Equations: mono through Tailwind `font-mono`.

Do not use serif in tables, forms, tabs, buttons, or dense labels.

## 4. Layout

The app is a Vite React SPA with a single dashboard shell:

- Cream-to-almond header with croissant mark, optimize action, and reload action.
- Responsive fact strip for last update, total products, total ingredients, and margin.
- Main shadcn-style tabs:
  - Hasil Optimasi
  - Model OR
  - Analisis Bahan
  - Data Bahan
  - Data Resep
  - Pengaturan
- Content panels using `Card`, `Table`, `Sheet`, `Dialog`, `Alert`, `Badge`, `Skeleton`, `Tooltip`, and `Toast`.

Cards use 8px radius. Avoid nested cards; use grouped rows, tables, borders, and spacing inside panels instead.

## 5. Components

- Header mark: caramel square with lucide `Croissant` icon.
- Buttons: shadcn-style variants with explicit contrast, tactile active feedback, and visible focus rings.
- Header buttons use at least 44px height for touch ergonomics.
- Tabs: bordered segmented control with warm active state and short content fade.
- Fact cards: compact cards with a small caramel leading accent.
- Result panel: light tan-to-almond gradient surface with main production number.
- Process cards: warm panels used only for the solver sequence.
- Tables: desktop table layout with warm hover state and stacked responsive rows below 720px.
- Recipe view: Data Resep defaults to grouped product panels with ingredient gram bars and estimated cost per unit.
- Recipe matrix: Data Resep includes an academic coefficient matrix where ingredient rows and product columns show gram per unit.
- Recipe detail: Raw recipe rows remain available as an administrative CRUD view, not the default presentation.
- Sheets: right-side drawers for add/edit ingredient and recipe forms.
- Dialogs: confirmation for delete and reload actions.
- Toasts: concise success/error feedback after create, update, delete, reload, optimize, and margin update.
- Skeletons: match final layout shapes for initial loading.
- Badges: status, data readiness, resource status, and process indicators.

## 6. Motion

Motion is restrained and state-based:

- Drawer/dialog entrance from Radix/shadcn-style primitives.
- Toast appearance.
- Loading spinners on active async buttons.
- Short tab-content fade.
- Button active press feedback.

Respect `prefers-reduced-motion` with near-instant alternatives.

## 7. Do and Do Not

Do:

- Lead with optimal result, profit, solver status, and production quantity.
- Show variables, objective function, constraints, and ingredient usage.
- Preserve Indonesian UI copy and current tab labels.
- Use bakery warmth to support the dashboard, not to decorate it.
- Keep CRUD controls compact, predictable, and validated.
- Let long product or ingredient names wrap safely on mobile.

Do not:

- Fake simplex tableau iterations.
- Add decorative bakery illustrations that compete with data.
- Hide persistent writes behind unclear controls.
- Use color alone for status.
- Turn the dashboard into a marketing page.
