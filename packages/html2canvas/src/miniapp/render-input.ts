import type {MiniAppSerializedStyleDeclaration} from '../css';
import {BACKGROUND_CLIP} from '../css/property-descriptors/background-clip';
import {BACKGROUND_ORIGIN} from '../css/property-descriptors/background-origin';
import {BORDER_STYLE} from '../css/property-descriptors/border-style';
import {BACKGROUND_REPEAT} from '../css/property-descriptors/background-repeat';
import {DIRECTION} from '../css/property-descriptors/direction';
import {DISPLAY} from '../css/property-descriptors/display';
import {FLOAT} from '../css/property-descriptors/float';
import {FONT_STYLE} from '../css/property-descriptors/font-style';
import {LIST_STYLE_TYPE} from '../css/property-descriptors/list-style-type';
import {OVERFLOW} from '../css/property-descriptors/overflow';
import {PAINT_ORDER_LAYER} from '../css/property-descriptors/paint-order';
import {POSITION} from '../css/property-descriptors/position';
import {TEXT_ALIGN} from '../css/property-descriptors/text-align';
import {TEXT_DECORATION_LINE} from '../css/property-descriptors/text-decoration-line';
import {VISIBILITY} from '../css/property-descriptors/visibility';
import type {CSSValue} from '../css/syntax/parser';
import {FLAG_INTEGER, FLAG_NUMBER, TokenType} from '../css/syntax/tokenizer';
import type {DimensionToken, NumberValueToken, StringValueToken} from '../css/syntax/tokenizer';
import type {Bounds} from '../css/layout/bounds';
import type {Color} from '../css/types/color';
import type {ComputedLayoutNode} from '../layout';
import type {RenderWindowBounds} from '../render/render-context';
import {BLACK_MINIAPP_COLOR, parseColor, TRANSPARENT_MINIAPP_COLOR} from './color';
import { WORD_BREAK } from '../css/property-descriptors/word-break';

type MethodKeys<T> = {
  [K in keyof T]-?: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type DataOnly<T> = Omit<T, MethodKeys<T>>;

type AbsoluteOffset = {
  left: number;
  top: number;
};

type BoundsLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type TextMeasureLine = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
type TextMeasureResult = {
  width: number;
  height: number;
  lineCount?: number;
  lines: TextMeasureLine[];
};

type SerializedLayoutNode = {
  absoluteBounds: BoundsLike;
  container: SerializedMiniAppContainer;
};

const DEFAULT_OFFSET: AbsoluteOffset = {left: 0, top: 0};
const DEFAULT_FONT_FAMILY = 'sans-serif';
const DEFAULT_FONT_SIZE = 16;
const DEFAULT_RENDER_SCALE = 1;
const AUTO_BACKGROUND_SIZE: StringValueToken = {
  type: TokenType.IDENT_TOKEN,
  value: 'auto'
};

const INHERITED_STYLE_KEYS = [
  'color',
  'direction',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'textAlign'
] as const;

export const DEFAULT_MINIAPP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';
export const DEFAULT_MINIAPP_USE_MITER_TEXT_STROKE = true;

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
export type MiniAppLayoutContainerType = 'element' | 'image';

export interface SerializedContainerBase {
  flags: number;
  bounds: SerializedBounds;
  styles: SerializedStyles;
  textNodes: SerializedTextNode[];
  elements: SerializedMiniAppContainer[];
  tree?: SerializedMiniAppContainer;
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

export type SerializedMiniAppContainer = SerializedElementContainer | SerializedImageContainer;

export interface MiniAppRenderOptionsInput {
  backgroundColor: Color | null;
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
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

const clonePlain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const parseNumericValue = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const parsed = normalized.endsWith('px') ? Number.parseFloat(normalized.slice(0, -2)) : Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
};

const getNumber = (value: unknown, fallback = 0): number => parseNumericValue(value) ?? fallback;

const getLocalBounds = (node: ComputedLayoutNode): BoundsLike => {
  const bounds = node.layout;

  if (!bounds) {
    return {left: 0, top: 0, width: 0, height: 0};
  }

  return {
    left: getNumber(bounds.left),
    top: getNumber(bounds.top),
    width: getNumber(bounds.width),
    height: getNumber(bounds.height)
  };
};

const getAbsoluteBounds = (node: ComputedLayoutNode, offset: AbsoluteOffset): BoundsLike => {
  const bounds = getLocalBounds(node);

  return {
    left: offset.left + bounds.left,
    top: offset.top + bounds.top,
    width: bounds.width,
    height: bounds.height
  };
};

const getContentOffset = (
  style: ComputedLayoutNode['style'] | undefined
): {left: number; top: number; right: number; bottom: number} => {
  const padding = style?.padding ?? 0;
  const paddingLeft = style?.paddingLeft ?? padding;
  const paddingRight = style?.paddingRight ?? padding;
  const paddingTop = style?.paddingTop ?? padding;
  const paddingBottom = style?.paddingBottom ?? padding;
  const borderWidth = style?.borderWidth ?? 0;
  const borderLeftWidth = style?.borderLeftWidth ?? borderWidth;
  const borderRightWidth = style?.borderRightWidth ?? borderWidth;
  const borderTopWidth = style?.borderTopWidth ?? borderWidth;
  const borderBottomWidth = style?.borderBottomWidth ?? borderWidth;

  return {
    left: paddingLeft + borderLeftWidth,
    top: paddingTop + borderTopWidth,
    right: paddingRight + borderRightWidth,
    bottom: paddingBottom + borderBottomWidth
  };
};

const toFlags = (value: number): number => (Number.isInteger(value) ? FLAG_INTEGER : FLAG_NUMBER);

const toNumberToken = (value: number): NumberValueToken => ({
  type: TokenType.NUMBER_TOKEN,
  number: value,
  flags: toFlags(value)
});

const toPx = (value: number): DimensionToken => ({
  type: TokenType.DIMENSION_TOKEN,
  number: value,
  flags: toFlags(value),
  unit: 'px'
});

const toColor = (value: unknown, fallback = TRANSPARENT_MINIAPP_COLOR): number => {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }

  try {
    return parseColor(value);
  } catch {
    return fallback;
  }
};

const toFontFamily = (value: unknown): string[] => {
  if (typeof value !== 'string' || value.trim() === '') {
    return [DEFAULT_FONT_FAMILY];
  }

  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      if ((part.startsWith("'") && part.endsWith("'")) || (part.startsWith('"') && part.endsWith('"'))) {
        return part;
      }

      return part.includes(' ') ? `'${part}'` : part;
    });
};

const toFontSize = (value: unknown): DimensionToken => {
  const fontSize = getNumber(value, DEFAULT_FONT_SIZE);
  return toPx(fontSize > 0 ? fontSize : DEFAULT_FONT_SIZE);
};

const toFontWeight = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim().toLowerCase() === 'bold' ? 700 : getNumber(value, 400);
  }

  return 400;
};

const toFontStyle = (value: unknown): FONT_STYLE =>
  value === 'italic' ? FONT_STYLE.ITALIC : value === 'oblique' ? FONT_STYLE.OBLIQUE : FONT_STYLE.NORMAL;

const toLineHeight = (value: unknown): CSSValue => {
  const numericValue = parseNumericValue(value);

  if (typeof numericValue === 'number' && numericValue > 0) {
    return numericValue <= 4 ? toNumberToken(numericValue) : toPx(numericValue);
  }

  if (typeof value === 'string' && value.trim().toLowerCase() === 'normal') {
    return {type: TokenType.IDENT_TOKEN, value: 'normal'};
  }

  return {type: TokenType.IDENT_TOKEN, value: 'normal'};
};

const toDirection = (value: unknown): DIRECTION => (value === 'rtl' ? DIRECTION.RTL : DIRECTION.LTR);

const toOverflow = (value: unknown): OVERFLOW => {
  switch (value) {
    case 'hidden':
      return OVERFLOW.HIDDEN;
    case 'scroll':
      return OVERFLOW.SCROLL;
    case 'clip':
      return OVERFLOW.CLIP;
    case 'auto':
      return OVERFLOW.AUTO;
    default:
      return OVERFLOW.VISIBLE;
  }
};

const toPosition = (value: unknown): POSITION => {
  switch (value) {
    case 'relative':
      return POSITION.RELATIVE;
    case 'absolute':
      return POSITION.ABSOLUTE;
    case 'fixed':
      return POSITION.FIXED;
    default:
      return POSITION.STATIC;
  }
};

const toTextAlign = (value: unknown, direction: DIRECTION): TEXT_ALIGN => {
  switch (value) {
    case 'center':
    case 'justify':
      return TEXT_ALIGN.CENTER;
    case 'right':
      return TEXT_ALIGN.RIGHT;
    case 'end':
      return direction === DIRECTION.RTL ? TEXT_ALIGN.LEFT : TEXT_ALIGN.RIGHT;
    case 'start':
      return direction === DIRECTION.RTL ? TEXT_ALIGN.RIGHT : TEXT_ALIGN.LEFT;
    default:
      return TEXT_ALIGN.LEFT;
  }
};

const toTextDecorationLine = (value: unknown): TEXT_DECORATION_LINE[] => {
  const entries = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\s+/) : [];
  const lines: TEXT_DECORATION_LINE[] = [];

  for (const entry of entries) {
    switch (entry) {
      case 'underline':
        lines.push(TEXT_DECORATION_LINE.UNDERLINE);
        break;
      case 'overline':
        lines.push(TEXT_DECORATION_LINE.OVERLINE);
        break;
      case 'line-through':
        lines.push(TEXT_DECORATION_LINE.LINE_THROUGH);
        break;
    }
  }

  return lines;
};

const toZIndex = (value: unknown): {auto: boolean; order: number} => {
  if (value && typeof value === 'object') {
    const auto = Reflect.get(value, 'auto');
    const order = Reflect.get(value, 'order');

    if (typeof auto === 'boolean' && typeof order === 'number') {
      return {
        auto,
        order
      };
    }
  }

  const order = parseNumericValue(value);
  if (typeof order === 'number') {
    return {
      auto: false,
      order
    };
  }

  return {
    auto: true,
    order: 0
  };
};

const resolveInheritedStyle = (
  style: ComputedLayoutNode['style'] | undefined,
  inherited: ComputedLayoutNode['style'] | undefined
): ComputedLayoutNode['style'] | undefined => {
  if (!style && !inherited) {
    return undefined;
  }

  const resolved = {...style};

  if (inherited) {
    for (const key of INHERITED_STYLE_KEYS) {
      if (typeof resolved[key] === 'undefined' && typeof inherited[key] !== 'undefined') {
        resolved[key] = inherited[key] as never;
      }
    }
  }

  return resolved;
};

const createSerializedStyles = (style: ComputedLayoutNode['style'] | undefined): SerializedStyles => {
  const fontSize = toFontSize(style?.fontSize);
  const direction = toDirection(style?.direction);
  const textColor = toColor(style?.color, BLACK_MINIAPP_COLOR);
  const borderWidth = style?.borderWidth ?? 0;
  const borderLeftWidth = style?.borderLeftWidth ?? borderWidth;
  const borderRightWidth = style?.borderRightWidth ?? borderWidth;
  const borderTopWidth = style?.borderTopWidth ?? borderWidth;
  const borderBottomWidth = style?.borderBottomWidth ?? borderWidth;
  const padding = style?.padding ?? 0;

  return {
    backgroundClip: [BACKGROUND_CLIP.BORDER_BOX], // 待确认
    backgroundColor: TRANSPARENT_MINIAPP_COLOR, // 待确认
    backgroundImage: [], // 待确认
    backgroundOrigin: [BACKGROUND_ORIGIN.PADDING_BOX], // 待确认
    backgroundPosition: [[toNumberToken(0), toNumberToken(0)]], // 待确认
    backgroundRepeat: [BACKGROUND_REPEAT.REPEAT], // 待确认
    backgroundSize: [[AUTO_BACKGROUND_SIZE]], // 待确认
    borderTopColor: textColor, // 待确认
    borderRightColor: textColor, // 待确认
    borderBottomColor: textColor, // 待确认
    borderLeftColor: textColor, // 待确认
    borderTopLeftRadius: [toNumberToken(0), toNumberToken(0)], // 待确认
    borderTopRightRadius: [toNumberToken(0), toNumberToken(0)], // 待确认
    borderBottomRightRadius: [toNumberToken(0), toNumberToken(0)], // 待确认
    borderBottomLeftRadius: [toNumberToken(0), toNumberToken(0)], // 待确认
    borderTopStyle: borderTopWidth > 0 ? BORDER_STYLE.SOLID : BORDER_STYLE.NONE, // 待确认
    borderRightStyle: borderRightWidth > 0 ? BORDER_STYLE.SOLID : BORDER_STYLE.NONE, // 待确认
    borderBottomStyle: borderBottomWidth > 0 ? BORDER_STYLE.SOLID : BORDER_STYLE.NONE, // 待确认
    borderLeftStyle: borderLeftWidth > 0 ? BORDER_STYLE.SOLID : BORDER_STYLE.NONE, // 待确认
    borderTopWidth,
    borderRightWidth,
    borderBottomWidth,
    borderLeftWidth,
    boxShadow: [], // 待确认
    color: textColor,
    direction,
    display: DISPLAY.BLOCK, // 待确认
    float: FLOAT.NONE,
    fontFamily: toFontFamily(style?.fontFamily),
    fontSize,
    fontStyle: toFontStyle(style?.fontStyle),
    fontVariant: ['normal'], // 待确认
    fontWeight: toFontWeight(style?.fontWeight),
    letterSpacing: style?.letterSpacing ?? 0,
    lineHeight: toLineHeight(style?.lineHeight),
    listStyleImage: null, // 待确认
    listStyleType: LIST_STYLE_TYPE.NONE, // 待确认
    opacity: 1, // 待确认
    overflowX: toOverflow(style?.overflowX ?? style?.overflow),
    paddingTop: toPx(style?.paddingTop ?? padding),
    paddingRight: toPx(style?.paddingRight ?? padding),
    paddingBottom: toPx(style?.paddingBottom ?? padding),
    paddingLeft: toPx(style?.paddingLeft ?? padding),
    paintOrder: [PAINT_ORDER_LAYER.FILL, PAINT_ORDER_LAYER.STROKE, PAINT_ORDER_LAYER.MARKERS], // 待确认
    position: toPosition(style?.position),
    textAlign: toTextAlign(style?.textAlign, direction),
    textDecorationColor: toColor(style?.textDecorationColor, textColor),
    textDecorationLine: toTextDecorationLine(style?.textDecoration),
    textShadow: [], // 待确认
    transform: null, // 待确认
    transformOrigin: [toNumberToken(0), toNumberToken(0)], // 待确认
    visibility: VISIBILITY.VISIBLE, // 待确认
    webkitTextStrokeColor: textColor, // 待确认
    webkitTextStrokeWidth: 0, // 待确认
    wordBreak: WORD_BREAK.NORMAL,
    zIndex: toZIndex(style?.zIndex)
  };
};

const isTextMeasureLine = (value: unknown): value is TextMeasureLine => {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof Reflect.get(value, 'text') === 'string' &&
    typeof Reflect.get(value, 'x') === 'number' &&
    typeof Reflect.get(value, 'y') === 'number' &&
    typeof Reflect.get(value, 'width') === 'number' &&
    typeof Reflect.get(value, 'height') === 'number'
  );
};

const isTextMeasureResult = (value: unknown): value is TextMeasureResult => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const lines = Reflect.get(value, 'lines');
  return Array.isArray(lines) && lines.every(isTextMeasureLine);
};

const buildTextNodes = (
  style: ComputedLayoutNode['style'] | undefined,
  absoluteBounds: BoundsLike
): SerializedTextNode[] => {
  const text = typeof style?.text === 'string' ? style.text : '';
  const measure = style?.measure;

  if (!text) {
    return [];
  }

  if (typeof measure !== 'function') {
    return []; // 待确认
  }

  const contentOffset = getContentOffset(style);
  const contentWidth = Math.max(0, absoluteBounds.width - contentOffset.left - contentOffset.right);
  const measured = measure(contentWidth);

  if (!isTextMeasureResult(measured) || measured.lines.length === 0) {
    return []; // 待确认
  }

  return [
    {
      text,
      textBounds: measured.lines.map((line) => ({
        text: line.text,
        bounds: serializeBounds({
          left: absoluteBounds.left + contentOffset.left + line.x,
          top: absoluteBounds.top + contentOffset.top + line.y,
          width: line.width,
          height: line.height
        })
      }))
    }
  ];
};

export const serializeBounds = (
  bounds: Bounds | {left: number; top: number; width: number; height: number}
): SerializedBounds => ({
  left: bounds.left,
  top: bounds.top,
  width: bounds.width,
  height: bounds.height
});

export const serializeTextBounds = (textBounds: {
  text: string;
  bounds: Bounds | SerializedBounds;
}): SerializedTextBounds => ({
  text: textBounds.text,
  bounds: serializeBounds(textBounds.bounds)
});

export const serializeTextNode = (textNode: {
  text: string;
  textBounds: Array<{text: string; bounds: Bounds | SerializedBounds}>;
}): SerializedTextNode => ({
  text: textNode.text,
  textBounds: textNode.textBounds.map(serializeTextBounds)
});

export const normalizeMiniAppContainerType = (containerType?: string): MiniAppLayoutContainerType =>
  containerType === 'image' ? 'image' : 'element';

export const serializeMiniAppContainer = (container: {
  containerType?: MiniAppLayoutContainerType;
  flags: number;
  bounds: SerializedBounds;
  styles: SerializedStyles;
  textNodes: SerializedTextNode[];
  elements: SerializedMiniAppContainer[];
  src?: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  tree?: SerializedMiniAppContainer;
  svg?: string;
}): SerializedMiniAppContainer => {
  const containerType = normalizeMiniAppContainerType(container.containerType);
  const baseContainer = {
    flags: container.flags,
    bounds: container.bounds,
    styles: clonePlain(container.styles),
    textNodes: container.textNodes.map(serializeTextNode),
    elements: container.elements,
    tree: container.tree,
    svg: container.svg
  };

  if (containerType === 'image') {
    return {
      containerType,
      src: container.src ?? '', // 待确认
      intrinsicWidth: typeof container.intrinsicWidth === 'number' ? container.intrinsicWidth : 0, // 待确认
      intrinsicHeight: typeof container.intrinsicHeight === 'number' ? container.intrinsicHeight : 0, // 待确认
      ...baseContainer
    };
  }

  return {
    containerType: 'element',
    ...baseContainer
  };
};

const serializeLayoutNode = (
  node: ComputedLayoutNode,
  inheritedStyle?: ComputedLayoutNode['style'],
  parentOffset: AbsoluteOffset = DEFAULT_OFFSET
): SerializedLayoutNode => {
  const resolvedStyle = resolveInheritedStyle(node.style, inheritedStyle);
  const absoluteBounds = getAbsoluteBounds(node, parentOffset);
  const nextOffset = {left: absoluteBounds.left, top: absoluteBounds.top};
  const children = node.children.map((child) => serializeLayoutNode(child, resolvedStyle, nextOffset).container);
  const textNodes = buildTextNodes(resolvedStyle, absoluteBounds);
  const styles = createSerializedStyles(resolvedStyle);

  return {
    absoluteBounds,
    container: serializeMiniAppContainer({
      containerType: 'element', // 待确认
      flags: 0, // 待确认
      bounds: serializeBounds(absoluteBounds),
      styles,
      textNodes,
      elements: children,
      tree: undefined, // 待确认
      svg: undefined // 待确认
    })
  };
};

const createDefaultRenderOptions = (bounds: BoundsLike): MiniAppRenderOptionsInput => {
  const width = Math.max(0, Math.ceil(bounds.width));
  const height = Math.max(0, Math.ceil(bounds.height));

  return {
    backgroundColor: null, // 待确认
    scale: DEFAULT_RENDER_SCALE, // 待确认
    x: bounds.left,
    y: bounds.top,
    width,
    height
  };
};

const createDefaultWindowBounds = (bounds: BoundsLike): RenderWindowBounds => {
  const width = Math.max(0, Math.ceil(bounds.width));
  const height = Math.max(0, Math.ceil(bounds.height));

  return {
    left: bounds.left,
    top: bounds.top,
    width,
    height
  };
};

const createDefaultEnvironment = (): MiniAppRenderEnvironmentInput => ({
  userAgent: DEFAULT_MINIAPP_USER_AGENT, // 待确认
  useMiterTextStroke: DEFAULT_MINIAPP_USE_MITER_TEXT_STROKE // 待确认
});

export const layoutToMiniAppRenderInput = (root: ComputedLayoutNode): MiniAppRenderInput => {
  const serializedRoot = serializeLayoutNode(root);

  return {
    selector: undefined, // 待确认
    renderOptions: createDefaultRenderOptions(serializedRoot.absoluteBounds),
    windowBounds: createDefaultWindowBounds(serializedRoot.absoluteBounds),
    environment: createDefaultEnvironment(),
    root: serializedRoot.container
  };
};
