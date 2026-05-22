import assert from 'node:assert/strict';
import test from 'node:test';

import {computeLayout} from '../css-layout';
import type {LayoutNode} from '../css-layout';

test('computeLayout matches the documented padding and stretch example', () => {
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

  assert.deepEqual(nodeTree.layout, {
    width: 120,
    height: 120,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    direction: 'ltr'
  });

  assert.deepEqual(nodeTree.children[0].layout, {
    width: 20,
    height: 20,
    top: 50,
    left: 50,
    right: 0,
    bottom: 0,
    direction: 'ltr'
  });
});

test('computeLayout uses style.measure(width) for reflowable leaf nodes', () => {
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

  assert.deepEqual(calls, [180]);
  assert.deepEqual(nodeTree.children[0].layout, {
    width: 40,
    height: 30,
    top: 10,
    left: 10,
    right: 0,
    bottom: 0,
    direction: 'ltr'
  });
  assert.equal(nodeTree.layout.width, 60);
  assert.equal(nodeTree.layout.height, 50);
});
