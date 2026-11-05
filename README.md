# viz-mosaic

Small JavaScript visualizations that export portable SVG. Includes ring, puzzle, and radial mosaics, with the same component and category inputs.

All renderers are synchronous ESM with TypeScript declarations and no runtime dependencies. The demo uses native browser modules and a simple documentation-style theme inspired by [Zensical](https://zensical.org/docs/).

## Run locally

Requires Node.js 20 or later. No dependency installation or build step is needed.

```sh
npm test
npm run demo
```

Open <http://127.0.0.1:3000/demo/>. Set `PORT=3001` to use another port. Switch among **Ring mosaic**, **Puzzle mosaic**, and **Radial mosaic** above the editor; your components, colors, title, and images are preserved. Select **Packed rings** for the reference composition or **Skipped ring** to see positions 1, 2, and 4 with a logo-plus-name strip. Edit components, attach PNG/JPEG images, optionally set category colors, then select a format and choose **Download**. The download contains the diagram currently shown in the valid preview; invalid input disables downloading.

The demo opens with a **Research software ecosystem** example using nine named tool logos and the ecosystem center logo. Three rings express an educated priority guess; automatic colors favor contrasting neighbors. The [source assessment and placement rationale](docs/research-software-example.md) explains the documented relationships and editorial choices.

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

Names and ring indices are the only required component fields. A ring is a distance index: ring 1 is nearest the center. Equal indices share a ring in input order, clockwise. Missing indices remain empty, including when only ring 4 is present. Consecutive ring positions are adjacent. Ring starts are staggered to separate their joins. One component forms a complete band with a readable curved label.

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

Components radiate outward as tapered rays with fully rounded ends and uniform category fills. Tool logos sit at the outer ends; readable names run along the bodies and rotate with their logos. The system logo stays upright in the open center. Spacing is transparent.

All components follow input order clockwise, starting at the top. Here `ring` controls outward reach: 1 is shortest and each higher index adds 84 SVG units. Skipped indices preserve that distance. Switching views reuses the same data; the editor calls this field **Reach** in the radial view. Labels and density can increase the base radius to fit; rounded ends remain within separate angular slots. The default accessible title is `Radial mosaic`. TypeScript aliases are `RadialMosaicComponent` and `RadialMosaicOptions`.

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
| `title` | Accessible SVG name; defaults to `Ring mosaic`, `Puzzle mosaic`, or `Radial mosaic` for the corresponding renderer. |
| `centerLogo` | Optional base64 PNG or JPEG data URL, centered and upright. |
| `monochromeLogos` | Optional boolean, default `false`. Tint component marks to their label color and turn white details into transparent cutouts. The demo enables it. |
| `categoryColors` | Optional object mapping category IDs to opaque `#rgb` or `#rrggbb` colors. |
| `idPrefix` | Optional stable ID prefix, starting with a letter and containing letters, digits, `_`, `.`, or `-`. Supply a **distinct prefix per inline diagram**. Defaults are unique per render. |
| `measureText(name, fontSize)` | Optional callback returning a positive finite width in SVG pixels. Uses Arial, Helvetica, or sans-serif at weight 500. |

Categories share colors across rings. A deterministic, greedy palette assignment first avoids identical neighbors, then favors perceptual color contrast with extra weight on lightness around each ring and across adjacent rings, including rounded overlap regions. Radial mosaic applies the same contrast preference to neighboring rays, including the last-to-first pair. Unmapped category colors are chosen for the current layout. Explicit `categoryColors` stay exact; shared categories or fixed overrides can require repeated neighbors. Ring shadows and transparent puzzle/radial spacing retain separation in those cases. Text switches between dark and white according to the fill color.

The result is a complete responsive SVG string, with its own styles, scoped IDs, accessibility name, and embedded images. An empty component array produces a small, accessible empty canvas, optionally with a center logo. Inputs are never mutated.

### Layout and capacity

Bands are 64 SVG pixels thick with a 64-pixel radial pitch and a default first-ring centerline radius of 88 pixels. The default text-width estimate is conservative and DOM-free. It accounts for narrow characters, spaces, combining marks, and wider Unicode characters; it is not a font-shaping engine. The browser demo uses canvas measurements for better fitting.

```js
const context = document.createElement('canvas').getContext('2d');
const measureText = (name, fontSize) => {
  context.font = `500 ${fontSize}px Arial, Helvetica, sans-serif`;
  return context.measureText(name).width;
};
```

Labels do not wrap or truncate. Dense rings increase center clearance while retaining the same radial pitch and ring indices. Limits are 32 distance positions, 10,000 components, and a base radius of 4,096 SVG pixels for all views. A capacity error explains when names or component counts cannot fit. A dense diagram may need to be viewed at a larger size or zoomed in.

### Logo assets

Use `data:image/png;base64,...` or `data:image/jpeg;base64,...`. The core validates the data URL and image signature; callers must supply decodable image bytes. The demo also checks image decoding before attaching uploads. Files remain associated with row identities when names are edited or duplicated.

The renderer never fetches URLs. SVG source logos are not supported in this release; convert them to PNG first. In ring and puzzle views, component logos rotate along the arc to align with their labels and precede the text in reading order, including on the lower half. Radial logos align with the straight labels and occupy the rounded outer ends. The center logo stays upright. Both component and center images are embedded in downloaded files.

Center logos scale to the space inside the nearest occupied ring or the radial view's open center, including dense single rings, skipped inner positions, and empty diagrams, with a 12-unit clearance. With `monochromeLogos: true`, component colors follow text contrast automatically; transparency and grayscale opacity are retained and white pixels become cutouts. Center logos retain their original colors.

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
