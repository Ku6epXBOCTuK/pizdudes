import type { StationType } from "../assets/stations";

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
