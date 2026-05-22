import {ElementContainer} from '../element-container';
import type {Color} from '../../css/types/color';
import {Context} from '../../core/context';

export class IFrameElementContainer extends ElementContainer {
  readonly containerType = 'iframe';
  src: string;
  width: number;
  height: number;
  tree?: ElementContainer;
  backgroundColor: Color;

  constructor(context: Context, iframe: HTMLIFrameElement) {
    super(context, iframe);
    this.src = iframe.src;
    this.width = parseInt(iframe.width, 10) || 0;
    this.height = parseInt(iframe.height, 10) || 0;
    this.backgroundColor = this.styles.backgroundColor;
  }
}
