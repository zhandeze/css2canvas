export type Color = number;

export const TRANSPARENT_MINIAPP_COLOR: Color = 0x00000000;

export const packColor = (r: number, g: number, b: number, a = 1): Color =>
  ((toByte(r) << 24) | (toByte(g) << 16) | (toByte(b) << 8) | toByte(clamp01(a) * 255)) >>> 0;

export const parseColor = (value: string): Color => {
  const input = value.trim().toLowerCase();

  if (input === 'transparent') {
    return TRANSPARENT_MINIAPP_COLOR;
  }

  const hex = parseHexColor(input);
  if (hex !== null) {
    return hex;
  }

  const rgb = parseRgbColor(input);
  if (rgb !== null) {
    return rgb;
  }

  const hsl = parseHslColor(input);
  if (hsl !== null) {
    return hsl;
  }

  throw new Error(`Unsupported miniapp color: ${value}`);
};

export const parseOptionalColor = (value?: string | null): Color | null =>
  typeof value === 'string' ? parseColor(value) : null;

const parseHexColor = (input: string): Color | null => {
  const matched = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(input);
  if (!matched) {
    return null;
  }

  const hex = matched[1];

  if (hex.length === 3 || hex.length === 4) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
    return packColor(r, g, b, a);
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return packColor(r, g, b, a);
};

const parseRgbColor = (input: string): Color | null => {
  const matched = /^rgba?\((.+)\)$/.exec(input);
  if (!matched) {
    return null;
  }

  const parts = splitFunctionArgs(matched[1]);
  if (parts.length !== 3 && parts.length !== 4) {
    return null;
  }

  const r = parseRgbChannel(parts[0]);
  const g = parseRgbChannel(parts[1]);
  const b = parseRgbChannel(parts[2]);
  const a = parts.length === 4 ? parseAlpha(parts[3]) : 1;

  return packColor(r, g, b, a);
};

const parseHslColor = (input: string): Color | null => {
  const matched = /^hsla?\((.+)\)$/.exec(input);
  if (!matched) {
    return null;
  }

  const parts = splitFunctionArgs(matched[1]);
  if (parts.length !== 3 && parts.length !== 4) {
    return null;
  }

  const h = parseHue(parts[0]);
  const s = parsePercent(parts[1]);
  const l = parsePercent(parts[2]);
  const a = parts.length === 4 ? parseAlpha(parts[3]) : 1;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hPrime < 1) {
    r = c;
    g = x;
  } else if (hPrime < 2) {
    r = x;
    g = c;
  } else if (hPrime < 3) {
    g = c;
    b = x;
  } else if (hPrime < 4) {
    g = x;
    b = c;
  } else if (hPrime < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return packColor((r + m) * 255, (g + m) * 255, (b + m) * 255, a);
};

const splitFunctionArgs = (input: string): string[] => {
  if (input.includes(',')) {
    return input
      .split(/\s*,\s*/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const sections = input.split('/').map((item) => item.trim());
  if (sections.length > 2) {
    return [];
  }

  const parts = sections[0].split(/\s+/).filter(Boolean);
  if (sections.length === 2) {
    parts.push(sections[1]);
  }

  return parts;
};

const parseRgbChannel = (input: string): number =>
  input.endsWith('%') ? (parseFloat(input) / 100) * 255 : parseFloat(input);

const parseAlpha = (input: string): number => (input.endsWith('%') ? parseFloat(input) / 100 : parseFloat(input));

const parsePercent = (input: string): number => parseFloat(input) / 100;

const parseHue = (input: string): number => {
  if (input.endsWith('deg')) {
    return parseFloat(input);
  }
  if (input.endsWith('grad')) {
    return parseFloat(input) * 0.9;
  }
  if (input.endsWith('rad')) {
    return (parseFloat(input) * 180) / Math.PI;
  }
  if (input.endsWith('turn')) {
    return parseFloat(input) * 360;
  }
  return parseFloat(input);
};

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
};

const toByte = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(255, Math.max(0, Math.round(value)));
};
