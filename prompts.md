# Prompt and decision log

## Assignment prompt

Build a browser app where a user draws a roller-coaster track, rides it under gravity, and sees speed, vertical g-force, plots, and failure markers. Include a hand-worked physics validation. The assignment requires seven spec sections, at least two additional features, staged commits, and GitHub Pages publication.

## First-draft spec review

The initial spec is intentionally rough. The hand check uses an 80 m start, a 20 m valley, and a 100 m valley radius:

- `v = sqrt(2 * 9.81 * (80 - 20)) = 34.292856 m/s = 76.72 mph`
- At the bottom of a valley, `n/g = 1 + v^2/(r*g) = 2.2 g`

Correction during spec review: `sqrt(1177.2) = 34.310348 m/s`, which is `76.750063 mph`; the revised spec uses 34.310 m/s and 76.75 mph.

## Plan-mode availability

This workspace's available tools do not include a Plan-mode toggle or a separate Plan-mode agent chat. The spec will be reviewed in the current coding session and the section-by-section prompts and decisions will be recorded here; no Plan-mode session is claimed.

## Spec review prompts and decisions

The following review was done section by section in the current session because no Plan-mode tool is available.

1. **Whole spec — instruction:** "Review this spec as an engineering learning app. Identify ambiguous inputs, physics conventions, failure behavior, testability, and deployment assumptions before implementation."
   - Decision: keep the first version frictionless, use meters internally, and define the plotted g quantity explicitly as signed normal seat load. Use a natural cubic spline (C2) instead of a Catmull–Rom curve so curvature and g-load stay continuous.
2. **Purpose — question:** "Who is this for, and what should users not infer from it?"
   - Decision: students and enthusiasts; prominently frame it as an educational model, not ride certification.
3. **Inputs — instruction:** "Enumerate all user actions and numeric values with units, ranges, defaults, and controls."
   - Decision: only control-point geometry changes the design; mass is excluded because it cancels. Add explicit restore/reset/share controls and bounded track coordinates.
4. **Calculations — question:** "How will the sign of g-force work at a valley or crest, and how should an inaccessible hill behave?"
   - Decision: positive curvature is a valley; use `G = cos(θ) + v²κ/g`; reverse at the energy turning point and mark it as a failure.
5. **Outputs — instruction:** "Make every requested readout and plot measurable and label its units."
   - Decision: mph and g readouts, distance in meters on both plots, and a failure marker with a textual reason.
6. **Look and feel — question:** "What is shown initially, and how does editing work with touch?"
   - Decision: show the default track and idle car immediately; scale the SVG on narrow screens and support pointer/touch dragging.
7. **Validation — instruction:** "Work one case by hand and set tolerances the app can be checked against."
   - Decision: the default 80 m to 20 m drop yields 76.75 mph; the spline's 100 m-radius valley gives 2.200 g. Compare app samples within 0.1 mph and 0.05 g.
8. **Features — instruction:** "Choose two user-centered additions not already supplied as examples."
   - Decision: share/restore designs via URL, and a reachable-route safety envelope.
9. **Out of scope — question:** "What tempting additions should wait until the required simulation validates?"
   - Decision: defer loops, friction, lift hills, 3D, structural analysis, and editing control-point count.

## Planned implementation prompts

1. "Build only the responsive static dashboard mockup. Use sample values and a drawn default track; do not implement physics yet."
2. "Implement the draggable spline, energy-based ride, rollback and g failures, readouts, plots, and failure markers. Keep the two optional features out until validation."
3. "Run the hand-check case through the app and adjust the implementation until its valley sample meets the stated tolerances. Record the observed outputs."
4. "Add the share/restore URL feature as one focused commit and test malformed input."
5. "Add the safety-envelope summary as one focused commit and test reachable and failed designs."
6. "Publish the static site to GitHub Pages and verify the deployed URL."

## Build stage notes

- **Stage 1 — mockup:** Added a dark responsive dashboard with a default track illustration, ride controls, readouts, plot area, safety panel, and educational-use notice. Checked the page in the browser at desktop size.
- **Stage 2 — required simulator:** Replaced the illustration with a natural cubic spline and pointer/keyboard-editable handles; added energy-based speed, live animation, both plots, and g-limit/energy-turnaround failure markers. Browser checks confirmed that the default ride reaches the end, dragging updates the geometry, both the 4 g and -1 g limits stop with a marked failure, and a raised final crest causes a marked rollback.
- **Feature 1 — shareable designs:** Added URL encoding, clipboard copy with a manual-copy fallback, loading from a pasted URL, and automatic restoration when a shared URL opens. Verified that a changed track survives copy/load and a page reload, and that a URL without track data produces an explicit error without replacing the current design.
- **Feature 2 — safety envelope:** Added live minimum/maximum g and a pass/fail explanation for the energy-reachable route. Browser checks showed the default design as safe (`-0.35` to `3.04 g`), flagged a reshaped track exceeding both g limits, and flagged a design with an unreachable crest.
- **Publishing setup:** Added a GitHub Actions workflow to deploy the static site to GitHub Pages on pushes to `main` and on manual runs. Publishing still requires a GitHub repository with Pages enabled and push access.
- **Pages configuration:** The first Actions run correctly reported that Pages was disabled. Selected **GitHub Actions** as the repository's Pages source in Settings; a subsequent push will retry deployment.

## Hand-check validation

Followed the default ride in the browser and paused just after its 20 m valley point. The car was at `x = 180.032 m`, `h = 20.000 m`, with `κ = 0.010008 1/m`; the live displays read `76.8 mph` and `2.20 g`. The hand results are `v = sqrt(2*9.81*(80-20)) = 34.310348 m/s = 76.750063 mph` and `G = 1 + v²/(100*9.81) = 2.200 g`. The UI's one-decimal mph value differs by 0.050 mph, within the 0.1 mph tolerance; g differs by 0.000 g at displayed precision.
