import { PUZZLE_GAP, PUZZLE_JOIN_REACH, puzzlePiece } from './puzzle-piece.js';
import { assignColors, contrastColor } from './colors.js';
import { FONT_SIZE, LOGO_SIZE, GAP, number, escapeXML as escape, createImages, svgDocument, shadowFilter } from './svg.js';
import { prepareInput } from './input.js';
import { RADIAL_FONT_SIZE, renderRadialLayout } from './radial-layout.js';

const TAU = Math.PI * 2;

const point = (radius, angle) => [number(radius * Math.cos(angle)), number(radius * Math.sin(angle))];

function arc(radius, start, end, direction = 1) {
  return `M ${point(radius, start)} A ${number(radius)} ${number(radius)} 0 ${Math.abs(end - start) > Math.PI ? 1 : 0} ${direction > 0 ? 1 : 0} ${point(radius, end)}`;
}

function sector(radius, start, end, band) {
  const outer = radius + band / 2;
  const inner = radius - band / 2;
  return `${arc(outer, start, end)} L ${point(inner, end)} A ${number(inner)} ${number(inner)} 0 ${end - start > Math.PI ? 1 : 0} 0 ${point(inner, start)} Z`;
}

/** Shared input validation and circular layouts for the public renderers. */
export function renderCircularMosaic(components, options = {}, style) {
  const puzzle = style === 'puzzle';
  const band = puzzle ? 64 : 52;
  const { entries, colors, palette, centerLogo, title, idPrefix } = prepareInput(components, options, style === 'radial' ? 'Radial mosaic' : puzzle ? 'Puzzle mosaic' : 'Ring mosaic', style === 'radial' ? RADIAL_FONT_SIZE : FONT_SIZE);
  const rings = new Map();
  for (const entry of entries) {
    if (!rings.has(entry.ring)) rings.set(entry.ring, []);
    rings.get(entry.ring).push({ ...entry, needed: entry.groupWidth + (puzzle ? PUZZLE_JOIN_REACH * 2 : band / 2) + 24 });
  }

  if (style === 'radial') {
    const entries = [...rings.values()].flat().sort((a, b) => a.order - b.order);
    return renderRadialLayout(entries, { colors, palette, centerLogo, title, idPrefix, monochromeLogos: options.monochromeLogos });
  }

  // Grow the center clearance, keeping pitch and the user's distance indices intact.
  let firstRadius = 88;
  for (const [ring, entries] of rings) {
    const required = Math.max(
      entries.reduce((sum, entry) => sum + entry.needed, 0) / TAU,
      ...entries.map(entry => entry.groupWidth / (Math.PI * 0.85) + FONT_SIZE),
    );
    firstRadius = Math.max(firstRadius, required - (ring - 1) * band);
    if (firstRadius > 4096) {
      throw new RangeError(`Ring ${ring} cannot fit ${entries.length} labels within the 4096px first-radius capacity. Shorten names or use fewer components in this ring.`);
    }
  }
  const maxRing = Math.max(0, ...rings.keys());
  const extent = maxRing ? firstRadius + (maxRing - 1) * band + band / 2 + 12 : 86;
  const defs = puzzle ? [] : [shadowFilter(idPrefix)];
  const content = [];
  const images = createImages(defs, idPrefix, options.monochromeLogos);

  const plans = [...rings].sort(([a], [b]) => a - b).map(([ring, entries]) => {
    const radius = firstRadius + (ring - 1) * band;
    const remaining = TAU - entries.reduce((sum, entry) => sum + entry.needed / radius, 0);
    const offset = ((ring - 1) * Math.PI / Math.max(2, entries.length)) % TAU;
    let angle = -Math.PI / 2 - 0.35 + offset;
    const segments = entries.map(entry => {
      const span = entry.needed / radius + remaining / entries.length;
      const segment = { ...entry, start: angle, end: angle + span };
      angle += span;
      return segment;
    });
    return { ring, radius, offset, segments };
  });
  assignColors(plans, colors, Math.max(band / 2, puzzle ? PUZZLE_JOIN_REACH : 0), undefined, palette);
  for (const { ring, radius, offset, segments } of plans) {
    const bases = [];
    const joins = [];
    const labels = [];
    segments.forEach((segment, index) => {
      const { name, logo, start, end, color, categoryId, width } = segment;
      const id = `${idPrefix}-r${ring}-c${index}`;
      const textColor = contrastColor(color);
      const category = categoryId === undefined ? '' : ` data-category-id="${escape(categoryId)}"`;
      const startVariant = ring + index;
      const endVariant = ring + (index + 1) % segments.length;
      const piece = puzzle && segments.length > 1 ? puzzlePiece(radius, start, end, startVariant, endVariant) : undefined;
      const base = segments.length === 1
        ? `<circle r="${number(radius)}" fill="none" stroke="${color}" stroke-width="${puzzle ? band - PUZZLE_GAP : band}"/>`
        : `<path${puzzle ? ' data-puzzle-piece=""' : ''} d="${puzzle ? piece.path : sector(radius, start, end, band)}" fill="${color}"/>`;
      bases.push(`<g data-component="${escape(name)}"${category}>${base}</g>`);
      if (segments.length > 1 && !puzzle) {
        // Every join is a separate pass, including the last-to-first join. Clip
        // shadows to the following strip so they merge cleanly into this strip.
        defs.push(`<clipPath id="${id}-join"><path d="${sector(radius, end, end + band * 1.5 / radius, band)}"/></clipPath>`);
        const [x, y] = point(radius, end);
        const cap = `<circle cx="${x}" cy="${y}" r="${band / 2}" fill="${color}"`;
        joins.push(`<g clip-path="url(#${id}-join)">${cap} filter="url(#${idPrefix}-shadow)"/></g>${cap}/>`);
      }
      const middle = segments.length === 1 ? -Math.PI / 2 + offset : puzzle ? piece.middle : (start + end) / 2 + band / (2 * radius);
      const lower = Math.sin(middle) > 0;
      const direction = lower ? -1 : 1;
      const textAngle = middle + direction * (logo ? (LOGO_SIZE + GAP) / 2 : 0) / radius;
      // Arial's visible letterforms sit about 0.33em above the alphabetic baseline.
      const baseline = radius + (lower ? 1 : -1) * FONT_SIZE * 0.33;
      const labelStart = textAngle - direction * Math.PI / 2;
      const labelEnd = textAngle + direction * Math.PI / 2;
      defs.push(`<path id="${id}-label" d="${arc(baseline, labelStart, labelEnd, direction)}"/>`);
      let image = '';
      if (logo) {
        const logoAngle = middle - direction * (width + GAP) / (2 * radius);
        const [x, y] = point(radius, logoAngle);
        const rotation = number((logoAngle + direction * Math.PI / 2) * 180 / Math.PI);
        image = images.component(logo, x, y, rotation, textColor);
      }
      labels.push(`<g>${image}<text fill="${textColor}" text-anchor="middle" xml:space="preserve"><textPath href="#${id}-label" startOffset="50%">${escape(name)}</textPath></text></g>`);
    });
    content.push(`<g data-ring="${ring}" data-radius="${number(radius)}">${bases.join('')}${joins.join('')}${labels.join('')}</g>`);
  }
  if (centerLogo) {
    const innerRadius = maxRing ? firstRadius + (Math.min(...rings.keys()) - 1) * band - band / 2 : extent;
    content.push(images.center(centerLogo, innerRadius));
  }
  return svgDocument(title, idPrefix, extent, defs, content);
}
