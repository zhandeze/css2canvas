import type {CSSValue} from '../css/syntax/parser';
import {FLAG_INTEGER, FLAG_NUMBER, TokenType} from '../css/syntax/tokenizer';
import type {DimensionToken, NumberValueToken, StringValueToken} from '../css/syntax/tokenizer';
import {BACKGROUND_CLIP} from '../css/property-descriptors/background-clip';
import {BACKGROUND_ORIGIN} from '../css/property-descriptors/background-origin';
import {BACKGROUND_REPEAT} from '../css/property-descriptors/background-repeat';
import {BORDER_STYLE} from '../css/property-descriptors/border-style';
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
import type {MiniAppSerializedStyleDeclaration} from '../css';
import {BLACK_MINIAPP_COLOR, parseColor, TRANSPARENT_MINIAPP_COLOR} from './color';
import {serializeBounds, serializeMiniAppContainer} from './render-input';
import type {
  MiniAppRenderInput,
  MiniAppRenderInputSource,
  SerializedMiniAppContainer,
  SerializedStyles,
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
  backgroundColor?: string;
  borderColor?: string;
  borderLeftColor?: string;
  borderRightColor?: string;
  borderTopColor?: string;
  borderBottomColor?: string;
  borderStyle?: string;
  borderLeftStyle?: string;
  borderRightStyle?: string;
  borderTopStyle?: string;
  borderBottomStyle?: string;
  color?: string;
  direction?: 'ltr' | 'rtl' | 'inherit';
  display?: string;
  float?: string;
  fontFamily?: string;
  fontSize?: number | string;
  fontStyle?: string;
  fontWeight?: number | string;
  letterSpacing?: number;
  lineHeight?: number | string;
  listStyleType?: string;
  opacity?: number;
  position?: string;
  text?: string;
  textAlign?: string;
  textDecoration?: string | string[];
  textDecorationColor?: string;
  visibility?: string;
  webkitTextStrokeColor?: string;
  webkitTextStrokeWidth?: number;
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

const DEFAULT_OFFSET: AbsoluteOffset = {left: 0, top: 0};

const AUTO_BACKGROUND_SIZE: StringValueToken = {
  type: TokenType.IDENT_TOKEN,
  value: 'auto'
};

const DEFAULT_FONT_FAMILY = 'sans-serif';
const DEFAULT_FONT_SIZE = 16;

const INHERITED_STYLE_KEYS = [
  'color',
  'direction',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'listStyleType',
  'textAlign'
] as const;

const getLocalBounds = (node: LayoutMiniAppNode): BoundsLike => {
  const bounds = node.layout ?? node.bounds;

  if (!bounds) {
    return {left: 0, top: 0, width: 0, height: 0};
  }

  return {
    left: typeof bounds.left === 'number' ? bounds.left : 0,
    top: typeof bounds.top === 'number' ? bounds.top : 0,
    width: typeof bounds.width === 'number' ? bounds.width : 0,
    height: typeof bounds.height === 'number' ? bounds.height : 0
  };
};

const getAbsoluteBounds = (node: LayoutMiniAppNode, offset: AbsoluteOffset): BoundsLike => {
  const bounds = getLocalBounds(node);

  return {
    left: offset.left + bounds.left,
    top: offset.top + bounds.top,
    width: bounds.width,
    height: bounds.height
  };
};

const getStyleNumber = (style: LayoutStyle | undefined, key: keyof LayoutStyle): number => {
  const value = style && style[key];
  if (typeof value === 'number' && isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized.endsWith('px')) {
      const parsed = Number.parseFloat(normalized.slice(0, -2));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getContentOffset = (style: LayoutStyle | undefined): {left: number; top: number; right: number; bottom: number} => {
  const padding = getStyleNumber(style, 'padding');
  const paddingLeft = getStyleNumber(style, 'paddingLeft') || padding;
  const paddingRight = getStyleNumber(style, 'paddingRight') || padding;
  const paddingTop = getStyleNumber(style, 'paddingTop') || padding;
  const paddingBottom = getStyleNumber(style, 'paddingBottom') || padding;
  const borderWidth = getStyleNumber(style, 'borderWidth');
  const borderLeftWidth = getStyleNumber(style, 'borderLeftWidth') || borderWidth;
  const borderRightWidth = getStyleNumber(style, 'borderRightWidth') || borderWidth;
  const borderTopWidth = getStyleNumber(style, 'borderTopWidth') || borderWidth;
  const borderBottomWidth = getStyleNumber(style, 'borderBottomWidth') || borderWidth;

  return {
    left: paddingLeft + borderLeftWidth,
    top: paddingTop + borderTopWidth,
    right: paddingRight + borderRightWidth,
    bottom: paddingBottom + borderBottomWidth
  };
};

const getChildren = (node: LayoutMiniAppNode): LayoutMiniAppNode[] =>
  Array.isArray(node.children) ? (node.children as LayoutMiniAppNode[]) : [];

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
  const fontSize =
    typeof value === 'number' && Number.isFinite(value) && value > 0
      ? value
      : typeof value === 'string'
      ? getStyleNumber({fontSize: value}, 'fontSize')
      : 0;

  return toPx(fontSize > 0 ? fontSize : DEFAULT_FONT_SIZE);
};

const toFontWeight = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim().toLowerCase() === 'bold' ? 700 : Number.parseFloat(value) || 400;
  }
  return 400;
};

const toFontStyle = (value: unknown): FONT_STYLE => {
  return value === 'italic' ? FONT_STYLE.ITALIC : value === 'oblique' ? FONT_STYLE.OBLIQUE : FONT_STYLE.NORMAL;
};

const toLineHeight = (value: unknown): CSSValue => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value <= 4 ? toNumberToken(value) : toPx(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'normal') {
      return {type: TokenType.IDENT_TOKEN, value: 'normal'};
    }
    if (normalized.endsWith('px')) {
      const pxValue = Number.parseFloat(normalized.slice(0, -2));
      if (Number.isFinite(pxValue) && pxValue > 0) {
        return toPx(pxValue);
      }
    }
    const numericValue = Number.parseFloat(normalized);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue <= 4 ? toNumberToken(numericValue) : toPx(numericValue);
    }
  }

  return {type: TokenType.IDENT_TOKEN, value: 'normal'};
};

const toBorderStyle = (value: unknown, width: number): BORDER_STYLE => {
  if (typeof value === 'string') {
    switch (value.trim().toLowerCase()) {
      case 'none':
        return BORDER_STYLE.NONE;
      case 'dashed':
        return BORDER_STYLE.DASHED;
      case 'dotted':
        return BORDER_STYLE.DOTTED;
      case 'double':
        return BORDER_STYLE.DOUBLE;
      default:
        return BORDER_STYLE.SOLID;
    }
  }

  return width > 0 ? BORDER_STYLE.SOLID : BORDER_STYLE.NONE;
};

const toDirection = (value: unknown): DIRECTION => (value === 'rtl' ? DIRECTION.RTL : DIRECTION.LTR);

const toDisplay = (value: unknown, containerType: string): number => {
  if (containerType === 'li') {
    return DISPLAY.LIST_ITEM;
  }

  if (typeof value === 'string') {
    switch (value.trim().toLowerCase()) {
      case 'none':
        return DISPLAY.NONE;
      case 'inline':
        return DISPLAY.INLINE;
      case 'inline-block':
        return DISPLAY.INLINE_BLOCK;
      case 'inline-flex':
        return DISPLAY.INLINE_FLEX;
      case 'flex':
        return DISPLAY.FLEX;
      case 'list-item':
        return DISPLAY.LIST_ITEM;
      default:
        return DISPLAY.BLOCK;
    }
  }

  return DISPLAY.BLOCK;
};

const toFloat = (value: unknown): FLOAT => {
  switch (value) {
    case 'left':
      return FLOAT.LEFT;
    case 'right':
      return FLOAT.RIGHT;
    case 'inline-start':
      return FLOAT.INLINE_START;
    case 'inline-end':
      return FLOAT.INLINE_END;
    default:
      return FLOAT.NONE;
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
    case 'sticky':
      return POSITION.STICKY;
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

const toVisibility = (value: unknown): VISIBILITY => {
  switch (value) {
    case 'hidden':
      return VISIBILITY.HIDDEN;
    case 'collapse':
      return VISIBILITY.COLLAPSE;
    default:
      return VISIBILITY.VISIBLE;
  }
};

const toListStyleType = (value: unknown): LIST_STYLE_TYPE => {
  switch (value) {
    case 'disc':
      return LIST_STYLE_TYPE.DISC;
    case 'circle':
      return LIST_STYLE_TYPE.CIRCLE;
    case 'square':
      return LIST_STYLE_TYPE.SQUARE;
    case 'decimal':
      return LIST_STYLE_TYPE.DECIMAL;
    case 'decimal-leading-zero':
      return LIST_STYLE_TYPE.DECIMAL_LEADING_ZERO;
    case 'lower-roman':
      return LIST_STYLE_TYPE.LOWER_ROMAN;
    case 'upper-roman':
      return LIST_STYLE_TYPE.UPPER_ROMAN;
    case 'lower-alpha':
      return LIST_STYLE_TYPE.LOWER_ALPHA;
    case 'upper-alpha':
      return LIST_STYLE_TYPE.UPPER_ALPHA;
    case 'none':
      return LIST_STYLE_TYPE.NONE;
    default:
      return LIST_STYLE_TYPE.NONE;
  }
};

const resolveInheritedStyle = (
  style: LayoutStyle | undefined,
  inherited: LayoutStyle | undefined
): LayoutStyle | undefined => {
  if (!style && !inherited) {
    return undefined;
  }

  const resolved: LayoutStyle = {...style};

  if (inherited) {
    for (const key of INHERITED_STYLE_KEYS) {
      if (typeof resolved[key] === 'undefined' && typeof inherited[key] !== 'undefined') {
        resolved[key] = inherited[key] as never;
      }
    }
  }

  return resolved;
};

const isSerializedStyles = (value: unknown): value is MiniAppSerializedStyleDeclaration => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {backgroundClip?: unknown; display?: unknown; fontFamily?: unknown};
  return Array.isArray(candidate.backgroundClip) && typeof candidate.display === 'number' && Array.isArray(candidate.fontFamily);
};

const createSerializedStyles = (
  style: LayoutStyle | undefined,
  containerType: string
): SerializedStyles => {
  const fontSize = toFontSize(style?.fontSize);
  const direction = toDirection(style?.direction);
  const textColor = toColor(style?.color, BLACK_MINIAPP_COLOR);
  const borderColor = toColor(style?.borderColor, textColor);
  const borderLeftWidth = getStyleNumber(style, 'borderLeftWidth') || getStyleNumber(style, 'borderWidth');
  const borderRightWidth = getStyleNumber(style, 'borderRightWidth') || getStyleNumber(style, 'borderWidth');
  const borderTopWidth = getStyleNumber(style, 'borderTopWidth') || getStyleNumber(style, 'borderWidth');
  const borderBottomWidth = getStyleNumber(style, 'borderBottomWidth') || getStyleNumber(style, 'borderWidth');

  return {
    backgroundClip: [BACKGROUND_CLIP.BORDER_BOX],
    backgroundColor: toColor(style?.backgroundColor, TRANSPARENT_MINIAPP_COLOR),
    backgroundImage: [],
    backgroundOrigin: [BACKGROUND_ORIGIN.PADDING_BOX],
    backgroundPosition: [[toNumberToken(0), toNumberToken(0)]],
    backgroundRepeat: [BACKGROUND_REPEAT.REPEAT],
    backgroundSize: [[AUTO_BACKGROUND_SIZE]],
    borderTopColor: toColor(style?.borderTopColor, borderColor),
    borderRightColor: toColor(style?.borderRightColor, borderColor),
    borderBottomColor: toColor(style?.borderBottomColor, borderColor),
    borderLeftColor: toColor(style?.borderLeftColor, borderColor),
    borderTopLeftRadius: [toNumberToken(0), toNumberToken(0)],
    borderTopRightRadius: [toNumberToken(0), toNumberToken(0)],
    borderBottomRightRadius: [toNumberToken(0), toNumberToken(0)],
    borderBottomLeftRadius: [toNumberToken(0), toNumberToken(0)],
    borderTopStyle: toBorderStyle(style?.borderTopStyle ?? style?.borderStyle, borderTopWidth),
    borderRightStyle: toBorderStyle(style?.borderRightStyle ?? style?.borderStyle, borderRightWidth),
    borderBottomStyle: toBorderStyle(style?.borderBottomStyle ?? style?.borderStyle, borderBottomWidth),
    borderLeftStyle: toBorderStyle(style?.borderLeftStyle ?? style?.borderStyle, borderLeftWidth),
    borderTopWidth,
    borderRightWidth,
    borderBottomWidth,
    borderLeftWidth,
    boxShadow: [],
    color: textColor,
    direction,
    display: toDisplay(style?.display, containerType),
    float: toFloat(style?.float),
    fontFamily: toFontFamily(style?.fontFamily),
    fontSize,
    fontStyle: toFontStyle(style?.fontStyle),
    fontVariant: ['normal'],
    fontWeight: toFontWeight(style?.fontWeight),
    letterSpacing: getStyleNumber(style, 'letterSpacing'),
    lineHeight: toLineHeight(style?.lineHeight),
    listStyleImage: null,
    listStyleType: toListStyleType(style?.listStyleType),
    opacity: typeof style?.opacity === 'number' && Number.isFinite(style.opacity) ? style.opacity : 1,
    overflowX: OVERFLOW.VISIBLE,
    paddingTop: toPx(getStyleNumber(style, 'paddingTop') || getStyleNumber(style, 'padding')),
    paddingRight: toPx(getStyleNumber(style, 'paddingRight') || getStyleNumber(style, 'padding')),
    paddingBottom: toPx(getStyleNumber(style, 'paddingBottom') || getStyleNumber(style, 'padding')),
    paddingLeft: toPx(getStyleNumber(style, 'paddingLeft') || getStyleNumber(style, 'padding')),
    paintOrder: [PAINT_ORDER_LAYER.FILL, PAINT_ORDER_LAYER.STROKE, PAINT_ORDER_LAYER.MARKERS],
    position: toPosition(style?.position),
    textAlign: toTextAlign(style?.textAlign, direction),
    textDecorationColor: toColor(style?.textDecorationColor, textColor),
    textDecorationLine: toTextDecorationLine(style?.textDecoration),
    textShadow: [],
    transform: null,
    transformOrigin: [toNumberToken(0), toNumberToken(0)],
    visibility: toVisibility(style?.visibility),
    webkitTextStrokeColor: toColor(style?.webkitTextStrokeColor, textColor),
    webkitTextStrokeWidth: getStyleNumber(style, 'webkitTextStrokeWidth'),
    zIndex: {auto: true, order: 0}
  };
};

const buildTextNodes = (
  style: LayoutStyle | undefined,
  absoluteBounds: BoundsLike
): SerializedTextNode[] => {
  const text = typeof style?.text === 'string' ? style.text : '';
  const measure = style?.measure;
  if (!text || typeof measure !== 'function') {
    return [];
  }

  const contentOffset = getContentOffset(style);
  const contentWidth = Math.max(0, absoluteBounds.width - contentOffset.left - contentOffset.right);
  const measured = measure(contentWidth);

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

const inferContainerType = (node: LayoutMiniAppNode): string => {
  if (typeof node.containerType === 'string') {
    return node.containerType;
  }
  if (typeof node.src === 'string') {
    return 'image';
  }
  if (typeof node.start === 'number' || typeof node.reversed === 'boolean') {
    return 'ol';
  }
  if (typeof node.value === 'number') {
    return 'li';
  }
  return 'element';
};

const serializeLayoutNode = (
  node: LayoutMiniAppNode,
  inheritedStyle?: LayoutStyle,
  parentOffset: AbsoluteOffset = DEFAULT_OFFSET
): SerializedMiniAppContainer => {
  const resolvedStyle = resolveInheritedStyle(node.style as LayoutStyle | undefined, inheritedStyle);
  const absoluteBounds = getAbsoluteBounds(node, parentOffset);
  const containerType = inferContainerType(node);
  const children = getChildren(node).map((child) =>
    serializeLayoutNode(child, resolvedStyle, {left: absoluteBounds.left, top: absoluteBounds.top})
  );
  const textNodes =
    Array.isArray(node.textNodes) && node.textNodes.length > 0
      ? node.textNodes
      : buildTextNodes(resolvedStyle, absoluteBounds);
  const styles = isSerializedStyles(node.styles)
    ? (node.styles as MiniAppSerializedStyleDeclaration)
    : createSerializedStyles(resolvedStyle, containerType);

  const serialized = serializeMiniAppContainer({
    containerType,
    flags: typeof node.flags === 'number' ? node.flags : 0,
    bounds: serializeBounds(absoluteBounds),
    styles,
    textNodes,
    elements: children,
    src: node.src,
    intrinsicWidth: node.intrinsicWidth,
    intrinsicHeight: node.intrinsicHeight,
    value: node.value,
    start: node.start,
    reversed: node.reversed,
    tree: node.tree ? serializeLayoutNode(node.tree, resolvedStyle, {left: absoluteBounds.left, top: absoluteBounds.top}) : undefined,
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
