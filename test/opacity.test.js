import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as mosaics from '../src/index.js';

test('shape opacity applies independently of text in all layouts', () => {
  for (const render of Object.values(mosaics)) {
    const component = { name: 'Label', ring: 1, categoryId: 'ink' };
    const options = { idPrefix: 'test', categoryColors: { ink: '#000' } };
    assert.equal(render([{ ...component, opacity: 1 }], options), render([component], options));
    for (const opacity of [0, 0.5]) {
      const svg = render([{ ...component, opacity }], options);
      const [, group, shape] = svg.match(/(<g data-component="Label"[^>]*>)(<(?:path|circle) [^>]+>)/);
      assert.ok(group.includes(` opacity="${opacity}"`) || shape.includes(` fill-opacity="${opacity}"`), render.name);
      const text = svg.match(/<text [^>]+>/)[0];
      assert.match(text, /fill="#182323"/);
      assert.doesNotMatch(text, /opacity/);
      if (group.includes(' opacity=')) assert.doesNotMatch(svg.slice(svg.indexOf(group) + group.length, svg.indexOf('</g>', svg.indexOf(group))), /<text/);
    }
  }
});

test('out-of-range and nonnumeric opacity values are rejected', () => {
  for (const opacity of [-0.1, 1.1, NaN, Infinity, '0.5', null]) {
    assert.throws(() => mosaics.renderRingMosaic([{ name: 'Label', ring: 1, opacity }]), /opacity must be a number from 0 to 1/);
  }
});
