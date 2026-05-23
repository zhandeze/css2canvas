import {computeLayout} from '../css-layout';
import type {LayoutNode} from '../css-layout';

const createNode = (style: LayoutNode['style'], children: LayoutNode[] = []): LayoutNode => ({
  style,
  children,
  layout: undefined as never,
  lastLayout: undefined,
  nextAbsoluteChild: null,
  nextFlexChild: null
});

describe('computeLayout position semantics', () => {
  it('treats explicit static nodes as in-flow and ignores inset offsets', () => {
    const first = createNode({
      position: 'static',
      width: 40,
      height: 20,
      top: 100,
      left: 200,
      right: 300,
      bottom: 400
    });

    const second = createNode({
      width: 30,
      height: 10
    });

    const root = createNode(
      {
        width: 100,
        paddingTop: 5,
        paddingLeft: 7
      },
      [first, second]
    );

    computeLayout(root, 100, 'ltr');

    expect(first.layout).toMatchObject({
      width: 40,
      height: 20,
      top: 5,
      left: 7,
      right: 53,
      direction: 'ltr',
      position: 'static'
    });
    expect(second.layout).toMatchObject({
      width: 30,
      height: 10,
      top: 25,
      left: 7,
      right: 63,
      direction: 'ltr',
      position: 'static'
    });
  });

  it('keeps relative nodes in flow but applies inset offsets after normal placement', () => {
    const relativeChild = createNode({
      position: 'relative',
      width: 40,
      height: 20,
      top: 6,
      left: 8
    });

    const sibling = createNode({
      width: 30,
      height: 10
    });

    const root = createNode(
      {
        width: 100,
        paddingTop: 5,
        paddingLeft: 7
      },
      [relativeChild, sibling]
    );

    computeLayout(root, 100, 'ltr');

    expect(relativeChild.layout).toMatchObject({
      width: 40,
      height: 20,
      top: 11,
      left: 15,
      right: 45,
      direction: 'ltr',
      position: 'relative'
    });
    expect(sibling.layout).toMatchObject({
      width: 30,
      height: 10,
      top: 25,
      left: 7,
      right: 63,
      direction: 'ltr',
      position: 'static'
    });
    expect(root.layout.height).toBe(35);
  });

  it('keeps absolute nodes out of flow and sizes the container from in-flow children only', () => {
    const absoluteChild = createNode({
      position: 'absolute',
      top: 4,
      left: 6,
      width: 50,
      height: 15
    });

    const inFlowChild = createNode({
      width: 30,
      height: 10
    });

    const root = createNode(
      {
        paddingTop: 5,
        paddingLeft: 7
      },
      [absoluteChild, inFlowChild]
    );

    computeLayout(root, 100, 'ltr');

    expect(root.layout.width).toBe(37);
    expect(root.layout.height).toBe(15);
    expect(absoluteChild.layout).toMatchObject({
      width: 50,
      height: 15,
      top: 4,
      left: 6,
      right: 6,
      bottom: 4,
      direction: 'ltr',
      position: 'absolute'
    });
    expect(inFlowChild.layout).toMatchObject({
      width: 30,
      height: 10,
      top: 5,
      left: 7,
      right: 0,
      direction: 'ltr',
      position: 'static'
    });
  });

  it('positions absolute children relative to relative parents', () => {
    const absoluteGrandchild = createNode({
      position: 'absolute',
      top: 12,
      left: 10,
      width: 30,
      height: 20
    });

    const relativeParent = createNode(
      {
        position: 'relative',
        width: 120,
        height: 80,
        top: 6,
        left: 8,
        borderLeftWidth: 3,
        borderTopWidth: 5,
        borderRightWidth: 4,
        borderBottomWidth: 6
      },
      [absoluteGrandchild]
    );

    const sibling = createNode({
      width: 20,
      height: 10
    });

    const root = createNode(
      {
        width: 200,
        paddingTop: 7,
        paddingLeft: 9
      },
      [relativeParent, sibling]
    );

    computeLayout(root, 200, 'ltr');

    expect(relativeParent.layout).toMatchObject({
      width: 120,
      height: 80,
      top: 13,
      left: 17,
      right: 63,
      position: 'relative'
    });
    expect(absoluteGrandchild.layout).toMatchObject({
      width: 30,
      height: 20,
      top: 17,
      left: 13,
      position: 'absolute'
    });
    expect(sibling.layout).toMatchObject({
      width: 20,
      height: 10,
      top: 87,
      left: 9,
      right: 171,
      bottom: 0,
      position: 'static'
    });
  });

  it('positions absolute children relative to absolute and fixed parents', () => {
    const absoluteChildOfAbsolute = createNode({
      position: 'absolute',
      top: 9,
      left: 7,
      width: 20,
      height: 10
    });

    const absoluteParent = createNode(
      {
        position: 'absolute',
        top: 15,
        left: 40,
        width: 100,
        height: 70,
        borderLeftWidth: 2,
        borderTopWidth: 4,
        borderRightWidth: 3,
        borderBottomWidth: 5
      },
      [absoluteChildOfAbsolute]
    );

    const absoluteChildOfFixed = createNode({
      position: 'absolute',
      right: 5,
      bottom: 7,
      width: 20,
      height: 10
    });

    const fixedParent = createNode(
      {
        position: 'fixed',
        right: 30,
        bottom: 20,
        width: 90,
        height: 60,
        borderLeftWidth: 6,
        borderTopWidth: 8,
        borderRightWidth: 4,
        borderBottomWidth: 2
      },
      [absoluteChildOfFixed]
    );

    const inFlowChild = createNode({
      width: 25,
      height: 15
    });

    const root = createNode(
      {
        width: 220,
        height: 140,
        paddingTop: 5,
        paddingLeft: 7
      },
      [absoluteParent, fixedParent, inFlowChild]
    );

    computeLayout(root, 220, 'ltr');

    expect(absoluteParent.layout).toMatchObject({
      width: 100,
      height: 70,
      top: 15,
      left: 40,
      position: 'absolute'
    });
    expect(absoluteChildOfAbsolute.layout).toMatchObject({
      width: 20,
      height: 10,
      top: 13,
      left: 9,
      position: 'absolute'
    });

    expect(fixedParent.layout).toMatchObject({
      width: 90,
      height: 60,
      top: 60,
      left: 100,
      right: 30,
      bottom: 20,
      position: 'fixed'
    });
    expect(absoluteChildOfFixed.layout).toMatchObject({
      width: 20,
      height: 10,
      top: 43,
      left: 65,
      right: 5,
      bottom: 7,
      position: 'absolute'
    });

    expect(inFlowChild.layout).toMatchObject({
      width: 25,
      height: 15,
      top: 5,
      left: 7,
      right: 188,
      bottom: 120,
      position: 'static'
    });
  });

  it('finds the nearest relative, absolute, or fixed ancestor for absolute grandchildren through static wrappers', () => {
    const absoluteUnderRelative = createNode({
      position: 'absolute',
      top: 13,
      left: 17,
      width: 20,
      height: 10
    });

    const staticWrapperInRelative = createNode(
      {
        width: 50,
        height: 25
      },
      [absoluteUnderRelative]
    );

    const relativeParent = createNode(
      {
        position: 'relative',
        width: 140,
        height: 90,
        borderLeftWidth: 3,
        borderTopWidth: 5,
        paddingLeft: 12,
        paddingTop: 9
      },
      [staticWrapperInRelative]
    );

    const absoluteUnderAbsolute = createNode({
      position: 'absolute',
      top: 8,
      left: 11,
      width: 18,
      height: 9
    });

    const staticWrapperInAbsolute = createNode(
      {
        width: 45,
        height: 20
      },
      [absoluteUnderAbsolute]
    );

    const absoluteParent = createNode(
      {
        position: 'absolute',
        top: 20,
        left: 30,
        width: 110,
        height: 70,
        borderLeftWidth: 4,
        borderTopWidth: 6,
        paddingLeft: 10,
        paddingTop: 7
      },
      [staticWrapperInAbsolute]
    );

    const absoluteUnderFixed = createNode({
      position: 'absolute',
      top: 9,
      left: 14,
      width: 16,
      height: 8
    });

    const staticWrapperInFixed = createNode(
      {
        width: 40,
        height: 18
      },
      [absoluteUnderFixed]
    );

    const fixedParent = createNode(
      {
        position: 'fixed',
        top: 15,
        left: 90,
        width: 100,
        height: 60,
        borderLeftWidth: 5,
        borderTopWidth: 7,
        paddingLeft: 9,
        paddingTop: 6
      },
      [staticWrapperInFixed]
    );

    const root = createNode(
      {
        width: 240,
        height: 160,
        paddingTop: 4,
        paddingLeft: 6
      },
      [relativeParent, absoluteParent, fixedParent]
    );

    computeLayout(root, 240, 'ltr');

    expect(staticWrapperInRelative.layout).toMatchObject({
      top: 14,
      left: 15,
      position: 'static'
    });
    expect(absoluteUnderRelative.layout).toMatchObject({
      top: 4,
      left: 5,
      position: 'absolute'
    });

    expect(staticWrapperInAbsolute.layout).toMatchObject({
      top: 13,
      left: 14,
      position: 'static'
    });
    expect(absoluteUnderAbsolute.layout).toMatchObject({
      top: 1,
      left: 1,
      position: 'absolute'
    });

    expect(staticWrapperInFixed.layout).toMatchObject({
      top: 13,
      left: 14,
      position: 'static'
    });
    expect(absoluteUnderFixed.layout).toMatchObject({
      top: 3,
      left: 5,
      position: 'absolute'
    });
  });

  it('treats fixed nodes as out of flow and positions them against the root viewport', () => {
    const fixedChild = createNode({
      position: 'fixed',
      top: 10,
      left: 20,
      width: 80,
      height: 30,
      zIndex: 5
    });

    const nestedStatic = createNode({
      position: 'static',
      width: 40,
      height: 10,
      top: 999,
      left: 999
    });

    fixedChild.children.push(nestedStatic);

    const inFlowChild = createNode({
      width: 50,
      height: 20
    });

    const root = createNode(
      {
        width: 200,
        height: 100,
        paddingTop: 6,
        paddingLeft: 8
      },
      [fixedChild, inFlowChild]
    );

    computeLayout(root, 200, 'ltr');

    expect(root.layout).toMatchObject({
      width: 200,
      height: 100,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      direction: 'ltr',
      position: 'static'
    });
    expect(inFlowChild.layout).toMatchObject({
      width: 50,
      height: 20,
      top: 6,
      left: 8,
      right: 142,
      direction: 'ltr',
      position: 'static'
    });
    expect(fixedChild.layout).toMatchObject({
      width: 80,
      height: 30,
      top: 10,
      left: 20,
      right: 100,
      bottom: 60,
      direction: 'ltr',
      position: 'fixed',
      isFixedStackingContext: true
    });
    expect(nestedStatic.layout).toMatchObject({
      width: 40,
      height: 10,
      top: 0,
      left: 0,
      right: 40,
      direction: 'ltr',
      position: 'static'
    });
  });

  it('records z-index metadata without changing geometric sibling order', () => {
    const first = createNode({
      position: 'relative',
      zIndex: 10,
      width: 40,
      height: 20
    });

    const second = createNode({
      position: 'relative',
      zIndex: -3,
      width: 30,
      height: 10
    });

    const root = createNode(
      {
        width: 100
      },
      [first, second]
    );

    computeLayout(root, 100, 'ltr');

    expect(first.layout.top).toBe(0);
    expect(second.layout.top).toBe(20);
    expect(first.layout.zIndex).toEqual({auto: false, order: 10});
    expect(second.layout.zIndex).toEqual({auto: false, order: -3});
  });

  it('treats static offsets, inset, and z-index as ineffective for layout and stacking metadata', () => {
    const staticChild = createNode({
      position: 'static',
      width: 40,
      height: 15,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      inset: 18,
      zIndex: 99
    });

    const sibling = createNode({
      width: 30,
      height: 10
    });

    const root = createNode(
      {
        width: 120,
        paddingTop: 6,
        paddingLeft: 9
      },
      [staticChild, sibling]
    );

    computeLayout(root, 120, 'ltr');

    expect(staticChild.layout).toMatchObject({
      width: 40,
      height: 15,
      top: 6,
      left: 9,
      right: 71,
      bottom: 0,
      position: 'static',
      zIndex: {auto: true, order: 0},
      isFixedStackingContext: false
    });
    expect(sibling.layout).toMatchObject({
      width: 30,
      height: 10,
      top: 21,
      left: 9,
      right: 81,
      bottom: 0,
      position: 'static'
    });
  });

  it('computes overflow clips for fixed nodes without affecting root in-flow sizing', () => {
    const fixedLeaf = createNode({
      measure() {
        return {width: 120, height: 80};
      }
    });

    const fixedChild = createNode(
      {
        position: 'fixed',
        top: 15,
        left: 25,
        width: 60,
        height: 40,
        overflow: 'hidden',
        borderLeftWidth: 2,
        borderRightWidth: 3,
        borderTopWidth: 4,
        borderBottomWidth: 5
      },
      [fixedLeaf]
    );

    const inFlowChild = createNode({
      width: 30,
      height: 10
    });

    const root = createNode(
      {
        width: 200,
        height: 100
      },
      [fixedChild, inFlowChild]
    );

    computeLayout(root, 200, 'ltr');

    expect(root.layout.width).toBe(200);
    expect(root.layout.height).toBe(100);
    expect(inFlowChild.layout.top).toBe(0);
    expect(fixedChild.overflowClip).toEqual({
      left: 2,
      top: 4,
      right: 57,
      bottom: 35
    });
    expect(fixedLeaf.layout.width).toBe(55);
    expect(fixedLeaf.layout.height).toBe(80);
  });

  it('maps fixed overflow clips correctly in rtl row-reverse containers', () => {
    const overflowingLeaf = createNode({
      measure() {
        return {width: 140, height: 50};
      }
    });

    const fixedChild = createNode(
      {
        position: 'fixed',
        direction: 'rtl',
        flexDirection: 'row-reverse',
        top: 7,
        right: 10,
        width: 60,
        height: 30,
        overflow: 'hidden',
        borderStartWidth: 9,
        borderEndWidth: 4,
        borderTopWidth: 1,
        borderBottomWidth: 3
      },
      [overflowingLeaf]
    );

    const root = createNode(
      {
        width: 200,
        height: 100
      },
      [fixedChild]
    );

    computeLayout(root, 200, 'ltr');

    expect(fixedChild.layout).toMatchObject({
      width: 60,
      height: 30,
      top: 7,
      left: 130,
      right: 10,
      bottom: 63,
      direction: 'rtl',
      position: 'fixed'
    });
    expect(fixedChild.overflowClip).toEqual({
      left: 4,
      top: 1,
      right: 51,
      bottom: 27
    });
    expect(overflowingLeaf.layout).toMatchObject({
      width: 140,
      height: 26,
      top: 1,
      left: 9,
      right: -89,
      bottom: 3,
      direction: 'rtl',
      position: 'static'
    });
  });

  it('treats inset: 0 as equivalent to left/right/top/bottom: 0 for fixed viewport stretching', () => {
    const explicitLeaf = createNode({
      measure() {
        return {width: 260, height: 120};
      }
    });

    const insetLeaf = createNode({
      measure() {
        return {width: 260, height: 120};
      }
    });

    const explicitFixed = createNode(
      {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        overflow: 'hidden',
        borderLeftWidth: 2,
        borderRightWidth: 4,
        borderTopWidth: 6,
        borderBottomWidth: 8,
        zIndex: 1
      },
      [explicitLeaf]
    );

    const insetFixed = createNode(
      {
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        borderLeftWidth: 2,
        borderRightWidth: 4,
        borderTopWidth: 6,
        borderBottomWidth: 8,
        zIndex: 2
      },
      [insetLeaf]
    );

    const inFlowChild = createNode({
      width: 40,
      height: 10
    });

    const root = createNode(
      {
        width: 180,
        height: 90,
        paddingTop: 5,
        paddingLeft: 7,
        borderWidth: 3
      },
      [explicitFixed, insetFixed, inFlowChild]
    );

    computeLayout(root, 180, 'ltr');

    expect(inFlowChild.layout).toMatchObject({
      top: 8,
      left: 10,
      right: 130,
      bottom: 72,
      position: 'static'
    });

    expect(explicitFixed.layout).toMatchObject({
      width: 180,
      height: 90,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      position: 'fixed',
      zIndex: {auto: false, order: 1},
      isFixedStackingContext: true
    });
    expect(insetFixed.layout).toMatchObject({
      width: 180,
      height: 90,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      position: 'fixed',
      zIndex: {auto: false, order: 2},
      isFixedStackingContext: true
    });

    expect(explicitFixed.overflowClip).toEqual({
      left: 2,
      top: 6,
      right: 176,
      bottom: 82
    });
    expect(insetFixed.overflowClip).toEqual({
      left: 2,
      top: 6,
      right: 176,
      bottom: 82
    });

    expect(explicitLeaf.layout).toMatchObject({
      width: 174,
      height: 120,
      top: 6,
      left: 2,
      right: 4,
      bottom: -36,
      position: 'static'
    });
    expect(insetLeaf.layout).toMatchObject({
      width: 174,
      height: 120,
      top: 6,
      left: 2,
      right: 4,
      bottom: -36,
      position: 'static'
    });
  });

  it('keeps fixed stacking isolated while preserving overflow clips across root and nested fixed nodes', () => {
    const nestedFixedLeaf = createNode({
      measure() {
        return {width: 110, height: 45};
      }
    });

    const nestedFixed = createNode(
      {
        position: 'fixed',
        right: 15,
        bottom: 12,
        width: 70,
        height: 25,
        overflow: 'hidden',
        borderLeftWidth: 1,
        borderRightWidth: 2,
        borderTopWidth: 3,
        borderBottomWidth: 4,
        zIndex: 9
      },
      [nestedFixedLeaf]
    );

    const fixedScrollableLeaf = createNode({
      measure() {
        return {width: 160, height: 90};
      }
    });

    const fixedChild = createNode(
      {
        position: 'fixed',
        top: 14,
        right: 18,
        left: 30,
        bottom: 16,
        overflow: 'hidden',
        borderLeftWidth: 5,
        borderRightWidth: 7,
        borderTopWidth: 9,
        borderBottomWidth: 11,
        zIndex: 4
      },
      [fixedScrollableLeaf, nestedFixed]
    );

    const normalChild = createNode({
      width: 60,
      height: 20
    });

    const root = createNode(
      {
        width: 220,
        height: 140,
        overflow: 'hidden',
        borderLeftWidth: 2,
        borderRightWidth: 3,
        borderTopWidth: 4,
        borderBottomWidth: 5,
        paddingLeft: 6,
        paddingTop: 8
      },
      [fixedChild, normalChild]
    );

    computeLayout(root, 220, 'ltr');

    expect(root.layout).toMatchObject({
      width: 220,
      height: 140,
      position: 'static'
    });
    expect(root.overflowClip).toEqual({
      left: 2,
      top: 4,
      right: 217,
      bottom: 135
    });

    expect(normalChild.layout).toMatchObject({
      width: 60,
      height: 20,
      top: 12,
      left: 8,
      right: 152,
      bottom: 108,
      position: 'static'
    });

    expect(fixedChild.layout).toMatchObject({
      width: 172,
      height: 110,
      top: 14,
      left: 30,
      right: 18,
      bottom: 16,
      position: 'fixed',
      zIndex: {auto: false, order: 4},
      isFixedStackingContext: true
    });
    expect(fixedChild.overflowClip).toEqual({
      left: 5,
      top: 9,
      right: 165,
      bottom: 99
    });

    expect(fixedScrollableLeaf.layout).toMatchObject({
      width: 160,
      height: 90,
      top: 9,
      left: 5,
      right: 7,
      bottom: 11,
      position: 'static'
    });

    expect(nestedFixed.layout).toMatchObject({
      width: 70,
      height: 25,
      top: 103,
      left: 135,
      right: 15,
      bottom: 12,
      position: 'fixed',
      zIndex: {auto: false, order: 9},
      isFixedStackingContext: true
    });
    expect(nestedFixed.overflowClip).toEqual({
      left: 1,
      top: 3,
      right: 68,
      bottom: 21
    });

    expect(nestedFixedLeaf.layout).toMatchObject({
      width: 67,
      height: 45,
      top: 3,
      left: 1,
      right: 2,
      bottom: -23,
      position: 'static'
    });
  });
});
