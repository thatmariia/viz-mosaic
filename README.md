# viz-mosaic

Small JavaScript visualizations that export portable SVG. Includes ring, puzzle, radial, spiral, spiral puzzle, and honeycomb mosaics, with the same component and category inputs.

All renderers are synchronous ESM with TypeScript declarations and no runtime dependencies. The demo uses native browser modules and a simple documentation-style theme inspired by [Zensical](https://zensical.org/docs/).

## Run locally

Requires Node.js 20 or later. No dependency installation or build step is needed.

```sh
npm test
npm run demo
```

Open <http://127.0.0.1:3000/demo/>. Set `PORT=3001` to use another port. Choose **Ring**, **Puzzle**, **Radial**, **Spiral**, **Spiral puzzle**, or **Honeycomb mosaic** above the editor; your components, colors, title, and images are preserved. Select **Packed rings** for the reference composition or **Skipped ring** to see positions 1, 2, and 4 with a logo-plus-name strip. Edit components, attach PNG/JPEG images, optionally set category colors, then select a format and choose **Download**. The download contains the diagram currently shown in the valid preview; invalid input disables downloading.

The demo opens with a **Research software ecosystem** example using nine named tool logos and the ecosystem center logo. Two levels distinguish deep integration (1) from lightweight integration (2). Categories group Tools, Workflows, Packaging, and Benchmarking. The [source assessment and placement rationale](docs/research-software-example.md) explains the documented relationships and editorial choices.

The **Palette** selector offers Palette 1 (six colors, default) and Palette 2 (ten colors), with swatches. Colors follow palette order: three categories use the first three colors. The selected palette stays active when switching views or resetting examples. Custom category colors override it. In code, pass `{ palette: 'palette-1' }` or `{ palette: 'palette-2' }` to any renderer.

Use **Show legend** to include or exclude the legend, and **Legend position** to place it above, right, below, or left of the diagram. It shows category colors and level names, stays outside the diagram, and is included in every download format when enabled.

SVG preserves vector geometry and embedded images. PNG uses a transparent background; JPEG uses white. Browser raster exports use twice the SVG dimensions, capped at 4,096 pixels per side. The public renderer always returns SVG; raster conversion stays in the demo's browser code.

## Render a mosaic

```js
import { renderRingMosaic } from 'viz-mosaic';

const svg = renderRingMosaic(
  [
    { name: 'Collection', ring: 1, categoryId: 'data' },
    { name: 'Processing', ring: 2, categoryId: 'tools' },
    { name: 'Reporting', ring: 4, categoryId: 'data' },
  ],
  {
    title: 'Example system',
    categoryColors: { data: '#006b50', tools: '#0653c4' },
  },
);
```

Names and ring indices are the only required component fields. In ring mosaic, a ring is a distance index: ring 1 is nearest the center. Equal indices share a ring in input order, clockwise. Missing indices remain empty, including when only ring 4 is present. Consecutive ring positions are adjacent. Ring starts are staggered to separate their joins. One component forms a complete band with a readable curved label.

### Puzzle mosaic

Use `renderPuzzleMosaic` with the same inputs and options:

```js
import { renderPuzzleMosaic } from 'viz-mosaic';

const svg = renderPuzzleMosaic(
  [
    { name: 'Collection', ring: 1, categoryId: 'data' },
    { name: 'Processing', ring: 1, categoryId: 'tools' },
  ],
  { categoryColors: { data: '#006b50', tools: '#0653c4' } },
);
```

Puzzle mosaic keeps circular ring edges and solid category fills. Components within each ring connect through simple rounded lobes and matching sockets, with heavily rounded corners and transparent spacing around every piece. The layout insets complete outlines by three SVG units to create six-unit gaps, including the circular edges between rings. Rounded curves use a fine geometric approximation; gaps are empty space rather than painted strokes or masks. They reveal the background in SVG and PNG; JPEG exports use a white background. A ring with one component forms a complete band without a connection to itself. The default accessible title is `Puzzle mosaic`; all other input rules, image behavior, and export formats are shared with ring mosaic. TypeScript callers can use `PuzzleMosaicComponent` and `PuzzleMosaicOptions`.

### Radial mosaic

```js
import { renderRadialMosaic } from 'viz-mosaic';

const svg = renderRadialMosaic(
  [
    { name: 'Collection', ring: 1, logo: collectionLogo },
    { name: 'Processing', ring: 2, logo: processingLogo },
  ],
  { centerLogo: systemLogo },
);
```

Components radiate outward as tapered rays with fully rounded ends and uniform category fills. For three or more pieces, neighboring straight edges run parallel with constant-width transparent gaps. Longer rays widen farther toward their rounded outer ends. Tool logos sit at the center of each rounded head, with labels fitted along the bodies and aligned with their logos. The system logo stays upright in the open center. Inner ends widen where space allows.

All components follow input order clockwise, starting at the top. Here `ring` controls outward reach: 1 is shortest and each higher index adds 84 SVG units. Skipped indices preserve that distance. Switching views reuses the same data; the editor calls this field **Reach** in the radial view. Labels and density can increase the base radius to fit; rounded ends remain within separate angular slots. The default accessible title is `Radial mosaic`. TypeScript aliases are `RadialMosaicComponent` and `RadialMosaicOptions`.

### Spiral mosaic

Use `renderSpiralMosaic(components, options)` with the same inputs. Components follow a continuous outward spiral, grouped by ascending `ring` and retaining input order within each level. Each level occupies at least a half-turn. With more than three components, occupied levels stretch evenly to make at least two complete turns, even when all components share a level. Skipped levels leave an equally sized empty section. The editor labels this field **Level**.

Rounded ends overlap the next component with the same clipped shadow as the classic ring. Disconnected levels have free rounded ends. The 64-unit band has an 84-unit pitch per complete turn, leaving transparent space between windings. Names curve along the pieces, and logos rotate with them. The upright center logo fits the available opening. Dense levels grow the starting radius, with a 4,096-unit base-radius limit. The default title is `Spiral mosaic`; the TypeScript aliases are `SpiralMosaicComponent` and `SpiralMosaicOptions`.

### Spiral puzzle mosaic

Use `renderSpiralPuzzleMosaic(components, options)` for the same expanding spiral with the rounded tabs and sockets from Puzzle mosaic. It shares spiral levels, skipped sections, and the two-turn minimum for more than three components. Connections follow the spiral's local direction; free ends stay rounded. Complete outlines are inset by three units for transparent six-unit gaps, including at connections, with additional space between windings. Labels follow the visible body of each piece so asymmetrical connections do not shift their centering. Logos rotate with their labels, and the center logo stays upright. The default title is `Spiral puzzle mosaic`; TypeScript aliases are `SpiralPuzzleMosaicComponent` and `SpiralPuzzleMosaicOptions`.

### Honeycomb mosaic

Use `renderHoneycombMosaic(components, options)` for rounded hexagonal tiles packed around the center logo. Lower `ring` values pack first, with input order preserved within a level. Here the level is a packing priority: multiple levels can share a physical hexagonal ring, and skipped values do not reserve empty cells. The original levels remain unchanged when switching views.

Tiles fill the nearest available hexagonal rings, with any partial outer ring distributed around the center. All tiles grow together to fit the longest name. Six-unit transparent gaps come from the grid spacing; no separator strokes or masks are used. Logos sit above horizontal names, and the center logo fits the unoccupied middle cell. The maximum SVG half-extent is 8,192 units. The default title is `Honeycomb mosaic`; TypeScript aliases are `HoneycombMosaicComponent` and `HoneycombMosaicOptions`.

### Components

| Field | Type | Behavior |
| --- | --- | --- |
| `name` | `string` | Nonempty text; punctuation, Unicode, and spaces are preserved and XML-escaped. |
| `ring` | `number` | Integer from 1 to 32. Numeric strings are rejected. |
| `categoryId` | `string \| number` | Optional nonempty string or finite number. Numeric `1` and string `"1"` share a category. |
| `logo` | `string` | Optional base64 PNG or JPEG data URL. |

### Options

| Field | Behavior |
| --- | --- |
| `title` | Accessible SVG name; defaults to the corresponding visualization name, such as `Spiral mosaic`. |
| `centerLogo` | Optional base64 PNG or JPEG data URL, centered and upright. |
| `monochromeLogos` | Optional boolean, default `false`. Tint component marks to their label color and turn white details into transparent cutouts. The demo enables it. |
| `categoryColors` | Optional object mapping category IDs to opaque `#rgb` or `#rrggbb` colors. |
| `palette` | Automatic palette: `palette-1` (6 colors, default) or `palette-2` (10 colors). Custom category colors take priority. |
| `legend` | Optional boolean, default `false`. Include category colors and occupied levels in the SVG. The demo enables it. |
| `legendPosition` | `top`, `right`, `bottom` (default), or `left`. Expands the canvas to leave the diagram unobstructed. |
| `levelLabels` | Optional object mapping numeric levels to readable labels, e.g. `{ 1: 'Deep integration', 2: 'Lightweight integration' }`. |
| `idPrefix` | Optional stable ID prefix, starting with a letter and containing letters, digits, `_`, `.`, or `-`. Supply a **distinct prefix per inline diagram**. Defaults are unique per render. |
| `measureText(name, fontSize)` | Optional callback returning a positive finite width in SVG pixels. Uses Arial, Helvetica, or sans-serif at weight 500. |

Categories receive colors in the order they first appear in the input, before any layout sorting. Repeated categories share a color across levels and views. Each component without a category receives its own palette slot. Colors repeat after the palette is exhausted; explicit `categoryColors` overrides keep their slot so other categories do not shift. Text switches between dark and white according to the fill color.

Legends use category IDs as labels, or component names when no category is given. Level labels default to `Level 1`, `Level 2`, etc.; custom labels include the level number. Long legend labels wrap. An empty diagram has no legend. For example:

```js
const svg = renderRingMosaic(components, {
  legend: true,
  legendPosition: 'right',
  levelLabels: { 1: 'Deep integration', 2: 'Lightweight integration' },
});
```

The result is a complete responsive SVG string, with its own styles, scoped IDs, accessibility name, and embedded images. An empty component array produces a small, accessible empty canvas, optionally with a center logo. Inputs are never mutated.

### Layout and capacity

Ring bands are 52 SVG pixels thick with a matching 52-pixel radial pitch. Puzzle bands retain their 64-unit thickness and pitch, before spacing insets. Both start at a default centerline radius of 88 pixels. The default text-width estimate is conservative and DOM-free. It accounts for narrow characters, spaces, combining marks, and wider Unicode characters; it is not a font-shaping engine. The browser demo uses canvas measurements for better fitting.

```js
const context = document.createElement('canvas').getContext('2d');
const measureText = (name, fontSize) => {
  context.font = `500 ${fontSize}px Arial, Helvetica, sans-serif`;
  return context.measureText(name).width;
};
```

Labels do not wrap or truncate. Dense rings increase center clearance while retaining the same radial pitch and ring indices. All views accept level indices from 1 to 32 and at most 10,000 components. Ring, puzzle, radial, and both spiral layouts have a 4,096-unit base-radius limit; honeycomb has an 8,192-unit half-extent limit. A capacity error explains when names or component counts cannot fit. A dense diagram may need to be viewed at a larger size or zoomed in.

### Logo assets

Use `data:image/png;base64,...` or `data:image/jpeg;base64,...`. The core validates the data URL and image signature; callers must supply decodable image bytes. The demo also checks image decoding before attaching uploads. Files remain associated with row identities when names are edited or duplicated.

The renderer never fetches URLs. SVG source logos are not supported in this release; convert them to PNG first. In ring, puzzle, and both spiral views, component logos rotate along the curve to align with their labels and precede the text in reading order. Radial logos align with the straight labels and occupy the rounded outer ends. Honeycomb logos and names stay horizontal. The center logo stays upright. Both component and center images are embedded in downloaded files.

Center logos scale to the available opening, including dense single rings, skipped inner positions, and empty diagrams, with a 12-unit clearance. With `monochromeLogos: true`, component colors follow text contrast automatically; transparency and grayscale opacity are retained and white pixels become cutouts. Center logos retain their original colors.

From Node:

```js
import { readFile, writeFile } from 'node:fs/promises';
import { renderRingMosaic } from 'viz-mosaic';

const logo = `data:image/png;base64,${await readFile('./logo.png', 'base64')}`;
const svg = renderRingMosaic(
  [{ name: 'Collection', ring: 1, logo, categoryId: 'data' }],
  { centerLogo: logo, title: 'My system', categoryColors: { data: '#006b50' } },
);
await writeFile('system.svg', svg);
```

In a browser, serve the project over HTTP and use a relative module import:

```html
<div id="diagram"></div>
<script type="module">
  import { renderRingMosaic } from './src/index.js';
  document.querySelector('#diagram').innerHTML = renderRingMosaic([
    { name: 'Collection', ring: 1 },
  ]);
</script>
```

## Package and distribution

Verify the packed artifact locally:

```sh
npm pack
# In a separate consumer directory:
npm install /absolute/path/to/viz-mosaic-0.1.0.tgz
```

The test suite packs and installs the artifact in a temporary consumer, imports `viz-mosaic`, renders an SVG, and checks the declaration entry point. Tests and development scripts are excluded from the package. Importing the root resolves `src/index.js`; declarations resolve `types/index.d.ts`.

GitHub installation is a **future example**, pending the owner's repository and release tag:

```sh
npm install github:YOUR-ORG/viz-mosaic#v0.1.0
```

To host on GitHub Pages, deploy the repository root as the static artifact, including `demo/`, `src/`, `docs/`, and `README.md`; link to `/viz-mosaic/demo/`. Deploying only `demo/` omits its `../src/index.js` import. All demo imports, links, and styles use relative paths so repository subpaths work. No deployment workflow or public release is enabled yet.

Before a public release, the owner needs to choose a license, create the GitHub repository, choose a release tag, and configure Pages if desired. This repository has not selected a license.

## Development

Use small feature branches, lowercase conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), and squash merges into `main`. Push branches and open pull requests once a GitHub remote exists. Current development and squash merges are local.

Run `npm test` before merging. Tests cover distance semantics, full circles, density, validation, XML escaping, category colors, embedded logos, ID scoping, measurement, immutability, and packed installation. GitHub Actions runs the same checks on pushes and pull requests. Browser verification should cover upper/lower labels, logos, rounded joins including wraparound, dense rings, mobile layout, and an independently opened offline download.

The packed-ring demo follows the supplied screenshot's touching bands, palette, overlapping ends, and center mark. Puzzle connections take their flowing shapes from the supplied organic-puzzle reference while keeping the circular rings and category fills. The original optional HTML prototypes were not supplied. The neutral sample components and generated PNG marks ship with the demo.
