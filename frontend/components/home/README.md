# Home page components

Audience: B2B sales decision-makers — VP Sales, Head of Growth, early-stage
startup founders. They decide in 30 seconds whether to keep reading.

## Positioning

Attack status quo. Most demand-validation tools confidently hallucinate. We
don't. The differentiator is honest acknowledgement of limits — a moral
claim about the product, not a feature claim.

## Visual discipline (Linear-style)

- Restraint, lots of whitespace
- No gradients
- No colorful accents beyond the existing product palette
- No hero animation beyond the three allowed motions:
  1. Hero input typewriter placeholder cycling
  2. Scroll-triggered fade-in (IntersectionObserver, once)
  3. Hero montage hover 3D tilt
- Everything else: static

## Structure

Four scrollable sections. Each max-width 1200px, centered.

1. `HeroSection` — headline + typewriter input + 3-layer product montage
2. `ManifestoSection` — "Our stop doing list." 5 items
3. `LiveExampleSection` — cannabis dispensary example, real component reuse
4. `FooterCTASection` — second CTA + links + tagline

## Reuse strategy

- Real reuse: `AdequacyFlow`, `Badge`, `Card`, `EvidenceList`, `RedditIcon`
- Static visual replicas (decorative, not functional): the hero montage's
  mini reasoning log / adequacy card / gap card are written inline, not
  rendered from real components — they're screenshots-as-HTML
- Copied from DemandReport: `DemandDiagnosticCard` and `GapCard` are
  re-written inline in `LiveExampleSection.tsx` with the same visual shape.
  Refactor (extract from DemandReport) deferred post-launch.

## CTA flow

Both CTAs (hero + footer) use `TypewriterInput`, which on Analyze:
1. Reads the current input value
2. If non-empty, navigates to `/analyze?description=<encoded>`
3. If empty, navigates to `/analyze` with no query param

`AnalyzeFlow` (on `/analyze`) reads `?description=` on mount and prefills
`DescriptionInput.initialValue`.

## External links

Footer links point to the live GitHub repo, LinkedIn profile, and the
`DECISIONS.md` file on GitHub. All three open in a new tab.
