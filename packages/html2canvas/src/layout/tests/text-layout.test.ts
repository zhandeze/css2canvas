import assert from 'node:assert/strict';
import test from 'node:test';

import {computeLayout} from '../css-layout';
import type {LayoutNode} from '../css-layout';

class FakeCanvasContext2D {
  font = '16px sans-serif';

  measureText(text: string) {
    let width = 0;
    for (const ch of Array.from(text)) {
      if (ch === ' ') {
        width += 4;
      } else if (ch === '\n' || ch === '\t') {
        width += 0;
      } else {
        width += 10;
      }
    }
    return {width};
  }
}

class FakeOffscreenCanvas {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext(kind: string) {
    if (kind === '2d') {
      return new FakeCanvasContext2D();
    }
    return null;
  }
}

(globalThis as typeof globalThis & {OffscreenCanvas?: typeof FakeOffscreenCanvas}).OffscreenCanvas =
  FakeOffscreenCanvas as unknown as typeof OffscreenCanvas;

test('computeLayout auto-creates text measure from text style', () => {
  const nodeTree: LayoutNode = {
    style: {
      padding: 10,
    },
    children: [
      {
        style: {
          text: 'abcdefgh',
          color: 'black',
          fontFamily: 'sans-serif',
          fontSize: 16,
          lineHeight: 20,
          textAlign: 'center',
          textDecoration: 'underline',
          textDecorationColor: 'red',
        },
        children: [],
        layout: undefined,
        lastLayout: undefined,
        nextAbsoluteChild: null,
        nextFlexChild: null,
      },
    ],
    layout: undefined,
    lastLayout: undefined,
    nextAbsoluteChild: null,
    nextFlexChild: null,
  };

  computeLayout(nodeTree, 80, 'ltr');

  assert.deepEqual(nodeTree.children[0].layout, {
    width: 60,
    height: 40,
    top: 10,
    left: 10,
    right: 0,
    bottom: 0,
    direction: 'ltr',
  });
  assert.equal(nodeTree.layout.width, 80);
  assert.equal(nodeTree.layout.height, 60);
  assert.equal(typeof nodeTree.children[0].style.measure, 'function');
});

test('computeLayout refreshes auto text measure when text changes', () => {
  const child: LayoutNode = {
    style: {
      text: 'abcdefgh',
      color: 'black',
      fontFamily: 'sans-serif',
      fontSize: 16,
      lineHeight: 20,
    },
    children: [],
    layout: undefined,
    lastLayout: undefined,
    nextAbsoluteChild: null,
    nextFlexChild: null,
  };

  const nodeTree: LayoutNode = {
    style: {
      padding: 10,
    },
    children: [child],
    layout: undefined,
    lastLayout: undefined,
    nextAbsoluteChild: null,
    nextFlexChild: null,
  };

  computeLayout(nodeTree, 80, 'ltr');
  assert.equal(child.layout.width, 60);
  assert.equal(child.layout.height, 40);

  child.style.text = 'ab';
  child.isDirty = true;
  nodeTree.isDirty = true;

  computeLayout(nodeTree, 80, 'ltr');
  assert.equal(child.layout.width, 20);
  assert.equal(child.layout.height, 20);
});

test('computeLayout keeps explicit measure when provided', () => {
  const calls: number[] = [];
  const nodeTree: LayoutNode = {
    style: {
      padding: 10,
    },
    children: [
      {
        style: {
          text: 'abcdefgh',
          measure(width: number) {
            calls.push(width);
            return {width: 30, height: 10};
          },
        },
        children: [],
        layout: undefined,
        lastLayout: undefined,
        nextAbsoluteChild: null,
        nextFlexChild: null,
      },
    ],
    layout: undefined,
    lastLayout: undefined,
    nextAbsoluteChild: null,
    nextFlexChild: null,
  };

  computeLayout(nodeTree, 80, 'ltr');

  assert.deepEqual(calls, [60]);
  assert.equal(nodeTree.children[0].layout.width, 30);
  assert.equal(nodeTree.children[0].layout.height, 10);
});

test('computeLayout uses default lineHeight when text style omits it', () => {
  const child: LayoutNode = {
    style: {
      text: 'abcdefgh',
      color: 'black',
      fontFamily: 'sans-serif',
      fontSize: 16,
    },
    children: [],
    layout: undefined,
    lastLayout: undefined,
    nextAbsoluteChild: null,
    nextFlexChild: null,
  };

  const nodeTree: LayoutNode = {
    style: {
      padding: 10,
    },
    children: [child],
    layout: undefined,
    lastLayout: undefined,
    nextAbsoluteChild: null,
    nextFlexChild: null,
  };

  computeLayout(nodeTree, 80, 'ltr');

  assert.equal(child.layout.width, 60);
  assert.equal(child.layout.height, 38.4);
  assert.equal(nodeTree.layout.height, 58.4);
});

test('computeLayout treats numeric unitless lineHeight as fontSize multiplier', () => {
  const child: LayoutNode = {
    style: {
      text: 'abcdefgh',
      color: 'black',
      fontFamily: 'sans-serif',
      fontSize: 16,
      lineHeight: 1,
    },
    children: [],
    layout: undefined,
    lastLayout: undefined,
    nextAbsoluteChild: null,
    nextFlexChild: null,
  };

  const nodeTree: LayoutNode = {
    style: {
      padding: 10,
    },
    children: [child],
    layout: undefined,
    lastLayout: undefined,
    nextAbsoluteChild: null,
    nextFlexChild: null,
  };

  computeLayout(nodeTree, 80, 'ltr');

  assert.equal(child.layout.width, 60);
  assert.equal(child.layout.height, 32);
  assert.equal(nodeTree.layout.height, 52);
});

test('computeLayout treats fractional unitless lineHeight as fontSize multiplier', () => {
  const child: LayoutNode = {
    style: {
      text: 'abcdefgh',
      color: 'black',
      fontFamily: 'sans-serif',
      fontSize: 16,
      lineHeight: 1.2,
    },
    children: [],
    layout: undefined,
    lastLayout: undefined,
    nextAbsoluteChild: null,
    nextFlexChild: null,
  };

  const nodeTree: LayoutNode = {
    style: {
      padding: 10,
    },
    children: [child],
    layout: undefined,
    lastLayout: undefined,
    nextAbsoluteChild: null,
    nextFlexChild: null,
  };

  computeLayout(nodeTree, 80, 'ltr');

  assert.equal(child.layout.width, 60);
  assert.equal(child.layout.height, 38.4);
  assert.equal(nodeTree.layout.height, 58.4);
});

test('computeLayout still accepts pixel lineHeight values', () => {
  const child: LayoutNode = {
    style: {
      text: 'abcdefgh',
      color: 'black',
      fontFamily: 'sans-serif',
      fontSize: 16,
      lineHeight: 20,
    },
    children: [],
    layout: undefined,
    lastLayout: undefined,
    nextAbsoluteChild: null,
    nextFlexChild: null,
  };

  const nodeTree: LayoutNode = {
    style: {
      padding: 10,
    },
    children: [child],
    layout: undefined,
    lastLayout: undefined,
    nextAbsoluteChild: null,
    nextFlexChild: null,
  };

  computeLayout(nodeTree, 80, 'ltr');

  assert.equal(child.layout.width, 60);
  assert.equal(child.layout.height, 40);
  assert.equal(nodeTree.layout.height, 60);
});
