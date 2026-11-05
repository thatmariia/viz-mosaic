import { assignColors, contrastColor } from './colors.js';
import { FONT_SIZE, number, escapeXML, createImages, svgDocument } from './svg.js';

const TAU = Math.PI * 2;
const TIP = 4;
const CAP = 44;
const PITCH = 84;
// Labels start where the taper has room for half a glyph height plus padding.
const LABEL_FRACTION = (FONT_SIZE / 2 + 6 - TIP) / (CAP - TIP);
const labelEnd = entry => entry.logo ? -CAP - 12 : CAP - 14;

// The convex hull of two unequal circles: straight taper, fully rounded ends.
function rayPath(inner, outer) {
  const slope = (CAP - TIP) / (outer - inner);
  const height = Math.sqrt(1 - slope * slope);
  const point = (center, radius, sign) => `${number(center - slope * radius)} ${number(sign * height * radius)}`;
  return `M ${point(inner, TIP, -1)} L ${point(outer, CAP, -1)} A ${CAP} ${CAP} 0 1 1 ${point(outer, CAP, 1)} L ${point(inner, TIP, 1)} A ${TIP} ${TIP} 0 0 1 ${point(inner, TIP, -1)} Z`;
}

export function renderRadialLayout(entries, { colors, centerLogo, title, idPrefix, monochromeLogos }) {
  // Keep each complete ray within its angular slot, including both round ends.
  const halfSlot = Math.sin(Math.PI / Math.max(2, entries.length)) * 0.85;
  const innerRadius = Math.max(76, (TIP + 3) / halfSlot - TIP);
  const inner = innerRadius + TIP;
  let firstRadius = Math.max(220, CAP / halfSlot, inner + CAP * 2);
  for (const entry of entries) {
    firstRadius = Math.max(firstRadius, inner + (entry.width - labelEnd(entry)) / (1 - LABEL_FRACTION) + 8);
  }
  if (firstRadius > 4096) {
    throw new RangeError('Radial mosaic cannot fit within the 4096px first-radius capacity. Shorten names or use fewer components.');
  }
  const segments = entries.map((entry, index) => ({
    ...entry, start: index * TAU / entries.length, end: (index + 1) * TAU / entries.length,
  }));
  assignColors([{ ring: 1, radius: firstRadius, segments }], colors, 0);
  const defs = [];
  const content = [];
  const images = createImages(defs, idPrefix, monochromeLogos);
  let extent = 86;
  for (const entry of segments) {
    const { name, ring, logo, categoryId, color, start } = entry;
    const outer = firstRadius + (ring - 1) * PITCH;
    extent = Math.max(extent, outer + CAP + 12);
    const angle = start - Math.PI / 2;
    const rotation = number(angle * 180 / Math.PI);
    const flip = Math.cos(angle) < -1e-8 ? 180 : 0;
    const textColor = contrastColor(color);
    const labelStart = inner + LABEL_FRACTION * (outer - inner);
    const labelCenter = (labelStart + outer + labelEnd(entry)) / 2;
    const category = categoryId === undefined ? '' : ` data-category-id="${escapeXML(categoryId)}"`;
    content.push(`<g data-component="${escapeXML(name)}" data-ring="${ring}"${category} transform="rotate(${rotation})"><path d="${rayPath(inner, outer)}" fill="${color}"/><circle cx="${number(outer)}" cy="0" r="${CAP}" fill="#000000" fill-opacity="0.08"/>${images.component(logo, number(outer), 0, flip, textColor)}<text x="0" y="${FONT_SIZE * 0.33}" fill="${textColor}" text-anchor="middle" xml:space="preserve" transform="translate(${number(labelCenter)} 0) rotate(${flip})">${escapeXML(name)}</text></g>`);
  }
  content.push(images.center(centerLogo, entries.length ? innerRadius : 76));
  return svgDocument(title, idPrefix, extent, defs, content);
}
