import { prepareInput } from './input.js';
import { optimizeOrder, colorKey } from './order.js';
import { contrastColor } from './colors.js';
import { FONT_SIZE, LOGO_SIZE, number, escapeXML, createImages, svgDocument, opacityAttribute } from './svg.js';

const ROOT3 = Math.sqrt(3);
const GAP = 6;
const DIRECTIONS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
const position = (q, r) => [ROOT3 * (q + r / 2), 1.5 * r];

function shellCells(shell) {
  const cells = [];
  let q = 0, r = -shell;
  for (const [dq, dr] of DIRECTIONS) for (let i = 0; i < shell; i++) {
    const [x, y] = position(q, r);
    cells.push({ q, r, angle: (Math.atan2(y, x) + Math.PI * 2.5) % (Math.PI * 2) });
    q += dq; r += dr;
  }
  return cells.sort((a, b) => a.angle - b.angle);
}

function hexagon(radius) {
  const vertices = Array.from({ length: 6 }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI / 3;
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  });
  const fraction = Math.min(10, radius * 0.14) / radius;
  const toward = (a, b) => a.map((value, i) => number(value * (1 - fraction) + b[i] * fraction));
  return {
    vertices,
    path: vertices.map((v, i) => `${i ? 'L' : 'M'} ${toward(v, vertices[(i + 5) % 6])} Q ${v.map(number)} ${toward(v, vertices[(i + 1) % 6])}`).join(' ') + ' Z',
  };
}

export function renderHoneycombMosaic(components, options) {
  const { entries, centerLogo, title, idPrefix, monochromeLogos, legend, keepInputOrder } = prepareInput(components, options, 'Honeycomb mosaic');
  const ordered = [...entries].sort((a, b) => a.ring - b.ring || a.order - b.order);
  const radius = Math.max(56, ...entries.map(entry => (entry.width + 24) / ROOT3));
  const spacing = radius + GAP / ROOT3;
  let shells = 0;
  while (3 * shells * (shells + 1) < entries.length) shells++;
  if (ROOT3 * spacing * shells + radius + 12 > 8192) throw new RangeError('Honeycomb mosaic cannot fit within the 8192px extent capacity. Shorten names or use fewer components.');
  const tiles = [];
  let index = 0;
  for (let shell = 1; index < ordered.length; shell++) {
    const slots = shellCells(shell), count = Math.min(slots.length, ordered.length - index);
    for (let i = 0; i < count; i++) {
      const cell = slots[Math.floor(i * slots.length / count)];
      const [x, y] = position(cell.q, cell.r).map(value => value * spacing);
      tiles.push({ ...ordered[index++], ...cell, shell, x, y });
    }
  }
  if (!keepInputOrder) {
    const cells = new Map(tiles.map((tile, i) => [`${tile.q},${tile.r}`, i])), neighbors = [];
    tiles.forEach((tile, i) => {
      for (const [dq, dr] of DIRECTIONS.slice(0, 3)) {
        const j = cells.get(`${tile.q + dq},${tile.r + dr}`);
        if (j !== undefined) neighbors.push([i, j]);
      }
    });
    const arranged = optimizeOrder(ordered, items => neighbors.reduce((score, [a, b]) => score + (colorKey(items[a].color) === colorKey(items[b].color) ? 1 : 0), 0));
    tiles.forEach((tile, i) => Object.assign(tile, arranged[i]));
  }
  const { path, vertices } = hexagon(radius), defs = [], content = [];
  const images = createImages(defs, idPrefix, monochromeLogos);
  let inner = Infinity, extent = 0;
  for (const tile of tiles) {
    const { name, ring, categoryId, logo, color, shell, q, r, x, y, opacity } = tile;
    const textColor = contrastColor(color, opacity);
    const category = categoryId === undefined ? '' : ` data-category-id="${escapeXML(categoryId)}"`;
    content.push(`<g data-component="${escapeXML(name)}" data-ring="${ring}" data-shell="${shell}" data-q="${q}" data-r="${r}"${category} transform="translate(${number(x)} ${number(y)})"><path d="${path}" fill="${color}"${opacityAttribute(opacity, 'fill-opacity')}/>${images.component(logo, 0, -LOGO_SIZE / 2, 0, textColor)}<text x="0" y="${number(FONT_SIZE * (logo ? 1.65 : 0.33))}" text-anchor="middle" fill="${textColor}" xml:space="preserve">${escapeXML(name)}</text></g>`);
    // Rounded corners stay inside this polygon, so its clearance is conservative.
    vertices.forEach((v, i) => {
      const next = vertices[(i + 1) % 6], ax = x + v[0], ay = y + v[1];
      extent = Math.max(extent, Math.abs(ax), Math.abs(ay));
      const dx = next[0] - v[0], dy = next[1] - v[1];
      const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy)));
      inner = Math.min(inner, Math.hypot(ax + t * dx, ay + t * dy));
    });
  }
  content.push(images.center(centerLogo, tiles.length ? inner : 86));
  return svgDocument(title, idPrefix, tiles.length ? extent + 12 : 86, defs, content, FONT_SIZE, legend);
}
