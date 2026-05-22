import type {TextAlign, TextDirection, TextLineBox} from './types';

function resolveAlign(textAlign: TextAlign, direction: TextDirection): 'left' | 'center' | 'right' {
  if (textAlign === 'center') {
    return 'center';
  }

  if (textAlign === 'right') {
    return 'right';
  }

  if (textAlign === 'left' || textAlign === 'justify') {
    return 'left';
  }

  return direction === 'rtl' ? 'right' : 'left';
}

export function alignLines(
  lines: Array<{text: string; width: number}>,
  containerWidth: number,
  textAlign: TextAlign,
  direction: TextDirection
): TextLineBox[] {
  const resolvedAlign = resolveAlign(textAlign, direction);
  return lines.map((line) => {
    let x = 0;
    if (resolvedAlign === 'center') {
      x = Math.max(0, (containerWidth - line.width) / 2);
    } else if (resolvedAlign === 'right') {
      x = Math.max(0, containerWidth - line.width);
    }

    return {
      text: line.text,
      width: line.width,
      x,
      y: 0,
      height: 0,
      decorations: []
    };
  });
}
