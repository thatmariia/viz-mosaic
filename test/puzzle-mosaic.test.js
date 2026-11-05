import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderRingMosaic, renderPuzzleMosaic } from '../src/index.js';

test('curved puzzle pieces retain input order and use inset outlines without strokes or masks', () => {
  const svg = renderPuzzleMosaic(['First', 'Second', 'Third'].map(name => ({ name, ring: 1, categoryId: 'same' })), { categoryColors: { same: '#abc' } });
  assert.deepEqual([...svg.matchAll(/data-component="([^"]+)"/g)].map(match => match[1]), ['First', 'Second', 'Third']);
  assert.equal((svg.match(/data-puzzle-piece=/g) || []).length, 3);
  assert.doesNotMatch(svg, /<mask|stroke=|stroke-width=/);
  assert.doesNotMatch(svg, /stroke="#182323"|stroke-opacity=/);
  assert.equal((svg.match(/<textPath /g) || []).length, 3);
  const pieces = [...svg.matchAll(/<g data-component=[^>]+><path data-puzzle-piece="" d="([^"]+)" fill="(#abc)"/g)];
  assert.equal(pieces.length, 3);
  for (const [, path] of pieces) {
    assert.match(path, / Q /); // Smooth, inset outlines include every edge.
    assert.ok(path.endsWith(' Z'));
  }
  assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
});

test('puzzle mosaic preserves skipped positions and supports single pieces and empty input', () => {
  const svg = renderPuzzleMosaic([1, 2, 4].map(ring => ({ name: `Ring ${ring}`, ring })));
  assert.deepEqual([...svg.matchAll(/data-radius="([\d.]+)"/g)].map(match => Number(match[1])), [88, 152, 280]);
  assert.equal((svg.match(/<g data-component=[^>]+><circle /g) || []).length, 3);
  assert.doesNotMatch(svg, /data-puzzle-join=/);
  assert.match(renderPuzzleMosaic([{ name: 'Only', ring: 4 }]), /data-ring="4" data-radius="280"/);
  assert.match(renderPuzzleMosaic([]), />Puzzle mosaic<\/title>/);
});

test('ring and puzzle mosaics use independent IDs and the same input validation', () => {
  const components = Object.freeze([Object.freeze({ name: 'Héllo & <世界>', ring: 1, categoryId: 0 })]);
  const svgs = [renderRingMosaic(components), renderPuzzleMosaic(components)];
  const ids = svgs.flatMap(svg => [...svg.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
  assert.equal(new Set(ids).size, ids.length);
  assert.match(svgs[1], /Héllo &amp; &lt;世界&gt;/);
  for (const render of [renderRingMosaic, renderPuzzleMosaic]) {
    assert.throws(() => render([{ name: 'Invalid', ring: 0 }]), /Component 1.*ring/);
    assert.throws(() => render([{ name: ' ', ring: 1 }]), /name/);
    assert.throws(() => render([{ name: 'Long '.repeat(3000), ring: 1 }]), /Ring 1 cannot fit/);
  }
});

test('calculated spacing separates whole outlines, including circular edges between rings', () => {
  const svg = renderPuzzleMosaic(['A', 'B', 'C', 'D'].map((name, index) => ({ name, ring: index < 2 ? 1 : 2 })));
  const outlines = [...svg.matchAll(/data-puzzle-piece="" d="([^"]+)"/g)].map(match =>
    [...match[1].matchAll(/[MQ] ([\d., -]+)/g)].flatMap(command => {
      const values = command[1].trim().split(/[ ,]+/).map(Number);
      return values.length === 2 ? [values] : [values.slice(0, 2), values.slice(2, 4)];
    }),
  );
  assert.equal(outlines.length, 4);
  for (const [index, outline] of outlines.entries()) {
    const radius = index < 2 ? 88 : 152;
    assert.ok(outline.every(point => Math.hypot(...point) >= radius - 29.2 && Math.hypot(...point) <= radius + 29.2));
    for (const other of outlines.slice(index + 1)) {
      let closestSquared = Infinity;
      for (const point of outline) for (const next of other) {
        closestSquared = Math.min(closestSquared, (point[0] - next[0]) ** 2 + (point[1] - next[1]) ** 2);
      }
      assert.ok(closestSquared >= 5.7 ** 2, 'Piece outlines must retain the six-unit gap within curve approximation tolerance.');
    }
  }
});
