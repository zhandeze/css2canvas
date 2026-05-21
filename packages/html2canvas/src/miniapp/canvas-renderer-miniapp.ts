import {
	CanvasRendererEnvironment,
	ExtractedCanvasRenderer,
	FontMetricsProvider,
	RenderConfigurations
} from '../render/canvas/extracted-canvas-renderer';
import {ElementPaint} from '../render/stacking-context';
import {ElementContainerLike, ElementContainerRenderStyle} from '../dom/element-container';
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
import {
	MiniAppRenderInput,
	SerializedImageContainer,
	SerializedListItemContainer,
	SerializedMiniAppContainer,
	SerializedOrderedListContainer,
	SerializedStyles,
	SerializedTextNode
} from './render-input';

const MASK_OFFSET = 10000;
const NATIVE_MINIAPP_TEXT_BASELINE_OFFSET = 3.25;
const DEFAULT_MINIAPP_USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';
const DEFAULT_MINIAPP_USE_MITER_TEXT_STROKE = true;
const FONT_METRICS_SAMPLE_TEXT = 'Hidden Text';

type RevivedStyles = ElementContainerRenderStyle & {
	isVisible(): boolean;
	isTransformed(): boolean;
	isPositioned(): boolean;
	isFloating(): boolean;
	isInlineLevel(): boolean;
};

type RevivedTextBound = {
	text: string;
	bounds: Bounds;
};

type RevivedTextNode = {
	text: string;
	textBounds: RevivedTextBound[];
};

type RevivedBaseContainer = ElementContainerLike & {
	containerType: SerializedMiniAppContainer['containerType'];
	styles: RevivedStyles;
	textNodes: RevivedTextNode[];
	elements: RevivedContainer[];
};

type RevivedElementContainer = RevivedBaseContainer & {
	containerType: 'element';
};

type RevivedImageContainer = RevivedBaseContainer & {
	containerType: 'image';
	src: string;
	intrinsicWidth: number;
	intrinsicHeight: number;
};

type RevivedListItemContainer = RevivedBaseContainer & {
	containerType: 'li';
	value: number;
};

type RevivedOrderedListContainer = RevivedBaseContainer & {
	containerType: 'ol';
	start: number;
	reversed: boolean;
};

type RevivedContainer =
	| RevivedElementContainer
	| RevivedImageContainer
	| RevivedListItemContainer
	| RevivedOrderedListContainer;

export interface MiniAppCanvasLike {
	width: number;
	height: number;
	ownerDocument?: Document;
	getContext(type: '2d'): CanvasRenderingContext2D;
	style?: {
		width: string;
		height: string;
	};
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

const attachStyleHelpers = (styles: SerializedStyles): RevivedStyles => ({
	...styles,
	isVisible(): boolean {
		return this.display > 0 && this.opacity > 0 && this.visibility === VISIBILITY.VISIBLE;
	},
	isTransformed(): boolean {
		return this.transform !== null;
	},
	isPositioned(): boolean {
		return this.position !== POSITION.STATIC;
	},
	isFloating(): boolean {
		return this.float !== FLOAT.NONE;
	},
	isInlineLevel(): boolean {
		return (
			contains(this.display, DISPLAY.INLINE) ||
			contains(this.display, DISPLAY.INLINE_GRID) ||
			contains(this.display, DISPLAY.INLINE_FLEX) ||
			contains(this.display, DISPLAY.INLINE_TABLE) ||
			contains(this.display, DISPLAY.INLINE_LIST_ITEM) ||
			contains(this.display, DISPLAY.INLINE_BLOCK)
		);
	}
});

const reviveTextNode = (textNode: SerializedTextNode): RevivedTextNode => ({
	text: textNode.text,
	textBounds: textNode.textBounds.map((item) => ({
		text: item.text,
		bounds: new Bounds(item.bounds.left, item.bounds.top, item.bounds.width, item.bounds.height)
	}))
});

const reviveBaseContainer = (
	container: SerializedMiniAppContainer
): Pick<RevivedBaseContainer, 'flags' | 'bounds' | 'styles' | 'textNodes' | 'elements'> => ({
	flags: typeof container.flags === 'number' ? container.flags : 0,
	bounds: new Bounds(container.bounds.left, container.bounds.top, container.bounds.width, container.bounds.height),
	styles: attachStyleHelpers(container.styles),
	textNodes: container.textNodes.map(reviveTextNode),
	elements: container.elements.map(reviveContainer)
});

const reviveImageContainer = (container: SerializedImageContainer): RevivedImageContainer => ({
	containerType: 'image',
	src: container.src,
	intrinsicWidth: container.intrinsicWidth,
	intrinsicHeight: container.intrinsicHeight,
	...reviveBaseContainer(container)
});

const reviveListItemContainer = (container: SerializedListItemContainer): RevivedListItemContainer => ({
	containerType: 'li',
	value: typeof container.value === 'number' ? container.value : 0,
	...reviveBaseContainer(container)
});

const reviveOrderedListContainer = (container: SerializedOrderedListContainer): RevivedOrderedListContainer => ({
	containerType: 'ol',
	start: container.start,
	reversed: container.reversed,
	...reviveBaseContainer(container)
});

const reviveContainer = (container: SerializedMiniAppContainer): RevivedContainer => {
	switch (container.containerType) {
		case 'image':
			return reviveImageContainer(container);
		case 'li':
			return reviveListItemContainer(container);
		case 'ol':
			return reviveOrderedListContainer(container);
		case 'element':
		default:
			return {
				containerType: 'element',
				...reviveBaseContainer(container)
			};
	}
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
	await renderer.render(root);
	return options.canvas;
};

const preloadImages = async (container: RevivedContainer, cache: MiniAppCache): Promise<void> => {
	if (container.containerType === 'image') {
		await cache.addImage(container.src);
	}
	for (const child of container.elements) {
		await preloadImages(child, cache);
	}
};

const isNativeMiniAppCanvas = (canvas: MiniAppCanvasLike): boolean => typeof canvas.ownerDocument === 'undefined';

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

const shouldUseRectangularSolidBorderFill = (
	curves: BoundCurves,
	styles: Pick<
		RevivedStyles,
		| 'borderTopStyle'
		| 'borderTopColor'
		| 'borderTopWidth'
		| 'borderRightStyle'
		| 'borderRightColor'
		| 'borderRightWidth'
		| 'borderBottomStyle'
		| 'borderBottomColor'
		| 'borderBottomWidth'
		| 'borderLeftStyle'
		| 'borderLeftColor'
		| 'borderLeftWidth'
	>
): boolean => {
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
