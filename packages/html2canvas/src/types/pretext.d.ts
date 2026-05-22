declare module '@chenglou/pretext' {
	export type PreparedTextWithSegments = any;

	export function prepareWithSegments(
		text: string,
		font: string,
		options: {whiteSpace: string; wordBreak: string; letterSpacing: number}
	): PreparedTextWithSegments;

	export function measureNaturalWidth(prepared: PreparedTextWithSegments): number;

	export function layoutWithLines(
		prepared: PreparedTextWithSegments,
		width: number,
		lineHeight: number
	): {
		lines: Array<{text: string; width: number; x: number; y: number; height: number}>;
		lineCount: number;
	};
}
