import { PALETTES } from './palettes.js';

const TAU = Math.PI * 2;
const normalize = color => color.length === 4 ? '#'+color.slice(1).split('').map(c => c+c).join('').toLowerCase() : color.toLowerCase();

function linearRGB(color) {
  const hex = normalize(color).slice(1);
  return [0, 2, 4].map(offset => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
}

export function contrastColor(color) {
  const [r, g, b] = linearRGB(color);
  return r * 0.2126 + g * 0.7152 + b * 0.0722 > 0.179 ? '#182323' : '#ffffff';
}

function lab(color) {
  const [r, g, b] = linearRGB(color);
  const f = value => value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
  const x = f((r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047);
  const y = f(r * 0.2126729 + g * 0.7151522 + b * 0.0721750);
  const z = f((r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function categoryColor(id, palette) {
  let hash = 0;
  for (const character of String(id)) hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export function assignColors(plans, overrides, reach, neighbors, palette = PALETTES.classic) {
  const nodes = new Map();
  const owners = new Map();
  for (const plan of plans) for (const [index, segment] of plan.segments.entries()) {
    const key = segment.categoryId === undefined ? segment : `category:${segment.categoryId}`;
    if (!nodes.has(key)) {
      const fixed = segment.categoryId === undefined ? undefined : overrides.get(String(segment.categoryId));
      nodes.set(key, { color: fixed, fixed: fixed !== undefined, preferred: segment.categoryId === undefined ? palette[index % palette.length] : categoryColor(segment.categoryId, palette), neighbors: new Set() });
    }
    owners.set(segment, nodes.get(key));
  }
  function connect(a, b) {
    const first = owners.get(a), second = owners.get(b);
    if (first === second) return;
    first.neighbors.add(second);
    second.neighbors.add(first);
  }
  if (neighbors) for (const [a, b] of neighbors) connect(a, b);
  else for (const [index, plan] of plans.entries()) {
    if (plan.segments.length > 1) plan.segments.forEach((segment, i) => connect(segment, plan.segments[(i + 1) % plan.segments.length]));
    const next = plans[index + 1];
    if (!next || next.ring !== plan.ring + 1) continue;
    const margin = reach / plan.radius + reach / next.radius;
    for (const a of plan.segments) for (const b of next.segments) {
      if ([-TAU, 0, TAU].some(shift => a.start < b.end + shift + margin && a.end > b.start + shift - margin)) connect(a, b);
    }
  }
  const metrics = new Map();
  function metric(color) {
    const key = normalize(color);
    if (!metrics.has(key)) metrics.set(key, lab(key));
    return metrics.get(key);
  }
  function separation(first, second) {
    const a = metric(first), b = metric(second);
    // Give lightness extra weight so strong hue differences are not the only cue.
    return Math.hypot((a[0] - b[0]) * 2, a[1] - b[1], a[2] - b[2]);
  }
  function score(node, color) {
    let repeats = 0, minimum = Infinity, total = 0;
    for (const neighbor of node.neighbors) {
      if (!neighbor.color) continue;
      if (normalize(color) === normalize(neighbor.color)) repeats++;
      const distance = separation(color, neighbor.color);
      minimum = Math.min(minimum, distance);
      total += distance;
    }
    return { repeats, minimum, total };
  }
  function choose(node) {
    let best = node.color ?? node.preferred;
    let bestScore = score(node, best);
    for (const color of palette) {
      const candidate = score(node, color);
      if (candidate.repeats < bestScore.repeats || (candidate.repeats === bestScore.repeats && (candidate.minimum > bestScore.minimum + 1e-6 || (Math.abs(candidate.minimum - bestScore.minimum) < 1e-6 && candidate.total > bestScore.total + 1e-6)))) {
        best = color;
        bestScore = candidate;
      }
    }
    node.color = best;
  }
  const automatic = [...nodes.values()].filter(node => !node.fixed).sort((a, b) => b.neighbors.size - a.neighbors.size);
  const first = automatic[0];
  if (first?.neighbors.size && ![...first.neighbors].some(node => node.color)) {
    // Seed with the widest palette contrast instead of a weak local color pair.
    let widest = -1;
    for (const a of palette) for (const b of palette) {
      const distance = separation(a, b);
      if (distance > widest) { widest = distance; first.color = a; }
    }
  }
  automatic.forEach(choose);
  automatic.forEach(choose);
  for (const plan of plans) for (const segment of plan.segments) segment.color = owners.get(segment).color;
}
