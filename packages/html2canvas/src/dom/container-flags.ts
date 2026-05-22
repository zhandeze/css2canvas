export const enum FLAGS {
  CREATES_STACKING_CONTEXT = 1 << 1,
  CREATES_REAL_STACKING_CONTEXT = 1 << 2,
  IS_LIST_OWNER = 1 << 3,
  DEBUG_RENDER = 1 << 4
}

export type ContainerType =
  | 'element'
  | 'image'
  | 'canvas'
  | 'svg'
  | 'input'
  | 'textarea'
  | 'select'
  | 'iframe'
  | 'li'
  | 'ol';
