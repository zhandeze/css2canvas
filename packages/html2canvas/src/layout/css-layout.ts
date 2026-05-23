import {ensureTextMeasure} from './text-layout/measure';
import type {TextMeasure, TextStyleInput} from './text-layout/types';

/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

export type LayoutDirection = 'inherit' | 'ltr' | 'rtl';
export type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
export type JustifyContent = 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
export type AlignContent = 'flex-start' | 'center' | 'flex-end' | 'stretch';
export type AlignItem = 'flex-start' | 'center' | 'flex-end' | 'stretch';
export type PositionType = 'static' | 'relative' | 'absolute' | 'fixed';
export type AxisDimension = 'width' | 'height';
export type Edge = 'left' | 'right' | 'top' | 'bottom';

export interface LayoutZIndex {
  auto: boolean;
  order: number;
}

export interface LayoutBox {
  width: number | undefined;
  height: number | undefined;
  top: number;
  left: number;
  right: number;
  bottom: number;
  direction?: LayoutDirection;
  position?: PositionType;
  zIndex?: LayoutZIndex;
  isFixedStackingContext?: boolean;
}

export interface LayoutClipRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface LayoutMeasureResult {
  width: number;
  height: number;
}

export type LayoutMeasure = TextMeasure | ((width: number) => LayoutMeasureResult);

export interface LayoutCache {
  requestedWidth?: number;
  requestedHeight?: number;
  parentMaxWidth?: number;
  width?: number;
  height?: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  direction?: LayoutDirection;
  position?: PositionType;
  zIndex?: LayoutZIndex;
  isFixedStackingContext?: boolean;
  overflowClip?: LayoutClipRect;
}

export interface LayoutStyle extends TextStyleInput {
  direction?: LayoutDirection;
  flexDirection?: FlexDirection;
  justifyContent?: JustifyContent;
  alignContent?: AlignContent;
  alignItems?: AlignItem;
  alignSelf?: AlignItem;
  position?: PositionType;
  flex?: number;
  flexWrap?: 'wrap';
  width?: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  margin?: number;
  marginLeft?: number;
  marginRight?: number;
  marginTop?: number;
  marginBottom?: number;
  marginStart?: number;
  marginEnd?: number;
  padding?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingStart?: number;
  paddingEnd?: number;
  borderWidth?: number;
  borderLeftWidth?: number;
  borderRightWidth?: number;
  borderTopWidth?: number;
  borderBottomWidth?: number;
  borderStartWidth?: number;
  borderEndWidth?: number;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  inset?: number;
  overflow?: string;
  overflowX?: string;
  overflowY?: string;
  zIndex?: number | 'auto' | LayoutZIndex;
  measure?: LayoutMeasure;
}

export interface LayoutBaseNode {
  layout: LayoutBox;
  style: LayoutStyle;
  isDirty?: boolean;
  shouldUpdate?: boolean;
  lastLayout: LayoutCache | undefined;
  lineIndex?: number;
  overflowClip?: LayoutClipRect;
}

export interface LayoutNode extends LayoutBaseNode {
  children: LayoutNode[];
  nextAbsoluteChild: LayoutNode | null;
  nextFlexChild: LayoutNode | null;
}

export interface ComputedLayoutNode extends LayoutBaseNode {
  children: ComputedLayoutNode[];
  nextAbsoluteChild: ComputedLayoutNode | null;
  nextFlexChild: ComputedLayoutNode | null;
}

interface DimensionMap {
  row: 'width';
  'row-reverse': 'width';
  column: 'height';
  'column-reverse': 'height';
}

interface EdgeMap {
  row: 'left' | 'right';
  'row-reverse': 'left' | 'right';
  column: 'top' | 'bottom';
  'column-reverse': 'top' | 'bottom';
}

type LayoutEngine = {
  layoutNodeImpl(
    layoutContext: LayoutContext,
    node: ComputedLayoutNode,
    parentMaxWidth: number | undefined,
    parentDirection: LayoutDirection | undefined
  ): void;
  computeLayout(node: ComputedLayoutNode, parentMaxWidth?: number, parentDirection?: LayoutDirection): ComputedLayoutNode;
  fillNodes(node: LayoutNode): ComputedLayoutNode;
};

const CSS_UNDEFINED = undefined;

const CSS_DIRECTION_INHERIT: LayoutDirection = 'inherit';
const CSS_DIRECTION_LTR: LayoutDirection = 'ltr';
const CSS_DIRECTION_RTL: LayoutDirection = 'rtl';

const CSS_FLEX_DIRECTION_ROW: FlexDirection = 'row';
const CSS_FLEX_DIRECTION_ROW_REVERSE: FlexDirection = 'row-reverse';
const CSS_FLEX_DIRECTION_COLUMN: FlexDirection = 'column';
const CSS_FLEX_DIRECTION_COLUMN_REVERSE: FlexDirection = 'column-reverse';

const CSS_JUSTIFY_FLEX_START: JustifyContent = 'flex-start';
const CSS_JUSTIFY_CENTER: JustifyContent = 'center';
const CSS_JUSTIFY_FLEX_END: JustifyContent = 'flex-end';
const CSS_JUSTIFY_SPACE_BETWEEN: JustifyContent = 'space-between';
const CSS_JUSTIFY_SPACE_AROUND: JustifyContent = 'space-around';

const CSS_ALIGN_FLEX_START: AlignItem = 'flex-start';
const CSS_ALIGN_CENTER: AlignItem = 'center';
const CSS_ALIGN_FLEX_END: AlignItem = 'flex-end';
const CSS_ALIGN_STRETCH: AlignItem = 'stretch';

const CSS_POSITION_STATIC: PositionType = 'static';
const CSS_POSITION_RELATIVE: PositionType = 'relative';
const CSS_POSITION_ABSOLUTE: PositionType = 'absolute';
const CSS_POSITION_FIXED: PositionType = 'fixed';

type LayoutContext = {
  rootNode: ComputedLayoutNode;
  fixedChildren: ComputedLayoutNode[];
};

const leading: EdgeMap = {
  row: 'left',
  'row-reverse': 'right',
  column: 'top',
  'column-reverse': 'bottom'
};
const trailing: EdgeMap = {
  row: 'right',
  'row-reverse': 'left',
  column: 'bottom',
  'column-reverse': 'top'
};
const pos: EdgeMap = {
  row: 'left',
  'row-reverse': 'right',
  column: 'top',
  'column-reverse': 'bottom'
};
const dim: DimensionMap = {
  row: 'width',
  'row-reverse': 'width',
  column: 'height',
  'column-reverse': 'height'
};

const layoutEngine: LayoutEngine = (function (): LayoutEngine {
  // When transpiled to Java / C the node type has layout, children and style
  // properties. For the JavaScript version this function adds these properties
  // if they don't already exist.
  function fillNodes(node: LayoutNode): ComputedLayoutNode {
    if (!node.layout || node.isDirty) {
      node.layout = {
        width: undefined,
        height: undefined,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      };
    }

    if (!node.style) {
      node.style = {};
    }

    if (!node.children) {
      node.children = [];
    }
    node.children = node.children.map((child) => fillNodes(child));
    return node as ComputedLayoutNode;
  }

  function isUndefined(value: unknown): value is undefined {
    return value === undefined;
  }

  function isRowDirection(flexDirection: FlexDirection): boolean {
    return flexDirection === CSS_FLEX_DIRECTION_ROW || flexDirection === CSS_FLEX_DIRECTION_ROW_REVERSE;
  }

  function isColumnDirection(flexDirection: FlexDirection): boolean {
    return flexDirection === CSS_FLEX_DIRECTION_COLUMN || flexDirection === CSS_FLEX_DIRECTION_COLUMN_REVERSE;
  }

  function getLeadingMargin(node: ComputedLayoutNode, axis: FlexDirection): number {
    if (node.style.marginStart !== undefined && isRowDirection(axis)) {
      return node.style.marginStart;
    }

    let value: number | undefined = undefined;
    switch (axis) {
      case 'row':
        value = node.style.marginLeft;
        break;
      case 'row-reverse':
        value = node.style.marginRight;
        break;
      case 'column':
        value = node.style.marginTop;
        break;
      case 'column-reverse':
        value = node.style.marginBottom;
        break;
    }

    if (value !== undefined) {
      return value;
    }

    if (node.style.margin !== undefined) {
      return node.style.margin;
    }

    return 0;
  }

  function getTrailingMargin(node: ComputedLayoutNode, axis: FlexDirection): number {
    if (node.style.marginEnd !== undefined && isRowDirection(axis)) {
      return node.style.marginEnd;
    }

    let value: number | undefined = undefined;
    switch (axis) {
      case 'row':
        value = node.style.marginRight;
        break;
      case 'row-reverse':
        value = node.style.marginLeft;
        break;
      case 'column':
        value = node.style.marginBottom;
        break;
      case 'column-reverse':
        value = node.style.marginTop;
        break;
    }

    if (value != null) {
      return value;
    }

    if (node.style.margin !== undefined) {
      return node.style.margin;
    }

    return 0;
  }

  function getLeadingPadding(node: ComputedLayoutNode, axis: FlexDirection): number {
    if (node.style.paddingStart !== undefined && node.style.paddingStart >= 0 && isRowDirection(axis)) {
      return node.style.paddingStart;
    }

    let value: number | undefined = undefined;
    switch (axis) {
      case 'row':
        value = node.style.paddingLeft;
        break;
      case 'row-reverse':
        value = node.style.paddingRight;
        break;
      case 'column':
        value = node.style.paddingTop;
        break;
      case 'column-reverse':
        value = node.style.paddingBottom;
        break;
    }

    if (value != null && value >= 0) {
      return value;
    }

    if (node.style.padding !== undefined && node.style.padding >= 0) {
      return node.style.padding;
    }

    return 0;
  }

  function getTrailingPadding(node: ComputedLayoutNode, axis: FlexDirection): number {
    if (node.style.paddingEnd !== undefined && node.style.paddingEnd >= 0 && isRowDirection(axis)) {
      return node.style.paddingEnd;
    }

    let value: number | undefined = undefined;
    switch (axis) {
      case 'row':
        value = node.style.paddingRight;
        break;
      case 'row-reverse':
        value = node.style.paddingLeft;
        break;
      case 'column':
        value = node.style.paddingBottom;
        break;
      case 'column-reverse':
        value = node.style.paddingTop;
        break;
    }

    if (value != null && value >= 0) {
      return value;
    }

    if (node.style.padding !== undefined && node.style.padding >= 0) {
      return node.style.padding;
    }

    return 0;
  }

  function getLeadingBorder(node: ComputedLayoutNode, axis: FlexDirection): number {
    if (node.style.borderStartWidth !== undefined && node.style.borderStartWidth >= 0 && isRowDirection(axis)) {
      return node.style.borderStartWidth;
    }

    let value: number | undefined = undefined;
    switch (axis) {
      case 'row':
        value = node.style.borderLeftWidth;
        break;
      case 'row-reverse':
        value = node.style.borderRightWidth;
        break;
      case 'column':
        value = node.style.borderTopWidth;
        break;
      case 'column-reverse':
        value = node.style.borderBottomWidth;
        break;
    }

    if (value != null && value >= 0) {
      return value;
    }

    if (node.style.borderWidth !== undefined && node.style.borderWidth >= 0) {
      return node.style.borderWidth;
    }

    return 0;
  }

  function getTrailingBorder(node: ComputedLayoutNode, axis: FlexDirection): number {
    if (node.style.borderEndWidth !== undefined && node.style.borderEndWidth >= 0 && isRowDirection(axis)) {
      return node.style.borderEndWidth;
    }

    let value: number | undefined = undefined;
    switch (axis) {
      case 'row':
        value = node.style.borderRightWidth;
        break;
      case 'row-reverse':
        value = node.style.borderLeftWidth;
        break;
      case 'column':
        value = node.style.borderBottomWidth;
        break;
      case 'column-reverse':
        value = node.style.borderTopWidth;
        break;
    }

    if (value != null && value >= 0) {
      return value;
    }

    if (node.style.borderWidth !== undefined && node.style.borderWidth >= 0) {
      return node.style.borderWidth;
    }

    return 0;
  }

  function getLeadingPaddingAndBorder(node: ComputedLayoutNode, axis: FlexDirection): number {
    return getLeadingPadding(node, axis) + getLeadingBorder(node, axis);
  }

  function getTrailingPaddingAndBorder(node: ComputedLayoutNode, axis: FlexDirection): number {
    return getTrailingPadding(node, axis) + getTrailingBorder(node, axis);
  }

  function getBorderAxis(node: ComputedLayoutNode, axis: FlexDirection): number {
    return getLeadingBorder(node, axis) + getTrailingBorder(node, axis);
  }

  function getMarginAxis(node: ComputedLayoutNode, axis: FlexDirection): number {
    return getLeadingMargin(node, axis) + getTrailingMargin(node, axis);
  }

  function getPaddingAndBorderAxis(node: ComputedLayoutNode, axis: FlexDirection): number {
    return getLeadingPaddingAndBorder(node, axis) + getTrailingPaddingAndBorder(node, axis);
  }

  function getJustifyContent(node: ComputedLayoutNode): JustifyContent {
    if (node.style.justifyContent) {
      return node.style.justifyContent;
    }
    return 'flex-start';
  }

  function getAlignContent(node: ComputedLayoutNode): AlignContent {
    if (node.style.alignContent) {
      return node.style.alignContent;
    }
    return 'flex-start';
  }

  function getAlignItem(node: ComputedLayoutNode, child: ComputedLayoutNode): AlignItem {
    if (child.style.alignSelf) {
      return child.style.alignSelf;
    }
    if (node.style.alignItems) {
      return node.style.alignItems;
    }
    return 'stretch';
  }

  function resolveAxis(axis: FlexDirection, direction: LayoutDirection): FlexDirection {
    if (direction === CSS_DIRECTION_RTL) {
      if (axis === CSS_FLEX_DIRECTION_ROW) {
        return CSS_FLEX_DIRECTION_ROW_REVERSE;
      } else if (axis === CSS_FLEX_DIRECTION_ROW_REVERSE) {
        return CSS_FLEX_DIRECTION_ROW;
      }
    }

    return axis;
  }

  function resolveDirection(node: ComputedLayoutNode, parentDirection?: LayoutDirection): LayoutDirection {
    let direction: LayoutDirection;
    if (node.style.direction) {
      direction = node.style.direction;
    } else {
      direction = CSS_DIRECTION_INHERIT;
    }

    if (direction === CSS_DIRECTION_INHERIT) {
      direction = parentDirection === undefined ? CSS_DIRECTION_LTR : parentDirection;
    }

    return direction;
  }

  function getFlexDirection(node: ComputedLayoutNode): FlexDirection {
    if (node.style.flexDirection) {
      return node.style.flexDirection;
    }
    return CSS_FLEX_DIRECTION_COLUMN;
  }

  function getCrossFlexDirection(flexDirection: FlexDirection, direction: LayoutDirection): FlexDirection {
    if (isColumnDirection(flexDirection)) {
      return resolveAxis(CSS_FLEX_DIRECTION_ROW, direction);
    } else {
      return CSS_FLEX_DIRECTION_COLUMN;
    }
  }

  function getPositionType(node: ComputedLayoutNode): PositionType {
    const position = node.style.position;
    if (
      position === CSS_POSITION_STATIC ||
      position === CSS_POSITION_RELATIVE ||
      position === CSS_POSITION_ABSOLUTE ||
      position === CSS_POSITION_FIXED
    ) {
      return position;
    }
    return CSS_POSITION_STATIC;
  }

  function isInFlowPosition(positionType: PositionType): boolean {
    return positionType === CSS_POSITION_STATIC || positionType === CSS_POSITION_RELATIVE;
  }

  function establishesAbsoluteContainingBlock(positionType: PositionType): boolean {
    return (
      positionType === CSS_POSITION_RELATIVE ||
      positionType === CSS_POSITION_ABSOLUTE ||
      positionType === CSS_POSITION_FIXED
    );
  }

  function appliesRelativeOffset(positionType: PositionType): boolean {
    return positionType === CSS_POSITION_RELATIVE || positionType === CSS_POSITION_ABSOLUTE || positionType === CSS_POSITION_FIXED;
  }

  function isOverflowHidden(node: ComputedLayoutNode): boolean {
    const overflow = node.style.overflow;
    const overflowX = node.style.overflowX;
    const overflowY = node.style.overflowY;

    return overflow === 'hidden' || overflowX === 'hidden' || overflowY === 'hidden';
  }

  function isFlex(node: ComputedLayoutNode): boolean {
    return isInFlowPosition(getPositionType(node)) && (node.style.flex ?? 0) > 0;
  }

  function isFlexWrap(node: ComputedLayoutNode): boolean {
    return node.style.flexWrap === 'wrap';
  }

  function getDimWithMargin(node: ComputedLayoutNode, axis: FlexDirection): number {
    return (node.layout[dim[axis]] ?? 0) + getMarginAxis(node, axis);
  }

  function isDimDefined(node: ComputedLayoutNode, axis: FlexDirection): boolean {
    const value = node.style[dim[axis]];
    return value !== undefined && value >= 0;
  }

  function getInset(node: ComputedLayoutNode): number | undefined {
    const inset = node.style.inset;
    if (typeof inset === 'number' && Number.isFinite(inset)) {
      return inset;
    }
    return undefined;
  }

  function isPosDefined(node: ComputedLayoutNode, pos: Edge): boolean {
    return node.style[pos] !== undefined || getInset(node) !== undefined;
  }

  function isMeasureDefined(node: ComputedLayoutNode): boolean {
    return node.style.measure !== undefined;
  }

  function getPosition(node: ComputedLayoutNode, pos: Edge): number {
    if (node.style[pos] !== undefined) {
      return node.style[pos];
    }
    const inset = getInset(node);
    if (inset !== undefined) {
      return inset;
    }
    return 0;
  }

  function getLayoutZIndex(node: ComputedLayoutNode, positionType: PositionType): LayoutZIndex {
    if (positionType === CSS_POSITION_STATIC) {
      return {
        auto: true,
        order: 0
      };
    }

    const rawZIndex = node.style.zIndex;
    if (rawZIndex && typeof rawZIndex === 'object') {
      const candidate = rawZIndex as {auto?: unknown; order?: unknown};
      if (typeof candidate.auto === 'boolean' && typeof candidate.order === 'number') {
        return {
          auto: candidate.auto,
          order: candidate.order
        };
      }
    }

    if (typeof rawZIndex === 'number' && Number.isFinite(rawZIndex)) {
      return {
        auto: false,
        order: rawZIndex
      };
    }

    return {
      auto: true,
      order: 0
    };
  }

  function boundAxis(node: ComputedLayoutNode, axis: FlexDirection, value: number): number {
    const min = {
      row: node.style.minWidth,
      'row-reverse': node.style.minWidth,
      column: node.style.minHeight,
      'column-reverse': node.style.minHeight
    }[axis] as number | undefined;

    const max = {
      row: node.style.maxWidth,
      'row-reverse': node.style.maxWidth,
      column: node.style.maxHeight,
      'column-reverse': node.style.maxHeight
    }[axis] as number | undefined;

    let boundValue = value;
    if (max !== undefined && max >= 0 && boundValue > max) {
      boundValue = max;
    }
    if (min !== undefined && min >= 0 && boundValue < min) {
      boundValue = min;
    }
    return boundValue;
  }

  function fmaxf(a: number, b: number): number {
    if (a > b) {
      return a;
    }
    return b;
  }

  // When the user specifically sets a value for width or height
  function setDimensionFromStyle(node: ComputedLayoutNode, axis: FlexDirection): void {
    // The parent already computed us a width or height. We just skip it
    if (node.layout[dim[axis]] !== undefined) {
      return;
    }
    // We only run if there's a width or height defined
    if (!isDimDefined(node, axis)) {
      return;
    }

    // The dimensions can never be smaller than the padding and border
    const styleDim = node.style[dim[axis]];
    if (styleDim === undefined) {
      return;
    }
    node.layout[dim[axis]] = fmaxf(boundAxis(node, axis, styleDim), getPaddingAndBorderAxis(node, axis));
  }

  function setTrailingPosition(node: ComputedLayoutNode, child: ComputedLayoutNode, axis: FlexDirection): void {
    child.layout[trailing[axis]] =
      (node.layout[dim[axis]] ?? 0) - (child.layout[dim[axis]] ?? 0) - (child.layout[pos[axis]] ?? 0);
  }

  // If both left and right are defined, then use left. Otherwise return
  // +left or -right depending on which is defined.
  function getRelativePosition(node: ComputedLayoutNode, axis: FlexDirection): number {
    if (isPosDefined(node, leading[axis])) {
      return getPosition(node, leading[axis]);
    }
    return -getPosition(node, trailing[axis]);
  }

  function setCachedLayout(node: ComputedLayoutNode): void {
    const lastLayout = node.lastLayout ?? (node.lastLayout = {});

    lastLayout.width = node.layout.width;
    lastLayout.height = node.layout.height;
    lastLayout.top = node.layout.top;
    lastLayout.left = node.layout.left;
    lastLayout.right = node.layout.right;
    lastLayout.bottom = node.layout.bottom;
    lastLayout.direction = node.layout.direction;
    lastLayout.position = node.layout.position;
    lastLayout.zIndex = node.layout.zIndex ? {...node.layout.zIndex} : undefined;
    lastLayout.isFixedStackingContext = node.layout.isFixedStackingContext;
    lastLayout.overflowClip = node.overflowClip ? {...node.overflowClip} : undefined;
  }

  function restoreCachedLayout(node: ComputedLayoutNode): void {
    const lastLayout = node.lastLayout;
    if (!lastLayout) {
      return;
    }

    node.layout.width = lastLayout.width;
    node.layout.height = lastLayout.height;
    node.layout.top = lastLayout.top ?? 0;
    node.layout.left = lastLayout.left ?? 0;
    node.layout.right = lastLayout.right ?? 0;
    node.layout.bottom = lastLayout.bottom ?? 0;
    node.layout.direction = lastLayout.direction;
    node.layout.position = lastLayout.position;
    node.layout.zIndex = lastLayout.zIndex ? {...lastLayout.zIndex} : undefined;
    node.layout.isFixedStackingContext = lastLayout.isFixedStackingContext;
    node.overflowClip = lastLayout.overflowClip ? {...lastLayout.overflowClip} : undefined;
  }

  function prefillFixedDimensions(
    node: ComputedLayoutNode,
    viewportWidth: number | undefined,
    viewportHeight: number | undefined
  ): void {
    let /*(c)!css_flex_direction_t*/ /*(java)!int*/ axis: FlexDirection;
    let viewportSize: number | undefined;

    for (let ii = 0; ii < 2; ii++) {
      axis = ii !== 0 ? CSS_FLEX_DIRECTION_ROW : CSS_FLEX_DIRECTION_COLUMN;
      viewportSize = axis === CSS_FLEX_DIRECTION_ROW ? viewportWidth : viewportHeight;

      if (
        !isUndefined(viewportSize) &&
        !isDimDefined(node, axis) &&
        isPosDefined(node, leading[axis]) &&
        isPosDefined(node, trailing[axis])
      ) {
        node.layout[dim[axis]] = fmaxf(
          boundAxis(
            node,
            axis,
            viewportSize - getMarginAxis(node, axis) - getPosition(node, leading[axis]) - getPosition(node, trailing[axis])
          ),
          getPaddingAndBorderAxis(node, axis)
        );
      }
    }
  }

  function resolveFixedLeadingPositions(
    node: ComputedLayoutNode,
    viewportWidth: number | undefined,
    viewportHeight: number | undefined
  ): void {
    let /*(c)!css_flex_direction_t*/ /*(java)!int*/ axis: FlexDirection;
    let viewportSize: number | undefined;

    for (let ii = 0; ii < 2; ii++) {
      axis = ii !== 0 ? CSS_FLEX_DIRECTION_ROW : CSS_FLEX_DIRECTION_COLUMN;
      viewportSize = axis === CSS_FLEX_DIRECTION_ROW ? viewportWidth : viewportHeight;

      if (
        !isUndefined(viewportSize) &&
        !isUndefined(node.layout[dim[axis]]) &&
        isPosDefined(node, trailing[axis]) &&
        !isPosDefined(node, leading[axis])
      ) {
        node.layout[leading[axis]] = viewportSize - (node.layout[dim[axis]] ?? 0) - getPosition(node, trailing[axis]);
      }
    }
  }

  function resolveFixedTrailingPositions(
    node: ComputedLayoutNode,
    viewportWidth: number | undefined,
    viewportHeight: number | undefined
  ): void {
    let /*(c)!css_flex_direction_t*/ /*(java)!int*/ axis: FlexDirection;
    let viewportSize: number | undefined;

    for (let ii = 0; ii < 2; ii++) {
      axis = ii !== 0 ? CSS_FLEX_DIRECTION_ROW : CSS_FLEX_DIRECTION_COLUMN;
      viewportSize = axis === CSS_FLEX_DIRECTION_ROW ? viewportWidth : viewportHeight;

      if (!isUndefined(viewportSize) && !isUndefined(node.layout[dim[axis]])) {
        node.layout[trailing[axis]] = viewportSize - (node.layout[dim[axis]] ?? 0) - node.layout[leading[axis]];
      }
    }
  }

  function resetChildrenLayout(node: ComputedLayoutNode): void {
    node.children.forEach(function (child: ComputedLayoutNode) {
      child.layout.width = undefined;
      child.layout.height = undefined;
      child.layout.top = 0;
      child.layout.left = 0;
      child.layout.right = 0;
      child.layout.bottom = 0;
      child.overflowClip = undefined;
    });
  }

  function prefillAbsoluteDimensions(node: ComputedLayoutNode, containingBlock: ComputedLayoutNode): void {
    let /*(c)!css_flex_direction_t*/ /*(java)!int*/ axis: FlexDirection;

    for (let ii = 0; ii < 2; ii++) {
      axis = ii !== 0 ? CSS_FLEX_DIRECTION_ROW : CSS_FLEX_DIRECTION_COLUMN;

      if (
        !isUndefined(containingBlock.layout[dim[axis]]) &&
        !isDimDefined(node, axis) &&
        isPosDefined(node, leading[axis]) &&
        isPosDefined(node, trailing[axis])
      ) {
        node.layout[dim[axis]] = fmaxf(
          boundAxis(
            node,
            axis,
            (containingBlock.layout[dim[axis]] ?? 0) -
              getPaddingAndBorderAxis(containingBlock, axis) -
              getMarginAxis(node, axis) -
              getPosition(node, leading[axis]) -
              getPosition(node, trailing[axis])
          ),
          getPaddingAndBorderAxis(node, axis)
        );
      }
    }
  }

  function positionAbsoluteNodeAgainstContainingBlock(
    node: ComputedLayoutNode,
    immediateParent: ComputedLayoutNode,
    containingBlock: ComputedLayoutNode,
    parentOffsetLeft: number,
    parentOffsetTop: number
  ): void {
    let /*(c)!css_flex_direction_t*/ /*(java)!int*/ axis: FlexDirection;

    for (let ii = 0; ii < 2; ii++) {
      axis = ii !== 0 ? CSS_FLEX_DIRECTION_ROW : CSS_FLEX_DIRECTION_COLUMN;
      const parentOffset = axis === CSS_FLEX_DIRECTION_ROW ? parentOffsetLeft : parentOffsetTop;

      if (isPosDefined(node, leading[axis])) {
        node.layout[leading[axis]] =
          getPosition(node, leading[axis]) + getLeadingBorder(containingBlock, axis) + getLeadingMargin(node, axis) - parentOffset;
      } else if (
        isPosDefined(node, trailing[axis]) &&
        !isUndefined(containingBlock.layout[dim[axis]]) &&
        !isUndefined(node.layout[dim[axis]])
      ) {
        node.layout[leading[axis]] =
          (containingBlock.layout[dim[axis]] ?? 0) - (node.layout[dim[axis]] ?? 0) - getPosition(node, trailing[axis]) - parentOffset;
      }

      if (!isUndefined(immediateParent.layout[dim[axis]]) && !isUndefined(node.layout[dim[axis]])) {
        node.layout[trailing[axis]] =
          (immediateParent.layout[dim[axis]] ?? 0) - (node.layout[dim[axis]] ?? 0) - (node.layout[leading[axis]] ?? 0);
      }
    }
  }

  function relayoutAbsoluteNode(
    layoutContext: LayoutContext,
    node: ComputedLayoutNode,
    immediateParent: ComputedLayoutNode,
    containingBlock: ComputedLayoutNode,
    parentDirection: LayoutDirection | undefined,
    parentOffsetLeft: number,
    parentOffsetTop: number
  ): void {
    node.layout.width = undefined;
    node.layout.height = undefined;
    node.layout.top = 0;
    node.layout.left = 0;
    node.layout.right = 0;
    node.layout.bottom = 0;
    node.overflowClip = undefined;

    resetChildrenLayout(node);
    prefillAbsoluteDimensions(node, containingBlock);

    const parentMaxWidth =
      containingBlock.layout.width !== undefined
        ? containingBlock.layout.width - getPaddingAndBorderAxis(containingBlock, CSS_FLEX_DIRECTION_ROW)
        : undefined;

    layoutNodeImpl({rootNode: layoutContext.rootNode, fixedChildren: []}, node, parentMaxWidth, parentDirection);
    positionAbsoluteNodeAgainstContainingBlock(node, immediateParent, containingBlock, parentOffsetLeft, parentOffsetTop);
    setCachedLayout(node);
  }

  function normalizeAbsoluteContainingBlocks(
    layoutContext: LayoutContext,
    node: ComputedLayoutNode,
    parentDirection: LayoutDirection | undefined,
    containingBlock: ComputedLayoutNode,
    offsetLeft: number,
    offsetTop: number
  ): void {
    const direction = resolveDirection(node, parentDirection);
    const nodePositionType = getPositionType(node);
    const nextContainingBlock = establishesAbsoluteContainingBlock(nodePositionType) ? node : containingBlock;
    const nextOffsetLeft = establishesAbsoluteContainingBlock(nodePositionType) ? 0 : offsetLeft;
    const nextOffsetTop = establishesAbsoluteContainingBlock(nodePositionType) ? 0 : offsetTop;

    for (const child of node.children) {
      const childPositionType = getPositionType(child);

      if (childPositionType === CSS_POSITION_ABSOLUTE) {
        if (nextContainingBlock !== node) {
          relayoutAbsoluteNode(layoutContext, child, node, nextContainingBlock, direction, nextOffsetLeft, nextOffsetTop);
        }

        normalizeAbsoluteContainingBlocks(layoutContext, child, direction, child, 0, 0);
        continue;
      }

      if (childPositionType === CSS_POSITION_FIXED) {
        normalizeAbsoluteContainingBlocks(layoutContext, child, direction, child, 0, 0);
        continue;
      }

      if (establishesAbsoluteContainingBlock(childPositionType)) {
        normalizeAbsoluteContainingBlocks(layoutContext, child, direction, child, 0, 0);
        continue;
      }

      normalizeAbsoluteContainingBlocks(
        layoutContext,
        child,
        direction,
        nextContainingBlock,
        nextOffsetLeft + child.layout.left,
        nextOffsetTop + child.layout.top
      );
    }
  }

  function layoutNodeImpl(
    layoutContext: LayoutContext,
    node: ComputedLayoutNode,
    parentMaxWidth: number | undefined,
    /*css_direction_t*/ parentDirection?: LayoutDirection
  ): void {
    const positionType = getPositionType(node);
    const /*css_direction_t*/ direction = resolveDirection(node, parentDirection);
    const /*(c)!css_flex_direction_t*/ /*(java)!int*/ mainAxis = resolveAxis(getFlexDirection(node), direction);
    const /*(c)!css_flex_direction_t*/ /*(java)!int*/ crossAxis = getCrossFlexDirection(mainAxis, direction);
    const /*(c)!css_flex_direction_t*/ /*(java)!int*/ resolvedRowAxis = resolveAxis(CSS_FLEX_DIRECTION_ROW, direction);

    // Handle width and height style attributes
    setDimensionFromStyle(node, mainAxis);
    setDimensionFromStyle(node, crossAxis);

    // Set the resolved resolution in the node's layout
    node.layout.direction = direction;
    node.layout.position = positionType;
    node.layout.zIndex = getLayoutZIndex(node, positionType);
    node.layout.isFixedStackingContext = positionType === CSS_POSITION_FIXED;

    // The position is set by the parent, but we need to complete it with a
    // delta composed of the margin and left/top/right/bottom
    node.layout[leading[mainAxis]] += getLeadingMargin(node, mainAxis);
    node.layout[trailing[mainAxis]] += getTrailingMargin(node, mainAxis);
    node.layout[leading[crossAxis]] += getLeadingMargin(node, crossAxis);
    node.layout[trailing[crossAxis]] += getTrailingMargin(node, crossAxis);

    if (appliesRelativeOffset(positionType)) {
      node.layout[leading[mainAxis]] += getRelativePosition(node, mainAxis);
      node.layout[trailing[mainAxis]] += getRelativePosition(node, mainAxis);
      node.layout[leading[crossAxis]] += getRelativePosition(node, crossAxis);
      node.layout[trailing[crossAxis]] += getRelativePosition(node, crossAxis);
    }

    // Inline immutable values from the target node to avoid excessive method
    // invocations during the layout calculation.
    const /*int*/ childCount = node.children.length;
    const /*float*/ paddingAndBorderAxisResolvedRow = getPaddingAndBorderAxis(node, resolvedRowAxis);

    if (isMeasureDefined(node)) {
      const /*bool*/ isResolvedRowDimDefined = !isUndefined(node.layout[dim[resolvedRowAxis]]);

      let /*float*/ width = 0;
      if (isDimDefined(node, resolvedRowAxis)) {
        width = node.style.width ?? 0;
      } else if (isResolvedRowDimDefined) {
        width = node.layout[dim[resolvedRowAxis]] ?? 0;
      } else {
        width = (parentMaxWidth ?? 0) - getMarginAxis(node, resolvedRowAxis);
      }
      width -= paddingAndBorderAxisResolvedRow;

      // We only need to give a dimension for the text if we haven't got any
      // for it computed yet. It can either be from the style attribute or because
      // the element is flexible.
      const /*bool*/ isRowUndefined = !isDimDefined(node, resolvedRowAxis) && !isResolvedRowDimDefined;
      const /*bool*/ isColumnUndefined =
          !isDimDefined(node, CSS_FLEX_DIRECTION_COLUMN) && isUndefined(node.layout[dim[CSS_FLEX_DIRECTION_COLUMN]]);

      // Let's not measure the text if we already know both dimensions
      if (isRowUndefined || isColumnUndefined) {
        const /*css_dim_t*/ measureDim = node.style.measure!(
            /*(c)!node->context,*/
            /*(java)!layoutContext.measureOutput,*/
            width
          );
        if (isRowUndefined) {
          node.layout.width = measureDim.width + paddingAndBorderAxisResolvedRow;
        }
        if (isColumnUndefined) {
          node.layout.height = measureDim.height + getPaddingAndBorderAxis(node, CSS_FLEX_DIRECTION_COLUMN);
        }
      }
      if (childCount === 0) {
        return;
      }
    }

    const /*bool*/ isNodeFlexWrap = isFlexWrap(node);

    const /*css_justify_t*/ justifyContent = getJustifyContent(node);

    const /*float*/ leadingPaddingAndBorderMain = getLeadingPaddingAndBorder(node, mainAxis);
    const /*float*/ leadingPaddingAndBorderCross = getLeadingPaddingAndBorder(node, crossAxis);
    const /*float*/ paddingAndBorderAxisMain = getPaddingAndBorderAxis(node, mainAxis);
    const /*float*/ paddingAndBorderAxisCross = getPaddingAndBorderAxis(node, crossAxis);

    const /*bool*/ isMainDimDefined = !isUndefined(node.layout[dim[mainAxis]]);
    const /*bool*/ isCrossDimDefined = !isUndefined(node.layout[dim[crossAxis]]);
    const /*bool*/ isMainRowDirection = isRowDirection(mainAxis);

    let /*int*/ i;
    let /*int*/ ii;
    let /*css_node_t**/ child: ComputedLayoutNode;
    let /*(c)!css_flex_direction_t*/ /*(java)!int*/ axis;

    let /*css_node_t**/ firstAbsoluteChild: ComputedLayoutNode | null = null;
    let /*css_node_t**/ currentAbsoluteChild: ComputedLayoutNode | null = null;

    let /*float*/ definedMainDim = 0;
    if (isMainDimDefined) {
      definedMainDim = (node.layout[dim[mainAxis]] ?? 0) - paddingAndBorderAxisMain;
    }

    // We want to execute the next two loops one per line with flex-wrap
    let /*int*/ startLine = 0;
    let /*int*/ endLine = 0;
    // var/*int*/ nextOffset = 0;
    let /*int*/ alreadyComputedNextLayout = 0;
    // We aggregate the total dimensions of the container in those two variables
    let /*float*/ linesCrossDim = 0;
    let /*float*/ linesMainDim = 0;
    let /*int*/ linesCount = 0;
    while (endLine < childCount) {
      // <Loop A> Layout non flexible children and count children by type

      // mainContentDim is accumulation of the dimensions and margin of all the
      // non flexible children. This will be used in order to either set the
      // dimensions of the node if none already exist, or to compute the
      // remaining space left for the flexible children.
      let /*float*/ mainContentDim = 0;

      // There are three kind of children, non flexible, flexible and absolute.
      // We need to know how many there are in order to distribute the space.
      let /*int*/ flexibleChildrenCount = 0;
      let /*float*/ totalFlexible = 0;
      let /*int*/ nonFlexibleChildrenCount = 0;

      // Use the line loop to position children in the main axis for as long
      // as they are using a simple stacking behaviour. Children that are
      // immediately stacked in the initial loop will not be touched again
      // in <Loop C>.
      let /*bool*/ isSimpleStackMain =
          (isMainDimDefined && justifyContent === CSS_JUSTIFY_FLEX_START) ||
          (!isMainDimDefined && justifyContent !== CSS_JUSTIFY_CENTER);
      let /*int*/ firstComplexMain = isSimpleStackMain ? childCount : startLine;

      // Use the initial line loop to position children in the cross axis for
      // as long as they are relatively positioned with alignment STRETCH or
      // FLEX_START. Children that are immediately stacked in the initial loop
      // will not be touched again in <Loop D>.
      let /*bool*/ isSimpleStackCross = true;
      let /*int*/ firstComplexCross = childCount;

      let /*css_node_t**/ firstFlexChild = null;
      let /*css_node_t**/ currentFlexChild = null;

      let /*float*/ mainDim = leadingPaddingAndBorderMain;
      let /*float*/ crossDim = 0;

      let /*float*/ maxWidth: number | undefined;
      for (i = startLine; i < childCount; ++i) {
        child = node.children[i]!;
        child.lineIndex = linesCount;

        child.nextAbsoluteChild = null;
        child.nextFlexChild = null;

        const /*css_align_t*/ alignItem = getAlignItem(node, child);
        const childPositionType = getPositionType(child);

        // Pre-fill cross axis dimensions when the child is using stretch before
        // we call the recursive layout pass
        if (
          alignItem === CSS_ALIGN_STRETCH &&
          isInFlowPosition(childPositionType) &&
          isCrossDimDefined &&
          !isDimDefined(child, crossAxis)
        ) {
          child.layout[dim[crossAxis]] = fmaxf(
            boundAxis(
              child,
              crossAxis,
              (node.layout[dim[crossAxis]] ?? 0) - paddingAndBorderAxisCross - getMarginAxis(child, crossAxis)
            ),
            // You never want to go smaller than padding
            getPaddingAndBorderAxis(child, crossAxis)
          );
        } else if (childPositionType === CSS_POSITION_ABSOLUTE) {
          // Store a private linked list of absolutely positioned children
          // so that we can efficiently traverse them later.
          if (firstAbsoluteChild === null) {
            firstAbsoluteChild = child;
          }
          if (currentAbsoluteChild !== null) {
            currentAbsoluteChild.nextAbsoluteChild = child;
          }
          currentAbsoluteChild = child;

          // Pre-fill dimensions when using absolute position and both offsets for the axis are defined (either both
          // left and right or top and bottom).
          for (ii = 0; ii < 2; ii++) {
            axis = ii !== 0 ? CSS_FLEX_DIRECTION_ROW : CSS_FLEX_DIRECTION_COLUMN;
            if (
              !isUndefined(node.layout[dim[axis]]) &&
              !isDimDefined(child, axis) &&
              isPosDefined(child, leading[axis]) &&
              isPosDefined(child, trailing[axis])
            ) {
              child.layout[dim[axis]] = fmaxf(
                boundAxis(
                  child,
                  axis,
                  (node.layout[dim[axis]] ?? 0) -
                    getPaddingAndBorderAxis(node, axis) -
                    getMarginAxis(child, axis) -
                    getPosition(child, leading[axis]) -
                    getPosition(child, trailing[axis])
                ),
                // You never want to go smaller than padding
                getPaddingAndBorderAxis(child, axis)
              );
            }
          }
        } else if (childPositionType === CSS_POSITION_FIXED) {
          layoutContext.fixedChildren.push(child);
        }

        let /*float*/ nextContentDim = 0;

        // It only makes sense to consider a child flexible if we have a computed
        // dimension for the node.
        if (isMainDimDefined && isFlex(child)) {
          flexibleChildrenCount++;
          totalFlexible += child.style.flex ?? 0;

          // Store a private linked list of flexible children so that we can
          // efficiently traverse them later.
          if (firstFlexChild === null) {
            firstFlexChild = child;
          }
          if (currentFlexChild !== null) {
            currentFlexChild.nextFlexChild = child;
          }
          currentFlexChild = child;

          // Even if we don't know its exact size yet, we already know the padding,
          // border and margin. We'll use this partial information, which represents
          // the smallest possible size for the child, to compute the remaining
          // available space.
          nextContentDim = getPaddingAndBorderAxis(child, mainAxis) + getMarginAxis(child, mainAxis);
        } else {
          maxWidth = CSS_UNDEFINED;
          if (!isMainRowDirection) {
            if (isDimDefined(node, resolvedRowAxis)) {
              maxWidth = (node.layout[dim[resolvedRowAxis]] ?? 0) - paddingAndBorderAxisResolvedRow;
            } else {
              maxWidth = (parentMaxWidth ?? 0) - getMarginAxis(node, resolvedRowAxis) - paddingAndBorderAxisResolvedRow;
            }
          }

          // This is the main recursive call. We layout non flexible children.
          if (childPositionType !== CSS_POSITION_FIXED && alreadyComputedNextLayout === 0) {
            layoutNodeWithContext(layoutContext, child, maxWidth, direction);
          }

          // Out-of-flow positioned elements do not take part of the layout, so we
          // don't use them to compute mainContentDim
          if (isInFlowPosition(childPositionType)) {
            nonFlexibleChildrenCount++;
            // At this point we know the final size and margin of the element.
            nextContentDim = getDimWithMargin(child, mainAxis);
          }
        }

        // The element we are about to add would make us go to the next line
        if (
          isNodeFlexWrap &&
          isMainDimDefined &&
          mainContentDim + nextContentDim > definedMainDim &&
          // If there's only one element, then it's bigger than the content
          // and needs its own line
          i !== startLine
        ) {
          nonFlexibleChildrenCount--;
          alreadyComputedNextLayout = 1;
          break;
        }

        // Disable simple stacking in the main axis for the current line as
        // we found a non-trivial child. The remaining children will be laid out
        // in <Loop C>.
        if (isSimpleStackMain && (!isInFlowPosition(childPositionType) || isFlex(child))) {
          isSimpleStackMain = false;
          firstComplexMain = i;
        }

        // Disable simple stacking in the cross axis for the current line as
        // we found a non-trivial child. The remaining children will be laid out
        // in <Loop D>.
        if (
          isSimpleStackCross &&
          (!isInFlowPosition(childPositionType) ||
            (alignItem !== CSS_ALIGN_STRETCH && alignItem !== CSS_ALIGN_FLEX_START) ||
            isUndefined(child.layout[dim[crossAxis]]))
        ) {
          isSimpleStackCross = false;
          firstComplexCross = i;
        }

        if (isSimpleStackMain) {
          child.layout[pos[mainAxis]] += mainDim;
          if (isMainDimDefined) {
            setTrailingPosition(node, child, mainAxis);
          }

          mainDim += getDimWithMargin(child, mainAxis);
          crossDim = fmaxf(crossDim, boundAxis(child, crossAxis, getDimWithMargin(child, crossAxis)));
        }

        if (isSimpleStackCross) {
          child.layout[pos[crossAxis]] += linesCrossDim + leadingPaddingAndBorderCross;
          if (isCrossDimDefined) {
            setTrailingPosition(node, child, crossAxis);
          }
        }

        alreadyComputedNextLayout = 0;
        mainContentDim += nextContentDim;
        endLine = i + 1;
      }

      // <Loop B> Layout flexible children and allocate empty space

      // In order to position the elements in the main axis, we have two
      // controls. The space between the beginning and the first element
      // and the space between each two elements.
      let /*float*/ leadingMainDim = 0;
      let /*float*/ betweenMainDim = 0;

      // The remaining available space that needs to be allocated
      let /*float*/ remainingMainDim = 0;
      if (isMainDimDefined) {
        remainingMainDim = definedMainDim - mainContentDim;
      } else {
        remainingMainDim = fmaxf(mainContentDim, 0) - mainContentDim;
      }

      // If there are flexible children in the mix, they are going to fill the
      // remaining space
      if (flexibleChildrenCount !== 0) {
        let /*float*/ flexibleMainDim = remainingMainDim / totalFlexible;
        let /*float*/ baseMainDim;
        let /*float*/ boundMainDim;

        // If the flex share of remaining space doesn't meet min/max bounds,
        // remove this child from flex calculations.
        currentFlexChild = firstFlexChild;
        while (currentFlexChild !== null) {
          baseMainDim =
            flexibleMainDim * (currentFlexChild.style.flex ?? 0) + getPaddingAndBorderAxis(currentFlexChild, mainAxis);
          boundMainDim = boundAxis(currentFlexChild, mainAxis, baseMainDim);

          if (baseMainDim !== boundMainDim) {
            remainingMainDim -= boundMainDim;
            totalFlexible -= currentFlexChild.style.flex ?? 0;
          }

          currentFlexChild = currentFlexChild.nextFlexChild;
        }
        flexibleMainDim = remainingMainDim / totalFlexible;

        // The non flexible children can overflow the container, in this case
        // we should just assume that there is no space available.
        if (flexibleMainDim < 0) {
          flexibleMainDim = 0;
        }

        currentFlexChild = firstFlexChild;
        while (currentFlexChild !== null) {
          // At this point we know the final size of the element in the main
          // dimension
          currentFlexChild.layout[dim[mainAxis]] = boundAxis(
            currentFlexChild,
            mainAxis,
            flexibleMainDim * (currentFlexChild.style.flex ?? 0) + getPaddingAndBorderAxis(currentFlexChild, mainAxis)
          );

          maxWidth = CSS_UNDEFINED;
          if (isDimDefined(node, resolvedRowAxis)) {
            maxWidth = (node.layout[dim[resolvedRowAxis]] ?? 0) - paddingAndBorderAxisResolvedRow;
          } else if (!isMainRowDirection) {
            maxWidth = (parentMaxWidth ?? 0) - getMarginAxis(node, resolvedRowAxis) - paddingAndBorderAxisResolvedRow;
          }

          // And we recursively call the layout algorithm for this child
          layoutNodeWithContext(layoutContext, currentFlexChild, maxWidth, direction);

          child = currentFlexChild;
          currentFlexChild = currentFlexChild.nextFlexChild;
          child.nextFlexChild = null;
        }

        // We use justifyContent to figure out how to allocate the remaining
        // space available
      } else if (justifyContent !== CSS_JUSTIFY_FLEX_START) {
        if (justifyContent === CSS_JUSTIFY_CENTER) {
          leadingMainDim = remainingMainDim / 2;
        } else if (justifyContent === CSS_JUSTIFY_FLEX_END) {
          leadingMainDim = remainingMainDim;
        } else if (justifyContent === CSS_JUSTIFY_SPACE_BETWEEN) {
          remainingMainDim = fmaxf(remainingMainDim, 0);
          if (flexibleChildrenCount + nonFlexibleChildrenCount - 1 !== 0) {
            betweenMainDim = remainingMainDim / (flexibleChildrenCount + nonFlexibleChildrenCount - 1);
          } else {
            betweenMainDim = 0;
          }
        } else if (justifyContent === CSS_JUSTIFY_SPACE_AROUND) {
          // Space on the edges is half of the space between elements
          betweenMainDim = remainingMainDim / (flexibleChildrenCount + nonFlexibleChildrenCount);
          leadingMainDim = betweenMainDim / 2;
        }
      }

      // <Loop C> Position elements in the main axis and compute dimensions

      // At this point, all the children have their dimensions set. We need to
      // find their position. In order to do that, we accumulate data in
      // variables that are also useful to compute the total dimensions of the
      // container!
      mainDim += leadingMainDim;

      for (i = firstComplexMain; i < endLine; ++i) {
        child = node.children[i]!;

        if (getPositionType(child) === CSS_POSITION_ABSOLUTE && isPosDefined(child, leading[mainAxis])) {
          // In case the child is position absolute and has left/top being
          // defined, we override the position to whatever the user said
          // (and margin/border).
          child.layout[pos[mainAxis]] =
            getPosition(child, leading[mainAxis]) +
            getLeadingBorder(node, mainAxis) +
            getLeadingMargin(child, mainAxis);
        } else {
          // If the child is position absolute (without top/left) or relative,
          // we put it at the current accumulated offset.
          child.layout[pos[mainAxis]] += mainDim;

          // Define the trailing position accordingly.
          if (isMainDimDefined) {
            setTrailingPosition(node, child, mainAxis);
          }

          // Now that we placed the element, we need to update the variables
          // We only need to do that for relative elements. Absolute elements
          // do not take part in that phase.
          if (isInFlowPosition(getPositionType(child))) {
            // The main dimension is the sum of all the elements dimension plus
            // the spacing.
            mainDim += betweenMainDim + getDimWithMargin(child, mainAxis);
            // The cross dimension is the max of the elements dimension since there
            // can only be one element in that cross dimension.
            crossDim = fmaxf(crossDim, boundAxis(child, crossAxis, getDimWithMargin(child, crossAxis)));
          }
        }
      }

      let /*float*/ containerCrossAxis = node.layout[dim[crossAxis]] ?? 0;
      if (!isCrossDimDefined) {
        containerCrossAxis = fmaxf(
          // For the cross dim, we add both sides at the end because the value
          // is aggregate via a max function. Intermediate negative values
          // can mess this computation otherwise
          boundAxis(node, crossAxis, crossDim + paddingAndBorderAxisCross),
          paddingAndBorderAxisCross
        );
      }

      // <Loop D> Position elements in the cross axis
      for (i = firstComplexCross; i < endLine; ++i) {
        child = node.children[i]!;

        if (getPositionType(child) === CSS_POSITION_ABSOLUTE && isPosDefined(child, leading[crossAxis])) {
          // In case the child is absolutely positionned and has a
          // top/left/bottom/right being set, we override all the previously
          // computed positions to set it correctly.
          child.layout[pos[crossAxis]] =
            getPosition(child, leading[crossAxis]) +
            getLeadingBorder(node, crossAxis) +
            getLeadingMargin(child, crossAxis);
        } else {
          let /*float*/ leadingCrossDim = leadingPaddingAndBorderCross;

          // For a relative children, we're either using alignItems (parent) or
          // alignSelf (child) in order to determine the position in the cross axis
          if (isInFlowPosition(getPositionType(child))) {
            /*eslint-disable */
            // This variable is intentionally re-defined as the code is transpiled to a block scope language
            let /*css_align_t*/ alignItem = getAlignItem(node, child);
            /*eslint-enable */
            if (alignItem === CSS_ALIGN_STRETCH) {
              // You can only stretch if the dimension has not already been set
              // previously.
              if (isUndefined(child.layout[dim[crossAxis]])) {
                child.layout[dim[crossAxis]] = fmaxf(
                  boundAxis(
                    child,
                    crossAxis,
                    containerCrossAxis - paddingAndBorderAxisCross - getMarginAxis(child, crossAxis)
                  ),
                  // You never want to go smaller than padding
                  getPaddingAndBorderAxis(child, crossAxis)
                );
              }
            } else if (alignItem !== CSS_ALIGN_FLEX_START) {
              // The remaining space between the parent dimensions+padding and child
              // dimensions+margin.
              const /*float*/ remainingCrossDim =
                  containerCrossAxis - paddingAndBorderAxisCross - getDimWithMargin(child, crossAxis);

              if (alignItem === CSS_ALIGN_CENTER) {
                leadingCrossDim += remainingCrossDim / 2;
              } else {
                // CSS_ALIGN_FLEX_END
                leadingCrossDim += remainingCrossDim;
              }
            }
          }

          // And we apply the position
          child.layout[pos[crossAxis]] += linesCrossDim + leadingCrossDim;

          // Define the trailing position accordingly.
          if (isCrossDimDefined) {
            setTrailingPosition(node, child, crossAxis);
          }
        }
      }

      linesCrossDim += crossDim;
      linesMainDim = fmaxf(linesMainDim, mainDim);
      linesCount += 1;
      startLine = endLine;
    }

    // <Loop E>
    //
    // Note(prenaux): More than one line, we need to layout the crossAxis
    // according to alignContent.
    //
    // Note that we could probably remove <Loop D> and handle the one line case
    // here too, but for the moment this is safer since it won't interfere with
    // previously working code.
    //
    // See specs:
    // http://www.w3.org/TR/2012/CR-css3-flexbox-20120918/#layout-algorithm
    // section 9.4
    //
    if (linesCount > 1 && isCrossDimDefined) {
      const /*float*/ nodeCrossAxisInnerSize = (node.layout[dim[crossAxis]] ?? 0) - paddingAndBorderAxisCross;
      const /*float*/ remainingAlignContentDim = nodeCrossAxisInnerSize - linesCrossDim;

      let /*float*/ crossDimLead = 0;
      let /*float*/ currentLead = leadingPaddingAndBorderCross;

      const /*css_align_t*/ alignContent = getAlignContent(node);
      if (alignContent === CSS_ALIGN_FLEX_END) {
        currentLead += remainingAlignContentDim;
      } else if (alignContent === CSS_ALIGN_CENTER) {
        currentLead += remainingAlignContentDim / 2;
      } else if (alignContent === CSS_ALIGN_STRETCH) {
        if (nodeCrossAxisInnerSize > linesCrossDim) {
          crossDimLead = remainingAlignContentDim / linesCount;
        }
      }

      let /*int*/ endIndex = 0;
      for (i = 0; i < linesCount; ++i) {
        const /*int*/ startIndex = endIndex;

        // compute the line's height and find the endIndex
        let /*float*/ lineHeight = 0;
        for (ii = startIndex; ii < childCount; ++ii) {
          child = node.children[ii]!;
          if (!isInFlowPosition(getPositionType(child))) {
            continue;
          }
          if (child.lineIndex !== i) {
            break;
          }
          const childCrossDim = child.layout[dim[crossAxis]];
          if (!isUndefined(childCrossDim)) {
            lineHeight = fmaxf(lineHeight, childCrossDim + getMarginAxis(child, crossAxis));
          }
        }
        endIndex = ii;
        lineHeight += crossDimLead;

        for (ii = startIndex; ii < endIndex; ++ii) {
          child = node.children[ii]!;
          if (!isInFlowPosition(getPositionType(child))) {
            continue;
          }

          const /*css_align_t*/ alignContentAlignItem = getAlignItem(node, child);
          if (alignContentAlignItem === CSS_ALIGN_FLEX_START) {
            child.layout[pos[crossAxis]] = currentLead + getLeadingMargin(child, crossAxis);
          } else if (alignContentAlignItem === CSS_ALIGN_FLEX_END) {
            child.layout[pos[crossAxis]] =
              currentLead + lineHeight - getTrailingMargin(child, crossAxis) - (child.layout[dim[crossAxis]] ?? 0);
          } else if (alignContentAlignItem === CSS_ALIGN_CENTER) {
            const /*float*/ childHeight = child.layout[dim[crossAxis]] ?? 0;
            child.layout[pos[crossAxis]] = currentLead + (lineHeight - childHeight) / 2;
          } else if (alignContentAlignItem === CSS_ALIGN_STRETCH) {
            child.layout[pos[crossAxis]] = currentLead + getLeadingMargin(child, crossAxis);
            // TODO(prenaux): Correctly set the height of items with undefined
            //                (auto) crossAxis dimension.
          }
        }

        currentLead += lineHeight;
      }
    }

    let /*bool*/ needsMainTrailingPos = false;
    let /*bool*/ needsCrossTrailingPos = false;

    // If the user didn't specify a width or height, and it has not been set
    // by the container, then we set it via the children.
    if (!isMainDimDefined) {
      node.layout[dim[mainAxis]] = fmaxf(
        // We're missing the last padding at this point to get the final
        // dimension
        boundAxis(node, mainAxis, linesMainDim + getTrailingPaddingAndBorder(node, mainAxis)),
        // We can never assign a width smaller than the padding and borders
        paddingAndBorderAxisMain
      );

      if (mainAxis === CSS_FLEX_DIRECTION_ROW_REVERSE || mainAxis === CSS_FLEX_DIRECTION_COLUMN_REVERSE) {
        needsMainTrailingPos = true;
      }
    }

    if (!isCrossDimDefined) {
      node.layout[dim[crossAxis]] = fmaxf(
        // For the cross dim, we add both sides at the end because the value
        // is aggregate via a max function. Intermediate negative values
        // can mess this computation otherwise
        boundAxis(node, crossAxis, linesCrossDim + paddingAndBorderAxisCross),
        paddingAndBorderAxisCross
      );

      if (crossAxis === CSS_FLEX_DIRECTION_ROW_REVERSE || crossAxis === CSS_FLEX_DIRECTION_COLUMN_REVERSE) {
        needsCrossTrailingPos = true;
      }
    }

    // <Loop F> Set trailing position if necessary
    if (needsMainTrailingPos || needsCrossTrailingPos) {
      for (i = 0; i < childCount; ++i) {
        child = node.children[i]!;

        if (needsMainTrailingPos) {
          setTrailingPosition(node, child, mainAxis);
        }

        if (needsCrossTrailingPos) {
          setTrailingPosition(node, child, crossAxis);
        }
      }
    }

    // <Loop G> Calculate dimensions for absolutely positioned elements
    currentAbsoluteChild = firstAbsoluteChild;
    while (currentAbsoluteChild !== null) {
      // Pre-fill dimensions when using absolute position and both offsets for
      // the axis are defined (either both left and right or top and bottom).
      for (ii = 0; ii < 2; ii++) {
        axis = ii !== 0 ? CSS_FLEX_DIRECTION_ROW : CSS_FLEX_DIRECTION_COLUMN;

        if (
          !isUndefined(node.layout[dim[axis]]) &&
          !isDimDefined(currentAbsoluteChild, axis) &&
          isPosDefined(currentAbsoluteChild, leading[axis]) &&
          isPosDefined(currentAbsoluteChild, trailing[axis])
        ) {
          currentAbsoluteChild.layout[dim[axis]] = fmaxf(
            boundAxis(
              currentAbsoluteChild,
              axis,
              (node.layout[dim[axis]] ?? 0) -
                getBorderAxis(node, axis) -
                getMarginAxis(currentAbsoluteChild, axis) -
                getPosition(currentAbsoluteChild, leading[axis]) -
                getPosition(currentAbsoluteChild, trailing[axis])
            ),
            // You never want to go smaller than padding
            getPaddingAndBorderAxis(currentAbsoluteChild, axis)
          );
        }

        if (isPosDefined(currentAbsoluteChild, trailing[axis]) && !isPosDefined(currentAbsoluteChild, leading[axis])) {
          currentAbsoluteChild.layout[leading[axis]] =
            (node.layout[dim[axis]] ?? 0) -
            (currentAbsoluteChild.layout[dim[axis]] ?? 0) -
            getPosition(currentAbsoluteChild, trailing[axis]);
        }
      }

      child = currentAbsoluteChild;
      currentAbsoluteChild = currentAbsoluteChild.nextAbsoluteChild;
      child.nextAbsoluteChild = null;
    }

    if (
      isOverflowHidden(node) &&
      !isUndefined(node.layout.width) &&
      !isUndefined(node.layout.height)
    ) {
      const leftBorder =
        resolvedRowAxis === CSS_FLEX_DIRECTION_ROW
          ? getLeadingBorder(node, resolvedRowAxis)
          : getTrailingBorder(node, resolvedRowAxis);
      const rightBorder =
        resolvedRowAxis === CSS_FLEX_DIRECTION_ROW
          ? getTrailingBorder(node, resolvedRowAxis)
          : getLeadingBorder(node, resolvedRowAxis);

      node.overflowClip = {
        left: leftBorder,
        top: getLeadingBorder(node, CSS_FLEX_DIRECTION_COLUMN),
        right: (node.layout.width ?? 0) - rightBorder,
        bottom: (node.layout.height ?? 0) - getTrailingBorder(node, CSS_FLEX_DIRECTION_COLUMN)
      };
    } else {
      node.overflowClip = undefined;
    }
  }

  function layoutFixedNode(layoutContext: LayoutContext, node: ComputedLayoutNode, parentDirection?: LayoutDirection): void {
    const direction = resolveDirection(node, parentDirection);
    const root = layoutContext.rootNode;
    const viewportWidth = root.layout.width;
    const viewportHeight = root.layout.height;

    node.layout.width = undefined;
    node.layout.height = undefined;
    node.layout.top = 0;
    node.layout.left = 0;
    node.layout.right = 0;
    node.layout.bottom = 0;
    node.overflowClip = undefined;

    prefillFixedDimensions(node, viewportWidth, viewportHeight);

    layoutNodeImpl(layoutContext, node, viewportWidth, direction);

    resolveFixedLeadingPositions(node, viewportWidth, viewportHeight);
    resolveFixedTrailingPositions(node, viewportWidth, viewportHeight);

    // Children of a fixed node keep using the fixed box as their containing block.
    for (const child of node.children) {
      if (getPositionType(child) === CSS_POSITION_FIXED) {
        continue;
      }

      if (child.layout.width !== undefined && node.layout.width !== undefined) {
        child.layout.right = node.layout.width - child.layout.width - child.layout.left;
      }
      if (child.layout.height !== undefined && node.layout.height !== undefined) {
        child.layout.bottom = node.layout.height - child.layout.height - child.layout.top;
      }
    }

    // Maintain resolved direction metadata explicitly after the root-scoped pass.
    node.layout.direction = direction;
    node.layout.position = CSS_POSITION_FIXED;
    node.layout.zIndex = getLayoutZIndex(node, CSS_POSITION_FIXED);
    node.layout.isFixedStackingContext = true;
  }

  function layoutNodeWithContext(
    layoutContext: LayoutContext,
    node: ComputedLayoutNode,
    parentMaxWidth?: number,
    parentDirection?: LayoutDirection
  ) {
    node.shouldUpdate = true;

    const direction = node.style.direction || CSS_DIRECTION_LTR;
    const skipLayout =
      !node.isDirty &&
      node.lastLayout &&
      node.lastLayout.requestedHeight === node.layout.height &&
      node.lastLayout.requestedWidth === node.layout.width &&
      node.lastLayout.parentMaxWidth === parentMaxWidth &&
      node.lastLayout.direction === direction;

    if (skipLayout) {
      restoreCachedLayout(node);
    } else {
      if (!node.lastLayout) {
        node.lastLayout = {};
      }

      node.lastLayout.requestedWidth = node.layout.width;
      node.lastLayout.requestedHeight = node.layout.height;
      node.lastLayout.parentMaxWidth = parentMaxWidth;
      node.lastLayout.direction = direction;

      // Reset child layouts
      resetChildrenLayout(node);

      node.overflowClip = undefined;

      layoutNodeImpl(layoutContext, node, parentMaxWidth, parentDirection);

      if (node === layoutContext.rootNode && layoutContext.fixedChildren.length > 0) {
        const fixedDirection = node.layout.direction;
        for (let fixedIndex = 0; fixedIndex < layoutContext.fixedChildren.length; fixedIndex++) {
          layoutFixedNode(layoutContext, layoutContext.fixedChildren[fixedIndex], fixedDirection);
        }
        layoutContext.fixedChildren.length = 0;
      }

      setCachedLayout(node);
    }
  }

  function layoutNode(
    node: ComputedLayoutNode,
    parentMaxWidth?: number,
    parentDirection?: LayoutDirection
  ): ComputedLayoutNode {
    const layoutContext = {rootNode: node, fixedChildren: []};
    layoutNodeWithContext(layoutContext, node, parentMaxWidth, parentDirection);
    normalizeAbsoluteContainingBlocks(layoutContext, node, parentDirection, node, 0, 0);
    return node;
  }

  return {
    layoutNodeImpl: layoutNodeImpl,
    computeLayout: layoutNode,
    fillNodes: fillNodes
  };
})();

export const computeLayoutEngine: LayoutEngine = layoutEngine;

function hydrateAutomaticTextMeasures(node: ComputedLayoutNode): void {
  ensureTextMeasure(node.style as LayoutStyle & {measure?: TextMeasure});
  node.children.forEach(hydrateAutomaticTextMeasures);
}

export function fillNodes(node: LayoutNode): ComputedLayoutNode {
  return computeLayoutEngine.fillNodes(node);
}

export function layoutNodeImpl(
  node: LayoutNode,
  parentMaxWidth?: number,
  parentDirection?: LayoutDirection
): ComputedLayoutNode {
  const computedNode = computeLayoutEngine.fillNodes(node);
  computeLayoutEngine.layoutNodeImpl({rootNode: computedNode, fixedChildren: []}, computedNode, parentMaxWidth, parentDirection);
  return computedNode;
}

export function computeLayout(
  node: LayoutNode,
  parentMaxWidth?: number,
  parentDirection?: LayoutDirection
): ComputedLayoutNode {
  const computedNode = computeLayoutEngine.fillNodes(node);
  hydrateAutomaticTextMeasures(computedNode);
  return computeLayoutEngine.computeLayout(computedNode, parentMaxWidth, parentDirection);
}

export default computeLayout;
