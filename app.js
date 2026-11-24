"use strict";

(() => {
  const GRAVITY = 9.81;
  const METERS_TO_MPH = 2.2369362920544;
  const MIN_G = -1;
  const MAX_G = 4;
  const SAMPLE_STEPS = 48;
  const MIN_POINT_GAP = 2;
  const DRAW = { left: 65, bottom: 330, xScale: 1.65, yScale: 2.7 };
  const CHART = { left: 48, right: 760, top: 22, bottom: 190 };
  const DEFAULT_TRACK = [
    { x: 0, h: 80 },
    { x: 40, h: 70 },
    { x: 80, h: 50 },
    { x: 120, h: 35 },
    { x: 160, h: 22 },
    { x: 170, h: 20.51456 },
    { x: 180, h: 20 },
    { x: 190, h: 20.51456 },
    { x: 200, h: 22 },
    { x: 230, h: 32 },
    { x: 270, h: 65 },
    { x: 320, h: 45 },
    { x: 400, h: 20 }
  ];

  const svgNS = "http://www.w3.org/2000/svg";
  const elements = {
    trackSvg: document.querySelector(".track-svg"),
    trackShadow: document.querySelector("#track-shadow"),
    trackLine: document.querySelector("#track-line"),
    controlPoints: document.querySelector("#control-points"),
    car: document.querySelector("#car"),
    failureMarker: document.querySelector("#failure-marker"),
    speedValue: document.querySelector("#speed-value"),
    gValue: document.querySelector("#g-value"),
    status: document.querySelector("#ride-status"),
    chartGrid: document.querySelector("#chart-grid"),
    speedPlot: document.querySelector("#speed-plot"),
    gPlot: document.querySelector("#g-plot"),
    plotFailure: document.querySelector("#plot-failure"),
    plotCursor: null,
    plotDistance: document.querySelector(".plot-heading-note")
  };

  let trackPoints = cloneTrack(DEFAULT_TRACK);
  let spline;
  let samples;
  let totalDistance;
  let energyBarrierDistance = null;
  let startHeight;
  let draggingIndex = null;
  let ride = freshRide();

  function cloneTrack(points) {
    return points.map(({ x, h }) => ({ x, h }));
  }

  function freshRide() {
    return {
      running: false,
      distance: 0,
      velocity: 0,
      lastTimestamp: null,
      frame: null,
      failureDistance: null,
      failureKind: null,
      failureMessage: ""
    };
  }

  function solveSpline(points) {
    const count = points.length;
    const second = Array(count).fill(0);
    if (count === 2) {
      return { points, second };
    }

    const intervals = [];
    for (let i = 0; i < count - 1; i += 1) {
      intervals.push(points[i + 1].x - points[i].x);
    }

    const size = count - 2;
    const lower = Array(size).fill(0);
    const diagonal = Array(size).fill(0);
    const upper = Array(size).fill(0);
    const right = Array(size).fill(0);

    for (let row = 0; row < size; row += 1) {
      const i = row + 1;
      const leftWidth = intervals[i - 1];
      const rightWidth = intervals[i];
      lower[row] = row === 0 ? 0 : leftWidth;
      diagonal[row] = 2 * (leftWidth + rightWidth);
      upper[row] = row === size - 1 ? 0 : rightWidth;
      const leftSlope = (points[i].h - points[i - 1].h) / leftWidth;
      const rightSlope = (points[i + 1].h - points[i].h) / rightWidth;
      right[row] = 6 * (rightSlope - leftSlope);
    }

    for (let row = 1; row < size; row += 1) {
      const factor = lower[row] / diagonal[row - 1];
      diagonal[row] -= factor * upper[row - 1];
      right[row] -= factor * right[row - 1];
    }
    second[count - 2] = right[size - 1] / diagonal[size - 1];
    for (let row = size - 2; row >= 0; row -= 1) {
      second[row + 1] = (right[row] - upper[row] * second[row + 2]) / diagonal[row];
    }
    return { points, second };
  }

  function curveAtX(x) {
    const points = spline.points;
    let low = 0;
    let high = points.length - 1;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if (x >= points[middle].x) {
        low = middle;
      } else {
        high = middle;
      }
    }

    const i = Math.min(low, points.length - 2);
    const left = points[i];
    const right = points[i + 1];
    const width = right.x - left.x;
    const a = (right.x - x) / width;
    const b = (x - left.x) / width;
    const secondLeft = spline.second[i];
    const secondRight = spline.second[i + 1];
    const h = a * left.h + b * right.h
      + ((a * a * a - a) * secondLeft + (b * b * b - b) * secondRight) * width * width / 6;
    const slope = (right.h - left.h) / width
      + width / 6 * (-(3 * a * a - 1) * secondLeft + (3 * b * b - 1) * secondRight);
    const secondDerivative = a * secondLeft + b * secondRight;
    const tangent = Math.atan(slope);
    const curvature = secondDerivative / Math.pow(1 + slope * slope, 1.5);
    return { x, h, slope, tangent, curvature };
  }

  function physicsAt(curve) {
    const speed = Math.sqrt(Math.max(0, 2 * GRAVITY * (startHeight - curve.h)));
    const gLoad = Math.cos(curve.tangent) + speed * speed * curve.curvature / GRAVITY;
    return { ...curve, speed, mph: speed * METERS_TO_MPH, gLoad };
  }

  function buildTrackSamples() {
    spline = solveSpline(trackPoints);
    startHeight = trackPoints[0].h;
    const result = [];
    let distance = 0;

    for (let segment = 0; segment < trackPoints.length - 1; segment += 1) {
      const startX = trackPoints[segment].x;
      const endX = trackPoints[segment + 1].x;
      for (let step = 0; step <= SAMPLE_STEPS; step += 1) {
        if (segment > 0 && step === 0) {
          continue;
        }
        const x = startX + (endX - startX) * step / SAMPLE_STEPS;
        const curve = curveAtX(x);
        if (result.length > 0) {
          const previous = result[result.length - 1];
          distance += Math.hypot(x - previous.x, curve.h - previous.h);
        }
        result.push({ ...physicsAt(curve), distance });
      }
    }
    samples = result;
    totalDistance = distance;
    energyBarrierDistance = null;
    for (let index = 1; index < samples.length; index += 1) {
      if (samples[index].h <= startHeight + 1e-8) {
        continue;
      }
      let below = samples[index - 1].distance;
      let above = samples[index].distance;
      for (let iteration = 0; iteration < 36; iteration += 1) {
        const middle = (below + above) / 2;
        if (pointAtDistance(middle).h > startHeight) {
          above = middle;
        } else {
          below = middle;
        }
      }
      energyBarrierDistance = (below + above) / 2;
      break;
    }
  }

  function pointAtDistance(distance) {
    const target = Math.max(0, Math.min(totalDistance, distance));
    let low = 0;
    let high = samples.length - 1;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if (samples[middle].distance <= target) {
        low = middle;
      } else {
        high = middle;
      }
    }
    const first = samples[low];
    const last = samples[high];
    const fraction = last.distance === first.distance
      ? 0
      : (target - first.distance) / (last.distance - first.distance);
    const x = first.x + (last.x - first.x) * fraction;
    return { ...physicsAt(curveAtX(x)), distance: target };
  }

  function worldToSvg(x, h) {
    return { x: DRAW.left + x * DRAW.xScale, y: DRAW.bottom - h * DRAW.yScale };
  }

  function svgNode(name, attributes) {
    const node = document.createElementNS(svgNS, name);
    for (const [key, value] of Object.entries(attributes)) {
      node.setAttribute(key, String(value));
    }
    return node;
  }

  function renderTrack() {
    const path = samples.map((sample, index) => {
      const point = worldToSvg(sample.x, sample.h);
      return `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }).join(" ");
    elements.trackShadow.setAttribute("d", path);
    elements.trackLine.setAttribute("d", path);

    elements.controlPoints.replaceChildren();
    trackPoints.forEach((point, index) => {
      const position = worldToSvg(point.x, point.h);
      const circle = svgNode("circle", {
        class: "point-ring",
        cx: position.x,
        cy: position.y,
        r: index === 0 ? 7 : 6,
        tabindex: "0",
        role: "button",
        "data-index": index,
        "aria-label": `Control point ${index + 1}: ${point.x.toFixed(1)} meters along, ${point.h.toFixed(1)} meters high. Drag or use arrow keys to move.`
      });
      elements.controlPoints.append(circle);
    });
  }

  function chartX(distance) {
    return CHART.left + (distance / totalDistance) * (CHART.right - CHART.left);
  }

  function speedY(mph) {
    return CHART.bottom - (mph / 100) * (CHART.bottom - CHART.top);
  }

  function gY(gLoad) {
    return CHART.bottom - ((gLoad + 1) / 5) * (CHART.bottom - CHART.top);
  }

  function renderChartGrid() {
    elements.chartGrid.replaceChildren();
    for (let tick = 0; tick <= 5; tick += 1) {
      const y = CHART.bottom - tick * (CHART.bottom - CHART.top) / 5;
      elements.chartGrid.append(
        svgNode("line", { class: "plot-grid", x1: CHART.left, x2: CHART.right, y1: y, y2: y }),
        svgNode("text", { class: "plot-label", x: 9, y: y + 3, "text-anchor": "start" })
      );
      elements.chartGrid.lastChild.textContent = String(tick * 20);
      const gTick = tick - 1;
      const label = svgNode("text", { class: "plot-label", x: 787, y: y + 3, "text-anchor": "end" });
      label.textContent = `${gTick} g`;
      elements.chartGrid.append(label);
    }
    const labels = [
      { distance: 0, anchor: "start" },
      { distance: totalDistance / 2, anchor: "middle" },
      { distance: totalDistance, anchor: "end" }
    ];
    for (const item of labels) {
      const text = svgNode("text", {
        class: "plot-label",
        x: chartX(item.distance),
        y: 205,
        "text-anchor": item.anchor
      });
      text.textContent = `${item.distance.toFixed(0)} m`;
      elements.chartGrid.append(text);
    }
  }

  function renderPlots() {
    const speedPath = [];
    const gPath = [];
    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index];
      const x = chartX(sample.distance);
      speedPath.push(`${index === 0 ? "M" : "L"}${x.toFixed(2)} ${speedY(sample.mph).toFixed(2)}`);
      gPath.push(`${index === 0 ? "M" : "L"}${x.toFixed(2)} ${gY(sample.gLoad).toFixed(2)}`);
    }
    elements.speedPlot.setAttribute("d", speedPath.join(" "));
    elements.gPlot.setAttribute("d", gPath.join(" "));
    elements.plotDistance.textContent = `${totalDistance.toFixed(0)} m total distance`;
    renderChartGrid();
    updatePlotMarkers();
  }

  function updatePlotMarkers() {
    const cursorX = chartX(ride.distance);
    if (!elements.plotCursor) {
      elements.plotCursor = svgNode("line", {
        id: "plot-cursor",
        y1: CHART.top,
        y2: CHART.bottom,
        stroke: "#d9eee8",
        "stroke-width": 1,
        "stroke-dasharray": "3 4",
        opacity: 0.65
      });
      document.querySelector("#profile-chart").append(elements.plotCursor);
    }
    elements.plotCursor.setAttribute("x1", cursorX);
    elements.plotCursor.setAttribute("x2", cursorX);
    if (ride.failureDistance === null) {
      elements.plotFailure.setAttribute("visibility", "hidden");
    } else {
      const failX = chartX(ride.failureDistance);
      elements.plotFailure.setAttribute("x1", failX);
      elements.plotFailure.setAttribute("x2", failX);
      elements.plotFailure.setAttribute("visibility", "visible");
    }
  }

  function setStatus(message, kind) {
    elements.status.textContent = message;
    elements.status.classList.toggle("failed", kind === "failed");
    elements.status.classList.toggle("safe", kind === "safe");
  }

  function renderReadouts() {
    const current = pointAtDistance(ride.distance);
    elements.speedValue.firstChild.textContent = current.mph.toFixed(1);
    elements.gValue.firstChild.textContent = current.gLoad.toFixed(2);
    const position = worldToSvg(current.x, current.h);
    elements.car.setAttribute("transform", `translate(${position.x} ${position.y}) rotate(${-current.tangent * 180 / Math.PI})`);
    elements.car.dataset.x = current.x.toFixed(3);
    elements.car.dataset.height = current.h.toFixed(3);
    elements.car.dataset.curvature = current.curvature.toFixed(6);
    elements.car.dataset.distance = current.distance.toFixed(3);
    const failure = ride.failureDistance === null ? null : pointAtDistance(ride.failureDistance);
    if (failure) {
      const marker = worldToSvg(failure.x, failure.h);
      elements.failureMarker.setAttribute("cx", marker.x);
      elements.failureMarker.setAttribute("cy", marker.y);
      elements.failureMarker.style.display = "block";
      elements.failureMarker.setAttribute("aria-label", ride.failureMessage);
    } else {
      elements.failureMarker.style.display = "none";
      elements.failureMarker.removeAttribute("aria-label");
    }
    updatePlotMarkers();
  }

  function refreshDesign() {
    buildTrackSamples();
    renderTrack();
    renderPlots();
    renderReadouts();
  }

  function resetRide(message = "Ready to ride · no friction or air drag") {
    if (ride.frame !== null) {
      cancelAnimationFrame(ride.frame);
    }
    ride = freshRide();
    renderReadouts();
    setStatus(message, "");
  }

  function resetTrack() {
    trackPoints = cloneTrack(DEFAULT_TRACK);
    resetRide();
    refreshDesign();
  }

  function getSafeLimitFailure(fromDistance, toDistance, kind) {
    let safeFraction = 0;
    let failedFraction = 1;
    for (let iteration = 0; iteration < 32; iteration += 1) {
      const fraction = (safeFraction + failedFraction) / 2;
      const point = pointAtDistance(fromDistance + (toDistance - fromDistance) * fraction);
      const failed = kind === "high" ? point.gLoad > MAX_G : point.gLoad < MIN_G;
      if (failed) {
        failedFraction = fraction;
      } else {
        safeFraction = fraction;
      }
    }
    return fromDistance + (toDistance - fromDistance) * failedFraction;
  }

  function findEnergyTurningPoint(fromDistance, toDistance) {
    let below = fromDistance;
    let above = toDistance;
    for (let iteration = 0; iteration < 36; iteration += 1) {
      const middle = (below + above) / 2;
      if (pointAtDistance(middle).h > startHeight) {
        above = middle;
      } else {
        below = middle;
      }
    }
    return (below + above) / 2;
  }

  function recordEnergyFailure(distance) {
    ride.distance = energyBarrierDistance === null
      ? findEnergyTurningPoint(ride.distance, distance)
      : energyBarrierDistance;
    ride.velocity = 0;
    if (ride.failureKind !== "energy") {
      const point = pointAtDistance(ride.distance);
      ride.failureKind = "energy";
      ride.failureDistance = ride.distance;
      ride.failureMessage = `Not enough energy to reach the next crest at ${point.x.toFixed(1)} m; the car rolls back.`;
      setStatus(`Energy failure: ${ride.failureMessage}`, "failed");
    }
  }

  function stopForGFailure(fromDistance, toDistance, kind) {
    ride.distance = getSafeLimitFailure(fromDistance, toDistance, kind);
    ride.velocity = 0;
    ride.running = false;
    ride.failureDistance = ride.distance;
    ride.failureKind = "g";
    const point = pointAtDistance(ride.distance);
    const limit = kind === "high" ? "4 g maximum" : "-1 g minimum";
    ride.failureMessage = `G-force limit exceeded (${point.gLoad.toFixed(2)} g; ${limit}).`;
    elements.speedValue.firstChild.textContent = point.mph.toFixed(1);
    elements.gValue.firstChild.textContent = point.gLoad.toFixed(2);
    setStatus(`Ride stopped: ${ride.failureMessage}`, "failed");
  }

  function advanceRide(dt) {
    const substeps = Math.max(1, Math.ceil(dt / 0.01));
    const stepDuration = dt / substeps;
    for (let step = 0; step < substeps && ride.running; step += 1) {
      const fromDistance = ride.distance;
      const current = pointAtDistance(fromDistance);
      const acceleration = -GRAVITY * Math.sin(current.tangent);
      const nextVelocity = ride.velocity + acceleration * stepDuration;
      let nextDistance = fromDistance + (ride.velocity + nextVelocity) * 0.5 * stepDuration;

      if (nextDistance > totalDistance) {
        nextDistance = totalDistance;
      }
      if (nextDistance < 0) {
        ride.distance = 0;
        ride.velocity = 0;
        ride.running = false;
        if (ride.failureKind === "energy") {
          setStatus(`Energy failure: rolled back to the start. ${ride.failureMessage}`, "failed");
        } else {
          setStatus("Ride complete · car returned to the start", "safe");
        }
        break;
      }

      const next = pointAtDistance(nextDistance);
      const gFailureKind = next.gLoad > MAX_G ? "high" : next.gLoad < MIN_G ? "low" : null;
      if (gFailureKind) {
        stopForGFailure(fromDistance, nextDistance, gFailureKind);
        break;
      }

      const stalledBeforeBarrier = energyBarrierDistance !== null
        && fromDistance < energyBarrierDistance - 1e-6
        && ride.velocity > 0
        && current.slope > 0
        && nextVelocity <= 0;
      if ((nextDistance > fromDistance && next.h > startHeight + 1e-8) || stalledBeforeBarrier) {
        recordEnergyFailure(nextDistance);
        continue;
      }

      ride.distance = nextDistance;
      const energySpeed = Math.sqrt(Math.max(0, 2 * GRAVITY * (startHeight - next.h)));
      ride.velocity = Math.sign(nextVelocity || acceleration) * energySpeed;

      if (ride.distance >= totalDistance) {
        ride.running = false;
        ride.velocity = 0;
        if (ride.failureKind === null) {
          setStatus("Ride complete · track end reached", "safe");
        }
      }
    }
  }

  function animationFrame(timestamp) {
    if (!ride.running) {
      return;
    }
    if (ride.lastTimestamp === null) {
      ride.lastTimestamp = timestamp;
    }
    const dt = Math.min((timestamp - ride.lastTimestamp) / 1000, 1 / 60);
    ride.lastTimestamp = timestamp;
    advanceRide(dt);
    renderReadouts();
    if (ride.running) {
      ride.frame = requestAnimationFrame(animationFrame);
    } else {
      ride.frame = null;
    }
  }

  function startRide() {
    if (ride.running) {
      return;
    }
    if (ride.distance >= totalDistance || ride.failureKind === "g") {
      resetRide();
    }
    const initial = pointAtDistance(ride.distance);
    if (initial.gLoad > MAX_G || initial.gLoad < MIN_G) {
      const kind = initial.gLoad > MAX_G ? "high" : "low";
      stopForGFailure(ride.distance, ride.distance, kind);
      renderReadouts();
      return;
    }
    ride.running = true;
    ride.lastTimestamp = null;
    setStatus("Car released · accelerating under gravity", "");
    ride.frame = requestAnimationFrame(animationFrame);
  }

  function pauseRide() {
    if (!ride.running) {
      return;
    }
    ride.running = false;
    if (ride.frame !== null) {
      cancelAnimationFrame(ride.frame);
    }
    ride.frame = null;
    ride.lastTimestamp = null;
    setStatus("Ride paused · press Ride to continue", "");
  }

  function eventWorldPosition(event) {
    const point = elements.trackSvg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = elements.trackSvg.getScreenCTM();
    if (!matrix) {
      return null;
    }
    const local = point.matrixTransform(matrix.inverse());
    return {
      x: (local.x - DRAW.left) / DRAW.xScale,
      h: (DRAW.bottom - local.y) / DRAW.yScale
    };
  }

  function updateDraggedPoint(event) {
    if (draggingIndex === null) {
      return;
    }
    const position = eventWorldPosition(event);
    if (!position) {
      return;
    }
    const point = trackPoints[draggingIndex];
    const previous = trackPoints[draggingIndex - 1];
    const next = trackPoints[draggingIndex + 1];
    const minX = previous ? previous.x + MIN_POINT_GAP : 0;
    const maxX = next ? next.x - MIN_POINT_GAP : 500;
    point.x = Math.max(minX, Math.min(maxX, position.x));
    point.h = Math.max(0, Math.min(100, position.h));
    resetRide("Track changed · ready to ride");
    refreshDesign();
  }

  elements.controlPoints.addEventListener("pointerdown", (event) => {
    const point = event.target.closest("[data-index]");
    if (!point) {
      return;
    }
    draggingIndex = Number(point.dataset.index);
    elements.trackSvg.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  elements.trackSvg.addEventListener("pointermove", updateDraggedPoint);
  elements.trackSvg.addEventListener("pointerup", () => { draggingIndex = null; });
  elements.trackSvg.addEventListener("pointercancel", () => { draggingIndex = null; });
  elements.controlPoints.addEventListener("keydown", (event) => {
    const pointNode = event.target.closest("[data-index]");
    if (!pointNode) {
      return;
    }
    const index = Number(pointNode.dataset.index);
    const point = trackPoints[index];
    const previous = trackPoints[index - 1];
    const next = trackPoints[index + 1];
    const step = event.shiftKey ? 5 : 1;
    if (event.key === "ArrowUp") {
      point.h = Math.min(100, point.h + step);
    } else if (event.key === "ArrowDown") {
      point.h = Math.max(0, point.h - step);
    } else if (event.key === "ArrowLeft") {
      point.x = Math.max(previous ? previous.x + MIN_POINT_GAP : 0, point.x - step);
    } else if (event.key === "ArrowRight") {
      point.x = Math.min(next ? next.x - MIN_POINT_GAP : 500, point.x + step);
    } else {
      return;
    }
    event.preventDefault();
    resetRide("Track changed · ready to ride");
    refreshDesign();
    elements.controlPoints.querySelector(`[data-index="${index}"]`)?.focus();
  });

  document.querySelector("#ride-play").addEventListener("click", startRide);
  document.querySelector("#ride-pause").addEventListener("click", pauseRide);
  document.querySelector("#ride-reset").addEventListener("click", () => resetRide());
  document.querySelector("#reset-track").addEventListener("click", resetTrack);

  refreshDesign();
  renderReadouts();
})();
