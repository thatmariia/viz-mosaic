/** Numeric and string IDs with the same spelling share a category. */
export type CategoryId = string | number;

export interface RingMosaicComponent {
  name: string;
  /** Distance index, from 1 to 32. Missing indices remain empty. */
  ring: number;
  /** A base64 PNG or JPEG data URL. */
  logo?: string;
  categoryId?: CategoryId;
}

export interface RingMosaicOptions {
  /** A base64 PNG or JPEG data URL; fits the available center space automatically. */
  centerLogo?: string;
  /** Tint component logos to match label colors, treating white pixels as cutouts. Defaults to false. */
  monochromeLogos?: boolean;
  /** Accessible name. Defaults to "Ring mosaic". */
  title?: string;
  /** Stable SVG IDs; use a distinct prefix for each inline diagram. */
  idPrefix?: string;
  /** Optional category overrides, as opaque #rgb or #rrggbb colors. */
  categoryColors?: Readonly<Record<string, string>>;
  /** Width in SVG pixels, using Arial at the supplied font size and weight 500. */
  measureText?: (name: string, fontSize: number) => number;
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

/** In radial mosaic, ring controls outward reach; components follow input order clockwise. */
export type RadialMosaicComponent = RingMosaicComponent;
/** Same options as ring mosaic; the default title is "Radial mosaic". */
export type RadialMosaicOptions = RingMosaicOptions;

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
