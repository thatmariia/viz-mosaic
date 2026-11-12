/** Numeric and string IDs with the same spelling share a category. */
export type CategoryId = string | number;
export type MosaicPalette = 'palette-1' | 'palette-2';
export type LegendPosition = 'top' | 'right' | 'bottom' | 'left';

export interface RingMosaicComponent {
  name: string;
  /** Distance index, from 1 to 32. Missing indices remain empty. */
  ring: number;
  /** A base64 SVG, PNG, or JPEG data URL. Omit for a text-only component. */
  logo?: string;
  /** Radial mosaic only: short text (e.g. "71%") drawn upright across the leaf's rounded end, in place of the logo. */
  value?: string;
  categoryId?: CategoryId;
  /** Shape opacity from 0 (transparent) to 1 (opaque, default). Text and logos remain opaque. */
  opacity?: number;
}

export interface RingMosaicOptions {
  /** A base64 SVG, PNG, or JPEG data URL; fits the available center space automatically. */
  centerLogo?: string;
  /** Tint component logos to match label colors, treating white pixels as cutouts. Defaults to false. */
  monochromeLogos?: boolean;
  /** Show component logos alongside labels. Defaults to true. */
  showComponentLogos?: boolean;
  /** Accessible name. Defaults to "Ring mosaic". */
  title?: string;
  /** Stable SVG IDs; use a distinct prefix for each inline diagram. */
  idPrefix?: string;
  /** Optional category overrides, as opaque #rgb or #rrggbb colors. */
  categoryColors?: Readonly<Record<string, string>>;
  /** Automatic color palette. Defaults to "palette-1"; category overrides take priority. */
  palette?: MosaicPalette;
  /** Keep input order within each level, or around the circle for radial mosaics. Defaults to false. */
  keepInputOrder?: boolean;
  /** Include the category legend in the SVG. Defaults to false. */
  legend?: boolean;
  /** Place the legend outside the diagram. Defaults to "bottom". */
  legendPosition?: LegendPosition;
  /** A single font family name. Defaults to Arial. */
  fontFamily?: string;
  /** Optional base64 WOFF2 data URL for the font family, covering weights 500 and 600. */
  fontSource?: string;
  /** Width in SVG pixels for the chosen family. Labels use weight 500 and radial values use 600. */
  measureText?: (text: string, fontSize: number, weight?: 500 | 600) => number;
}

/** Synchronous, DOM-free renderer; does not mutate its inputs. */
export function renderRingMosaic(
  components: readonly RingMosaicComponent[],
  options?: RingMosaicOptions,
): string;

export type PuzzleMosaicComponent = RingMosaicComponent;
/** Same options as ring mosaic; the default title is "Puzzle mosaic". */
export type PuzzleMosaicOptions = RingMosaicOptions;

/** Curved, interlocking puzzle pieces using the same component layout contract. */
export function renderPuzzleMosaic(
  components: readonly PuzzleMosaicComponent[],
  options?: PuzzleMosaicOptions,
): string;

/** In radial mosaic, ring controls outward reach; components may be reordered within each level. */
export type RadialMosaicComponent = RingMosaicComponent;
/** The default title is "Radial mosaic". */
export type RadialMosaicOptions = RingMosaicOptions & {
  /** Fill the rounded end with a value or logo and use one shared scale so labels grow with leaf size. Defaults to false. */
  scaleRadialLabels?: boolean;
};

/** Outward tapered rays with rounded ends and an optional upright center logo. */
export function renderRadialMosaic(
  components: readonly RadialMosaicComponent[],
  options?: RadialMosaicOptions,
): string;

/** Levels occupy spiral sections; more than three components make at least two turns. Skipped indices remain empty. */
export type SpiralMosaicComponent = RingMosaicComponent;
/** Same options; default title is "Spiral mosaic". */
export type SpiralMosaicOptions = RingMosaicOptions;
export function renderSpiralMosaic(
  components: readonly SpiralMosaicComponent[],
  options?: SpiralMosaicOptions,
): string;

export type SpiralPuzzleMosaicComponent = SpiralMosaicComponent;
/** Spiral layout with rounded puzzle connections; default title is "Spiral puzzle mosaic". */
export type SpiralPuzzleMosaicOptions = SpiralMosaicOptions;
export function renderSpiralPuzzleMosaic(
  components: readonly SpiralPuzzleMosaicComponent[],
  options?: SpiralPuzzleMosaicOptions,
): string;

/** Lower ring values pack first; empty level numbers do not reserve cells. */
export type HoneycombMosaicComponent = RingMosaicComponent;
/** Same options; default title is "Honeycomb mosaic". */
export type HoneycombMosaicOptions = RingMosaicOptions;
export function renderHoneycombMosaic(
  components: readonly HoneycombMosaicComponent[],
  options?: HoneycombMosaicOptions,
): string;
