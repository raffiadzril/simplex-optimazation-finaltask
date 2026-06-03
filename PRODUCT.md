# Product

## Register

product

## Users

The primary users are UAS evaluators and course stakeholders reviewing an operations research final project. They need to understand the simplex optimization result quickly, see that the data comes from the deployed backend and Google Sheets, and verify that ingredient, recipe, and parameter edits are handled coherently.

Secondary users are bakery operators or students simulating bakery production decisions. Their task is to compare stock, recipes, prices, margins, and optimal production quantities without reading the API documentation.

## Product Purpose

This product turns a bakery production optimization model into an Indonesian dashboard. It shows the optimal product mix, maximum profit, selling prices, ingredient usage, and the editable data that drives the solver.

Success means a reviewer can open the app, understand the optimization outcome, inspect the input data, and trust the CRUD flows without needing backend knowledge.

## Brand Personality

Clear, credible, focused.

The product should feel like a polished academic decision-support tool: calm enough for analysis, friendly enough for a bakery context, and precise enough for an operations research demo.

## Anti-references

Avoid marketing landing-page patterns, decorative hero sections, generic SaaS gloss, heavy gradients, glassmorphism, oversized cards, and playful bakery decoration that distracts from the model.

Avoid spreadsheet clutter that makes the interface feel unfinished. Dense data is allowed, but it must remain organized, aligned, and easy to scan.

## Design Principles

1. Lead with the decision: make the optimal production result and profit visible before supporting details.
2. Keep data editable but accountable: every CRUD surface should clearly show what will change.
3. Explain the model through output: use tables, charts, and usage summaries instead of long instructional copy.
4. Preserve demo confidence: errors, loading, and empty states must be explicit and calm.
5. Stay operational: decorative flourishes lose to clarity, alignment, and repeatable workflows.

## Accessibility & Inclusion

Target WCAG AA contrast for text and controls. Maintain readable Indonesian labels, keyboard-accessible controls, visible focus states, and reduced-motion support for any future animation. Do not rely on color alone for status; pair semantic color with text or icons.
