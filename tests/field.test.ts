import { describe, expect, it } from "vitest";

import { STATION_TYPES } from "../src/assets/stations";
import {
	FIELD_SLOTS,
	randomPointIn,
	randomSpawnPoint,
	randomWanderPoint,
	slotPosition,
	SPAWN_AREA,
	WANDER_AREA,
} from "../src/config/field";
import { COOK_HALF_SIZE, STATION_HALF_SIZE } from "../src/constants";
import {
	chainRoot,
	DISH_RECIPES,
	prepChain,
	RAW_ITEM_STATION,
} from "../src/config/recipes";

// Раскладка привязана к ячейкам 128x128 от левого верхнего угла и требует
// сетку минимум 15x8, поэтому проверяем только разрешения от 1920x1080.
const SCREENS = [
	{ width: 1920, height: 1080 },
	{ width: 2560, height: 1440 },
];

const STATION_HALF = STATION_HALF_SIZE;
const COOK_HALF = COOK_HALF_SIZE;

function inArea(
	point: { x: number; y: number },
	screen: { width: number; height: number },
	area: { xMin: number; xMax: number; yMin: number; yMax: number },
) {
	return (
		point.x >= screen.width * area.xMin &&
		point.x <= screen.width * area.xMax &&
		point.y >= screen.height * area.yMin &&
		point.y <= screen.height * area.yMax
	);
}

function pixelSlots(screen: { width: number; height: number }) {
	return FIELD_SLOTS.map((slot) => ({
		station: slot.station,
		...slotPosition(slot, screen),
	}));
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

describe("раскладка станций", () => {
	it("каждая станция из STATION_TYPES стоит на поле ровно один раз", () => {
		const placed = FIELD_SLOTS.map((slot) => slot.station);

		expect(placed.length).toBe(STATION_TYPES.length);

		for (const type of STATION_TYPES) {
			expect(placed.filter((s) => s === type)).toHaveLength(1);
		}
	});

	it.each(SCREENS)(
		"все ячейки помещаются на экран на $width x $height",
		(screen) => {
			for (const slot of FIELD_SLOTS) {
				expect(() => slotPosition(slot, screen)).not.toThrow();
			}
		},
	);

	it.each(SCREENS)(
		"станции не наезжают друг на друга и не уходят за экран на $width x $height",
		(screen) => {
			const slots = pixelSlots(screen);

			for (let i = 0; i < slots.length; i++) {
				const current = slots[i];
				if (!current) continue;

				expect(current.x - STATION_HALF).toBeGreaterThanOrEqual(0);
				expect(current.y - STATION_HALF).toBeGreaterThanOrEqual(0);
				expect(current.x + STATION_HALF).toBeLessThanOrEqual(screen.width);
				expect(current.y + STATION_HALF).toBeLessThanOrEqual(screen.height);

				for (let j = i + 1; j < slots.length; j++) {
					const other = slots[j];
					if (!other) continue;

					expect(dist(current, other)).toBeGreaterThanOrEqual(STATION_HALF * 2);
				}
			}
		},
	);

	it("у каждого рецепта весь маршрут проходит по станциям на поле", () => {
		const placed = FIELD_SLOTS.map((s) => s.station);

		for (const recipe of DISH_RECIPES) {
			for (const layer of recipe.layers) {
				expect(placed).toContain(RAW_ITEM_STATION[chainRoot(layer)]);

				for (const step of prepChain(layer)) {
					expect(placed).toContain(step.at);
				}
			}

			expect(placed).toContain(recipe.finishAt);
		}
	});
});

describe("области спавна и блуждания", () => {
	it("обе области внутри экрана", () => {
		for (const area of [SPAWN_AREA, WANDER_AREA]) {
			expect(area.xMin).toBeLessThan(area.xMax);
			expect(area.yMin).toBeLessThan(area.yMax);
		}
	});

	it("область блуждания шире области спавна", () => {
		expect(WANDER_AREA.xMin).toBeLessThanOrEqual(SPAWN_AREA.xMin);
		expect(WANDER_AREA.xMax).toBeGreaterThanOrEqual(SPAWN_AREA.xMax);
		expect(WANDER_AREA.yMin).toBeLessThanOrEqual(SPAWN_AREA.yMin);
		expect(WANDER_AREA.yMax).toBeGreaterThanOrEqual(SPAWN_AREA.yMax);
	});
});

describe("randomPointIn", () => {
	it("при random=0 даёт левый верх области", () => {
		const screen = { width: 1920, height: 1080 };
		expect(randomPointIn(SPAWN_AREA, screen, () => 0)).toEqual({
			x: screen.width * SPAWN_AREA.xMin,
			y: screen.height * SPAWN_AREA.yMin,
		});
	});

	it("при random=0.5 даёт центр области", () => {
		const screen = { width: 1920, height: 1080 };
		const point = randomPointIn(SPAWN_AREA, screen, () => 0.5);
		const centerX = ((SPAWN_AREA.xMin + SPAWN_AREA.xMax) / 2) * screen.width;
		const centerY = ((SPAWN_AREA.yMin + SPAWN_AREA.yMax) / 2) * screen.height;

		expect(point.x).toBeCloseTo(centerX);
		expect(point.y).toBeCloseTo(centerY);
	});

	it("детерминирован при фиксированном random", () => {
		const screen = { width: 1920, height: 1080 };
		const seq = [0.1, 0.9, 0.42, 0.77, 0.33];
		let index = 0;
		const random = () => seq[index++ % seq.length] ?? 0;

		const first = Array.from({ length: 5 }, () =>
			randomSpawnPoint(screen, random),
		);
		index = 0;
		const second = Array.from({ length: 5 }, () =>
			randomSpawnPoint(screen, random),
		);

		expect(first).toEqual(second);
	});
});

describe("случайные точки не попадают на станции", () => {
	it.each(SCREENS)(
		"спавн: 2000 точек на $width x $height — все в экране и не на станциях",
		(screen) => {
			const slots = pixelSlots(screen);

			for (let i = 0; i < 2000; i++) {
				const point = randomSpawnPoint(screen);

				expect(inArea(point, screen, SPAWN_AREA)).toBe(true);
				expect(point.x - COOK_HALF).toBeGreaterThanOrEqual(0);
				expect(point.y - COOK_HALF).toBeGreaterThanOrEqual(0);
				expect(point.x + COOK_HALF).toBeLessThanOrEqual(screen.width);
				expect(point.y + COOK_HALF).toBeLessThanOrEqual(screen.height);

				for (const slot of slots) {
					expect(dist(point, slot)).toBeGreaterThan(STATION_HALF + COOK_HALF);
				}
			}
		},
	);

	it.each(SCREENS)(
		"блуждание: 2000 точек на $width x $height — все в экране и не на станциях",
		(screen) => {
			const slots = pixelSlots(screen);

			for (let i = 0; i < 2000; i++) {
				const point = randomWanderPoint(screen);

				expect(inArea(point, screen, WANDER_AREA)).toBe(true);
				expect(point.x - COOK_HALF).toBeGreaterThanOrEqual(0);
				expect(point.y - COOK_HALF).toBeGreaterThanOrEqual(0);
				expect(point.x + COOK_HALF).toBeLessThanOrEqual(screen.width);
				expect(point.y + COOK_HALF).toBeLessThanOrEqual(screen.height);

				for (const slot of slots) {
					expect(dist(point, slot)).toBeGreaterThan(STATION_HALF + COOK_HALF);
				}
			}
		},
	);
});

describe("точки не кладутся в один пиксель", () => {
	it("5000 случайных точек дают заметный разброс", () => {
		const screen = { width: 1920, height: 1080 };
		const points = Array.from({ length: 5000 }, () =>
			randomWanderPoint(screen),
		);
		const xs = new Set(points.map((p) => Math.round(p.x)));

		expect(xs.size).toBeGreaterThan(200);
	});
});
