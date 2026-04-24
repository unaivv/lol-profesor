# Code Review Rules

## TypeScript
- Use `const`/`let`, never `var`
- Prefer interfaces over types for object shapes
- No `any` types — use `unknown` or proper generics
- Explicit return types on exported functions

## React
- Functional components only
- Named exports (no default exports for components)
- No business logic inside components — extract to hooks or utils
- No inline styles for layout; prefer Tailwind classes when available

## Tauri
- All window operations must use the Tauri API (`@tauri-apps/api`)
- Required capabilities must be declared in `src-tauri/capabilities/default.json`
- Never expose sensitive data to the frontend; handle it in Rust commands

## General
- No `console.log` left in production code
- No commented-out code
- Keep components under 150 lines; extract if larger
- One responsibility per file
