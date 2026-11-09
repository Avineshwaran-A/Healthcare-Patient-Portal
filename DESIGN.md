# Healthcareportal design system

World: clinical editorial. Warm paper, deep ink, pine, one coral action accent. Source of truth for tokens is
`frontend/src/app/globals.css`; the live specimen is `/design-system`.

## Colour
| Token | Hex | Use |
|---|---|---|
| background (paper) | #F6F2E9 | Page ground |
| card | #FBF9F4 | Raised surface |
| foreground / sidebar (ink) | #0D1B17 | Text, dark sections |
| primary (pine) | #0B4A3F | Primary actions, links |
| coral | #FF6A4D | The single action accent per screen. Ink text on it, never white |
| mint | #9BE8C2 | Highlight on ink |
| info / success / warning / destructive | see globals.css | Status meaning only |

Rules: no violet; no gradient text; every text pair meets WCAG AA; status colours never decorate.

## Type
- One typeface: **Inter** (variable, self-hosted via next/font), with system sans fallbacks. No serif, no monospace, no italics for emphasis.
- Weights: 600 page, section and table headings; 500 card headings, labels, buttons, navigation, badges; 400 body, inputs, table cells, captions.
- Large headings: `.display-xl` (2.5–4.5rem), `.display-lg` (2–3.25rem), `.display-md` (1.5–2rem), all SemiBold. Emphasis is colour on one phrase, never a second face.
- `.eyebrow`: 12px Medium metadata line, sentence case. Tabular numerals on tables, `time`, `.tabular`, stats and IDs.
- `font-mono` is aliased to Inter in `tailwind.config.ts` so no component can introduce another family.

## Components
Buttons (pill): default pine, `action` coral, outline, secondary, ghost, destructive.
Badges: tones neutral/primary/info/success/warning/danger x variants soft/solid/outline, optional dot or icon.
Domain statuses live in `STATUS` in `components/ui/index.tsx`: change a label or tone there, nowhere else.

## Motion
- Text mask (`MaskLines`): lines rise from an overflow mask. 1.1s expo.out, 0.1s stagger.
- Image/UI mask (`ClipReveal`): clip-path uncover on enter.
- Section transition: the next panel slides over the previous with a rounded clip-path; the covered panel pins, scales to 0.94 and dims. Scrubbed (landing only).
- Curtain (`TransitionLink`): pine wipe between landing and auth pages.
- Loader: ECG draw, counter, split panels. Landing only, once per session, about 1.7s.
- Workspaces: quiet only (`page-in` 260ms, hover lift). No masks or pinning on data screens.
- Reduced motion: everything rests in its final state and nothing stays hidden.
