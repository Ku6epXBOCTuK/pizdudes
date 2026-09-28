import type { StationType } from "../assets/stations";

export interface FieldSlot {
	station: StationType;
	x: number;
	y: number;
}

export const FIELD_SLOTS: FieldSlot[] = [
	{ station: "bun-shelf", x: 0.12, y: 0.24 },
	{ station: "veggie-shelf", x: 0.12, y: 0.48 },
	{ station: "patty-grill", x: 0.12, y: 0.72 },
	{ station: "cash-register", x: 0.88, y: 0.24 },
	{ station: "serving-counter", x: 0.88, y: 0.48 },
	{ station: "trash-can", x: 0.88, y: 0.72 },
];
