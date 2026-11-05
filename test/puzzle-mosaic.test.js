import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderRingMosaic, renderPuzzleMosaic } from '../src/index.js';
import { puzzleEdge } from '../src/puzzle-piece.js';

test('curved puzzle pieces retain input order and have a join at every boundary', () => {
  const svg = renderPuzzleMosaic(['First', 'Second', 'Third'].map(name => ({ name, ring: 1, categoryId: 'same' })), { categoryColors: { same: '#abc' } });
  assert.deepEqual([...svg.matchAll(/data-component="([^"]+)"/g)].map(match => match[1]), ['First', 'Second', 'Third']);
  assert.equal((svg.match(/data-puzzle-join=/g) || []).length, 3);
  assert.equal((svg.match(/stroke="#ffffff" stroke-width="3"/g) || []).length, 3);
  assert.doesNotMatch(svg, /stroke="#182323"|stroke-opacity=/);
  assert.equal((svg.match(/<textPath /g) || []).length, 3);
  const pieces = [...svg.matchAll(/<g data-component=[^>]+><path d="([^"]+)" fill="(#abc)"/g)];
  assert.equal(pieces.length, 3);
  for (const [, path] of pieces) {
    assert.match(path, / A /); // Circular edges around the center.
    assert.match(path, / Q /); // Soft corners.
    assert.match(path, / C /); // Organic connections.
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

test('organic connections and their sockets trace exactly the same curves in reverse', () => {
  function curves(path, start) {
    let previous = start;
    return [...path.matchAll(/C ([\d., -]+)/g)].map(match => {
      const values = match[1].trim().split(/[ ,]+/).map(Number);
      const points = [previous, values.slice(0, 2), values.slice(2, 4), values.slice(4, 6)];
      previous = points[3];
      return points;
    });
  }
  for (const angle of [-1.9, 0, 2.1, 4.4]) {
    for (const variant of [1, 2, 3]) {
      const point = radius => [Number((radius * Math.cos(angle)).toFixed(4)), Number((radius * Math.sin(angle)).toFixed(4))];
      const forward = curves(puzzleEdge(152, angle, variant), point(178));
      const reverse = curves(puzzleEdge(152, angle, variant, true), point(126));
      assert.deepEqual(reverse, forward.reverse().map(curve => curve.reverse()));
    }
  }
});
