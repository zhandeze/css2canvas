import {layoutWithLines, measureNaturalWidth, prepareWithSegments} from '@chenglou/pretext';
import type {PreparedTextWithSegments} from '@chenglou/pretext';

import {normalizeTextStyle} from './normalize-style';
import {alignLines} from './align';
import {decorateLines} from './decorate';
import type {NormalizedTextStyle, TextMeasureResult, TextStyleInput} from './types';

export interface PreparedTextBlock {
  text: string;
  style: NormalizedTextStyle;
  prepared: PreparedTextWithSegments;
}

function toPretextWordBreak(wordBreak: NormalizedTextStyle['wordBreak']): 'normal' | 'keep-all' {
  return wordBreak === 'keep-all' ? 'keep-all' : 'normal';
}

export function prepareTextBlock(text: string, style: TextStyleInput): PreparedTextBlock {
  const normalized = normalizeTextStyle(style, text);
  const prepared = prepareWithSegments(normalized.text, normalized.font, {
    whiteSpace: normalized.whiteSpace,
    wordBreak: toPretextWordBreak(normalized.wordBreak),
    letterSpacing: normalized.letterSpacing
  });

  return {
    text: normalized.text,
    style: normalized,
    prepared
  };
}

export function layoutPreparedText(block: PreparedTextBlock, width: number): TextMeasureResult {
  const targetWidth = Number.isFinite(width) && width > 0 ? width : measureNaturalWidth(block.prepared);
  const layout = layoutWithLines(block.prepared, targetWidth, block.style.lineHeight);
  const lines = alignLines(layout.lines, targetWidth, block.style.textAlign, block.style.direction).map(
    (line, index) => ({
      ...line,
      y: index * block.style.lineHeight,
      height: block.style.lineHeight
    })
  );
  const decoratedLines = decorateLines(lines, block.style);

  return {
    width: layout.lines.reduce((maxWidth, line) => Math.max(maxWidth, line.width), 0),
    height: layout.lineCount * block.style.lineHeight,
    lineCount: layout.lineCount,
    lines: decoratedLines
  };
}
