# Gravity Ride — specification

## Purpose

Gravity Ride is a browser-based learning tool for physics students and coaster enthusiasts. Users shape a track, ride it with a gravity-powered car, and inspect energy, speed, and rider g-loads. It is an educational model, not a real-world ride-design or safety-certification tool.

## Inputs

- Track geometry is entered by dragging the 13 preset control points on the track diagram, or by focusing a point and using the arrow keys (Shift + arrow moves 5 m). Horizontal position `x` is 0–500 m and height `h` is 0–100 m; points remain in left-to-right order with at least 2 m between neighbors. The first point is the start and sets the release height. The point count is fixed.
- The default design starts at 80 m and descends into a 20 m valley before another hill. Its control points `(x m, h m)` are `(0,80)`, `(40,70)`, `(80,50)`, `(120,35)`, `(160,22)`, `(170,20.51456)`, `(180,20)`, `(190,20.51456)`, `(200,22)`, `(230,32)`, `(270,65)`, `(320,45)`, `(400,20)`. The user can restore this design with **Reset track**.
- **Play**, **Pause**, and **Reset ride** control the animation; they do not change the physics.
- The model uses `g = 9.81 m/s²`, zero friction, and zero air drag. Mass is not an input because it cancels from the energy and acceleration equations.
- **Share design** encodes the control-point coordinates in a URL. Opening that URL restores the design. **Load shared design** accepts a URL pasted into a text field; malformed or out-of-range designs are rejected with an error.

## Calculations

The track is a natural cubic spline `h(x)` through the control points, with `x` increasing from left to right and zero second derivative at both ends. At each point on the resulting curve, `s` is distance along the track in meters, `h` is height in meters, `θ = atan(dh/dx)` is the tangent angle measured from the horizontal, and `κ = h''(x)/(1+(dh/dx)²)^(3/2)` is signed curvature in `1/m` (positive for a valley, negative for a crest). The plotted distance is accumulated from `ds = sqrt(1+(dh/dx)²) dx`.

With release height `h₀` and no friction, conservation of energy gives speed magnitude `v = sqrt(max(0, 2g(h₀-h)))` in m/s wherever `h ≤ h₀`. The displayed speed is `v_mph = 2.23694 v`. The animation advances along the track under tangential gravity; its speed readout is evaluated from the energy equation.

The signed normal seat load, displayed as vertical g-force, is `G = cos(θ) + v²κ/g`, in g. At a horizontal valley bottom with radius `r = 1/κ`, this reduces to `G = 1 + v²/(rg)`. A ride fails and stops at the first location where `G > 4` or `G < -1`. If the track rises above `h₀`, the car stops at the `h = h₀` turning point, reverses direction, and rolls back; the turning point is marked as an energy failure. Equality at a g threshold is not a failure.

Speed and g are sampled along track distance for the two plots. The safety summary reports the minimum and maximum g on the reachable route and an overall pass/fail result; an energy stall also makes the result fail.

## Outputs

- A smooth, draggable track diagram with control points and an animated car.
- Live speed in mph and signed normal g-load in g.
- Speed (mph) and g (g) plots against distance along the track (m), with failure locations marked.
- A track failure marker and clear explanation for an unreachable crest or a g-limit violation.
- A safety summary with minimum and maximum reachable g and an overall status.
- A shareable URL for restoring a design.

## Look and feel

A dark, high-contrast engineering dashboard. On first open, show the default track, labeled draggable points, idle car at the first point, live readouts, plots, and ride controls. The track is the largest panel; controls and safety summary sit nearby, with plots below. Use visible labels, units, and safe/failure color plus text (not color alone). On phones, stack panels in reading order, keep the full track visible by scaling its SVG, and make points comfortably touch-draggable. The page is a dependency-free static site so it can be hosted on GitHub Pages.

## Validation

Use the default design, `g = 9.81 m/s²`, release height `h₀ = 80 m`, and evaluate its valley control point at `(x,h) = (180,20) m`, no friction. The spline's local radius there is approximately `100 m` (horizontal tangent to within 0.003 rad). The 60 m drop gives:

1. `v = sqrt(2 * 9.81 * (80 - 20)) = sqrt(1177.2) = 34.310 m/s`.
2. `v_mph = 34.310 * 2.23694 = 76.75 mph`.
3. `G = cos(θ) + v²κ/g ≈ 1 + 1177.2/(100*9.81) = 2.200 g`.

The app's interpolated spline will be checked against 76.75 mph within 0.1 mph and 2.200 g within 0.05 g at the valley control point. A separate design that rises above 80 m must turn back and mark the first `h = 80 m` turning point. A design whose computed load exceeds 4 g or drops below -1 g must stop and mark that point.

## Features

- **Design sharing:** copy a URL that preserves the user's track points and restore a design from a shared URL. This helps students compare and discuss designs without manually copying coordinates.
- **Safety envelope:** show the minimum and maximum g on the reachable route and whether the ride passes both the g limits and energy-reachability check. This helps students identify why a design is unsafe before or after a ride.

## Out of scope

No real-world coaster certification or structural analysis, 3D rendering, friction, air drag, lift hills, loops, vehicle mass tuning, or crowd/vehicle engineering. Track editing is limited to moving the provided control points; users cannot add or delete points in this version.
