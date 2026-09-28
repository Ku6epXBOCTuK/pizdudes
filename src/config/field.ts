import type { StationType } from "../assets/stations";
import { COOK_HALF_SIZE, STATION_HALF_SIZE } from "../constants";
import type { Vector2 } from "../core/world";

export type ApproachSide = "left" | "right" | "top" | "bottom";

export interface FieldSlot {
	station: StationType;
	x: number;
	y: number;
	approach: ApproachSide;
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
	{ station: "bun-shelf", x: 0.12, y: 0.12, approach: "right" },
	{ station: "patty-grill", x: 0.12, y: 0.37, approach: "right" },
	{ station: "cheese-shelf", x: 0.12, y: 0.62, approach: "right" },
	{ station: "veggie-shelf", x: 0.12, y: 0.87, approach: "right" },
	{ station: "cash-register", x: 0.88, y: 0.12, approach: "left" },
	{ station: "serving-counter", x: 0.88, y: 0.37, approach: "left" },
	{ station: "sauce-dispenser", x: 0.88, y: 0.62, approach: "left" },
	{ station: "trash-can", x: 0.88, y: 0.87, approach: "left" },
];

export function slotPosition(
	slot: FieldSlot,
	screen: { width: number; height: number },
): Vector2 {
	return { x: slot.x * screen.width, y: slot.y * screen.height };
}

export function approachPoint(
	slot: FieldSlot,
	screen: { width: number; height: number },
): Vector2 {
	const station = slotPosition(slot, screen);
	const offset = STATION_HALF_SIZE + COOK_HALF_SIZE;

	switch (slot.approach) {
		case "left":
			return { x: station.x - offset, y: station.y };
		case "right":
			return { x: station.x + offset, y: station.y };
		case "top":
			return { x: station.x, y: station.y - offset };
		case "bottom":
			return { x: station.x, y: station.y + offset };
	}
}

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
