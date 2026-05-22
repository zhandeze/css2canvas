import {splitGraphemes} from 'text-segmentation';

export const supportsNativeTextSegmentation = (): boolean =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  !!(typeof Intl !== 'undefined' && (Intl as any).Segmenter);

export const segmentGraphemes = (value: string): string[] => {
  if (supportsNativeTextSegmentation()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const segmenter = new (Intl as any).Segmenter(void 0, {granularity: 'grapheme'});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Array.from(segmenter.segment(value)).map((segment: any) => segment.segment);
  }

  return splitGraphemes(value);
};
