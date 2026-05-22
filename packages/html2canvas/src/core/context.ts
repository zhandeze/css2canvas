import {Logger} from './logger';
import {Cache, ResourceOptions} from './cache-storage';
import {Bounds} from '../css/layout/bounds';
import {RenderCache} from '../render/render-context';

export interface ContextCache {
  addImage(src: string): Promise<void>;
  match(src: string): Promise<any>;
}

export type ContextOptions = {
  logging: boolean;
  cache?: ContextCache;
} & ResourceOptions;

export class Context {
  private static instanceCount = 1;
  private readonly instanceName = `#${Context.instanceCount++}`;
  readonly logger: Logger;
  readonly cache: RenderCache;

  constructor(options: ContextOptions, public windowBounds: Bounds) {
    this.logger = new Logger({id: this.instanceName, enabled: options.logging});
    this.cache = options.cache ?? new Cache(this, options);
  }
}
