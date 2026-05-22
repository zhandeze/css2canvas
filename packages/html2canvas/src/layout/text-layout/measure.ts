import type {TextMeasure, TextMeasureResult, TextStyleInput} from './types';

import {layoutPreparedText, prepareTextBlock} from './pretext-adapter';

const AUTO_TEXT_MEASURE_SIGNATURE = Symbol('autoTextMeasureSignature');

type AutoTextMeasureStyle = TextStyleInput & {
  text?: unknown;
  measure?: TextMeasure;
  [AUTO_TEXT_MEASURE_SIGNATURE]?: string;
};

function getTextDecorationSignature(value: TextStyleInput['textDecoration']): string {
  if (Array.isArray(value)) {
    return value.join(' ');
  }
  return value ?? '';
}

function getAutoTextMeasureSignature(style: AutoTextMeasureStyle): string {
  return JSON.stringify({
    text: typeof style.text === 'string' ? style.text : '',
    font: style.font ?? '',
    fontSize: style.fontSize ?? '',
    fontFamily: style.fontFamily ?? '',
    fontWeight: style.fontWeight ?? '',
    fontStyle: style.fontStyle ?? '',
    lineHeight: style.lineHeight ?? '',
    letterSpacing: style.letterSpacing ?? '',
    whiteSpace: style.whiteSpace ?? '',
    wordBreak: style.wordBreak ?? '',
    textAlign: style.textAlign ?? '',
    textDecoration: getTextDecorationSignature(style.textDecoration),
    textDecorationColor: style.textDecorationColor ?? '',
    color: style.color ?? '',
    direction: style.direction ?? '',
  });
}

export function measureTextBlock(text: string, style: TextStyleInput, width: number): TextMeasureResult {
  const block = prepareTextBlock(text, style);
  return layoutPreparedText(block, width);
}

export function createTextMeasure(text: string, style: TextStyleInput): TextMeasure {
  const block = prepareTextBlock(text, style);
  let lastWidth: number | undefined;
  let lastResult: TextMeasureResult | undefined;

  return (width: number) => {
    if (lastWidth === width && lastResult !== undefined) {
      return lastResult;
    }

    lastWidth = width;
    lastResult = layoutPreparedText(block, width);
    return lastResult;
  };
}

export function ensureTextMeasure<T extends AutoTextMeasureStyle>(style: T): T {
  const text = typeof style.text === 'string' ? style.text : undefined;

  if (text === undefined) {
    if (style[AUTO_TEXT_MEASURE_SIGNATURE] !== undefined) {
      delete style.measure;
      delete style[AUTO_TEXT_MEASURE_SIGNATURE];
    }
    return style;
  }

  if (style.measure !== undefined && style[AUTO_TEXT_MEASURE_SIGNATURE] === undefined) {
    return style;
  }

  const nextSignature = getAutoTextMeasureSignature(style);
  if (style[AUTO_TEXT_MEASURE_SIGNATURE] === nextSignature && style.measure !== undefined) {
    return style;
  }

  style.measure = createTextMeasure(text, style);
  style[AUTO_TEXT_MEASURE_SIGNATURE] = nextSignature;
  return style;
}
