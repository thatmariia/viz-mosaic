# viz-mosaic

Small JavaScript visualizations that export portable SVG. Ring mosaic is the first renderer; future visualizations can add their own modules and public exports without changing this API.

The renderer is synchronous ESM with TypeScript declarations and no runtime dependencies. The demo uses native browser modules and a simple documentation-style theme inspired by [Zensical](https://zensical.org/docs/).

## Run locally

Requires Node.js 20 or later. No dependency installation or build step is needed.

```sh
npm test
npm run demo
```

Open <http://127.0.0.1:3000/demo/>. Set `PORT=3001` to use another port. Select **Packed rings** for the reference composition or **Skipped ring** to see positions 1, 2, and 4 with a logo-plus-name strip. Edit components, attach PNG/JPEG images, optionally set category colors, then select a format and choose **Download**. The download contains the diagram currently shown in the valid preview; invalid input disables downloading.

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

Names and ring indices are the only required component fields. A ring is a distance index: ring 1 is nearest the center. Equal indices share a ring in input order, clockwise. Missing indices remain empty, including when only ring 4 is present. Occupied consecutive rings touch. One component forms a complete band with its label at the top.

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
| `title` | Accessible SVG name; defaults to `Ring mosaic`. |
| `centerLogo` | Optional base64 PNG or JPEG data URL, centered and upright. |
| `categoryColors` | Optional object mapping category IDs to opaque `#rgb` or `#rrggbb` colors. |
| `idPrefix` | Optional stable ID prefix, starting with a letter and containing letters, digits, `_`, `.`, or `-`. Supply a **distinct prefix per inline diagram**. Defaults are unique per render. |
| `measureText(name, fontSize)` | Optional callback returning a positive finite width in SVG pixels. Uses Arial, Helvetica, or sans-serif at weight 500. |

Categories share colors across rings. Unmapped categories receive deterministic palette colors. Components without categories use the palette in ring order, avoiding equal neighboring colors where possible. Repeated category colors retain rounded joins and local shadows. Text switches between dark and white according to the fill color.

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

Labels do not wrap or truncate. Dense rings increase center clearance while retaining the same radial pitch and ring indices. Limits are 32 ring positions, 10,000 components, and a first-ring radius of 4,096 SVG pixels. A capacity error identifies the ring that cannot fit. A dense diagram may need to be viewed at a larger size or zoomed in.

### Logo assets

Use `data:image/png;base64,...` or `data:image/jpeg;base64,...`. The core validates the data URL and image signature; callers must supply decodable image bytes. The demo also checks image decoding before attaching uploads. Files remain associated with row identities when names are edited or duplicated.

The renderer never fetches URLs. SVG source logos are not supported in this release; convert them to PNG first. Component logos rotate along the arc to align with their labels and precede the text in reading order, including on the lower half. The center logo stays upright. Both component and center images are embedded in downloaded files.

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

To host on GitHub Pages, deploy the repository root as the static artifact, including `demo/`, `src/`, and `README.md`; link to `/viz-mosaic/demo/`. Deploying only `demo/` omits its `../src/index.js` import. All demo imports, links, and styles use relative paths so repository subpaths work. No deployment workflow or public release is enabled yet.

Before a public release, the owner needs to choose a license, create the GitHub repository, choose a release tag, and configure Pages if desired. This repository has not selected a license.

## Development

Use small feature branches, lowercase conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), and squash merges into `main`. Push branches and open pull requests once a GitHub remote exists. Current development and squash merges are local.

Run `npm test` before merging. Tests cover distance semantics, full circles, density, validation, XML escaping, category colors, embedded logos, ID scoping, measurement, immutability, and packed installation. GitHub Actions runs the same checks on pushes and pull requests. Browser verification should cover upper/lower labels, logos, rounded joins including wraparound, dense rings, mobile layout, and an independently opened offline download.

The packed-ring demo follows the supplied screenshot's touching bands, palette, overlapping ends, and center mark. The original optional HTML prototypes were not supplied. The neutral sample components and generated PNG marks ship with the demo.
