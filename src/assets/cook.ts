import { Rectangle, Texture, type TextureSource } from "pixi.js";

import type { Vector2 } from "../core/world";

export const COOK_CELL = 84;
export const COOK_COLUMNS = 8;
export const COOK_ROWS = 9;

export const COOK_WALK_FPS = 0.25;

export const COOK_DIRECTION_ROWS = {
	south: 1,
	"south-east": 2,
	east: 3,
	"north-east": 4,
	north: 5,
	"north-west": 6,
	west: 7,
	"south-west": 8,
} as const;

export type CookDirection = keyof typeof COOK_DIRECTION_ROWS;

export type CookWalkFrames = Record<CookDirection, Texture[]>;

const DIRECTION_ORDER: CookDirection[] = [
	"east",
	"south-east",
	"south",
	"south-west",
	"west",
	"north-west",
	"north",
	"north-east",
];

const STEP_ANGLE = Math.PI / 4;

const walkFramesCache = new WeakMap<TextureSource, CookWalkFrames>();

function cookFrame(sheet: Texture, column: number, row: number): Texture {
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

function cookRow(sheet: Texture, row: number): Texture[] {
	return Array.from({ length: COOK_COLUMNS }, (_, column) =>
		cookFrame(sheet, column, row),
	);
}

export function cookDirectionFromVelocity(velocity: Vector2): CookDirection {
	const step = Math.round(Math.atan2(velocity.y, velocity.x) / STEP_ANGLE);
	return DIRECTION_ORDER[((step % 8) + 8) % 8]!;
}

export function cookWalkFrames(sheet: Texture): CookWalkFrames {
	const cached = walkFramesCache.get(sheet.source);
	if (cached) return cached;

	const frames = {} as CookWalkFrames;
	for (const direction of Object.keys(COOK_DIRECTION_ROWS) as CookDirection[]) {
		frames[direction] = cookRow(sheet, COOK_DIRECTION_ROWS[direction]);
	}

	walkFramesCache.set(sheet.source, frames);
	return frames;
}
