import type { StationType } from "../assets/stations";
import type { Vector2 } from "../core/world";

export interface FieldSlot {
	station: StationType;
	x: number;
	y: number;
}

export interface FieldArea {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
}

export const SPAWN_AREA: FieldArea = {
	xMin: 0.34,
	xMax: 0.66,
	yMin: 0.2,
	yMax: 0.8,
};

export const WANDER_AREA: FieldArea = {
	xMin: 0.26,
	xMax: 0.74,
	yMin: 0.12,
	yMax: 0.88,
};

export const FIELD_SLOTS: FieldSlot[] = [
	{ station: "bun-shelf", x: 0.12, y: 0.12 },
	{ station: "patty-grill", x: 0.12, y: 0.37 },
	{ station: "cheese-shelf", x: 0.12, y: 0.62 },
	{ station: "veggie-shelf", x: 0.12, y: 0.87 },
	{ station: "cash-register", x: 0.88, y: 0.12 },
	{ station: "serving-counter", x: 0.88, y: 0.37 },
	{ station: "sauce-dispenser", x: 0.88, y: 0.62 },
	{ station: "trash-can", x: 0.88, y: 0.87 },
];

export function randomPointIn(
	area: FieldArea,
	screen: { width: number; height: number },
	random: () => number = Math.random,
): Vector2 {
	return {
		x: screen.width * (area.xMin + random() * (area.xMax - area.xMin)),
		y: screen.height * (area.yMin + random() * (area.yMax - area.yMin)),
	};
}

export function randomSpawnPoint(
	screen: { width: number; height: number },
	random: () => number = Math.random,
): Vector2 {
	return randomPointIn(SPAWN_AREA, screen, random);
}

export function randomWanderPoint(
	screen: { width: number; height: number },
	random: () => number = Math.random,
): Vector2 {
	return randomPointIn(WANDER_AREA, screen, random);
}
