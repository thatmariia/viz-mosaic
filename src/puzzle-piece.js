import { insetPath, sampleCurve } from './inset.js';

const point = (radius, angle) => [radius * Math.cos(angle), radius * Math.sin(angle)];
export const PUZZLE_GAP = 6;

function circularCurves(cx, cy, radius, start, end) {
  const count = Math.ceil(Math.abs(end - start) / (Math.PI / 2));
  return Array.from({ length: count }, (_, index) => {
    const from = start + (end - start) * index / count;
    const to = start + (end - start) * (index + 1) / count;
    const a = [cx + radius * Math.cos(from), cy + radius * Math.sin(from)];
    const b = [cx + radius * Math.cos(to), cy + radius * Math.sin(to)];
    const handle = radius * 4 / 3 * Math.tan((to - from) / 4);
    return [a, [a[0] - handle * Math.sin(from), a[1] + handle * Math.cos(from)], [b[0] + handle * Math.sin(to), b[1] - handle * Math.cos(to)], b];
  });
}

const neckRadius = 8;
const headRadius = 12;
const shoulder = (neckRadius + headRadius) / Math.SQRT2;
const upperNeck = [
  [[20, 0], [18, 0], [16, 0], [shoulder, 0]],
  ...circularCurves(shoulder, neckRadius, neckRadius, -Math.PI / 2, -5 * Math.PI / 4),
];
const CONNECTION = [
  ...upperNeck,
  ...circularCurves(0, neckRadius + shoulder, headRadius, -Math.PI / 4, 5 * Math.PI / 4),
  ...upperNeck.slice().reverse().map(curve => curve.map(([radial, tangent]) => [-radial, tangent]).reverse()),
];

// Neighbors share the same flowing boundary, traced in opposite directions.
// A single rounded lobe keeps connections simple; mirrored joins vary direction.
function edgeCurves(radius, angle, variant, reverse = false) {
  const position = ([radial, tangent]) => {
    const bend = tangent * (variant % 2 ? -1 : 1);
    const x = (radius + radial) * Math.cos(angle) - bend * Math.sin(angle);
    const y = (radius + radial) * Math.sin(angle) + bend * Math.cos(angle);
    return [x, y];
  };
  const curves = CONNECTION.map(curve => curve.slice());
  if (reverse) curves.reverse().forEach(curve => curve.reverse());
  return curves.map(curve => curve.map(position));
}

export function puzzlePiece(radius, start, end, startVariant, endVariant) {
  const outer = radius + 32;
  const inner = radius - 32;
  const outerInset = 12 / outer;
  const innerInset = 12 / inner;
  const outline = [point(outer, start + outerInset)];
  function arc(r, from, to) {
    const steps = Math.ceil(Math.abs(to - from) / (2 * Math.acos(1 - 0.08 / r)));
    for (let index = 1; index <= steps; index++) outline.push(point(r, from + (to - from) * index / steps));
  }
  function corner(control, endPoint) { sampleCurve([outline.at(-1), control, endPoint], outline); }
  arc(outer, start + outerInset, end - outerInset);
  corner(point(outer, end), point(radius + 20, end));
  for (const curve of edgeCurves(radius, end, endVariant)) sampleCurve(curve, outline);
  corner(point(inner, end), point(inner, end - innerInset));
  arc(inner, end - innerInset, start + innerInset);
  corner(point(inner, start), point(radius - 20, start));
  for (const curve of edgeCurves(radius, start, startVariant, true)) sampleCurve(curve, outline);
  corner(point(outer, start), outline[0]);
  return insetPath(outline, PUZZLE_GAP / 2);
}
