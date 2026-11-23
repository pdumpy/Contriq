# Frontend explained

Next.js uses the `app/` directory as its route map. Each `page.tsx` describes the screen at that URL. The shared [layout](../app/layout.tsx) supplies navigation, evaluation-period context, local fonts and the footer.

| Screen | File and data call | Reviewer task |
| --- | --- | --- |
| Overview | [app/page.tsx](../app/page.tsx), `getOverview()` | Inspect cohort counts, four within-family distributions and source availability |
| People | [app/employees/page.tsx](../app/employees/page.tsx), `getEmployees()` | Search names/codes/teams and filter the selected run |
| Detail | [app/employees/[code]/page.tsx](../app/employees/[code]/page.tsx), `getEmployee()` | Inspect the exact rubric, dimensions, metric arithmetic and source evidence |
| Methodology | [app/methodology/page.tsx](../app/methodology/page.tsx), `getMethodology()` | Switch role tabs and read the actual stored rule definitions |

## What runs where

These pages are server components. Their database queries run in the Next.js process. The browser receives rendered content and only the JavaScript needed by interactive components. A TypeScript DTO tells a page which fields it can expect, such as a score being a number or null.

[Navigation](../src/components/navigation.tsx) marks the active destination. [DirectoryFilters](../src/components/directory-filters.tsx) keeps the editable search/filter values and sends them through the URL. Search, family, result state and page are reproducible addresses. The selected run ID is retained as you explore.

[ui.tsx](../src/components/ui.tsx) contains small shared presentation helpers for score formatting, coverage, status, headings and links. It contains no scoring engine. A score of zero is displayed as zero. A null result is displayed as unavailable.

## Inspect a calculation

The detail page receives `result.components`. Each dimension has a weight, score, weighted contribution, explanatory text and metric rows. A native `details` disclosure lets the user open deeper information without introducing a large state-management library.

[FactLink](../src/components/fact-link.tsx) connects metric facts to their source record. Clicking it opens the matching native disclosure and scrolls to the fact. The original payload is displayed as escaped JSON text, letting a reviewer see what was observed.

The page also describes coverage gaps and grounds review guidance in the returned metric reasons. It produces no interpersonal judgments or AI-generated scoring.

## Styling and states

[app/globals.css](../app/globals.css) defines reusable colors, spacing, tables, responsive breakpoints and focus outlines. Inter is the interface font and IBM Plex Mono distinguishes numerical and technical values. Local font imports avoid an external font request during builds.

[loading.tsx](../app/loading.tsx) gives navigation feedback. [error.tsx](../app/error.tsx) displays a readable database/unavailable state with retry. [not-found.tsx](../app/not-found.tsx) handles an unknown employee or result. An empty search has its own clear state and a way back to useful results.

Verify a URL with filters, open a person and return to the directory. Then open the same view at a narrow width. Long table content scrolls inside its table container, while the page itself remains within the viewport. Use the Tab key to check links, inputs and native evidence disclosures.
