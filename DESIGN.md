# Design System: Optimasi Produksi Bakery

## 1. Overview

The interface is a clean academic dashboard for a bakery production optimization calculation. It helps an evaluator read the algorithm result, inspect the input data, understand the OR formulation, and safely update the data source through the deployed API.

The visual tone is restrained bakery-academic: warm work surfaces, crisp borders, compact data panels, espresso/cocoa primary actions, and caramel highlights. The bakery mood is carried by color and serif display moments, not by decorative illustrations.

## 2. Color Tokens

Use OKLCH CSS custom properties in `frontend/src/index.css`.

- `--background: oklch(0.985 0.012 82)`
- `--foreground: oklch(0.22 0.035 48)`
- `--muted: oklch(0.94 0.028 78)`
- `--muted-foreground: oklch(0.42 0.035 52)`
- `--card: oklch(0.998 0.003 82)`
- `--border: oklch(0.84 0.035 72)`
- `--primary: oklch(0.43 0.105 45)`
- `--primary-foreground: oklch(1 0 0)`
- `--accent: oklch(0.66 0.13 68)`
- `--accent-foreground: oklch(0.18 0.035 45)`
- `--success: oklch(0.46 0.10 145)`
- `--warning: oklch(0.64 0.14 68)`
- `--destructive: oklch(0.52 0.16 25)`

Primary is reserved for main actions and active state. Accent is reserved for caramel highlights, model/process emphasis, and selected badges.

## 3. Typography

Use Inter/system sans through Tailwind for operational UI. Use a serif stack (`Georgia, Cambria, Times New Roman, ui-serif`) only for display moments: the page title and the main result number.

- Page title: 36px, serif, 700 weight, tight line height.
- Main result number: serif, large, tabular-feeling emphasis.
- Section title: 20px, 700 weight.
- Card title: 16px, 700 weight.
- Body/table text: 14px to 15px, 450 to 550 weight.
- Labels: 12px to 13px, 650 weight.

## 4. Layout

The app is a single dashboard shell:

- Header with title, data status, reload action.
- Responsive summary strip.
- Main shadcn tabs.
- Content panels using `Card`, `Table`, `Sheet`, `Dialog`, `Alert`, `Badge`, `Skeleton`, and `Tooltip`.

Tabs:

- Hasil Optimasi
- Model OR
- Analisis Bahan
- Data Bahan
- Data Resep
- Pengaturan

Cards use 8px radius. Avoid nested card structures; use grouped rows, tables, or section dividers inside panels.

## 5. Components

- Buttons: shadcn-style variants for primary, outline, ghost, destructive.
- Tables: desktop table layout with responsive stacked rows on small screens.
- Sheets: right-side drawers for add/edit ingredient and recipe forms.
- Dialogs: confirmation for delete and reload actions.
- Toasts: concise feedback after create, update, delete, reload, optimize, and margin update.
- Skeletons: used for initial result and table loading.
- Badges: solver status, data status, resource status, process steps.

## 6. Motion

Motion is limited to state feedback: drawer/dialog entrance, toast appearance, and loading spinners. Respect `prefers-reduced-motion`.

## 7. Do and Do Not

Do:

- Show optimal result, model formulation, constraints, and ingredient usage.
- Keep Indonesian UI copy precise and short.
- Use icons only where they clarify actions.
- Keep forms predictable and validation messages explicit.

Do not:

- Fake simplex tableau iterations.
- Add decorative bakery illustrations.
- Hide persistent writes behind unclear controls.
- Use color alone for status.
- Let long ingredient or product names overflow on mobile.
