export type TextWhiteSpace = 'normal' | 'pre-wrap';
export type TextWordBreak = 'normal' | 'keep-all' | 'break-all';
export type TextAlign = 'start' | 'end' | 'left' | 'right' | 'center' | 'justify';
export type TextDecorationLine = 'none' | 'underline' | 'overline' | 'line-through';
export type TextDirection = 'ltr' | 'rtl' | 'inherit';

export interface TextStyleInput {
  text?: string;
  font?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  lineHeight?: number | string;
  letterSpacing?: number;
  whiteSpace?: TextWhiteSpace;
  wordBreak?: TextWordBreak;
  textAlign?: TextAlign;
  textDecoration?: string | string[];
  textDecorationColor?: string;
  color?: string;
  direction?: TextDirection;
  [key: string]: unknown;
}

export interface NormalizedTextStyle {
  text: string;
  font: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number | string;
  fontStyle: 'normal' | 'italic' | 'oblique';
  lineHeight: number;
  letterSpacing: number;
  whiteSpace: TextWhiteSpace;
  wordBreak: TextWordBreak;
  textAlign: TextAlign;
  textDecorationLines: TextDecorationLine[];
  textDecorationColor: string;
  color: string;
  direction: 'ltr' | 'rtl';
}

export interface TextDecorationBox {
  line: TextDecorationLine;
  color: string;
  x: number;
  y: number;
  width: number;
  thickness: number;
}

export interface TextLineBox {
  text: string;
  width: number;
  x: number;
  y: number;
  height: number;
  decorations: TextDecorationBox[];
}

export interface TextMeasureResult {
  width: number;
  height: number;
  lineCount: number;
  lines: TextLineBox[];
}

export type TextMeasure = (width: number) => TextMeasureResult;
