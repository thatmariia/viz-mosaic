const TAU = Math.PI * 2;
export const colorKey = color => (color.length === 4 ? '#' + [...color.slice(1)].map(c => c + c).join('') : color).toLowerCase();

// Only move whole components within their level; their assigned colors stay fixed.
export function optimizeOrder(entries, score) {
  let best = [...entries], bestScore = score(best);
  if (bestScore < 1e-8) return best;
  const groups = new Map();
  entries.forEach((entry, i) => {
    if (!groups.has(entry.ring)) groups.set(entry.ring, []);
    groups.get(entry.ring).push(i);
  });
  // Bound interactive work for large diagrams. Small diagrams get several starts
  // to avoid a poor local minimum; ties retain the original, stable order.
  let budget = Math.max(32, Math.floor(20000 / Math.max(1, entries.length)));
  let seed = 1;
  for (let restart = 0; restart < 4 && budget > 0; restart++) {
    const candidate = [...best];
    if (restart) for (const indices of groups.values()) for (let i = indices.length - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const a = indices[i], b = indices[seed % (i + 1)];
      [candidate[a], candidate[b]] = [candidate[b], candidate[a]];
    }
    let current = score(candidate), changed = true;
    const allowance = Math.ceil(budget / (4 - restart));
    let spent = 0;
    while (changed && spent < allowance) {
      changed = false;
      search: for (const indices of groups.values()) for (let i = 0; i < indices.length; i++) for (let j = i + 1; j < indices.length; j++) {
        const a = indices[i], b = indices[j];
        if (colorKey(candidate[a].color) === colorKey(candidate[b].color)) continue;
        [candidate[a], candidate[b]] = [candidate[b], candidate[a]];
        const next = score(candidate);
        spent++;
        if (next < current - 1e-8) { current = next; changed = true; }
        else [candidate[a], candidate[b]] = [candidate[b], candidate[a]];
        if (spent >= allowance) break search;
      }
    }
    budget -= spent;
    if (current < bestScore - 1e-8) { best = candidate; bestScore = current; }
    if (bestScore < 1e-8) break;
  }
  return best;
}

// Shared angular contact length between ordered bands, including rounded joins.
function overlapScore(first, second, shift, reach) {
  let score = 0, from = 0;
  for (const a of first) {
    const marginA = reach / a.radius;
    while (from < second.length && second[from].end + shift + reach / second[from].radius <= a.start - marginA) from++;
    for (let i = from; i < second.length; i++) {
      const b = second[i], marginB = reach / b.radius;
      if (b.start + shift - marginB >= a.end + marginA) break;
      if (a === b || colorKey(a.color) !== colorKey(b.color)) continue;
      const overlap = Math.min(a.end + marginA, b.end + shift + marginB) - Math.max(a.start - marginA, b.start + shift - marginB);
      if (overlap > 1e-8) score += overlap * Math.min(a.radius, b.radius);
    }
  }
  return score;
}

export function bandContactScore(plans, band, reach, spiral = false) {
  let score = 0;
  const segments = plans.flatMap(plan => plan.segments);
  const groups = spiral ? [segments] : plans.map(plan => plan.segments);
  for (const group of groups) for (let i = 0; i < group.length; i++) {
    const a = group[i], b = group[(i + 1) % group.length];
    if (a === b || (spiral && (i === group.length - 1 || Math.abs(a.end - b.start) > 1e-8))) continue;
    if (colorKey(a.color) === colorKey(b.color)) score += band;
  }
  // Winding neighbors have a wider transparent gap than connected ends.
  if (spiral) score += overlapScore(segments, segments, -TAU, reach) * 0.25;
  else for (let i = 1; i < plans.length; i++) {
    if (plans[i].ring !== plans[i - 1].ring + 1) continue;
    for (const shift of [-TAU, 0, TAU]) score += overlapScore(plans[i - 1].segments, plans[i].segments, shift, reach);
  }
  return score;
}
