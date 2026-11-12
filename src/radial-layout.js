import { contrastColor } from './colors.js';
import { optimizeOrder, colorKey } from './order.js';
import { GAP, number, escapeXML, createImages, svgDocument, opacityAttribute } from './svg.js';

export const RADIAL_FONT_SIZE = 36;
const LOGO_SIZE = 64;
const TAU = Math.PI * 2;
const MIN_TIP = 4;
const MIN_CAP = 80;
const PITCH = 84;

// The convex hull of two unequal circles: straight taper, fully rounded ends.
function rayPath(inner, outer, tip, cap) {
  const slope = (cap - tip) / (outer - inner);
  const height = Math.sqrt(1 - slope * slope);
  const point = (center, radius, sign) => `${number(center - slope * radius)} ${number(sign * height * radius)}`;
  return `M ${point(inner, tip, -1)} L ${point(outer, cap, -1)} A ${number(cap)} ${number(cap)} 0 1 1 ${point(outer, cap, 1)} L ${point(inner, tip, 1)} A ${number(tip)} ${number(tip)} 0 0 1 ${point(inner, tip, -1)} Z`;
}

export function renderRadialLayout(entries, { centerLogo, title, idPrefix, monochromeLogos, legend, keepInputOrder, scaleRadialLabels = false }) {
  if (typeof scaleRadialLabels !== 'boolean') throw new TypeError('scaleRadialLabels must be a boolean.');
  const halfAngle = Math.PI / Math.max(3, entries.length);
  const sine = Math.sin(halfAngle), cosine = Math.cos(halfAngle);
  const innerRadius = Math.max(112, (MIN_TIP + 3) / sine - MIN_TIP);
  // Broaden tips within the available slot, preserving gaps and center space.
  const tip = Math.max(MIN_TIP, Math.min(16, (innerRadius * sine - 3) / (1 - sine)));
  const inner = innerRadius + tip;
  // Offset both sides equally from their shared angular boundary. The facing
  // edges of neighboring rays are parallel, regardless of their reach.
  const offset = inner * sine - tip;
  const labelStart = (offset + (RADIAL_FONT_SIZE / 2 + 6) * cosine) / sine;
  const labelHeightRun = RADIAL_FONT_SIZE / 2 * cosine / sine;
  let firstRadius = Math.max(220, (MIN_CAP + offset) / sine);
  for (const entry of entries) {
    const needed = labelStart + entry.width + 8;
    firstRadius = Math.max(firstRadius, entry.logo ? needed + LOGO_SIZE / 2 + GAP : (needed + 14 + offset) / (1 + sine));
  }
  if (firstRadius > 4096) {
    throw new RangeError('Radial mosaic cannot fit within the 4096px first-radius capacity. Shorten names or use fewer components.');
  }
  const firstCap = firstRadius * sine - offset;
  const ordered = keepInputOrder ? entries : optimizeOrder(entries, items => items.length < 2 ? 0 : items.reduce((score, a, i) => {
    const b = items[(i + 1) % items.length];
    return score + (colorKey(a.color) === colorKey(b.color) ? firstRadius + (Math.min(a.ring, b.ring) - 1) * PITCH : 0);
  }, 0));
  const segments = ordered.map((entry, index) => ({
    ...entry, start: index * TAU / entries.length, end: (index + 1) * TAU / entries.length,
  }));
  const defs = [];
  const content = [];
  const images = createImages(defs, idPrefix, monochromeLogos);
  let extent = 86;
  for (const entry of segments) {
    const { name, ring, logo, categoryId, color, start, opacity } = entry;
    const outer = firstRadius + (ring - 1) * PITCH;
    const cap = outer * sine - offset;
    extent = Math.max(extent, outer + cap + 12);
    const angle = start - Math.PI / 2;
    const rotation = number(angle * 180 / Math.PI);
    const flip = Math.cos(angle) < -1e-8 ? 180 : 0;
    const textColor = contrastColor(color, opacity);
    const labelLimit = logo ? outer - GAP : outer + cap;
    const endPadding = logo ? LOGO_SIZE / 2 : 14;
    let scale = 1;
    if (scaleRadialLabels) {
      // Growing the label pushes its start outward along the tapered sides.
      // Reserve room for that shift and the logo or rounded end at the other side.
      const fit = (labelLimit - labelStart + labelHeightRun - 8) / (entry.width + labelHeightRun + endPadding);
      scale = Math.max(1, Math.min(cap / firstCap, fit));
    }
    const scaledStart = labelStart + labelHeightRun * (scale - 1);
    const labelEnd = labelLimit - endPadding * scale;
    const labelCenter = (scaledStart + labelEnd) / 2;
    const fontSize = number(RADIAL_FONT_SIZE * scale);
    const font = fontSize === RADIAL_FONT_SIZE ? '' : ` font-size="${fontSize}"`;
    const logoSize = number(LOGO_SIZE * scale);
    const category = categoryId === undefined ? '' : ` data-category-id="${escapeXML(categoryId)}"`;
    content.push(`<g data-component="${escapeXML(name)}" data-ring="${ring}" data-radius="${number(outer)}"${category} transform="rotate(${rotation})"><path d="${rayPath(inner, outer, tip, cap)}" fill="${color}"${opacityAttribute(opacity, 'fill-opacity')}/>${images.component(logo, number(outer), 0, flip, textColor, logoSize)}<text x="0" y="${number(fontSize * 0.33)}" fill="${textColor}"${font} text-anchor="middle" xml:space="preserve" transform="translate(${number(labelCenter)} 0) rotate(${flip})">${escapeXML(name)}</text></g>`);
  }
  content.push(images.center(centerLogo, entries.length ? innerRadius : 76));
  return svgDocument(title, idPrefix, extent, defs, content, RADIAL_FONT_SIZE, legend);
}
