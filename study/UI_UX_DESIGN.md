# UI and UX design

The interface centers on one reviewer task. Understand the result, inspect its context, then check the underlying evidence. The four screens progressively narrow that task rather than adding unrelated modules.

## Visual choices

The charcoal and black surfaces follow the supplied WARCAMP language. Neutral text levels and borders group information. A restrained gold accent marks a primary action or evidence gap. Status words remain visible, so color is never the only signal.

Inter makes ordinary text and navigation readable. IBM Plex Mono aligns scores, IDs and numerical details. The fonts are locally packaged in [layout.tsx](../app/layout.tsx). Shared CSS in [globals.css](../app/globals.css) gives tables, controls and disclosure panels one consistent spacing and focus system.

The overview starts with cohort size and result availability, then separates the four role families. Distribution buckets show how scores are spread within each family. They communicate an actual question rather than adding a decorative trend chart. The directory uses a table because names, roles, scores, coverage and states need aligned comparison.

## WARCAMP principles in the actual screens

| Principle | Concrete decision |
| --- | --- |
| Hick's Law | Three primary destinations and relevant directory filters keep choices focused |
| Fitts's Law | Comfortable search/filter controls and full employee links are usable targets |
| Jakob's Law | Familiar navigation, table pagination and native disclosure behavior |
| Miller's Law | Six dimensions are grouped, with smaller metric details revealed underneath |
| Doherty Threshold | Loading feedback and navigation pending state acknowledge work in progress |
| Tesler's Law | Normalization, deduplication and calculation complexity stay in the backend |
| Proximity | Score, weight and contribution are physically grouped with their dimension |
| Similarity | One shared status/score component gives equivalent information a consistent treatment |
| Common Region | Borders and disclosure panels group the evidence belonging to a calculation |
| Von Restorff Effect | Restrained emphasis makes missing-evidence cases easier to notice |
| Cognitive Load | Labels state units and meanings, while raw payloads remain expandable |
| Peak-End Rule | A traceable source record provides a useful end to investigation |
| Aesthetic-Usability Effect | Alignment and consistent type support trust while evidence verifies the result |

## The six additional concepts

**Progressive disclosure** lets a reviewer open a dimension, then metric references, then the source payload. **Recognition rather than recall** keeps employee names, codes, family and evaluation period visible. **Smart defaults** begin with the latest published run and retain it during exploration.

**Constraints/Poka-Yoke** use typed family/status options and backend validation. **Information scent** gives destinations and evidence links concrete labels. **Interruption recovery** relies on URL search/filter/page/run parameters, so a copied URL restores the same exploration context.

## Observe, contextualise, recommend

A detail page first exposes score or insufficiency. It then shows the role rubric, dimensions, operands and sources. Suggested follow-up comes from the actual reason, such as verifying an unavailable source or reviewing a failed work check. It avoids guessing about the person.

The design review should include a narrow-screen table, a keyboard path into an evidence disclosure, a search with no matches, a calculated result and an insufficient-evidence result. The [verification record](../docs/VERIFICATION.md) reports the checks actually performed.

## Label typography review

The owner's UI review on 23 November requested sentence case throughout the interface and normal letter spacing. The wordmark now reads Contriq. Workspace context, evaluation-period labels, evaluation state, employee-detail headings, methodology labels, loading and error messages use sentence case.

Inter renders the human-readable labels as well as navigation, headings and body copy. IBM Plex Mono renders scores, identifiers, dates, formulas and raw structured data. Labels and technical values are separate spans when they share a line. Browser renderer inspection confirmed actual Inter Regular and Inter Medium glyphs for interface copy and IBM Plex Mono for numerical data. The revised layouts were checked on all four screens and at 390px width.
