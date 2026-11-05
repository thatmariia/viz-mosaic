import { insetShape, sampleCurve } from './inset.js';
import { PUZZLE_GAP, PUZZLE_JOIN_REACH, puzzleEdgeCurves } from './puzzle-piece.js';

export function spiralPuzzlePiece(spiral, start, end, startVariant, endVariant) {
  const from = startVariant === undefined ? start : spiral.advance(start, 12);
  const to = endVariant === undefined ? end : spiral.advance(end, -12);
  const outline = spiral.samples(from, to, -32);
  const corner = (control, point) => sampleCurve([outline.at(-1), control, point], outline);
  function position(t) {
    const { point: [x, y], tangent } = spiral.at(t);
    return (radial, along) => [x + radial * Math.sin(tangent) + along * Math.cos(tangent), y - radial * Math.cos(tangent) + along * Math.sin(tangent)];
  }
  function cap(t, fromAngle) {
    const at = position(t);
    for (let i = 1; i <= 32; i++) {
      const angle = fromAngle + Math.PI * i / 32;
      outline.push(at(32 * Math.cos(angle), 32 * Math.sin(angle)));
    }
  }
  if (endVariant === undefined) cap(end, 0);
  else {
    corner(spiral.at(end, -32).point, spiral.at(end, -20).point);
    for (const curve of puzzleEdgeCurves(position(end), endVariant)) sampleCurve(curve, outline);
    corner(spiral.at(end, 32).point, spiral.at(to, 32).point);
  }
  outline.push(...spiral.samples(to, from, 32).slice(1));
  if (startVariant === undefined) cap(start, Math.PI);
  else {
    corner(spiral.at(start, 32).point, spiral.at(start, 20).point);
    for (const curve of puzzleEdgeCurves(position(start), startVariant, true)) sampleCurve(curve, outline);
    corner(spiral.at(start, -32).point, outline[0]);
  }
  const shape = insetShape(outline, PUZZLE_GAP / 2);
  function contains(t) {
    const [x, y] = spiral.at(t).point;
    let inside = false;
    for (const [i, a] of shape.outline.entries()) {
      const b = shape.outline[(i + 1) % shape.outline.length];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }
  // Center the label on the visible body, accounting for its tab and socket.
  const nominal = spiral.advance(start, spiral.length(start, end) / 2);
  function boundary(outside) {
    let inside = nominal;
    for (let i = 0; i < 16; i++) {
      const t = (outside + inside) / 2;
      if (contains(t)) inside = t;
      else outside = t;
    }
    return inside;
  }
  const before = boundary(spiral.advance(start, -PUZZLE_JOIN_REACH - PUZZLE_GAP));
  const after = boundary(spiral.advance(end, PUZZLE_JOIN_REACH + PUZZLE_GAP));
  return { path: shape.path, middle: spiral.advance(before, spiral.length(before, after) / 2) };
}
