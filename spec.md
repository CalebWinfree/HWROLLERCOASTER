# Gravity Ride — first draft

## Purpose

Gravity Ride is a small browser app for students and coaster fans to sketch a roller coaster and see how a gravity-powered car moves along it.

## Inputs

- The user drags track points on a grid measured in meters. The first point is the starting crest.
- The default track starts at 80 m, drops to 20 m, and then climbs again.
- The first version assumes no friction and uses a 1,000 kg car with riders.

## Calculations

Use a smooth curve through the control points. The car's speed comes from the height lost since the start: `v = sqrt(2 g (h_start - h))`. Convert m/s to mph for display. The vertical g reading depends on the track curvature and speed. The car cannot climb above its starting height. Mark a failure if it stalls at a crest or the g reading is outside -1 to 4 g.

For a 60 m drop with no friction, `v = sqrt(2 * 9.81 * 60) = 34.3 m/s`, or about 76.7 mph. For a valley of radius 100 m at that speed, the g reading is about `1 + v^2/(100 * 9.81) = 2.2 g`.

## Outputs

- An animated car on the track.
- Live speed in mph and vertical g in g.
- Plots of speed and g along the track.
- A marker where the ride fails.

## Look and feel

A dark, high-contrast engineering dashboard. Track editing is the main view, with ride controls and readouts beside or below it. On a phone, stack the controls and plots below the track.

## Validation

Start at 80 m and evaluate the car at the bottom of a 20 m valley, with no friction. The expected speed is 34.3 m/s (76.7 mph). If the bottom radius is 100 m, the expected valley g reading is about 2.2 g.

## Features

- Save and restore a design using a shareable URL.
- Add an engineering safety summary that reports the minimum and maximum g and whether the full ride is safe.

## Out of scope

No real-world coaster certification, 3D rendering, friction, air drag, lift hills, loops, or crowd/vehicle engineering in the first version.
