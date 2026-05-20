export interface RenderLogger {
	debug(...args: unknown[]): void;
	info(...args: unknown[]): void;
	warn(...args: unknown[]): void;
	error(...args: unknown[]): void;
}

export interface RenderCache {
	addImage(src: string): Promise<void>;
	match(src: string): Promise<any>;
}

export interface RenderWindowBounds {
	left: number;
	top: number;
	width: number;
	height: number;
}

export interface RenderContext {
	readonly windowBounds: RenderWindowBounds;
	readonly logger: RenderLogger;
	readonly cache: RenderCache;
}
