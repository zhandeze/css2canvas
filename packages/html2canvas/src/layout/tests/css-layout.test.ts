import {computeLayout} from '../css-layout';
import type {LayoutNode} from '../css-layout';

describe('computeLayout', () => {
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
        layout: undefined,
        lastLayout: undefined,
        nextAbsoluteChild: null,
        nextFlexChild: null
      }
    ],
    layout: undefined,
    lastLayout: undefined,
    nextAbsoluteChild: null,
    nextFlexChild: null
  };

  computeLayout(nodeTree);

  expect(nodeTree.layout).toEqual({
    width: 120,
    height: 120,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    direction: 'ltr'
  });

  expect(nodeTree.children[0].layout).toEqual({
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
        layout: undefined,
        lastLayout: undefined,
        nextAbsoluteChild: null,
        nextFlexChild: null
      }
    ],
    layout: undefined,
    lastLayout: undefined,
    nextAbsoluteChild: null,
    nextFlexChild: null
  };

  computeLayout(nodeTree, 200, 'ltr');

  expect(calls).toEqual([180]);
  expect(nodeTree.children[0].layout).toEqual({
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
});
