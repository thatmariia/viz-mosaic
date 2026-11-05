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
  /** A base64 PNG or JPEG data URL. */
  centerLogo?: string;
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
