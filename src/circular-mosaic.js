import { PUZZLE_GAP, PUZZLE_JOIN_REACH, puzzlePiece } from './puzzle-piece.js';
import { assignColors, contrastColor } from './colors.js';

const TAU = Math.PI * 2;
const BAND = 64;
const PITCH = BAND;
const FONT_SIZE = 16;
const FONT = 'Arial, Helvetica, sans-serif';
const LOGO_SIZE = 28;
const GAP = 10;
let sequence = 0;

const escape = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[c]);
const number = value => Number(value.toFixed(4));
const point = (radius, angle) => [number(radius * Math.cos(angle)), number(radius * Math.sin(angle))];

function arc(radius, start, end, direction = 1) {
  return `M ${point(radius, start)} A ${number(radius)} ${number(radius)} 0 ${Math.abs(end - start) > Math.PI ? 1 : 0} ${direction > 0 ? 1 : 0} ${point(radius, end)}`;
}

function sector(radius, start, end) {
  const outer = radius + BAND / 2;
  const inner = radius - BAND / 2;
  return `${arc(outer, start, end)} L ${point(inner, end)} A ${number(inner)} ${number(inner)} 0 ${end - start > Math.PI ? 1 : 0} 0 ${point(inner, start)} Z`;
}

// Deliberately conservative; callers can supply measured widths for their font.
function estimateWidth(name) {
  return Array.from(name).reduce((width, character) => {
    if (/\p{Mark}/u.test(character)) return width;
    if (/\s/u.test(character)) return width + FONT_SIZE * 0.35;
    if (/[ilI.,'!:;|]/u.test(character)) return width + FONT_SIZE * 0.35;
    return width + FONT_SIZE * (/[^\u0000-\u024f]/u.test(character) ? 1.05 : 0.72);
  }, 0);
}

function imageData(value, label) {
  if (value === undefined) return;
  const match = typeof value === 'string' && /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) {
    throw new TypeError(`${label} must be a base64 PNG or JPEG data URL.`);
  }
  const bytes = atob(match[2]);
  const signature = match[1] === 'png' ? '\x89PNG\r\n\x1a\n' : '\xff\xd8\xff';
  if (!bytes.startsWith(signature) || bytes.length <= signature.length) {
    throw new TypeError(`${label} has an invalid ${match[1].toUpperCase()} image signature.`);
  }
  return value;
}

/** Shared validation, radial layout, labels and assets for both public renderers. */
export function renderCircularMosaic(components, options = {}, style) {
  if (!Array.isArray(components)) throw new TypeError('components must be an array.');
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object.');
  if (components.length > 10000) throw new RangeError('Use at most 10000 components per mosaic.');
  const puzzle = style === 'puzzle';
  const { title = puzzle ? 'Puzzle mosaic' : 'Ring mosaic', idPrefix = `viz-${++sequence}-${Math.random().toString(36).slice(2)}`, categoryColors = {}, measureText = estimateWidth } = options;
  if (typeof title !== 'string' || !title.trim()) throw new TypeError('title must be a nonempty string.');
  if (typeof idPrefix !== 'string' || !/^[A-Za-z][\w.-]*$/.test(idPrefix)) {
    throw new TypeError('idPrefix must start with a letter and contain only letters, digits, underscores, dots, or hyphens.');
  }
  if (typeof measureText !== 'function') throw new TypeError('measureText must be a function.');
  if (options.monochromeLogos !== undefined && typeof options.monochromeLogos !== 'boolean') {
    throw new TypeError('monochromeLogos must be a boolean.');
  }
  if (!categoryColors || typeof categoryColors !== 'object' || Array.isArray(categoryColors)) {
    throw new TypeError('categoryColors must be an object mapping category IDs to hex colors.');
  }
  const colors = new Map(Object.entries(categoryColors));
  for (const [id, color] of colors) {
    if (typeof color !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color)) {
      throw new TypeError(`categoryColors[${JSON.stringify(id)}] must be a solid #rgb or #rrggbb color.`);
    }
  }
  const centerLogo = imageData(options.centerLogo, 'centerLogo');
  const rings = new Map();
  components.forEach((component, index) => {
    const label = `Component ${index + 1}`;
    if (!component || typeof component.name !== 'string' || !component.name.trim()) {
      throw new TypeError(`${label}: name must be a nonempty string.`);
    }
    if (!Number.isInteger(component.ring) || component.ring < 1 || component.ring > 32) {
      throw new RangeError(`${label} (${component.name}): ring must be an integer from 1 to 32.`);
    }
    const { name, ring, categoryId } = component;
    if (categoryId !== undefined && !(
      (typeof categoryId === 'string' && categoryId.trim()) ||
      (typeof categoryId === 'number' && Number.isFinite(categoryId))
    )) throw new TypeError(`${label}: categoryId must be a nonempty string or a finite number.`);
    const logo = imageData(component.logo, `${label} logo`);
    const width = measureText(name, FONT_SIZE);
    if (!Number.isFinite(width) || width <= 0) throw new TypeError(`${label}: measureText must return a positive finite width.`);
    const groupWidth = width + (logo ? LOGO_SIZE + GAP : 0);
    if (!rings.has(ring)) rings.set(ring, []);
    rings.get(ring).push({ name, logo, categoryId, width, groupWidth, needed: groupWidth + (puzzle ? PUZZLE_JOIN_REACH * 2 : BAND / 2) + 24 });
  });

  // Grow the center clearance, keeping pitch and the user's distance indices intact.
  let firstRadius = 88;
  for (const [ring, entries] of rings) {
    const required = Math.max(
      entries.reduce((sum, entry) => sum + entry.needed, 0) / TAU,
      ...entries.map(entry => entry.groupWidth / (Math.PI * 0.85) + FONT_SIZE),
    );
    firstRadius = Math.max(firstRadius, required - (ring - 1) * PITCH);
    if (firstRadius > 4096) {
      throw new RangeError(`Ring ${ring} cannot fit ${entries.length} labels within the 4096px first-radius capacity. Shorten names or use fewer components in this ring.`);
    }
  }
  const maxRing = Math.max(0, ...rings.keys());
  const extent = maxRing ? firstRadius + (maxRing - 1) * PITCH + BAND / 2 + 12 : 86;
  const defs = puzzle ? [] : [`<filter id="${idPrefix}-shadow" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="0" stdDeviation="4.5" flood-opacity="0.32"/></filter>`];
  const content = [];
  const logoFilters = new Set();

  const plans = [...rings].sort(([a], [b]) => a - b).map(([ring, entries]) => {
    const radius = firstRadius + (ring - 1) * PITCH;
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
  assignColors(plans, colors, Math.max(BAND / 2, puzzle ? PUZZLE_JOIN_REACH : 0));
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
        ? `<circle r="${number(radius)}" fill="none" stroke="${color}" stroke-width="${puzzle ? BAND - PUZZLE_GAP : BAND}"/>`
        : `<path${puzzle ? ' data-puzzle-piece=""' : ''} d="${puzzle ? piece.path : sector(radius, start, end)}" fill="${color}"/>`;
      bases.push(`<g data-component="${escape(name)}"${category}>${base}</g>`);
      if (segments.length > 1 && !puzzle) {
        // Every join is a separate pass, including the last-to-first join. Clip
        // shadows to the following strip so they merge cleanly into this strip.
        defs.push(`<clipPath id="${id}-join"><path d="${sector(radius, end, end + BAND * 1.5 / radius)}"/></clipPath>`);
        const [x, y] = point(radius, end);
        const cap = `<circle cx="${x}" cy="${y}" r="${BAND / 2}" fill="${color}"`;
        joins.push(`<g clip-path="url(#${id}-join)">${cap} filter="url(#${idPrefix}-shadow)"/></g>${cap}/>`);
      }
      const middle = segments.length === 1 ? -Math.PI / 2 + offset : puzzle ? piece.middle : (start + end) / 2 + BAND / (2 * radius);
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
        let filter = '';
        if (options.monochromeLogos) {
          const filterId = `${idPrefix}-logo-${textColor.slice(1)}`;
          if (!logoFilters.has(textColor)) {
            logoFilters.add(textColor);
            // Turn white artwork into cutouts, retain the source alpha, then tint.
            defs.push(`<filter id="${filterId}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.2126 -0.7152 -0.0722 0 1" result="ink"/><feComposite in="ink" in2="SourceGraphic" operator="in" result="alpha"/><feFlood flood-color="${textColor}"/><feComposite in2="alpha" operator="in"/></filter>`);
          }
          filter = ` filter="url(#${filterId})"`;
        }
        image = `<image href="${escape(logo)}" x="${number(x - LOGO_SIZE / 2)}" y="${number(y - LOGO_SIZE / 2)}" width="${LOGO_SIZE}" height="${LOGO_SIZE}" transform="rotate(${rotation} ${x} ${y})"${filter} preserveAspectRatio="xMidYMid meet"/>`;
      }
      labels.push(`<g>${image}<text fill="${textColor}" text-anchor="middle" xml:space="preserve"><textPath href="#${id}-label" startOffset="50%">${escape(name)}</textPath></text></g>`);
    });
    content.push(`<g data-ring="${ring}" data-radius="${number(radius)}">${bases.join('')}${joins.join('')}${labels.join('')}</g>`);
  }
  if (centerLogo) {
    const innerRadius = maxRing ? firstRadius + (Math.min(...rings.keys()) - 1) * PITCH - BAND / 2 : extent;
    const size = (innerRadius - 12) * Math.SQRT2;
    content.push(`<image href="${escape(centerLogo)}" x="${number(-size / 2)}" y="${number(-size / 2)}" width="${number(size)}" height="${number(size)}" preserveAspectRatio="xMidYMid meet"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${number(-extent)} ${number(-extent)} ${number(extent * 2)} ${number(extent * 2)}" role="img" aria-labelledby="${idPrefix}-title" font-family="${FONT}" font-size="${FONT_SIZE}" font-weight="500"><title id="${idPrefix}-title">${escape(title)}</title><defs>${defs.join('')}</defs>${content.join('')}</svg>`;
}
