import {Bounds, parseBounds, parseDocumentSize} from '../src/css/layout/bounds';
import {COLORS, isTransparent, parseColor} from '../src/css/types/color';
import {CloneConfigurations, DocumentCloner} from '../src/dom/document-cloner';
import {isBodyElement, isHTMLElement, parseTree} from '../src/dom/node-parser';
import {CacheStorage} from '../src/core/cache-storage';
import {
	CanvasRenderer,
	createBrowserCanvasRendererEnvironment,
	ExtractedCanvasRenderer,
	RenderConfigurations
} from '../src/render/canvas/canvas-renderer';
import {Context} from '../src/core/context';
import {ElementContainer} from '../src/dom/element-container';
import {TextBounds} from '../src/css/layout/text-bounds';
import {layoutToMiniAppRenderInput} from '../src/miniapp/layout-to-miniapp';
import {renderMiniAppCanvas} from '../src/miniapp/canvas-renderer-miniapp';
import {computeLayout, measureTextBlock} from '../src/layout';

type CompareResult = {
	identical: boolean;
	originalSize: {width: number; height: number};
	extractedSize: {width: number; height: number};
	diffPixels: number;
};

type MiniAppLayoutCompareResult = {
	compare: CompareResult;
	input: SerializedRenderInput;
};

type LayoutFixtureNode = {
	containerType: string;
	style: Record<string, unknown> & {
		text?: string;
		fontFamily?: string;
		fontSize?: number;
		fontWeight?: number | string;
		fontStyle?: string;
		lineHeight?: number | string;
		letterSpacing?: number;
		textAlign?: string;
		textDecoration?: string;
		textDecorationColor?: string;
		color?: string;
	};
	layout: {left: number; top: number; width: number; height: number; right?: number; bottom?: number; direction?: string};
	lastLayout: any;
	nextAbsoluteChild: LayoutFixtureNode | null;
	nextFlexChild: LayoutFixtureNode | null;
	flags?: number;
	textNodes?: SerializedTextNode[];
	children: LayoutFixtureNode[];
};

type CompareOptions = {
	selector: string;
	scale?: number;
	canvasSelector?: string;
};

type SerializedBounds = {
	left: number;
	top: number;
	width: number;
	height: number;
};

type SerializedTextBounds = {
	text: string;
	bounds: SerializedBounds;
};

type SerializedTextNode = {
	text: string;
	textBounds: SerializedTextBounds[];
};

type SerializedCanvasSnapshot = {
	width: number;
	height: number;
	dataURL: string;
};

type SerializedElementContainer = {
	containerType: string;
	flags: number;
	bounds: SerializedBounds;
	styles: unknown;
	textNodes: SerializedTextNode[];
	elements: SerializedElementContainer[];
	src?: string;
	svg?: string;
	intrinsicWidth?: number;
	intrinsicHeight?: number;
	checked?: boolean;
	value?: string | number;
	inputType?: string;
	start?: number;
	reversed?: boolean;
	width?: number;
	height?: number;
	backgroundColor?: number | null;
	tree?: SerializedElementContainer;
	canvasData?: SerializedCanvasSnapshot;
};

type SerializedRenderInput = {
	selector: string;
	renderOptions: {
		backgroundColor: number | null;
		scale: number;
		x: number;
		y: number;
		width: number;
		height: number;
		canvas?: SerializedCanvasSnapshot;
	};
	windowBounds: SerializedBounds;
	environment: {
		userAgent: string;
		useMiterTextStroke: boolean;
	};
	root: SerializedElementContainer;
};

type PrepareRenderResult = {
	context: Context;
	root: ReturnType<typeof parseTree>;
	renderOptions: RenderConfigurations;
	cleanup: () => void;
};

const cloneCanvasWithContent = (source: HTMLCanvasElement): HTMLCanvasElement => {
	const canvas = document.createElement('canvas');
	canvas.width = source.width;
	canvas.height = source.height;
	canvas.style.width = source.style.width;
	canvas.style.height = source.style.height;
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	ctx.drawImage(source, 0, 0);
	return canvas;
};

const normalizeCompareOptions = (options: string | CompareOptions): CompareOptions =>
	typeof options === 'string' ? {selector: options} : options;

const prepareRender = async (options: CompareOptions, canvas?: HTMLCanvasElement): Promise<PrepareRenderResult> => {
	const element = document.querySelector(options.selector) as HTMLElement | null;
	if (!element) {
		throw new Error(`Element not found: ${options.selector}`);
	}

	const ownerDocument = element.ownerDocument;
	const defaultView = ownerDocument.defaultView as Window;

	const windowBounds = new Bounds(
		defaultView.pageXOffset,
		defaultView.pageYOffset,
		defaultView.innerWidth,
		defaultView.innerHeight
	);

	const context = new Context(
		{
			logging: true,
			allowTaint: false,
			imageTimeout: 15000,
			proxy: undefined,
			useCORS: false
		},
		windowBounds
	);

	const cloneOptions: CloneConfigurations = {
		allowTaint: false,
		inlineImages: false,
		copyStyles: false
	};

	const documentCloner = new DocumentCloner(context, element, cloneOptions);
	const clonedElement = documentCloner.clonedReferenceElement;
	if (!clonedElement) {
		throw new Error('Unable to find cloned element');
	}

	const container = await documentCloner.toIFrame(ownerDocument, windowBounds);

	const {width, height, left, top} =
		isBodyElement(clonedElement) || isHTMLElement(clonedElement)
			? parseDocumentSize(clonedElement.ownerDocument)
			: parseBounds(context, clonedElement);

	const backgroundColor = parseBackgroundColor(context, clonedElement);
	const root = parseTree(context, clonedElement);
	if (backgroundColor === root.styles.backgroundColor) {
		root.styles.backgroundColor = COLORS.TRANSPARENT;
	}

	const renderOptions: RenderConfigurations = {
		backgroundColor,
		canvas,
		scale: options.scale ?? defaultView.devicePixelRatio ?? 1,
		x: left,
		y: top,
		width: Math.ceil(width),
		height: Math.ceil(height)
	};

	return {
		context,
		root,
		renderOptions,
		cleanup: () => {
			DocumentCloner.destroy(container);
		}
	};
};

const parseBackgroundColor = (context: Context, element: HTMLElement) => {
	const ownerDocument = element.ownerDocument;
	const documentBackgroundColor = ownerDocument.documentElement
		? parseColor(context, getComputedStyle(ownerDocument.documentElement).backgroundColor as string)
		: COLORS.TRANSPARENT;
	const bodyBackgroundColor = ownerDocument.body
		? parseColor(context, getComputedStyle(ownerDocument.body).backgroundColor as string)
		: COLORS.TRANSPARENT;

	const defaultBackgroundColor = 0xffffffff;

	return element === ownerDocument.documentElement
		? isTransparent(documentBackgroundColor)
			? isTransparent(bodyBackgroundColor)
				? defaultBackgroundColor
				: bodyBackgroundColor
			: documentBackgroundColor
		: defaultBackgroundColor;
};

const compareCanvases = (left: HTMLCanvasElement, right: HTMLCanvasElement): CompareResult => {
	const width = Math.min(left.width, right.width);
	const height = Math.min(left.height, right.height);
	const leftCtx = left.getContext('2d') as CanvasRenderingContext2D;
	const rightCtx = right.getContext('2d') as CanvasRenderingContext2D;
	const leftData = leftCtx.getImageData(0, 0, width, height).data;
	const rightData = rightCtx.getImageData(0, 0, width, height).data;
	let diffPixels = 0;

	for (let i = 0; i < leftData.length; i += 4) {
		if (
			leftData[i] !== rightData[i] ||
			leftData[i + 1] !== rightData[i + 1] ||
			leftData[i + 2] !== rightData[i + 2] ||
			leftData[i + 3] !== rightData[i + 3]
		) {
			diffPixels++;
		}
	}

	return {
		identical: diffPixels === 0 && left.width === right.width && left.height === right.height,
		originalSize: {width: left.width, height: left.height},
		extractedSize: {width: right.width, height: right.height},
		diffPixels
	};
};

const renderOriginalAndExtracted = async (
	rawOptions: string | CompareOptions
): Promise<{
	original: HTMLCanvasElement;
	extracted: HTMLCanvasElement;
	compare: CompareResult;
}> => {
	CacheStorage.setContext(window);
	const options = normalizeCompareOptions(rawOptions);
	let sourceCanvas: HTMLCanvasElement | null = null;

	if (options.canvasSelector) {
		sourceCanvas = document.querySelector(options.canvasSelector) as HTMLCanvasElement | null;
		if (!sourceCanvas) {
			throw new Error(`Canvas not found: ${options.canvasSelector}`);
		}
	}

	const originalInputCanvas = sourceCanvas ? cloneCanvasWithContent(sourceCanvas) : undefined;
	const extractedInputCanvas = sourceCanvas ? cloneCanvasWithContent(sourceCanvas) : undefined;

	const preparedOriginal = await prepareRender(options, originalInputCanvas);
	const originalRenderer = new CanvasRenderer(preparedOriginal.context, preparedOriginal.renderOptions);
	const originalCanvas = await originalRenderer.render(preparedOriginal.root);
	preparedOriginal.cleanup();

	const preparedExtracted = await prepareRender(options, extractedInputCanvas);
	const extractedRenderer = new ExtractedCanvasRenderer(
		preparedExtracted.context,
		preparedExtracted.renderOptions,
		createBrowserCanvasRendererEnvironment(document, window.navigator.userAgent)
	);
	const extractedCanvas = await extractedRenderer.render(preparedExtracted.root);
	preparedExtracted.cleanup();

	const compare = compareCanvases(originalCanvas, extractedCanvas);
	return {original: originalCanvas, extracted: extractedCanvas, compare};
};

const clonePlain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const serializeBounds = (
	bounds: Bounds | {left: number; top: number; width: number; height: number}
): SerializedBounds => ({
	left: bounds.left,
	top: bounds.top,
	width: bounds.width,
	height: bounds.height
});

const serializeTextBounds = (textBounds: TextBounds): SerializedTextBounds => ({
	text: textBounds.text,
	bounds: serializeBounds(textBounds.bounds)
});

const serializeCanvasSnapshot = (canvas: HTMLCanvasElement): SerializedCanvasSnapshot => ({
	width: canvas.width,
	height: canvas.height,
	dataURL: canvas.toDataURL()
});

const serializeContainer = (container: ElementContainer): SerializedElementContainer => {
	const containerType = normalizeMiniAppContainerType(container.containerType);
	const serialized: SerializedElementContainer = {
		containerType,
		flags: container.flags,
		bounds: serializeBounds(container.bounds),
		styles: clonePlain(container.styles),
		textNodes: container.textNodes.map((textNode) => ({
			text: textNode.text,
			textBounds: textNode.textBounds.map(serializeTextBounds)
		})),
		elements: container.elements.map(serializeContainer)
	};

	const containerData = container as ElementContainer & {
		src?: string;
		svg?: string;
		intrinsicWidth?: number;
		intrinsicHeight?: number;
		checked?: boolean;
		value?: string | number;
		type?: string;
		start?: number;
		reversed?: boolean;
		width?: number;
		height?: number;
		backgroundColor?: number | null;
		tree?: ElementContainer;
		canvas?: HTMLCanvasElement;
	};

	if (typeof containerData.src === 'string') {
		serialized.src = containerData.src;
	}
	if (containerType === 'svg' && typeof containerData.svg === 'string') {
		serialized.svg = containerData.svg;
	}
	if (typeof containerData.intrinsicWidth === 'number') {
		serialized.intrinsicWidth = containerData.intrinsicWidth;
	}
	if (typeof containerData.intrinsicHeight === 'number') {
		serialized.intrinsicHeight = containerData.intrinsicHeight;
	}
	if (typeof containerData.checked === 'boolean') {
		serialized.checked = containerData.checked;
	}
	if (typeof containerData.value !== 'undefined') {
		serialized.value = containerData.value;
	}
	if (typeof containerData.type === 'string') {
		serialized.inputType = containerData.type;
	}
	if (typeof containerData.start === 'number') {
		serialized.start = containerData.start;
	}
	if (typeof containerData.reversed === 'boolean') {
		serialized.reversed = containerData.reversed;
	}
	if (typeof containerData.width === 'number') {
		serialized.width = containerData.width;
	}
	if (typeof containerData.height === 'number') {
		serialized.height = containerData.height;
	}
	if (typeof containerData.backgroundColor !== 'undefined') {
		serialized.backgroundColor = containerData.backgroundColor;
	}
	if (containerType === 'iframe' && containerData.tree) {
		serialized.tree = serializeContainer(containerData.tree);
	}
	if (containerType === 'canvas' && containerData.canvas) {
		serialized.canvasData = serializeCanvasSnapshot(containerData.canvas);
	}

	return serialized;
};

const exportRenderInput = async (rawOptions: string | CompareOptions): Promise<SerializedRenderInput> => {
	CacheStorage.setContext(window);
	const options = normalizeCompareOptions(rawOptions);
	let sourceCanvas: HTMLCanvasElement | undefined;

	if (options.canvasSelector) {
		const canvas = document.querySelector(options.canvasSelector) as HTMLCanvasElement | null;
		if (!canvas) {
			throw new Error(`Canvas not found: ${options.canvasSelector}`);
		}
		sourceCanvas = cloneCanvasWithContent(canvas);
	}

	const prepared = await prepareRender(options, sourceCanvas);
	const serialized: SerializedRenderInput = {
		selector: options.selector,
		renderOptions: {
			backgroundColor: prepared.renderOptions.backgroundColor,
			scale: prepared.renderOptions.scale,
			x: prepared.renderOptions.x,
			y: prepared.renderOptions.y,
			width: prepared.renderOptions.width,
			height: prepared.renderOptions.height,
			canvas: prepared.renderOptions.canvas ? serializeCanvasSnapshot(prepared.renderOptions.canvas) : undefined
		},
		windowBounds: serializeBounds(prepared.context.windowBounds),
		environment: {
			userAgent: window.navigator.userAgent,
			useMiterTextStroke: 'chrome' in window
		},
		root: serializeContainer(prepared.root)
	};
	prepared.cleanup();
	return serialized;
};

const renderMiniAppLayoutCompare = async (rawOptions: string | CompareOptions): Promise<MiniAppLayoutCompareResult> => {
	const input = await exportRenderInput(rawOptions);
	const compare = await renderOriginalAndExtracted(rawOptions);
	const layoutRoot = buildLayoutFixture(input);
	computeLayout(layoutRoot as never, input.renderOptions.width, 'ltr');
	const miniInput = layoutToMiniAppRenderInput({
		selector: input.selector,
		renderOptions: input.renderOptions,
		windowBounds: input.windowBounds,
		environment: input.environment,
		root: layoutRoot as never
	});
	const canvas = document.createElement('canvas');
	canvas.width = Math.floor(input.renderOptions.width * input.renderOptions.scale);
	canvas.height = Math.floor(input.renderOptions.height * input.renderOptions.scale);
	canvas.style.width = `${input.renderOptions.width}px`;
	canvas.style.height = `${input.renderOptions.height}px`;

	await renderMiniAppCanvas(miniInput, {
		canvas: canvas as never,
		createCanvas: () => document.createElement('canvas') as never,
		loadImage: (src: string) =>
			new Promise((resolve, reject) => {
				const img = new Image();
				img.onload = () => resolve(img);
				img.onerror = reject;
				img.src = src;
			}),
		fontMetrics: createBrowserFontMetrics(document),
		userAgent: window.navigator.userAgent,
		useMiterTextStroke: 'chrome' in window,
		logging: true
	});

	return {
		compare: compareCanvases(compare.original, canvas),
		input
	};
};

const buildLayoutFixture = (input: SerializedRenderInput): LayoutFixtureNode => {
	const text = input.root.textNodes
		.map((node) => node.text)
		.join('');
	const layoutText = text || 'Miniapp compare';
	const measure = (width: number) => measureTextBlock(layoutText, {
		text: layoutText,
		fontFamily: "'Noto Sans SC', Arial, sans-serif",
		fontSize: 18,
		fontWeight: 700,
		fontStyle: 'normal',
		lineHeight: 24,
		textAlign: 'left',
		textDecoration: 'underline',
		color: '#102030'
	}, width);

	return {
		containerType: 'element',
		style: {
			width: input.renderOptions.width,
			padding: 24,
			borderWidth: 6,
			text: layoutText,
			measure
		},
		children: [
			{
				containerType: 'element',
				style: {
					text: layoutText,
					measure
				},
				children: [],
				layout: {left: 0, top: 0, width: 0, height: 0},
				lastLayout: null,
				nextAbsoluteChild: null,
				nextFlexChild: null
			}
		],
		layout: {left: 0, top: 0, width: 0, height: 0},
		lastLayout: null,
		nextAbsoluteChild: null,
		nextFlexChild: null
	};
};

declare global {
	interface Window {
		extractedCanvasRendererBrowser: {
			renderOriginalAndExtracted: typeof renderOriginalAndExtracted;
			exportRenderInput: typeof exportRenderInput;
			renderMiniAppLayoutCompare: typeof renderMiniAppLayoutCompare;
		};
	}
}

window.extractedCanvasRendererBrowser = {
	renderOriginalAndExtracted,
	exportRenderInput,
	renderMiniAppLayoutCompare
};

function createBrowserFontMetrics(doc: Document) {
	return {
		getMetrics(fontFamily: string, fontSize: string) {
			const canvas = doc.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				return {baseline: 0, middle: 0};
			}
			ctx.font = `${fontSize} ${fontFamily}`;
			const metrics = ctx.measureText('Hidden Text');
			return {
				baseline: metrics.actualBoundingBoxAscent || 0,
				middle: ((metrics.actualBoundingBoxAscent || 0) - (metrics.actualBoundingBoxDescent || 0)) / 2
			};
		}
	};
}

const normalizeMiniAppContainerType = (containerType: string): string => {
	switch (containerType) {
		case 'canvas':
		case 'iframe':
		case 'svg':
		case 'video':
			return 'element';
		default:
			return containerType;
	}
};
