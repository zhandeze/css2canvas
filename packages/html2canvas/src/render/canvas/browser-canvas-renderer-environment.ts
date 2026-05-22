import {CanvasRendererEnvironment} from './extracted-canvas-renderer';
import {FontMetrics} from '../font-metrics';

export const createBrowserCanvasRendererEnvironment = (
  document: Document,
  userAgent: string
): CanvasRendererEnvironment => ({
  createCanvas(ownerDocument?: Document | null): HTMLCanvasElement {
    return (ownerDocument ?? document).createElement('canvas');
  },
  fontMetrics: new FontMetrics(document),
  userAgent,
  useMiterTextStroke: 'chrome' in window
});
