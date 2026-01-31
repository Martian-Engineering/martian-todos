# Workshop Facilitator Notes — Deliberate Imperfections

This file documents intentionally introduced issues for workshop demos. These are
meant to be safe, small, and educational.

## Inserted Imperfections

1) apps/frontend/src/components/TodoList.tsx
- Minor bug: The list is sorted with `todos.sort(...)`, which mutates the props
  array in place. This can reorder parent state unexpectedly across renders.
- Code smell: Sorting and the priority weight map are re-created on every render
  instead of memoized or moved to a shared helper.
- TODO comment added to highlight the mutation/stability problem.

2) apps/backend/src/routes/todos.ts
- Minor bug: `totalPages` uses `Math.floor(...)`, which can undercount the last
  page (off-by-one when there are leftover items).
- TODO comment added to flag the pagination math.

## Opportunities for AI-Assisted Refactoring

- Extract and memoize priority sorting for todos (e.g., helper + `useMemo`) to
  avoid prop mutation and re-sorting on every render.
- Centralize pagination math (including consistent filter-aware totals) in a
  shared backend utility.
