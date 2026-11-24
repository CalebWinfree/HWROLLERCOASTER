# Prompt and decision log

## Assignment prompt

Build a browser app where a user draws a roller-coaster track, rides it under gravity, and sees speed, vertical g-force, plots, and failure markers. Include a hand-worked physics validation. The assignment requires seven spec sections, at least two additional features, staged commits, and GitHub Pages publication.

## First-draft spec review

The initial spec is intentionally rough. The hand check uses an 80 m start, a 20 m valley, and a 100 m valley radius:

- `v = sqrt(2 * 9.81 * (80 - 20)) = 34.292856 m/s = 76.72 mph`
- At the bottom of a valley, `n/g = 1 + v^2/(r*g) = 2.2 g`

## Plan-mode availability

This workspace's available tools do not include a Plan-mode toggle or a separate Plan-mode agent chat. The spec will be reviewed in the current coding session and the section-by-section prompts and decisions will be recorded here; no Plan-mode session is claimed.
