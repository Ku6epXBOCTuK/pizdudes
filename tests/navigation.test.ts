import { describe, expect, it } from "vitest";

import { hasArrived, moveToward } from "../src/core/navigation";
import { AI_ARRIVE_DISTANCE, AGENT_SPEED } from "../src/constants";
import type { Vector2 } from "../src/core/world";

const STATION = "serving-counter" as const;

function agent(position: Vector2, at: Vector2 | null = null) {
	return {
		position,
		velocity: { x: 0, y: 0 },
		target: at ? { type: STATION, position: at } : null,
	};
}

function target(cook: ReturnType<typeof agent>): Vector2 | null {
	return cook.target ? cook.target.position : null;
}

describe("moveToward", () => {
	it("разгоняет до AGENT_SPEED", () => {
		const cook = agent({ x: 0, y: 0 }, { x: 500, y: 0 });

		moveToward(cook, target(cook)!);

		expect(Math.hypot(cook.velocity.x, cook.velocity.y)).toBeCloseTo(
			AGENT_SPEED,
		);
	});

	it("ведёт точно в цель", () => {
		const cook = agent({ x: 0, y: 0 }, { x: 300, y: 400 });

		moveToward(cook, target(cook)!);

		const expected = Math.atan2(400, 300);
		expect(Math.atan2(cook.velocity.y, cook.velocity.x)).toBeCloseTo(expected);
	});

	it.each([
		["вправо", { x: 1, y: 0 }],
		["вниз", { x: 0, y: 1 }],
		["влево", { x: -1, y: 0 }],
		["вверх", { x: 0, y: -1 }],
		["по диагонали", { x: 1, y: 1 }],
	])("не делит на ноль: %s", (_name, direction) => {
		const cook = agent({ x: 0, y: 0 }, direction);

		moveToward(cook, target(cook)!);

		expect(Number.isFinite(cook.velocity.x)).toBe(true);
		expect(Number.isFinite(cook.velocity.y)).toBe(true);
	});

	it("останавливается в радиусе прибытия", () => {
		const cook = agent({ x: 0, y: 0 }, { x: AI_ARRIVE_DISTANCE - 1, y: 0 });

		moveToward(cook, target(cook)!);

		expect(cook.velocity).toEqual({ x: 0, y: 0 });
	});

	it("на границе радиуса ещё двигается", () => {
		const cook = agent({ x: 0, y: 0 }, { x: AI_ARRIVE_DISTANCE + 1, y: 0 });

		moveToward(cook, target(cook)!);

		expect(cook.velocity.x).toBeGreaterThan(0);
	});

	it("скорость не зависит от расстояния", () => {
		const near = agent({ x: 0, y: 0 }, { x: 100, y: 0 });
		const far = agent({ x: 0, y: 0 }, { x: 5000, y: 0 });

		moveToward(near, target(near)!);
		moveToward(far, target(far)!);

		expect(near.velocity.x).toBeCloseTo(far.velocity.x);
	});

	it("движение к цели за конечное число шагов приводит к прибытию", () => {
		const goal = { x: 900, y: 300 };
		const cook = agent({ x: 0, y: 0 }, goal);
		const step = 1000 / 60;

		for (let frame = 0; frame < 60 * 60; frame++) {
			if (hasArrived(cook)) break;
			moveToward(cook, target(cook)!);
			cook.position.x += (cook.velocity.x * step) / 1000;
			cook.position.y += (cook.velocity.y * step) / 1000;
		}

		expect(hasArrived(cook)).toBe(true);
	});
});

describe("hasArrived", () => {
	it("false без цели", () => {
		expect(hasArrived(agent({ x: 0, y: 0 }, null))).toBe(false);
	});

	it("true на месте", () => {
		expect(hasArrived(agent({ x: 100, y: 100 }, { x: 100, y: 100 }))).toBe(
			true,
		);
	});

	it("true внутри радиуса прибытия", () => {
		expect(
			hasArrived(agent({ x: 0, y: 0 }, { x: AI_ARRIVE_DISTANCE, y: 0 })),
		).toBe(true);
	});

	it("false за радиусом прибытия", () => {
		expect(
			hasArrived(agent({ x: 0, y: 0 }, { x: AI_ARRIVE_DISTANCE + 10, y: 0 })),
		).toBe(false);
	});

	it("симметрично: расстояние считается в обе стороны", () => {
		expect(hasArrived(agent({ x: 0, y: 0 }, { x: -50, y: 0 }))).toBe(
			hasArrived(agent({ x: 0, y: 0 }, { x: 50, y: 0 })),
		);
	});
});
