import { Rectangle, Texture } from "pixi.js";

export const COOK_CELL = 84;
export const COOK_COLUMNS = 8;
export const COOK_ROWS = 9;

export const COOK_POSE = {
	walkLeft: 1,
	walkRight: 3,
	walkBack: 4,
	idle: 8,
} as const;

export type CookPose = (typeof COOK_POSE)[keyof typeof COOK_POSE];

export function cookFrame(
	sheet: Texture,
	column: number,
	row: number,
): Texture {
	return new Texture({
		source: sheet.source,
		frame: new Rectangle(
			column * COOK_CELL,
			row * COOK_CELL,
			COOK_CELL,
			COOK_CELL,
		),
	});
}

export function cookRow(sheet: Texture, row: number): Texture[] {
	return Array.from({ length: COOK_COLUMNS }, (_, column) =>
		cookFrame(sheet, column, row),
	);
}
