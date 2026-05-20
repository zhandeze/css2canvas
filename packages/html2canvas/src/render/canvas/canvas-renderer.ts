import {Context} from '../../core/context';
import {
    ExtractedCanvasRenderer,
    RenderConfigurations
} from './extracted-canvas-renderer';
import {createBrowserCanvasRendererEnvironment} from './browser-canvas-renderer-environment';

export {
    CanvasRendererEnvironment,
    FontMetricsProvider,
    ExtractedCanvasRenderer,
    RenderConfigurations,
    RenderOptions
} from './extracted-canvas-renderer';
export {createBrowserCanvasRendererEnvironment} from './browser-canvas-renderer-environment';

export class CanvasRenderer extends ExtractedCanvasRenderer {
    constructor(context: Context, options: RenderConfigurations) {
        super(
            context,
            options,
            createBrowserCanvasRendererEnvironment(document, window.navigator.userAgent)
        );
    }
}
