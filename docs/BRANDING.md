# Contriq branding

Updated 23 November 2026 following the owner's supplied OSWAR/teck references.

## Wordmark

The product name is displayed as CONTRIQ. The N has the pointed open-apex form used in the supplied company examples. The underlying text remains CONTRIQ, and the navigation link has the accessible name Contriq overview.

The wordmark uses locally packaged Inter Bold at weight 700. A CSS pseudo-element in `app/globals.css` gives the N its custom shape. `src/components/navigation.tsx` renders the wordmark and product mark. Interface headings, navigation, labels and body copy use Inter with sentence-case labels. Scores, identifiers, dates and formulas use IBM Plex Mono.

The footer uses Geist with the bundled [SIL Open Font License](../public/fonts/geist-OFL.txt). The curtain samples a Times New Roman CONTRIQ mask and uses the same custom N outline. Its fixed reveal, 3 px cells on a 4 px grid, and traveling Simplex field follow the [WoiseX100 curtain](https://github.com/dumpydon/WoiseX100/blob/main/src/curtain-motion.js). Active cells use Contriq gold. Reduced motion shows a still frame.

The full-width bar immediately above the curtain carries the OSWAR/teck credit, copyright and legal controls. The controls show demo notices. Final legal text is pending owner review.

People cards and employee records use [Cue’s review images](https://github.com/dumpydon/cue/tree/3b1b1f1e1bd63b7cef6312a93e05ccdbad3c753c/site/public/assets/story-avatars) as illustrations for fictional profiles. The 11 published PNGs rotate deterministically by employee code. Records with insufficient evidence use Cue’s Remi Zee illustration (`alex-rivera.svg`).

## Product mark

The original generated symbol combines an open geometric C, three evidence strokes and a verification check. It represents original work records becoming a validated and traceable result. Its muted gold and charcoal follow the existing product palette.

- App asset is `public/brand/contriq-mark.png`, a 256px PNG.
- The selected full-resolution generated source is retained locally at `.local/brand/contriq-mark-generated-original.png`.
- The built-in ImageGen tool generated the mark. The selected output was inspected and downsampled for the interface.
- The charcoal ground blends into the dark sidebar with the mark's CSS blend treatment.

## Shared browser-tab identity

The supplied examples use one corporate mark across OSWAR/teck products. The same official asset is used here, downloaded from the icon link exposed by the Polycron page. [Source page](https://oswarteck.com/polycron), [official icon asset](https://oswarteck.com/icon.png?icon.a4c0e8b2.png)

`app/icon.png` preserves the exact official 500px PNG. `app/favicon.ico` contains 16, 32, 48 and 64px derivatives for browser support. Its embedded PNG frames use RGBA, as required by Next.js's ICO decoder. Next.js discovers both files through its icon metadata conventions. The app tab title uses CONTRIQ.

## Selected generation prompt

The following exact prompt produced the selected product mark with the built-in ImageGen tool.

```text
Use case: logo-brand. Design ONE original flat geometric product logo symbol only for CONTRIQ, an evidence-to-verification software app. A compact open letter-C silhouette containing three aligned horizontal evidence bars that converge into a precise verification check. Reduce it to a bold simple balanced symbol that remains clear at 32 pixels. Use solid flat muted gold #d6bf83 ink against a perfectly solid uniform charcoal background #0b0d0c. Absolutely uniform fills, sharp geometric edges, vector-like finish. The symbol should occupy about 85% of a square canvas with modest even padding. No text, wordmark, letters outside the symbol, tiny details, gradients, lighting effects, grain, shadows, glows, frames, presentation boards, mockups or watermark. Do not introduce any additional colors.
```

