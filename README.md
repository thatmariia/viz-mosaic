# viz-mosaic

Six SVG mosaics with shared component data: ring, puzzle, radial, spiral, spiral puzzle, and honeycomb. Synchronous ESM, TypeScript declarations, no runtime dependencies.

## Try it

Requires Node.js 20+; no install or build step.

```sh
npm run demo
npm test
```

Open http://127.0.0.1:3000/demo/ to edit components, switch views and palettes, position or hide the category legend, and download SVG, transparent PNG, or JPEG. Raster downloads use a 6,000-pixel longest side and maximum JPEG quality.

## Use it

```js
import { renderRingMosaic } from 'viz-mosaic';

const svg = renderRingMosaic([
  { name: 'Registry', ring: 1, categoryId: 'Tools' },
  { name: 'Workflow engine', ring: 2, categoryId: 'Workflows' },
], {
  palette: 'palette-1',
  legend: true,
  legendPosition: 'bottom',
});
```

Other renderers: `renderPuzzleMosaic`, `renderRadialMosaic`, `renderSpiralMosaic`, `renderSpiralPuzzleMosaic`, `renderHoneycombMosaic`.

- Components require a nonempty `name` and integer `ring` from 1–32. Optional `categoryId` groups colors; optional `logo` accepts a base64 PNG/JPEG data URL.
- Lower levels sit nearer the center. Radial levels control reach; honeycomb levels control packing priority. Components may be reordered within a level to reduce same-color neighbors. Inputs are never mutated.
- `palette-1` (default, six colors) and `palette-2` (ten colors) assign colors by first category appearance in the input. Colors repeat when exhausted. `categoryColors: { Tools: '#123456' }` overrides a category without shifting other colors.
- `legend` defaults to `false`. `legendPosition` accepts `top`, `right`, `bottom` (default), or `left`. The category legend is embedded in the SVG and exports.
- `centerLogo` accepts a base64 SVG/PNG/JPEG data URL. SVG center images stay vector in SVG downloads. `monochromeLogos: true` tints component logos to match text. The center retains its colors.
- Optional `title`, distinct `idPrefix` per inline diagram, and `measureText(name, fontSize)` customize accessible naming, SVG IDs, and label measurement.

Browser imports can use `./src/index.js` when served over HTTP. For package installation, run `npm pack` and install the generated archive in your consumer project. The Pages workflow tests and deploys the demo on pushes to `main` or manual runs. In repository Settings → Pages, set Source to **GitHub Actions**.

The research software example separates deep integration (1) and lightweight integration (2), with Tools, Workflows, Packaging, and Benchmarking categories. WorkflowHub and BIII placements are editorial inferences from the [RSEc integration model](https://research-software-ecosystem.org/docs#integration-model).

Development uses small branches, lowercase conventional commits, and squash merges. Run `npm test` before merging. No license has been selected yet.
