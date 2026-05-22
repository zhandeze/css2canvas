import {
	serializeBounds,
	serializeMiniAppContainer
} from './render-input';
import type {
	MiniAppRenderInput,
	MiniAppRenderInputSource,
	SerializedMiniAppContainer,
	SerializedTextNode
} from './render-input';
import type {LayoutNode} from '../layout';

type LayoutTextLine = {
	text: string;
	x: number;
	y: number;
	width: number;
	height: number;
};

type LayoutTextMeasureResult = {
	width: number;
	height: number;
	lineCount: number;
	lines: LayoutTextLine[];
};

type LayoutStyle = {
	text?: string;
	measure?: (width: number) => LayoutTextMeasureResult;
	padding?: number;
	paddingLeft?: number;
	paddingRight?: number;
	paddingTop?: number;
	paddingBottom?: number;
	borderWidth?: number;
	borderLeftWidth?: number;
	borderRightWidth?: number;
	borderTopWidth?: number;
	borderBottomWidth?: number;
	[key: string]: unknown;
};

export type LayoutMiniAppNode = LayoutNode & {
	containerType?: string;
	styles?: Record<string, unknown>;
	flags?: number;
	bounds?: {left: number; top: number; width: number; height: number};
	textNodes?: SerializedTextNode[];
	elements?: LayoutMiniAppNode[];
	src?: string;
	intrinsicWidth?: number;
	intrinsicHeight?: number;
	value?: number;
	start?: number;
	reversed?: boolean;
	tree?: LayoutMiniAppNode;
	canvas?: HTMLCanvasElement;
	svg?: string;
};

const getBounds = (node: LayoutMiniAppNode) => node.layout ?? node.bounds ?? {left: 0, top: 0, width: 0, height: 0};

const getStyleNumber = (style: LayoutStyle | undefined, key: keyof LayoutStyle): number => {
	const value = style && style[key];
	return typeof value === 'number' && isFinite(value) ? value : 0;
};

const getContentOffset = (node: LayoutMiniAppNode): {left: number; top: number} => {
	const style = node.style as LayoutStyle | undefined;
	const padding = getStyleNumber(style, 'padding');
	const paddingLeft = getStyleNumber(style, 'paddingLeft') || padding;
	const paddingTop = getStyleNumber(style, 'paddingTop') || padding;
	const borderWidth = getStyleNumber(style, 'borderWidth');
	const borderLeftWidth = getStyleNumber(style, 'borderLeftWidth') || borderWidth;
	const borderTopWidth = getStyleNumber(style, 'borderTopWidth') || borderWidth;

	return {
		left: paddingLeft + borderLeftWidth,
		top: paddingTop + borderTopWidth
	};
};

const getChildren = (node: LayoutMiniAppNode): LayoutMiniAppNode[] =>
	Array.isArray(node.children) ? (node.children as LayoutMiniAppNode[]) : [];

const buildTextNodes = (node: LayoutMiniAppNode): SerializedTextNode[] => {
	const style = node.style as LayoutStyle | undefined;
	const text = typeof style?.text === 'string' ? style.text : '';
	const measure = style?.measure;
	if (!text || typeof measure !== 'function') {
		return [];
	}

	const bounds = getBounds(node);
	const measured = measure(Math.max(0, bounds.width || 0));
	const contentOffset = getContentOffset(node);

	return [
		{
			text,
			textBounds: measured.lines.map((line) => ({
				text: line.text,
				bounds: serializeBounds({
					left: bounds.left + contentOffset.left + line.x,
					top: bounds.top + contentOffset.top + line.y,
					width: line.width,
					height: line.height
				})
			}))
		}
	];
};

const serializeLayoutNode = (node: LayoutMiniAppNode): SerializedMiniAppContainer => {
	const children = getChildren(node).map(serializeLayoutNode);
	const textNodes = Array.isArray(node.textNodes) && node.textNodes.length > 0 ? node.textNodes : buildTextNodes(node);
	const bounds = getBounds(node);

	const serialized = serializeMiniAppContainer({
		containerType: node.containerType ?? 'element',
		flags: typeof node.flags === 'number' ? node.flags : 0,
		bounds: serializeBounds(bounds),
		styles: (node.styles ?? node.style ?? {}) as never,
		textNodes,
		elements: children,
		src: node.src,
		intrinsicWidth: node.intrinsicWidth,
		intrinsicHeight: node.intrinsicHeight,
		value: node.value,
		start: node.start,
		reversed: node.reversed,
		tree: node.tree ? serializeLayoutNode(node.tree) : undefined,
		canvas: node.canvas,
		svg: node.svg
	});

	return serialized;
};

export const layoutToMiniAppRenderInput = (input: {
	renderOptions: MiniAppRenderInputSource['renderOptions'];
	windowBounds: MiniAppRenderInputSource['windowBounds'];
	environment: MiniAppRenderInputSource['environment'];
	root: LayoutMiniAppNode;
	selector?: string;
}): MiniAppRenderInput => ({
	selector: input.selector,
	renderOptions: {
		...input.renderOptions,
		canvas: input.renderOptions.canvas ? {...input.renderOptions.canvas} : undefined
	},
	windowBounds: serializeBounds(input.windowBounds),
	environment: {...input.environment},
	root: serializeLayoutNode(input.root)
});
