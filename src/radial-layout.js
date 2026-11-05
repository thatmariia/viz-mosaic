import { assignColors, contrastColor } from './colors.js';
import { GAP, number, escapeXML, createImages, svgDocument } from './svg.js';

export const RADIAL_FONT_SIZE = 36;
const LOGO_SIZE = 64;
const TAU = Math.PI * 2;
const MIN_TIP = 4;
const CAP = 80;
const PITCH = 84;
const labelEnd = entry => entry.logo ? -LOGO_SIZE / 2 - GAP : CAP - 14;

// The convex hull of two unequal circles: straight taper, fully rounded ends.
function rayPath(inner, outer, tip) {
  const slope = (CAP - tip) / (outer - inner);
  const height = Math.sqrt(1 - slope * slope);
  const point = (center, radius, sign) => `${number(center - slope * radius)} ${number(sign * height * radius)}`;
  return `M ${point(inner, tip, -1)} L ${point(outer, CAP, -1)} A ${CAP} ${CAP} 0 1 1 ${point(outer, CAP, 1)} L ${point(inner, tip, 1)} A ${number(tip)} ${number(tip)} 0 0 1 ${point(inner, tip, -1)} Z`;
}

export function renderRadialLayout(entries, { colors, centerLogo, title, idPrefix, monochromeLogos }) {
  // Keep each complete ray within its angular slot, including both round ends.
  const halfSlot = Math.sin(Math.PI / Math.max(2, entries.length)) * 0.85;
  const innerRadius = Math.max(112, (MIN_TIP + 3) / halfSlot - MIN_TIP);
  // Broaden tips within the available slot, preserving gaps and center space.
  const tip = Math.max(MIN_TIP, Math.min(16, (innerRadius * halfSlot - 3) / (1 - halfSlot)));
  const inner = innerRadius + tip;
  const labelFraction = (RADIAL_FONT_SIZE / 2 + 6 - tip) / (CAP - tip);
  let firstRadius = Math.max(220, CAP / halfSlot, inner + CAP * 2);
  for (const entry of entries) {
    firstRadius = Math.max(firstRadius, inner + (entry.width - labelEnd(entry)) / (1 - labelFraction) + 8);
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
    const labelStart = inner + labelFraction * (outer - inner);
    const labelCenter = (labelStart + outer + labelEnd(entry)) / 2;
    const category = categoryId === undefined ? '' : ` data-category-id="${escapeXML(categoryId)}"`;
    content.push(`<g data-component="${escapeXML(name)}" data-ring="${ring}" data-radius="${number(outer)}"${category} transform="rotate(${rotation})"><path d="${rayPath(inner, outer, tip)}" fill="${color}"/>${images.component(logo, number(outer), 0, flip, textColor, LOGO_SIZE)}<text x="0" y="${RADIAL_FONT_SIZE * 0.33}" fill="${textColor}" text-anchor="middle" xml:space="preserve" transform="translate(${number(labelCenter)} 0) rotate(${flip})">${escapeXML(name)}</text></g>`);
  }
  content.push(images.center(centerLogo, entries.length ? innerRadius : 76));
  return svgDocument(title, idPrefix, extent, defs, content, RADIAL_FONT_SIZE);
}
