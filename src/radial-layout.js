import { contrastColor } from './colors.js';
import { optimizeOrder, colorKey } from './order.js';
import { GAP, number, escapeXML, createImages, svgDocument, opacityAttribute } from './svg.js';

export const RADIAL_FONT_SIZE = 36;
const LOGO_SIZE = 64;
const TAU = Math.PI * 2;
const MIN_TIP = 4;
const MIN_CAP = 80;
const PITCH = 84;
// When labels scale, the logo side or value text fills this share of the rounded end's radius.
const LOGO_FILL = 0.6;
const VALUE_FILL = 1.0; // value width
const VALUE_HEIGHT = 0.7; // value font size
// Half the value's extent along the ray, per unit of font size (digit height plus a margin).
const VALUE_RUN = 0.38;

// The convex hull of two unequal circles: straight taper, fully rounded ends.
function rayPath(inner, outer, tip, cap) {
  const slope = (cap - tip) / (outer - inner);
  const height = Math.sqrt(1 - slope * slope);
  const point = (center, radius, sign) => `${number(center - slope * radius)} ${number(sign * height * radius)}`;
  return `M ${point(inner, tip, -1)} L ${point(outer, cap, -1)} A ${number(cap)} ${number(cap)} 0 1 1 ${point(outer, cap, 1)} L ${point(inner, tip, 1)} A ${number(tip)} ${number(tip)} 0 0 1 ${point(inner, tip, -1)} Z`;
}

export function renderRadialLayout(entries, { centerLogo, title, idPrefix, monochromeLogos, legend, keepInputOrder, font, scaleRadialLabels = false }) {
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
    const endRun = entry.value ? RADIAL_FONT_SIZE * VALUE_RUN : entry.logo ? LOGO_SIZE / 2 : 0;
    firstRadius = Math.max(firstRadius, endRun ? needed + endRun + GAP : (needed + 14 + offset) / (1 + sine));
    if (entry.value) {
      const minCap = Math.hypot(entry.valueUnit * RADIAL_FONT_SIZE / 2, endRun);
      firstRadius = Math.max(firstRadius, (minCap + offset) / sine - (entry.ring - 1) * PITCH);
    }
  }
  if (firstRadius > 4096) {
    throw new RangeError('Radial mosaic cannot fit within the 4096px first-radius capacity. Shorten names or use fewer components.');
  }
  const ordered = keepInputOrder ? entries : optimizeOrder(entries, items => items.length < 2 ? 0 : items.reduce((score, a, i) => {
    const b = items[(i + 1) % items.length];
    return score + (colorKey(a.color) === colorKey(b.color) ? firstRadius + (Math.min(a.ring, b.ring) - 1) * PITCH : 0);
  }, 0));
  const firstCap = firstRadius * sine - offset;
  const leaves = ordered.map((entry, index) => {
    const outer = firstRadius + (entry.ring - 1) * PITCH;
    const cap = outer * sine - offset;
    const angle = index * TAU / ordered.length - Math.PI / 2;
    const rotation = number(angle * 180 / Math.PI);
    const flip = Math.cos(angle) < -1e-8 ? 180 : 0;
    const labelLimit = entry.value || entry.logo ? outer - GAP : outer + cap;
    // How far the value or logo may reach inward while the label still fits at its base size.
    const room = labelLimit - (labelStart + entry.width + 8);
    let logoSize = LOGO_SIZE, valueSize = RADIAL_FONT_SIZE, endPadding = 14;
    if (entry.value) {
      // The value fills the rounded end: across it by width, along the ray by height.
      if (scaleRadialLabels) valueSize = Math.max(RADIAL_FONT_SIZE, Math.min(cap * VALUE_FILL / entry.valueUnit, cap * VALUE_HEIGHT, room / VALUE_RUN));
      endPadding = valueSize * VALUE_RUN;
    } else if (entry.logo) {
      if (scaleRadialLabels) logoSize = Math.max(LOGO_SIZE, Math.min(cap * LOGO_FILL, 2 * room));
      endPadding = logoSize / 2;
    }
    // Largest label scale that fits; growing a label pushes its start outward
    // along the tapered sides, so reserve room for that shift.
    const fit = (labelLimit - endPadding - labelStart + labelHeightRun - 8) / (entry.width + labelHeightRun);
    return { entry, outer, cap, rotation, flip, labelLimit, logoSize, valueSize, endPadding, fit, growth: cap / firstCap };
  });
  // Labels share one factor, so text grows with leaf size and a larger leaf never
  // has smaller text; the factor is the largest at which every label fits.
  const factor = scaleRadialLabels ? Math.min(...leaves.map(leaf => Math.max(1, leaf.fit) / leaf.growth)) : 1;
  const extent = Math.max(86, ...leaves.map(leaf => leaf.outer + leaf.cap + 12));
  const defs = [];
  const content = [];
  const images = createImages(defs, idPrefix, monochromeLogos);
  for (const { entry, outer, cap, rotation, flip, labelLimit, logoSize, valueSize, endPadding, growth } of leaves) {
    const { name, ring, logo, value, categoryId, color, opacity } = entry;
    const textColor = contrastColor(color, opacity);
    const scale = scaleRadialLabels ? Math.max(1, factor * growth) : 1;
    const scaledStart = labelStart + labelHeightRun * (scale - 1);
    const labelEnd = labelLimit - endPadding;
    const labelCenter = (scaledStart + labelEnd) / 2;
    const fontSize = number(RADIAL_FONT_SIZE * scale);
    const fontSizeAttribute = fontSize === RADIAL_FONT_SIZE ? '' : ` font-size="${fontSize}"`;
    let end;
    if (value) {
      // Across the ray and upright: turn a quarter from the label, toward level.
      const labelTurn = (rotation + flip + 360) % 360;
      const turn = flip + (labelTurn > 0 && labelTurn <= 180 ? -90 : 90);
      end = `<text x="0" y="${number(valueSize * 0.35)}" fill="${textColor}" font-size="${number(valueSize)}" font-weight="600" text-anchor="middle" xml:space="preserve" transform="translate(${number(outer)} 0) rotate(${turn})">${escapeXML(value)}</text>`;
    } else end = images.component(logo, number(outer), 0, flip, textColor, number(logoSize));
    const category = categoryId === undefined ? '' : ` data-category-id="${escapeXML(categoryId)}"`;
    content.push(`<g data-component="${escapeXML(name)}" data-ring="${ring}" data-radius="${number(outer)}"${category} transform="rotate(${rotation})"><path d="${rayPath(inner, outer, tip, cap)}" fill="${color}"${opacityAttribute(opacity, 'fill-opacity')}/>${end}<text x="0" y="${number(fontSize * 0.33)}" fill="${textColor}"${fontSizeAttribute} text-anchor="middle" xml:space="preserve" transform="translate(${number(labelCenter)} 0) rotate(${flip})">${escapeXML(name)}</text></g>`);
  }
  content.push(images.center(centerLogo, entries.length ? innerRadius : 76));
  return svgDocument(title, idPrefix, extent, defs, content, RADIAL_FONT_SIZE, legend, font);
}
