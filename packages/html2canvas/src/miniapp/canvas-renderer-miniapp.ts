import {
	CanvasRendererEnvironment,
	ExtractedCanvasRenderer,
	FontMetricsProvider,
	RenderConfigurations
} from '../render/canvas/extracted-canvas-renderer';
import {ElementPaint} from '../render/stacking-context';
import {Bounds} from '../css/layout/bounds';
import {contains} from '../core/bitwise';
import {DISPLAY} from '../css/property-descriptors/display';
import {FLOAT} from '../css/property-descriptors/float';
import {POSITION} from '../css/property-descriptors/position';
import {VISIBILITY} from '../css/property-descriptors/visibility';
import {BORDER_STYLE} from '../css/property-descriptors/border-style';
import {BACKGROUND_CLIP} from '../css/property-descriptors/background-clip';
import {asString, Color, isTransparent} from '../css/types/color';
import {EffectTarget} from '../render/effects';
import {Logger} from '../core/logger';
import {RenderContext} from '../render/render-context';
import {
	BoundCurves,
	calculateBorderBoxPath,
	calculateContentBoxPath,
	calculatePaddingBoxPath
} from '../render/bound-curves';
import {transformPath, Path} from '../render/path';
import {getBackgroundValueForIndex} from '../render/background';
import {isBezierCurve} from '../render/bezier-curve';

type PlainObject = {[key: string]: any};

const MASK_OFFSET = 10000;
const NATIVE_MINIAPP_TEXT_BASELINE_OFFSET = 3.25;
const DEFAULT_MINIAPP_USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';
const DEFAULT_MINIAPP_USE_MITER_TEXT_STROKE = true;
const FONT_METRICS_SAMPLE_TEXT = 'Hidden Text';

export interface MiniAppCanvasLike {
	width: number;
	height: number;
	getContext(type: '2d'): CanvasRenderingContext2D;
	style?: {
		width: string;
		height: string;
	};
}

export interface MiniAppRenderInput {
	selector?: string;
	renderOptions: {
		backgroundColor: number | null;
		scale: number;
		x: number;
		y: number;
		width: number;
		height: number;
		canvas?: {
			width: number;
			height: number;
			dataURL?: string;
		};
	};
	windowBounds: {
		left: number;
		top: number;
		width: number;
		height: number;
	};
	environment: {
		userAgent: string;
		useMiterTextStroke: boolean;
	};
	root: PlainObject;
}

export interface MiniAppRendererOptions {
	canvas: MiniAppCanvasLike;
	createCanvas: () => MiniAppCanvasLike;
	loadImage?: (src: string) => Promise<any>;
	measureCanvas?: MiniAppCanvasLike;
	fontMetrics?: FontMetricsProvider;
	userAgent?: string;
	useMiterTextStroke?: boolean;
	logging?: boolean;
}

type RevivedContainer = PlainObject & {
	elements?: RevivedContainer[];
	tree?: RevivedContainer;
};

const UNSUPPORTED_MEDIA_TYPES = {
	canvas: true,
	iframe: true,
	svg: true,
	video: true
} as const;

class MiniAppCache {
	private readonly images: {[key: string]: Promise<any> | undefined} = {};

	constructor(private readonly loadImage?: (src: string) => Promise<any>) {}

	addImage(src: string): Promise<void> {
		if (!this.loadImage || typeof this.images[src] !== 'undefined') {
			return Promise.resolve();
		}
		this.images[src] = this.loadImage(src);
		return Promise.resolve();
	}

	match(src: string): Promise<any> {
		const cached = this.images[src];
		if (typeof cached !== 'undefined') {
			return cached;
		}
		if (this.loadImage) {
			const promise = this.loadImage(src);
			this.images[src] = promise;
			return promise;
		}
		return Promise.resolve(undefined);
	}
}

const attachStyleHelpers = (styles: PlainObject): PlainObject => {
	styles.isVisible = function (): boolean {
		return this.display > 0 && this.opacity > 0 && this.visibility === VISIBILITY.VISIBLE;
	};
	styles.isTransparent = function (): boolean {
		return this.backgroundColor === 0;
	};
	styles.isTransformed = function (): boolean {
		return this.transform !== null;
	};
	styles.isPositioned = function (): boolean {
		return this.position !== POSITION.STATIC;
	};
	styles.isPositionedWithZIndex = function (): boolean {
		return this.isPositioned() && !this.zIndex.auto;
	};
	styles.isFloating = function (): boolean {
		return this.float !== FLOAT.NONE;
	};
	styles.isInlineLevel = function (): boolean {
		return (
			contains(this.display, DISPLAY.INLINE) ||
			contains(this.display, DISPLAY.INLINE_GRID) ||
			contains(this.display, DISPLAY.INLINE_FLEX) ||
			contains(this.display, DISPLAY.INLINE_TABLE) ||
			contains(this.display, DISPLAY.INLINE_LIST_ITEM) ||
			contains(this.display, DISPLAY.INLINE_BLOCK)
		);
	};
	return styles;
};

const reviveTextNode = (textNode: PlainObject): PlainObject => ({
	text: textNode.text,
	textBounds: textNode.textBounds.map((item: PlainObject) => ({
		text: item.text,
		bounds: new Bounds(item.bounds.left, item.bounds.top, item.bounds.width, item.bounds.height)
	}))
});

const reviveContainer = (container: PlainObject): RevivedContainer => {
	const containerType = typeof container.containerType === 'string' ? container.containerType : 'element';
	const normalizedContainerType = isUnsupportedMediaContainer(containerType) ? 'element' : containerType;
	const revived: RevivedContainer = {
		...container,
		containerType: normalizedContainerType,
		bounds: new Bounds(
			container.bounds.left,
			container.bounds.top,
			container.bounds.width,
			container.bounds.height
		),
		styles: attachStyleHelpers({...container.styles}),
		textNodes: (container.textNodes || []).map(reviveTextNode),
		elements: (container.elements || []).map(reviveContainer)
	};

	if (container.tree) {
		revived.tree = reviveContainer(container.tree);
	}
	if (typeof revived.flags !== 'number') {
		revived.flags = 0;
	}
	if (typeof revived.value === 'undefined' && revived.containerType === 'li') {
		revived.value = 0;
	}
	if (typeof revived.type === 'undefined' && typeof revived.inputType === 'string') {
		revived.type = revived.inputType;
	}
	return revived;
};

const createEnvironment = (
	input: MiniAppRenderInput,
	options: MiniAppRendererOptions,
	fontMetrics: FontMetricsProvider
): CanvasRendererEnvironment => ({
	createCanvas(): HTMLCanvasElement {
		return options.createCanvas() as unknown as HTMLCanvasElement;
	},
	fontMetrics,
	userAgent: options.userAgent ?? input.environment.userAgent ?? DEFAULT_MINIAPP_USER_AGENT,
	useMiterTextStroke:
		options.useMiterTextStroke ?? input.environment.useMiterTextStroke ?? DEFAULT_MINIAPP_USE_MITER_TEXT_STROKE
});

class MiniAppCanvasRenderer extends ExtractedCanvasRenderer {
	constructor(
		context: RenderContext,
		options: RenderConfigurations,
		environment: CanvasRendererEnvironment,
		private readonly useNativeBorderRectangles: boolean
	) {
		super(context, options, environment);
	}

	async renderNodeBackgroundAndBorders(paint: ElementPaint): Promise<void> {
		if (
			!this.useNativeBorderRectangles ||
			!shouldUseRectangularSolidBorderFill(paint.curves, paint.container.styles)
		) {
			return super.renderNodeBackgroundAndBorders(paint);
		}

		this.applyEffects(paint.getEffects(EffectTarget.BACKGROUND_BORDERS));
		const styles = paint.container.styles;
		const hasBackground = !isTransparent(styles.backgroundColor) || styles.backgroundImage.length;
		const borders = [
			{style: styles.borderTopStyle, color: styles.borderTopColor, width: styles.borderTopWidth},
			{style: styles.borderRightStyle, color: styles.borderRightColor, width: styles.borderRightWidth},
			{style: styles.borderBottomStyle, color: styles.borderBottomColor, width: styles.borderBottomWidth},
			{style: styles.borderLeftStyle, color: styles.borderLeftColor, width: styles.borderLeftWidth}
		];

		const backgroundPaintingArea = calculateBackgroundCurvedPaintingArea(
			getBackgroundValueForIndex(styles.backgroundClip, 0),
			paint.curves
		);

		if (hasBackground || styles.boxShadow.length) {
			this.ctx.save();
			this.path(backgroundPaintingArea);
			this.ctx.clip();

			if (!isTransparent(styles.backgroundColor)) {
				this.ctx.fillStyle = asString(styles.backgroundColor);
				this.ctx.fill();
			}

			await this.renderBackgroundImage(paint.container);
			this.ctx.restore();

			styles.boxShadow
				.slice(0)
				.reverse()
				.forEach((shadow) => {
					this.ctx.save();
					const borderBoxArea = calculateBorderBoxPath(paint.curves);
					const maskOffset = shadow.inset ? 0 : MASK_OFFSET;
					const shadowPaintingArea = transformPath(
						borderBoxArea,
						-maskOffset + (shadow.inset ? 1 : -1) * shadow.spread.number,
						(shadow.inset ? 1 : -1) * shadow.spread.number,
						shadow.spread.number * (shadow.inset ? -2 : 2),
						shadow.spread.number * (shadow.inset ? -2 : 2)
					);

					if (shadow.inset) {
						this.path(borderBoxArea);
						this.ctx.clip();
						this.mask(shadowPaintingArea);
					} else {
						this.mask(borderBoxArea);
						this.ctx.clip();
						this.path(shadowPaintingArea);
					}

					this.ctx.shadowOffsetX = shadow.offsetX.number + maskOffset;
					this.ctx.shadowOffsetY = shadow.offsetY.number;
					this.ctx.shadowColor = asString(shadow.color);
					this.ctx.shadowBlur = shadow.blur.number;
					this.ctx.fillStyle = shadow.inset ? asString(shadow.color) : 'rgba(0,0,0,1)';

					this.ctx.fill();
					this.ctx.restore();
				});
		}

		this.renderRectangularSolidBorder(paint.container.bounds, borders[0].color, borders);
	}

	private renderRectangularSolidBorder(bounds: Bounds, color: Color, borders: Array<{width: number}>): void {
		const top = borders[0].width;
		const right = borders[1].width;
		const bottom = borders[2].width;
		const left = borders[3].width;
		const scale = this.options.scale;
		const outerLeft = bounds.left;
		const outerTop = bounds.top;
		const outerRight = bounds.left + bounds.width;
		const outerBottom = bounds.top + bounds.height;
		const snappedOuterLeft = Math.ceil(outerLeft * scale) / scale;
		const snappedOuterRight = Math.ceil(outerRight * scale) / scale;
		const snappedOuterTop = Math.ceil(outerTop * scale) / scale;

		this.ctx.fillStyle = asString(color);
		this.ctx.fillRect(snappedOuterLeft, outerTop, snappedOuterRight - snappedOuterLeft, top);
		this.ctx.fillRect(
			bounds.left + bounds.width - right,
			snappedOuterTop,
			right,
			outerBottom - bottom - snappedOuterTop
		);
		this.ctx.fillRect(bounds.left, bounds.top + bounds.height - bottom, bounds.width, bottom);
		this.ctx.fillRect(bounds.left, snappedOuterTop, left, outerBottom - bottom - snappedOuterTop);
	}
}

const createRenderContext = (
	input: MiniAppRenderInput,
	options: MiniAppRendererOptions,
	cache: MiniAppCache
): RenderContext => ({
	logger: new Logger({id: '#miniapp', enabled: options.logging ?? false}),
	cache,
	windowBounds: new Bounds(
		input.windowBounds.left,
		input.windowBounds.top,
		input.windowBounds.width,
		input.windowBounds.height
	)
});

export const renderMiniAppCanvas = async (
	input: MiniAppRenderInput,
	options: MiniAppRendererOptions
): Promise<MiniAppCanvasLike> => {
	const cache = new MiniAppCache(options.loadImage);
	const context = createRenderContext(input, options, cache);
	const useNativeCanvas = isNativeMiniAppCanvas(options.canvas);
	const fontMetrics = resolveFontMetrics(options, useNativeCanvas);

	const root = reviveContainer(input.root);

	const renderOptions: RenderConfigurations = {
		backgroundColor: input.renderOptions.backgroundColor,
		scale: input.renderOptions.scale,
		x: input.renderOptions.x,
		y: input.renderOptions.y,
		width: input.renderOptions.width,
		height: input.renderOptions.height,
		canvas: options.canvas as unknown as HTMLCanvasElement
	};

	await preloadImages(root, cache);

	const renderer = new MiniAppCanvasRenderer(
		context,
		renderOptions,
		createEnvironment(input, options, fontMetrics),
		useNativeCanvas
	);
	await renderer.render(root as any);
	return options.canvas;
};

const preloadImages = async (container: PlainObject, cache: MiniAppCache): Promise<void> => {
	if (container.containerType === 'image' && typeof container.src === 'string') {
		await cache.addImage(container.src);
	}
	for (const child of container.elements || []) {
		await preloadImages(child, cache);
	}
	if (container.tree) {
		await preloadImages(container.tree, cache);
	}
};

const isUnsupportedMediaContainer = (containerType: string): boolean =>
	Object.prototype.hasOwnProperty.call(UNSUPPORTED_MEDIA_TYPES, containerType);

const isNativeMiniAppCanvas = (canvas: MiniAppCanvasLike): boolean =>
	typeof (canvas as HTMLCanvasElement & {ownerDocument?: Document}).ownerDocument === 'undefined';

const resolveFontMetrics = (options: MiniAppRendererOptions, useNativeCanvas: boolean): FontMetricsProvider => {
	const baseFontMetrics =
		options.fontMetrics ?? createMiniAppFontMetricsProvider(options.measureCanvas ?? options.createCanvas());

	return useNativeCanvas ? createNativeMiniAppFontMetrics(baseFontMetrics) : baseFontMetrics;
};

const parseFontSize = (fontSize: string): number => {
	const matched = /([0-9.]+)px/.exec(fontSize);
	if (!matched) {
		return 16;
	}

	return Number(matched[1]) || 16;
};

const createMiniAppFontMetricsProvider = (measureCanvas: MiniAppCanvasLike): FontMetricsProvider => {
	const ctx = measureCanvas.getContext('2d');
	const cache: {[key: string]: {baseline: number; middle: number} | undefined} = {};

	return {
		getMetrics(fontFamily: string, fontSize: string) {
			const key = `${fontFamily}|${fontSize}`;
			const cached = cache[key];
			if (typeof cached !== 'undefined') {
				return cached;
			}

			const size = parseFontSize(fontSize);
			ctx.font = `${fontSize} ${fontFamily}`;

			let baseline = size * 0.8;
			let middle = size * 0.5;
			const metrics = ctx.measureText ? ctx.measureText(FONT_METRICS_SAMPLE_TEXT) : null;

			if (metrics) {
				if (typeof metrics.actualBoundingBoxAscent === 'number') {
					baseline = metrics.actualBoundingBoxAscent;
				}
				if (
					typeof metrics.actualBoundingBoxAscent === 'number' &&
					typeof metrics.actualBoundingBoxDescent === 'number'
				) {
					middle = (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
				}
			}

			const value = {baseline, middle};
			cache[key] = value;
			return value;
		}
	};
};

const createNativeMiniAppFontMetrics = (fontMetrics: FontMetricsProvider): FontMetricsProvider => {
	const cache: {[key: string]: {baseline: number; middle: number} | undefined} = {};

	return {
		getMetrics(fontFamily: string, fontSize: string) {
			const key = `${fontFamily}|${fontSize}`;
			const cached = cache[key];
			if (typeof cached !== 'undefined') {
				return cached;
			}

			const metrics = fontMetrics.getMetrics(fontFamily, fontSize);
			const patched = {
				baseline: metrics.baseline + NATIVE_MINIAPP_TEXT_BASELINE_OFFSET,
				middle: metrics.middle + NATIVE_MINIAPP_TEXT_BASELINE_OFFSET
			};
			cache[key] = patched;
			return patched;
		}
	};
};

const shouldUseRectangularSolidBorderFill = (curves: BoundCurves, styles: PlainObject): boolean => {
	const borders = [
		{style: styles.borderTopStyle, color: styles.borderTopColor, width: styles.borderTopWidth},
		{style: styles.borderRightStyle, color: styles.borderRightColor, width: styles.borderRightWidth},
		{style: styles.borderBottomStyle, color: styles.borderBottomColor, width: styles.borderBottomWidth},
		{style: styles.borderLeftStyle, color: styles.borderLeftColor, width: styles.borderLeftWidth}
	];
	const firstBorder = borders[0];

	return (
		!hasBezierBorderCorners(curves) &&
		borders.every(
			(border) =>
				border.style === BORDER_STYLE.SOLID &&
				border.width > 0 &&
				!isTransparent(border.color) &&
				border.color === firstBorder.color
		)
	);
};

const hasBezierBorderCorners = (curves: BoundCurves): boolean =>
	[
		curves.topLeftBorderBox,
		curves.topRightBorderBox,
		curves.bottomRightBorderBox,
		curves.bottomLeftBorderBox,
		curves.topLeftPaddingBox,
		curves.topRightPaddingBox,
		curves.bottomRightPaddingBox,
		curves.bottomLeftPaddingBox
	].some((path) => isBezierCurve(path));

const calculateBackgroundCurvedPaintingArea = (clip: BACKGROUND_CLIP, curves: BoundCurves): Path[] => {
	switch (clip) {
		case BACKGROUND_CLIP.BORDER_BOX:
			return calculateBorderBoxPath(curves);
		case BACKGROUND_CLIP.CONTENT_BOX:
			return calculateContentBoxPath(curves);
		case BACKGROUND_CLIP.PADDING_BOX:
		default:
			return calculatePaddingBoxPath(curves);
	}
};
