import {CSSParsedDeclaration} from '../css/index';
import type {TextContainer} from './text-container';
import {Bounds, parseBounds} from '../css/layout/bounds';
import {Context} from '../core/context';
import {DebuggerType, isDebugging} from '../core/debugger';
import {ContainerType, FLAGS} from './container-flags';

export class ElementContainer {
	readonly containerType: ContainerType = 'element';
	readonly styles: CSSParsedDeclaration;
	readonly textNodes: TextContainer[] = [];
	readonly elements: ElementContainer[] = [];
	bounds: Bounds;
	flags = 0;

	constructor(
		protected readonly context: Context,
		element: Element
	) {
		if (isDebugging(element, DebuggerType.PARSE)) {
			debugger;
		}

		this.styles = new CSSParsedDeclaration(context, window.getComputedStyle(element, null));

		if (isHTMLElementNode(element)) {
			if (this.styles.animationDuration.some((duration) => duration > 0)) {
				element.style.animationDuration = '0s';
			}

			if (this.styles.transform !== null) {
				// getBoundingClientRect takes transforms into account
				element.style.transform = 'none';
			}
		}

		this.bounds = parseBounds(this.context, element);

		if (isDebugging(element, DebuggerType.RENDER)) {
			this.flags |= FLAGS.DEBUG_RENDER;
		}
	}
}

const isElementNode = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;
const isSVGElementNode = (element: Element): element is SVGElement =>
	typeof (element as SVGElement).className === 'object';
const isHTMLElementNode = (node: Node): node is HTMLElement =>
	isElementNode(node) && typeof (node as HTMLElement).style !== 'undefined' && !isSVGElementNode(node);
