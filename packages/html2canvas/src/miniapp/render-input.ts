import type {MiniAppSerializedStyleDeclaration} from '../css';
import type {Bounds} from '../css/layout/bounds';
import type {Color} from '../css/types/color';
import type {RenderWindowBounds} from '../render/render-context';

type MethodKeys<T> = {
	[K in keyof T]-?: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type DataOnly<T> = Omit<T, MethodKeys<T>>;

export type SerializedBounds = DataOnly<Bounds>;

export interface SerializedTextBounds {
	text: string;
	bounds: SerializedBounds;
}

export interface SerializedTextNode {
	text: string;
	textBounds: SerializedTextBounds[];
}

export type SerializedStyles = MiniAppSerializedStyleDeclaration;

interface SerializedContainerBase {
	flags: number;
	bounds: SerializedBounds;
	styles: SerializedStyles;
	textNodes: SerializedTextNode[];
	elements: SerializedMiniAppContainer[];
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
