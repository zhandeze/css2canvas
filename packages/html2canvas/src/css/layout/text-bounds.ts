import {Bounds} from './bounds';

export class TextBounds {
  readonly text: string;
  readonly bounds: Bounds;

  constructor(text: string, bounds: Bounds) {
    this.text = text;
    this.bounds = bounds;
  }
}
