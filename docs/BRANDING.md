# Contriq branding

Updated 23 November 2026 following the owner's supplied OSWAR/teck references.

## Wordmark

The product name is displayed as CONTRIQ. The N has the pointed open-apex form used in the supplied company examples. The underlying text remains CONTRIQ, and the navigation link has the accessible name Contriq overview.

The wordmark uses locally packaged Inter Bold at weight 700. A CSS pseudo-element in `app/globals.css` gives the N its custom shape. `src/components/navigation.tsx` renders the wordmark and product mark. Interface headings, navigation, labels and body copy use Inter with sentence-case labels. Scores, identifiers, dates and formulas use IBM Plex Mono.

The footer uses Geist with the bundled [SIL Open Font License](../public/fonts/geist-OFL.txt). The curtain samples a Times New Roman CONTRIQ mask and uses the same custom N outline. Its fixed reveal, 3 px cells on a 4 px grid, and traveling Simplex field follow the [WoiseX100 curtain](https://github.com/dumpydon/WoiseX100/blob/main/src/curtain-motion.js). Active cells use Contriq gold. Reduced motion shows a still frame.

The full-width bar immediately above the curtain carries the OSWAR/teck credit, copyright and legal controls. The controls show demo notices. Final legal text is pending owner review.

People cards and employee records use [Cue’s review images](https://github.com/dumpydon/cue/tree/3b1b1f1e1bd63b7cef6312a93e05ccdbad3c753c/site/public/assets/story-avatars) as illustrations for fictional profiles. The 11 published PNGs rotate deterministically by employee code. Records with insufficient evidence use Cue’s Remi Zee illustration (`alex-rivera.svg`).

## Product mark

The selected product mark combines a rounded C with a diagonal Q tail and a three-bar chart. It uses champagne gold and antique gold on charcoal.

- App asset is `public/brand/contriq-mark.png`, a 160px PNG.
- The selected full-resolution generated source is retained locally at `.local/brand/contriq-cq-mark-generated.png`.
- The built-in ImageGen tool generated the mark. The selected output was inspected and downsampled for the interface.
- The charcoal ground blends into the dark sidebar with the mark's CSS blend treatment.

## Shared browser-tab identity

The supplied examples use one corporate mark across OSWAR/teck products. The same official asset is used here, downloaded from the icon link exposed by the Polycron page. [Source page](https://oswarteck.com/polycron), [official icon asset](https://oswarteck.com/icon.png?icon.a4c0e8b2.png)

`app/icon.png` preserves the exact official 500px PNG. `app/favicon.ico` contains 16, 32, 48 and 64px derivatives for browser support. Its embedded PNG frames use RGBA, as required by Next.js's ICO decoder. Next.js discovers both files through its icon metadata conventions. The app tab title uses CONTRIQ.

## Selected generation prompt

The following exact prompt produced the selected product mark with the built-in ImageGen tool.

```text
Recolor and isolate the main C/Q monogram in this image for the CONTRIQ app. Match the reference geometry closely: the same wide, rounded hexagonal C silhouette open at the right, the same diagonal lower-right Q tail, and the same chart inside it with three rising bars and three round nodes on the ascending line. Keep the alignment, weight, proportions, and gaps from the reference. Recolor the navy C and trend line to Contriq's muted champagne gold #d6bf83, and the teal bars and Q tail to warm antique gold #b09150. Use uniform charcoal #0b0d0c for the background. Remove the Edit button and any neighboring graphic from the screenshot. Output exactly one tightly spaced, optically centered logo on a square canvas with about 8% padding. Crisp clean edges and flat solid fills. No lettering, blue or teal, sheen, bevels, texture, shadow, or embellishment.
```

