import type {NormalizedTextStyle, TextDecorationLine, TextStyleInput} from './types';

const DEFAULT_LINE_HEIGHT_MULTIPLIER = 1.2;

function normalizeFontWeight(value: number | string | undefined): number | string {
  if (value === undefined) {
    return 400;
  }
  return value;
}

function normalizeFontSize(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return 16;
  }
  return value;
}

function normalizeLineHeight(value: number | string | undefined, fontSize: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value <= 4 ? fontSize * value : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed !== '') {
      if (trimmed.endsWith('px')) {
        const pxValue = Number.parseFloat(trimmed.slice(0, -2));
        if (Number.isFinite(pxValue) && pxValue > 0) {
          return pxValue;
        }
      }

      const numericValue = Number.parseFloat(trimmed);
      if (Number.isFinite(numericValue) && numericValue > 0) {
        return numericValue <= 4 ? fontSize * numericValue : numericValue;
      }
    }
  }

  return fontSize * DEFAULT_LINE_HEIGHT_MULTIPLIER;
}

function normalizeDecoration(value: string | string[] | undefined): TextDecorationLine[] {
  const source = Array.isArray(value) ? value : (value ?? '').split(/\s+/);
  const lines: TextDecorationLine[] = [];
  for (const entry of source) {
    if (entry === 'underline' || entry === 'overline' || entry === 'line-through') {
      lines.push(entry);
    }
  }
  return lines;
}

function normalizeDirection(value: TextStyleInput['direction']): 'ltr' | 'rtl' {
  return value === 'rtl' ? 'rtl' : 'ltr';
}

function normalizeText(text: string | undefined): string {
  return (text ?? '').replace(/\r\n?/g, '\n');
}

function buildFont(style: TextStyleInput, fontSize: number): string {
  if (typeof style.font === 'string' && style.font.trim() !== '') {
    return style.font.trim();
  }

  const pieces: string[] = [];
  const fontStyle = style.fontStyle ?? 'normal';
  if (fontStyle !== 'normal') {
    pieces.push(fontStyle);
  }

  const fontWeight = normalizeFontWeight(style.fontWeight);
  if (fontWeight !== 400) {
    pieces.push(String(fontWeight));
  }

  pieces.push(`${fontSize}px`);
  pieces.push((style.fontFamily ?? 'sans-serif').trim() || 'sans-serif');
  return pieces.join(' ');
}

export function normalizeTextStyle(style: TextStyleInput, text: string): NormalizedTextStyle {
  const fontSize = normalizeFontSize(style.fontSize);
  const normalized: NormalizedTextStyle = {
    text: normalizeText(text),
    font: buildFont(style, fontSize),
    fontSize,
    fontFamily: (style.fontFamily ?? 'sans-serif').trim() || 'sans-serif',
    fontWeight: normalizeFontWeight(style.fontWeight),
    fontStyle: style.fontStyle ?? 'normal',
    lineHeight: normalizeLineHeight(style.lineHeight, fontSize),
    letterSpacing: style.letterSpacing ?? 0,
    whiteSpace: style.whiteSpace ?? 'normal',
    wordBreak: style.wordBreak ?? 'normal',
    textAlign: style.textAlign ?? 'start',
    textDecorationLines: normalizeDecoration(style.textDecoration),
    textDecorationColor: style.textDecorationColor ?? style.color ?? 'black',
    color: style.color ?? 'black',
    direction: normalizeDirection(style.direction)
  };
  return normalized;
}
