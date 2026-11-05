import { renderCircularMosaic } from './circular-mosaic.js';

export function renderRadialMosaic(components, options) {
  return renderCircularMosaic(components, options, 'radial');
}
