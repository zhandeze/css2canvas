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

describe('computeLayout', () => {
  it('returns the same node tree after mutating layout in place', () => {
    const nodeTree: LayoutNode = {
      style: {
        padding: 10
      },
      children: [],
      layout: undefined as never,
      lastLayout: undefined,
      nextAbsoluteChild: null,
      nextFlexChild: null
    };

    const result = computeLayout(nodeTree, 100, 'ltr');

    expect(result).toBe(nodeTree);
    expect(result.layout).toMatchObject({
      width: 20,
      height: 20,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      direction: 'ltr',
      position: 'static'
    });
  });

  it('matches the documented padding and stretch example', () => {
    const nodeTree: LayoutNode = {
      style: {
        padding: 50
      },
      children: [
        {
          style: {
            padding: 10,
            alignSelf: 'stretch'
          },
          children: [],
          layout: undefined as never,
          lastLayout: undefined,
          nextAbsoluteChild: null,
          nextFlexChild: null
        }
      ],
      layout: undefined as never,
      lastLayout: undefined,
      nextAbsoluteChild: null,
      nextFlexChild: null
    };

    computeLayout(nodeTree);

    expect(nodeTree.layout).toMatchObject({
      width: 120,
      height: 120,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      direction: 'ltr'
    });

    expect(nodeTree.children[0].layout).toMatchObject({
      width: 20,
      height: 20,
      top: 50,
      left: 50,
      right: 0,
      bottom: 0,
      direction: 'ltr'
    });
  });

  it('uses style.measure(width) for reflowable leaf nodes', () => {
    const calls: number[] = [];
    const nodeTree: LayoutNode = {
      style: {
        padding: 10
      },
      children: [
        {
          style: {
            measure(width: number) {
              calls.push(width);
              return {width: 40, height: 30};
            }
          },
          children: [],
          layout: undefined as never,
          lastLayout: undefined,
          nextAbsoluteChild: null,
          nextFlexChild: null
        }
      ],
      layout: undefined as never,
      lastLayout: undefined,
      nextAbsoluteChild: null,
      nextFlexChild: null
    };

    computeLayout(nodeTree, 200, 'ltr');

    expect(calls).toEqual([180]);
    expect(nodeTree.children[0].layout).toMatchObject({
      width: 40,
      height: 30,
      top: 10,
      left: 10,
      right: 0,
      bottom: 0,
      direction: 'ltr'
    });
    expect(nodeTree.layout.width).toBe(60);
    expect(nodeTree.layout.height).toBe(50);
  });

  it('computes an overflow clip rect for hidden overflow nodes', () => {
    const nodeTree: LayoutNode = {
      style: {
        width: 80,
        height: 50,
        overflow: 'hidden',
        borderLeftWidth: 1,
        borderRightWidth: 2,
        borderTopWidth: 3,
        borderBottomWidth: 4
      },
      children: [
        {
          style: {
            measure() {
              return {width: 120, height: 90};
            }
          },
          children: [],
          layout: undefined as never,
          lastLayout: undefined,
          nextAbsoluteChild: null,
          nextFlexChild: null
        }
      ],
      layout: undefined as never,
      lastLayout: undefined,
      nextAbsoluteChild: null,
      nextFlexChild: null
    };

    computeLayout(nodeTree, 200, 'ltr');

    expect(nodeTree.layout).toMatchObject({
      width: 80,
      height: 50,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      direction: 'ltr'
    });
    expect(nodeTree.overflowClip).toEqual({
      left: 1,
      top: 3,
      right: 78,
      bottom: 46
    });
    expect(nodeTree.children[0].layout.height).toBe(90);
  });

  it('tracks nested overflow clips across axes and clears stale clips after recompute', () => {
    const overflowingGrandchild = createNode({
      measure() {
        return {width: 140, height: 120};
      }
    });

    const nestedOverflowNode = createNode(
      {
        width: 90,
        height: 70,
        overflowX: 'hidden',
        borderLeftWidth: 5,
        borderRightWidth: 6,
        borderTopWidth: 7,
        borderBottomWidth: 8,
        padding: 4
      },
      [overflowingGrandchild]
    );

    const verticalOverflowLeaf = createNode({
      measure() {
        return {width: 100, height: 50};
      }
    });

    const verticalOverflowNode = createNode(
      {
        width: 80,
        height: 30,
        overflowY: 'hidden',
        borderWidth: 2,
        marginTop: 3
      },
      [verticalOverflowLeaf]
    );

    const plainOverflowLeaf = createNode({
      measure() {
        return {width: 70, height: 40};
      }
    });

    const plainNode = createNode(
      {
        width: 60,
        height: 25
      },
      [plainOverflowLeaf]
    );

    const nodeTree = createNode(
      {
        width: 150,
        height: 90,
        overflow: 'hidden',
        borderLeftWidth: 1,
        borderRightWidth: 2,
        borderTopWidth: 3,
        borderBottomWidth: 4,
        paddingLeft: 6,
        paddingTop: 5
      },
      [nestedOverflowNode, verticalOverflowNode, plainNode]
    );

    computeLayout(nodeTree, 200, 'ltr');

    expect(nodeTree.overflowClip).toEqual({
      left: 1,
      top: 3,
      right: 148,
      bottom: 86
    });
    expect(nestedOverflowNode.overflowClip).toEqual({
      left: 5,
      top: 7,
      right: 84,
      bottom: 62
    });
    expect(verticalOverflowNode.overflowClip).toEqual({
      left: 2,
      top: 2,
      right: 78,
      bottom: 28
    });
    expect(plainNode.overflowClip).toBeUndefined();

    expect(nestedOverflowNode.layout.left).toBe(7);
    expect(nestedOverflowNode.layout.top).toBe(8);
    expect(verticalOverflowNode.layout.left).toBe(7);
    expect(verticalOverflowNode.layout.top).toBe(81);

    expect(overflowingGrandchild.layout.width).toBe(71);
    expect(overflowingGrandchild.layout.height).toBe(120);
    expect(overflowingGrandchild.layout.top).toBe(11);
    expect(overflowingGrandchild.layout.left).toBe(9);
    expect(overflowingGrandchild.layout.bottom).toBe(-61);

    expect(verticalOverflowLeaf.layout.width).toBe(76);
    expect(verticalOverflowLeaf.layout.height).toBe(50);
    expect(verticalOverflowLeaf.layout.top).toBe(2);
    expect(verticalOverflowLeaf.layout.left).toBe(2);
    expect(verticalOverflowLeaf.layout.bottom).toBe(-22);

    expect(plainOverflowLeaf.layout.width).toBe(60);
    expect(plainOverflowLeaf.layout.height).toBe(40);
    expect(plainOverflowLeaf.layout.bottom).toBe(-15);

    nodeTree.style.overflow = 'visible';
    nestedOverflowNode.style.overflowX = 'visible';
    verticalOverflowNode.style.overflowY = 'visible';
    nodeTree.isDirty = true;
    nestedOverflowNode.isDirty = true;
    verticalOverflowNode.isDirty = true;

    computeLayout(nodeTree, 200, 'ltr');

    expect(nodeTree.overflowClip).toBeUndefined();
    expect(nestedOverflowNode.overflowClip).toBeUndefined();
    expect(verticalOverflowNode.overflowClip).toBeUndefined();
    expect(plainNode.overflowClip).toBeUndefined();
    expect(overflowingGrandchild.layout.width).toBe(71);
    expect(overflowingGrandchild.layout.height).toBe(120);
  });

  it('maps logical start and end borders into physical overflow clip edges in rtl row-reverse containers', () => {
    const overflowingChild = createNode({
      measure() {
        return {width: 150, height: 60};
      }
    });

    const nodeTree = createNode(
      {
        width: 100,
        height: 40,
        overflow: 'hidden',
        direction: 'rtl',
        flexDirection: 'row-reverse',
        borderStartWidth: 9,
        borderEndWidth: 4,
        borderTopWidth: 1,
        borderBottomWidth: 3
      },
      [overflowingChild]
    );

    computeLayout(nodeTree, 200, 'ltr');

    expect(nodeTree.layout).toMatchObject({
      width: 100,
      height: 40,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      direction: 'rtl'
    });
    expect(nodeTree.overflowClip).toEqual({
      left: 4,
      top: 1,
      right: 91,
      bottom: 37
    });
    expect(overflowingChild.layout.width).toBe(150);
    expect(overflowingChild.layout.height).toBe(36);
  });
});
