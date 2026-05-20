import type {RenderContext} from './render-context';
import type {RenderConfigurations} from './canvas/extracted-canvas-renderer';

export class Renderer {
	constructor(
		protected readonly context: RenderContext,
		protected readonly options: RenderConfigurations
	) {}
}
