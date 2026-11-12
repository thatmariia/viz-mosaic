import { prepareInput } from './input.js';
import { optimizeOrder, bandContactScore } from './order.js';
import { contrastColor } from './colors.js';
import { FONT_SIZE, LOGO_SIZE, GAP, number, escapeXML, createImages, svgDocument, shadowFilter, opacityAttribute, clipOutsideCap } from './svg.js';
import { PUZZLE_JOIN_REACH } from './puzzle-piece.js';
import { spiralPuzzlePiece } from './spiral-puzzle-piece.js';

const TAU = Math.PI * 2;
const BAND = 64;
const SLOPE = 84 / TAU;
const ORIGIN = -Math.PI / 2 - 0.35;
const path = points => points.map((p, i) => `${i ? 'L' : 'M'} ${p.map(number)}`).join(' ');

function geometry(base) {
  function at(t, offset = 0) {
    const r = base + t * SLOPE, angle = ORIGIN + t;
    const c = Math.cos(angle), s = Math.sin(angle), speed = Math.hypot(r, SLOPE);
    const dx = SLOPE * c - r * s, dy = SLOPE * s + r * c;
    return { point: [r * c - dy / speed * offset, r * s + dx / speed * offset], tangent: Math.atan2(dy, dx) };
  }
  function integral(t) {
    const r = base + t * SLOPE;
    return (r * Math.hypot(r, SLOPE) + SLOPE ** 2 * Math.asinh(r / SLOPE)) / (2 * SLOPE);
  }
  function advance(start, distance) {
    let t = start + distance / Math.hypot(base + start * SLOPE, SLOPE);
    for (let i = 0; i < 6; i++) t -= (integral(t) - integral(start) - distance) / Math.hypot(base + t * SLOPE, SLOPE);
    return t;
  }
  function samples(start, end, offset = 0) {
    const count = Math.max(2, Math.ceil(Math.abs(end - start) / 0.025));
    return Array.from({ length: count + 1 }, (_, i) => at(start + (end - start) * i / count, offset).point);
  }
  return {
    at, advance, samples, length: (start, end) => integral(end) - integral(start),
    curve: (start, end, offset = 0) => path(samples(start, end, offset)),
    strip: (start, end) => `${path([...samples(start, end, -BAND / 2), ...samples(end, start, BAND / 2)])} Z`,
  };
}

export function renderSpiralLayout(components, options, puzzle = false) {
  const { entries, centerLogo, title, idPrefix, monochromeLogos, legend, keepInputOrder, font } = prepareInput(components, options, puzzle ? 'Spiral puzzle mosaic' : 'Spiral mosaic');
  const rings = new Map();
  for (const entry of entries) {
    if (!rings.has(entry.ring)) rings.set(entry.ring, []);
    rings.get(entry.ring).push({ ...entry, needed: entry.groupWidth + (puzzle ? PUZZLE_JOIN_REACH * 2 + 24 : BAND + 16) });
  }
  // Stretch occupied levels together to give larger mosaics at least two turns.
  const levelAngle = Math.PI * (entries.length > 3 ? Math.max(1, 4 / rings.size) : 1);
  let base = 104;
  for (const [ring, items] of rings) {
    base = Math.max(base, items.reduce((sum, entry) => sum + entry.needed, 0) / levelAngle - (ring - 1) * levelAngle * SLOPE);
    if (base > 4096) throw new RangeError(`Spiral level ${ring} cannot fit within the 4096px base-radius capacity. Shorten names or use fewer components.`);
  }
  function plan(ordered) {
    const grouped = new Map();
    for (const entry of ordered) {
      if (!grouped.has(entry.ring)) grouped.set(entry.ring, []);
      grouped.get(entry.ring).push(entry);
    }
    return [...grouped].sort(([a], [b]) => a - b).map(([ring, items]) => {
      const radius = base + (ring - 1) * levelAngle * SLOPE;
      const extra = (levelAngle - items.reduce((sum, entry) => sum + entry.needed / radius, 0)) / items.length;
      let t = (ring - 1) * levelAngle;
      return { ring, radius, segments: items.map(entry => {
        const segment = { ...entry, start: t, end: t + entry.needed / radius + extra };
        segment.radius = base + (segment.start + segment.end) / 2 * SLOPE;
        t = segment.end;
        return segment;
      }) };
    });
  }
  const groupedEntries = [...rings.values()].flat();
  const ordered = keepInputOrder ? groupedEntries : optimizeOrder(groupedEntries, items => bandContactScore(plan(items), BAND, puzzle ? PUZZLE_JOIN_REACH : BAND / 2, true));
  const plans = plan(ordered);
  const segments = plans.flatMap(plan => plan.segments);
  const connected = (a, b) => a && b && Math.abs(a.end - b.start) < 1e-8;
  const maxRing = Math.max(0, ...rings.keys());
  const extent = maxRing ? base + maxRing * levelAngle * SLOPE + BAND / 2 + 12 : 86;
  const separateFills = !puzzle && segments.some(segment => segment.opacity < 1);
  const spiral = geometry(base), defs = puzzle ? [] : [shadowFilter(idPrefix)], bodies = [], joins = [], labels = [];
  const images = createImages(defs, idPrefix, monochromeLogos);
  const cap = (t, color, filter = '') => {
    const [x, y] = spiral.at(t).point.map(number);
    return `<circle cx="${x}" cy="${y}" r="${BAND / 2}" fill="${color}"${filter}/>`;
  };
  segments.forEach((segment, i) => {
    const { name, ring, categoryId, color, logo, width, start, end, opacity } = segment;
    const id = `${idPrefix}-s${i}`, textColor = contrastColor(color, opacity);
    const category = categoryId === undefined ? '' : ` data-category-id="${escapeXML(categoryId)}"`;
    const previous = segments[i - 1];
    const next = segments[i + 1];
    const hasPrevious = connected(previous, segment);
    const hasNext = connected(segment, next);
    const piece = puzzle ? spiralPuzzlePiece(spiral, start, end, hasPrevious ? i : undefined, hasNext ? i + 1 : undefined) : undefined;
    const clip = separateFills && hasPrevious
      ? clipOutsideCap(defs, `${id}-fill`, spiral.at(previous.end).point.map(number), BAND / 2, extent)
      : '';
    const caps = separateFills ? `${hasPrevious ? '' : cap(start, color)}${cap(end, color)}` : '';
    bodies.push(`<g data-component="${escapeXML(name)}" data-ring="${ring}" data-start="${number(start)}" data-end="${number(end)}"${category}${opacityAttribute(opacity)}${clip}><path${puzzle ? ' data-spiral-puzzle-piece=""' : ''} d="${piece ? piece.path : spiral.strip(start, end)}" fill="${color}"/>${caps}</g>`);
    if (!puzzle) {
      if (!separateFills && !hasPrevious) bodies.push(cap(start, color));
      if (hasNext && opacity === 1 && next.opacity === 1) {
        defs.push(`<clipPath id="${id}-join"><path d="${spiral.strip(next.start, next.end)}"/></clipPath>`);
        joins.push(`<g data-spiral-join="" clip-path="url(#${id}-join)">${cap(end, color, ` filter="url(#${idPrefix}-shadow)"`)}</g>`);
      }
      if (!separateFills) joins.push(cap(end, color));
    }
    const length = spiral.length(start, end);
    const middle = piece ? piece.middle : spiral.advance(start, length / 2 + (hasPrevious ? BAND / 2 : 0));
    const direction = Math.cos(spiral.at(middle).tangent) < 0 ? -1 : 1;
    const textMiddle = spiral.advance(middle, direction * (logo ? (LOGO_SIZE + GAP) / 2 : 0));
    const half = width / 2 + 16;
    const from = spiral.advance(textMiddle, -direction * half), to = spiral.advance(textMiddle, direction * half);
    defs.push(`<path id="${id}-label" d="${spiral.curve(from, to, direction * FONT_SIZE * 0.33)}"/>`);
    let image = '';
    if (logo) {
      const t = spiral.advance(middle, -direction * (width + GAP) / 2);
      const { point: [x, y], tangent } = spiral.at(t);
      image = images.component(logo, number(x), number(y), number((tangent + (direction < 0 ? Math.PI : 0)) * 180 / Math.PI), textColor);
    }
    labels.push(`<g data-label-for="${escapeXML(name)}">${image}<text fill="${textColor}" text-anchor="middle" xml:space="preserve"><textPath href="#${id}-label" startOffset="50%">${escapeXML(name)}</textPath></text></g>`);
  });
  const inner = maxRing ? base + (Math.min(...rings.keys()) - 1) * levelAngle * SLOPE - BAND / 2 : 86;
  return svgDocument(title, idPrefix, extent, defs, [...bodies, ...joins, ...labels, images.center(centerLogo, inner)], FONT_SIZE, legend, font);
}

export function renderSpiralMosaic(components, options) {
  return renderSpiralLayout(components, options);
}
