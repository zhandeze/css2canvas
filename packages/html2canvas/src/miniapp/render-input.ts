import type {MiniAppSerializedStyleDeclaration} from '../css';
import type {Bounds} from '../css/layout/bounds';
import type {Color} from '../css/types/color';
import type {RenderWindowBounds} from '../render/render-context';
type MethodKeys<T> = {
	[K in keyof T]-?: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type DataOnly<T> = Omit<T, MethodKeys<T>>;

export type SerializedBounds = DataOnly<Bounds>;

export interface SerializedCanvasSnapshot {
	width: number;
	height: number;
	dataURL?: string;
}

export interface SerializedTextBounds {
	text: string;
	bounds: SerializedBounds;
}

export interface SerializedTextNode {
	text: string;
	textBounds: SerializedTextBounds[];
}

export type SerializedStyles = MiniAppSerializedStyleDeclaration;

export interface SerializedContainerBase {
	flags: number;
	bounds: SerializedBounds;
	styles: SerializedStyles;
	textNodes: SerializedTextNode[];
	elements: SerializedMiniAppContainer[];
	tree?: SerializedMiniAppContainer;
	canvasData?: SerializedCanvasSnapshot;
	svg?: string;
}

export interface SerializedElementContainer extends SerializedContainerBase {
	containerType: 'element';
}

export interface SerializedImageContainer extends SerializedContainerBase {
	containerType: 'image';
	src: string;
	intrinsicWidth: number;
	intrinsicHeight: number;
}

export interface SerializedListItemContainer extends SerializedContainerBase {
	containerType: 'li';
	value?: number;
}

export interface SerializedOrderedListContainer extends SerializedContainerBase {
	containerType: 'ol';
	start: number;
	reversed: boolean;
}

export type SerializedMiniAppContainer =
	| SerializedElementContainer
	| SerializedImageContainer
	| SerializedListItemContainer
	| SerializedOrderedListContainer;

export interface MiniAppRenderOptionsInput {
	backgroundColor: Color | null;
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
}

export interface MiniAppRenderEnvironmentInput {
	userAgent: string;
	useMiterTextStroke: boolean;
}

export interface MiniAppRenderInput {
	selector?: string;
	renderOptions: MiniAppRenderOptionsInput;
	windowBounds: RenderWindowBounds;
	environment: MiniAppRenderEnvironmentInput;
	root: SerializedMiniAppContainer;
}

export type MiniAppRenderInputSource = MiniAppRenderInput;

const clonePlain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const serializeBounds = (
	bounds: Bounds | {left: number; top: number; width: number; height: number}
): SerializedBounds => ({
	left: bounds.left,
	top: bounds.top,
	width: bounds.width,
	height: bounds.height
});

export const serializeTextBounds = (textBounds: {text: string; bounds: Bounds | SerializedBounds}): SerializedTextBounds => ({
	text: textBounds.text,
	bounds: serializeBounds(textBounds.bounds)
});

export const serializeTextNode = (textNode: {text: string; textBounds: Array<{text: string; bounds: Bounds | SerializedBounds}>}): SerializedTextNode => ({
	text: textNode.text,
	textBounds: textNode.textBounds.map(serializeTextBounds)
});

export const normalizeMiniAppContainerType = (
	containerType: string
): SerializedMiniAppContainer['containerType'] => {
	switch (containerType) {
		case 'canvas':
		case 'iframe':
		case 'svg':
		case 'video':
			return 'element';
		default:
			return containerType as SerializedMiniAppContainer['containerType'];
	}
};

export const serializeMiniAppContainer = (
	container: {
		containerType?: string;
		flags: number;
		bounds: SerializedBounds;
		styles: SerializedStyles;
		textNodes: SerializedTextNode[];
		elements: SerializedMiniAppContainer[];
		src?: string;
		intrinsicWidth?: number;
		intrinsicHeight?: number;
		value?: number;
		start?: number;
		reversed?: boolean;
		tree?: SerializedMiniAppContainer;
		canvas?: HTMLCanvasElement | SerializedCanvasSnapshot;
		svg?: string;
	}
): SerializedMiniAppContainer => {
	const containerType = normalizeMiniAppContainerType(container.containerType ?? 'element');
	const serialized: SerializedMiniAppContainer = containerType === 'ol' ? {
		containerType,
		flags: container.flags,
		bounds: container.bounds,
		styles: clonePlain(container.styles),
		textNodes: container.textNodes.map(serializeTextNode),
		elements: container.elements,
		start: typeof container.start === 'number' ? container.start : 0,
		reversed: typeof container.reversed === 'boolean' ? container.reversed : false
	} : containerType === 'li' ? {
		containerType,
		flags: container.flags,
		bounds: container.bounds,
		styles: clonePlain(container.styles),
		textNodes: container.textNodes.map(serializeTextNode),
		elements: container.elements,
		value: container.value
	} : {
		containerType,
		flags: container.flags,
		bounds: container.bounds,
		styles: clonePlain(container.styles),
		textNodes: container.textNodes.map(serializeTextNode),
		elements: container.elements
	};

	if (typeof container.src === 'string') {
		(serialized as SerializedImageContainer).src = container.src;
	}
	if (typeof container.intrinsicWidth === 'number') {
		(serialized as SerializedImageContainer).intrinsicWidth = container.intrinsicWidth;
	}
	if (typeof container.intrinsicHeight === 'number') {
		(serialized as SerializedImageContainer).intrinsicHeight = container.intrinsicHeight;
	}
	if (typeof container.value === 'number') {
		(serialized as SerializedListItemContainer).value = container.value;
	}
	if (typeof container.start === 'number') {
		(serialized as SerializedOrderedListContainer).start = container.start;
	}
	if (typeof container.reversed === 'boolean') {
		(serialized as SerializedOrderedListContainer).reversed = container.reversed;
	}
	if (container.tree) {
		(serialized as SerializedContainerBase).tree = container.tree;
	}
	if (container.canvas) {
		const canvas = container.canvas as HTMLCanvasElement & SerializedCanvasSnapshot;
		(serialized as SerializedContainerBase).canvasData = {
			width: canvas.width,
			height: canvas.height,
			dataURL: typeof canvas.toDataURL === 'function' ? canvas.toDataURL() : canvas.dataURL
		};
	}
	if (typeof container.svg === 'string') {
		(serialized as SerializedContainerBase).svg = container.svg;
	}

	return serialized;
};

export const serializeMiniAppRenderInput = (input: MiniAppRenderInputSource): MiniAppRenderInput => input;
