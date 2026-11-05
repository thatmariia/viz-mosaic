import { contrastColor } from './colors.js';
import { GAP, number, escapeXML, createImages, svgDocument } from './svg.js';

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

export function renderRadialLayout(entries, { centerLogo, title, idPrefix, monochromeLogos, legend }) {
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
  let firstRadius = Math.max(220, (MIN_CAP + offset) / sine);
  for (const entry of entries) {
    const needed = labelStart + entry.width + 8;
    firstRadius = Math.max(firstRadius, entry.logo ? needed + LOGO_SIZE / 2 + GAP : (needed + 14 + offset) / (1 + sine));
  }
  if (firstRadius > 4096) {
    throw new RangeError('Radial mosaic cannot fit within the 4096px first-radius capacity. Shorten names or use fewer components.');
  }
  const segments = entries.map((entry, index) => ({
    ...entry, start: index * TAU / entries.length, end: (index + 1) * TAU / entries.length,
  }));
  const defs = [];
  const content = [];
  const images = createImages(defs, idPrefix, monochromeLogos);
  let extent = 86;
  for (const entry of segments) {
    const { name, ring, logo, categoryId, color, start } = entry;
    const outer = firstRadius + (ring - 1) * PITCH;
    const cap = outer * sine - offset;
    extent = Math.max(extent, outer + cap + 12);
    const angle = start - Math.PI / 2;
    const rotation = number(angle * 180 / Math.PI);
    const flip = Math.cos(angle) < -1e-8 ? 180 : 0;
    const textColor = contrastColor(color);
    const labelEnd = logo ? outer - LOGO_SIZE / 2 - GAP : outer + cap - 14;
    const labelCenter = (labelStart + labelEnd) / 2;
    const category = categoryId === undefined ? '' : ` data-category-id="${escapeXML(categoryId)}"`;
    content.push(`<g data-component="${escapeXML(name)}" data-ring="${ring}" data-radius="${number(outer)}"${category} transform="rotate(${rotation})"><path d="${rayPath(inner, outer, tip, cap)}" fill="${color}"/>${images.component(logo, number(outer), 0, flip, textColor, LOGO_SIZE)}<text x="0" y="${RADIAL_FONT_SIZE * 0.33}" fill="${textColor}" text-anchor="middle" xml:space="preserve" transform="translate(${number(labelCenter)} 0) rotate(${flip})">${escapeXML(name)}</text></g>`);
  }
  content.push(images.center(centerLogo, entries.length ? innerRadius : 76));
  return svgDocument(title, idPrefix, extent, defs, content, RADIAL_FONT_SIZE, legend);
}
