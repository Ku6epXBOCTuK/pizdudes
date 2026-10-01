import type { StationType } from "../assets/stations";
import { COOK_HALF_SIZE, STATION_HALF_SIZE } from "../constants";
import type { Vector2 } from "../core/world";

export type ApproachSide = "left" | "right" | "top" | "bottom";

export interface FieldSlot {
	station: StationType;
	cell: GridCell;
	approach: ApproachSide;
}

export interface FieldArea {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
}

export const SPAWN_AREA: FieldArea = {
	xMin: 0.22,
	xMax: 0.48,
	yMin: 0.41,
	yMax: 0.61,
};

export const WANDER_AREA: FieldArea = {
	xMin: 0.05,
	xMax: 0.8,
	yMin: 0.26,
	yMax: 0.74,
};

export const CELL_SIZE = 128;

export type GridCell = `${string}${number}`;

export interface GridMetrics {
	columns: number;
	rows: number;
	offsetX: number;
	offsetY: number;
}

export function gridMetrics(screen: {
	width: number;
	height: number;
}): GridMetrics {
	const columns = Math.max(1, Math.floor(screen.width / CELL_SIZE));
	const rows = Math.max(1, Math.floor(screen.height / CELL_SIZE));

	return {
		columns,
		rows,
		offsetX: (screen.width - columns * CELL_SIZE) / 2,
		offsetY: (screen.height - rows * CELL_SIZE) / 2,
	};
}

function cellIndices(cell: GridCell): { column: number; row: number } {
	const letter = cell.slice(0, 1).toLowerCase();
	const column = letter.charCodeAt(0) - "a".charCodeAt(0);
	const row = Number(cell.slice(1)) - 1;

	if (!/^[a-z]$/.test(letter) || !Number.isInteger(row) || row < 0) {
		throw new Error(`Неизвестная ячейка поля: ${cell}`);
	}

	return { column, row };
}

export function cellCenter(
	cell: GridCell,
	screen: { width: number; height: number },
): Vector2 {
	const { columns, rows, offsetX, offsetY } = gridMetrics(screen);
	const indices = cellIndices(cell);

	if (indices.column >= columns || indices.row >= rows) {
		throw new Error(`Ячейка ${cell} не помещается в сетку ${columns}x${rows}`);
	}

	return {
		x: offsetX + (indices.column + 0.5) * CELL_SIZE,
		y: offsetY + (indices.row + 0.5) * CELL_SIZE,
	};
}

export interface StationPlacement {
	station: StationType;
	cell: GridCell;
	approach: ApproachSide;
}

export const STATION_PLACEMENT: StationPlacement[] = [
	{ station: "bun-shelf", cell: "e3", approach: "bottom" },
	{ station: "produce-shelf", cell: "f3", approach: "bottom" },
	{ station: "dairy-shelf", cell: "g3", approach: "bottom" },
	{ station: "pantry-shelf", cell: "h3", approach: "bottom" },
	{ station: "fridge", cell: "i3", approach: "bottom" },
	{ station: "cutting-board", cell: "h8", approach: "top" },
	{ station: "grill", cell: "c4", approach: "right" },
	{ station: "dough-mixer", cell: "k4", approach: "left" },
	{ station: "pizza-oven", cell: "k5", approach: "left" },
	{ station: "stove-pot", cell: "c5", approach: "right" },
	{ station: "trash-can", cell: "i8", approach: "top" },
	{ station: "serving-counter", cell: "g8", approach: "top" },
	{ station: "cash-register", cell: "e8", approach: "top" },
];

export const FIELD_SLOTS: FieldSlot[] = STATION_PLACEMENT.map(
	({ station, cell, approach }) => ({ station, cell, approach }),
);

export function slotPosition(
	slot: FieldSlot,
	screen: { width: number; height: number },
): Vector2 {
	return cellCenter(slot.cell, screen);
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

const STATION_CLEARANCE = STATION_HALF_SIZE + COOK_HALF_SIZE;
const SAMPLE_ATTEMPTS = 16;

function distanceToNearestStation(
	point: Vector2,
	screen: { width: number; height: number },
): number {
	let nearest = Infinity;

	for (const slot of FIELD_SLOTS) {
		const station = slotPosition(slot, screen);
		nearest = Math.min(
			nearest,
			Math.hypot(point.x - station.x, point.y - station.y),
		);
	}

	return nearest;
}

function randomClearPointIn(
	area: FieldArea,
	screen: { width: number; height: number },
	random: () => number,
): Vector2 {
	let best = randomPointIn(area, screen, random);
	let bestDistance = distanceToNearestStation(best, screen);

	for (
		let attempt = 1;
		attempt < SAMPLE_ATTEMPTS && bestDistance <= STATION_CLEARANCE;
		attempt++
	) {
		const candidate = randomPointIn(area, screen, random);
		const distance = distanceToNearestStation(candidate, screen);

		if (distance > bestDistance) {
			best = candidate;
			bestDistance = distance;
		}
	}

	return best;
}

export function randomSpawnPoint(
	screen: { width: number; height: number },
	random: () => number = Math.random,
): Vector2 {
	return randomClearPointIn(SPAWN_AREA, screen, random);
}

export function randomWanderPoint(
	screen: { width: number; height: number },
	random: () => number = Math.random,
): Vector2 {
	return randomClearPointIn(WANDER_AREA, screen, random);
}
