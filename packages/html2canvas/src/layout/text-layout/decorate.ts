import type {NormalizedTextStyle, TextDecorationBox, TextLineBox, TextDecorationLine} from './types';

function decorationY(line: TextDecorationLine, lineTop: number, fontSize: number, lineHeight: number): number {
  if (line === 'overline') {
    return lineTop + fontSize * 0.1;
  }
  if (line === 'line-through') {
    return lineTop + fontSize * 0.45;
  }
  return lineTop + lineHeight - Math.max(1, fontSize * 0.08);
}

export function decorateLines(lines: TextLineBox[], style: NormalizedTextStyle): TextLineBox[] {
  if (style.textDecorationLines.length === 0) {
    return lines;
  }

  const thickness = Math.max(1, style.fontSize / 14);
  return lines.map((line) => {
    const decorations: TextDecorationBox[] = style.textDecorationLines.map((textDecorationLine) => ({
      line: textDecorationLine,
      color: style.textDecorationColor,
      x: line.x,
      y: decorationY(textDecorationLine, line.y, style.fontSize, line.height || style.lineHeight),
      width: line.width,
      thickness
    }));
    return {
      ...line,
      decorations
    };
  });
}
