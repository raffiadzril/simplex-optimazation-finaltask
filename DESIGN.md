---
name: Optimasi Produksi Bakery
description: Indonesian academic dashboard for bakery simplex optimization and data management.
colors:
  ink: "#2f261f"
  muted: "#74665d"
  surface: "#ffffff"
  surface-warm: "#fffaf5"
  app-bg: "#f8f3ee"
  app-bg-deep: "#efe3d8"
  border: "#e4d8cc"
  border-strong: "#d1bdab"
  primary: "#9a4f1f"
  primary-dark: "#6f3515"
  primary-soft: "#fff0e3"
  accent: "#c98a2e"
  accent-soft: "#fff7df"
  success: "#2f7a4a"
  success-soft: "#e9f6ed"
  warning: "#a7651b"
  warning-soft: "#fff4d8"
  danger: "#b44a3b"
  danger-soft: "#fff0eb"
typography:
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.28rem"
    fontWeight: 760
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 760
    lineHeight: 1.25
    letterSpacing: "0"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 580
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "0"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "40px"
shadow:
  sm: "0 1px 2px rgba(59, 38, 23, 0.08)"
  md: "0 10px 28px rgba(59, 38, 23, 0.12)"
  modal: "0 22px 70px rgba(59, 38, 23, 0.26)"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "38px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 11px"
    height: "38px"
---

# Design System: Optimasi Produksi Bakery

## 1. Overview

**Creative North Star: "The Optimization Calculation Board"**

The interface is a clean dashboard for a bakery production optimization calculation. It should help an evaluator read the algorithm result, inspect the input data, and understand the interpretation without adding product-commercial framing.

**Key Characteristics:**
- Warm bakery context used lightly, with neutral white work surfaces.
- Clear academic layout for result, input data, and interpretation.
- Compact metric cards, simple tabs, and restrained panels.
- Tables and charts explain the model before prose does.
- Icons support actions, reloads, edits, and destructive actions.

## 2. Colors

The palette uses bakery warmth without turning the dashboard into decoration.

### Primary
- **Cocoa Brown**: Primary actions, active navigation, chart bars, and key result accents.
- **Deep Cocoa**: Hover state and strong emphasis.
- **Cream Highlight**: Soft background for recommendation cards and active chips.

### Secondary
- **Caramel Accent**: Used sparingly in usage bars and warm highlights.
- **Warm Paper**: Application background.
- **Panel White**: Tables, metric cards, modals, and main content panels.

### Semantic
Green, amber, and red are reserved for success, warning, and error states.

## 3. Typography

The system uses an Inter-compatible sans stack. Size stays fixed in rem units so dense dashboard content remains predictable on laptop and mobile.

### Hierarchy
- **Headline**: Section titles and dashboard headings.
- **Title**: Panel titles and compact table headings.
- **Body**: Table cells, form values, and operational copy.
- **Label**: Metric labels, form labels, status text, and table headers.

## 4. Elevation

Normal dashboard surfaces use a border and a very small shadow. Modals use the larger modal shadow to separate them from the backdrop.

## 5. Components

### Header
The header uses a cocoa gradient and keeps the app identity clear without becoming a marketing hero.

### Tabs
Tabs use a simple segmented control: warm container, white active item, icon and label.

### Metrics
Metric cards are compact, readable, and stable. Values use tabular-friendly spacing and never depend on large decorative type.

### Result Panels
The recommendation and explanation areas should make the solver result understandable at a glance without adding analytics that are not already present in the data.

### Tables
Desktop tables remain compact. On mobile they transform into stacked rows with stable label/value columns to prevent text overlap.

## 6. Do's and Don'ts

### Do:
- **Do** lead with optimal production, profit, solver status, and ingredient usage.
- **Do** preserve readable Indonesian labels.
- **Do** use brown/caramel lightly as bakery context and semantic colors only for state.
- **Do** keep CRUD controls compact and predictable.
- **Do** allow long product or ingredient names to wrap safely on mobile.

### Don't:
- **Don't** change solver, API contracts, formulas, or backend data shape.
- **Don't** frame the interface as a commercial product or add workflow features not requested by the calculation dashboard.
- **Don't** add decorative bakery illustrations that compete with the dashboard.
- **Don't** hide state behind color alone.
- **Don't** put cards inside cards.
- **Don't** let tables become spreadsheet clutter; alignment and scanning matter first.
