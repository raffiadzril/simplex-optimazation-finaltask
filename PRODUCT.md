# Product

## Register

product

## Users

Primary users are UAS evaluators, lecturers, and course stakeholders reviewing an Operational Research final project. They need to see the optimal production result quickly, understand how the model is formulated, and verify that the frontend connects cleanly to the deployed backend.

Secondary users are students or bakery operators running simulations. They inspect ingredient stock, recipes, margin, product profit, and optimal production quantities to understand how data changes affect the solver output.

## Product Purpose

This product is an Indonesian bakery production optimization dashboard. It turns backend data from Google Sheets into a readable Operational Research workflow: input data, decision variables, objective function, constraints, solver status, optimal result, and ingredient usage.

Success means a reviewer can open the dashboard, understand the optimization result from the first screen, move to the OR model explanation for academic reasoning, and safely test CRUD changes without reading the API documentation.

## Brand Personality

Clear, credible, focused.

The product should feel like a polished academic decision-support tool with a restrained bakery identity. The bakery feeling comes from espresso, cocoa, caramel, the croissant mark, and selective serif display type, while the workflow remains precise and operational.

## Anti-references

Avoid marketing landing-page patterns, decorative hero sections, generic SaaS gloss, heavy gradients, glassmorphism, oversized cards, and playful bakery decoration that distracts from the model.

Avoid fake algorithm theater. The app should not pretend to show simplex tableau iterations when the backend uses a solver library.

Avoid spreadsheet clutter. Dense data is allowed, but it must remain organized, aligned, and easy to scan.

## Design Principles

1. Lead with the decision: the optimal production result and profit must be visible first.
2. Bridge result and process: show variables, objective function, constraints, solver status, and interpretation.
3. Keep data editable but accountable: CRUD actions should clearly show what will change and confirm risky actions.
4. Preserve demo confidence: loading, empty, error, and success states must be explicit and calm.
5. Use bakery identity with restraint: visual warmth should support analysis, not compete with the OR model.

## Accessibility & Inclusion

Target WCAG AA contrast for text, controls, badges, and form states. Keep Indonesian labels readable, preserve keyboard-accessible controls, use visible focus states, and support reduced motion. Do not rely on color alone for status; pair semantic color with text or icons.
