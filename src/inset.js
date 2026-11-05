const coordinates = point => point.map(value => Number(value.toFixed(4))).join(',');
const midpoint = (a, b) => a.map((value, index) => (value + b[index]) / 2);

// Sample curves closely enough to inset them in SVG units without a DOM.
export function sampleCurve(curve, points) {
  const [start] = curve;
  const end = curve.at(-1);
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const flat = curve.slice(1, -1).every(point => {
    const cross = Math.abs((point[0] - start[0]) * (end[1] - start[1]) - (point[1] - start[1]) * (end[0] - start[0]));
    return cross / (length || 1) < 0.08;
  });
  if (flat) { points.push(end); return; }
  let level = curve;
  const left = [start];
  const right = [end];
  while (level.length > 1) {
    level = level.slice(1).map((point, index) => midpoint(level[index], point));
    left.push(level[0]);
    right.unshift(level.at(-1));
  }
  sampleCurve(left, points);
  sampleCurve(right, points);
}

export function insetPath(outline, distance) {
  const points = outline.filter((point, index) => !index || Math.hypot(point[0] - outline[index - 1][0], point[1] - outline[index - 1][1]) > 1e-7);
  if (Math.hypot(points[0][0] - points.at(-1)[0], points[0][1] - points.at(-1)[1]) < 1e-7) points.pop();
  const area = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0);
  const normals = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    const dx = next[0] - point[0];
    const dy = next[1] - point[1];
    const length = Math.hypot(dx, dy);
    const direction = Math.sign(area);
    return [-dy / length * direction, dx / length * direction];
  });
  const inset = points.map((point, index) => {
    const previous = normals[(index + points.length - 1) % points.length];
    const next = normals[index];
    const scale = distance / Math.max(0.5, 1 + previous[0] * next[0] + previous[1] * next[1]);
    return [point[0] + (previous[0] + next[0]) * scale, point[1] + (previous[1] + next[1]) * scale];
  });
  // Quadratic segments keep the closely sampled outline smoothly rounded.
  return `M ${coordinates(midpoint(inset.at(-1), inset[0]))} ${inset.map((point, index) => `Q ${coordinates(point)} ${coordinates(midpoint(point, inset[(index + 1) % inset.length]))}`).join(' ')} Z`;
}
