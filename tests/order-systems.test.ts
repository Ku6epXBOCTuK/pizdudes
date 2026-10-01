import { World } from "miniplex";
import { beforeEach, describe, expect, it } from "vitest";

import {
	approachPoint,
	FIELD_SLOTS,
	slotPosition,
	WANDER_AREA,
} from "../src/config/field";
import {
	createCarryState,
	createOrder,
	type DishRecipe,
	type LayerItem,
} from "../src/config/recipes";

function makeRecipe(
	layers: LayerItem[],
	overrides: Partial<DishRecipe> = {},
): DishRecipe {
	return {
		id: "test-recipe",
		name: "Тестовый",
		dish: "dish-burger",
		layers,
		order: "layered",
		finishAt: "serving-counter",
		...overrides,
	};
}
import { createControlState, type CookRequest } from "../src/config/control";
import type { StationType } from "../src/assets/stations";
import type { Entity, Vector2 } from "../src/core/world";
import { createCookSteeringSystem } from "../src/systems/cook-steering";
import { createCookTargetingSystem } from "../src/systems/cook-targeting";
import { createCookWanderSystem } from "../src/systems/cook-wander";
import { createOrderAssemblySystem } from "../src/systems/order-assembly";
import {
	AGENT_SPEED,
	AI_ARRIVE_DISTANCE,
	IDLE_WANDER_MAX_MS,
	IDLE_WANDER_MIN_MS,
	MAX_FRAME_MS,
	WANDER_SPEED,
} from "../src/constants";

const SCREEN = { width: 1920, height: 1080 };
const FRAME = 1000 / 60;

function stationPositions() {
	return FIELD_SLOTS.map((slot) => ({
		stationType: slot.station,
		position: slotPosition(slot, SCREEN),
		approach: approachPoint(slot, SCREEN),
	}));
}

function stationAt(type: string) {
	const found = stationPositions().find((s) => s.stationType === type);
	if (!found) throw new Error(`нет станции ${type}`);
	return found.approach;
}

interface Harness {
	world: World<Entity>;
	step: (seconds: number) => void;
	tick: () => void;
}

function makeCook(
	overrides: Partial<Entity> & { name: string },
	position: Vector2 = { x: SCREEN.width / 2, y: SCREEN.height / 2 },
) {
	const defaults: Entity = {
		position: { ...position },
		velocity: { x: 0, y: 0 },
		order: null,
		carry: createCarryState(),
		control: createControlState("auto"),
		target: null,
		wander: null,
	};

	return {
		...defaults,
		...overrides,
		name: overrides.name,
		cookId: overrides.cookId ?? `id-${overrides.name}`,
		position: { ...position },
	} satisfies Entity;
}

function makeRandom(seed = 1): () => number {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

function harness(
	cooks: Entity[],
	random: () => number = makeRandom(),
): Harness {
	const world = new World<Entity>();

	for (const slot of stationPositions()) {
		world.add({
			position: { ...slot.position },
			approach: { ...slot.approach },
			stationTag: true,
			stationType: slot.stationType,
		});
	}

	for (const cook of cooks) {
		world.add(cook);
	}

	const ctx = {
		world,
		app: { screen: SCREEN },
	} as never;

	const targeting = createCookTargetingSystem(ctx, random);
	const steering = createCookSteeringSystem(ctx);
	const wander = createCookWanderSystem(ctx, random);
	const assembly = createOrderAssemblySystem(ctx);

	const tick = () => {
		targeting(Math.min(FRAME, MAX_FRAME_MS));
		steering();
		wander();
		assembly(Math.min(FRAME, MAX_FRAME_MS));
		for (const cook of world) {
			if (cook.position && cook.velocity) {
				cook.position.x += (cook.velocity.x * FRAME) / 1000;
				cook.position.y += (cook.velocity.y * FRAME) / 1000;
			}
		}
	};

	return {
		world,
		tick,
		step: (seconds) => {
			const frames = Math.ceil((seconds * 1000) / FRAME);
			for (let i = 0; i < frames; i++) tick();
		},
	};
}

function cookOf(h: Harness, name: string) {
	for (const cook of h.world) {
		if (cook.name === name) return cook;
	}
	throw new Error(`нет повара ${name}`);
}

function speedOf(cook: Entity) {
	return Math.hypot(cook.velocity?.x ?? 0, cook.velocity?.y ?? 0);
}

function typeOf(cook: Entity): StationType | null {
	return cook.target?.stationType ?? null;
}

describe("навигация в auto-режиме", () => {
	let h: Harness;
	let cook: Entity;

	beforeEach(() => {
		cook = makeCook({ name: "house" });
		h = harness([cook]);
	});

	it("без заказа идёт к serving-станции", () => {
		h.step(0.1);
		expect(typeOf(cookOf(h, "house"))).toBe("serving-counter");
	});

	it("после получения заказа идёт за первым ингредиентом", () => {
		cook.order = createOrder(makeRecipe(["bun", "cheese", "bun"]));
		h.step(0.1);
		expect(typeOf(cookOf(h, "house"))).toBe("bun-shelf");
	});

	it("меняет цель по мере выкладки слоёв", () => {
		const order = createOrder(makeRecipe(["bun", "cheese", "bun"]));
		cook.order = order;

		for (let i = 0; i < 60 * 60 && order.placed.length === 0; i++) {
			h.tick();
		}

		expect(order.placed).toEqual(["bun"]);

		h.step(0.1);

		expect(typeOf(cookOf(h, "house"))).toBe("dairy-shelf");
	});

	it("несёт бургер на кассу", () => {
		cook.order = createOrder(makeRecipe(["bun"]));
		cook.order.placed.push("bun");
		cook.carry = { item: "dish-burger" };

		h.step(0.1);

		expect(typeOf(cookOf(h, "house"))).toBe("cash-register");
	});

	it("не блуждает в auto-режиме", () => {
		h.step(40);
		const c = cookOf(h, "house");

		expect(c.wander).toBeNull();
	});
});

describe("chat-режим", () => {
	function chatCook(overrides: Partial<Entity> = {}) {
		return makeCook(
			{ name: "viewer", control: createControlState("chat"), ...overrides },
			{ x: SCREEN.width / 2, y: SCREEN.height / 2 },
		);
	}

	function issue(h: Harness, request: CookRequest) {
		issueRequest(cookOf(h, "viewer"), request);
	}

	it("без запроса стоит на месте", () => {
		const cook = makeCook(
			{ name: "viewer", control: createControlState("chat", () => 1) },
			{ x: SCREEN.width / 2, y: SCREEN.height / 2 },
		);
		const h = harness([cook], () => 1);

		h.step(5);

		const c = cookOf(h, "viewer");
		expect(speedOf(c)).toBe(0);
		expect(typeOf(c)).toBeNull();
	});

	it("!взять ведёт к serving-станции", () => {
		const cook = chatCook();
		const h = harness([cook]);

		issue(h, { kind: "get-order" });
		h.step(0.1);

		expect(typeOf(cookOf(h, "viewer"))).toBe("serving-counter");
	});

	it("!положи ведёт сначала к полке, потом к столу", () => {
		const cook = chatCook({
			order: createOrder(makeRecipe(["bun", "cheese", "bun"])),
		});
		const h = harness([cook]);

		issue(h, { kind: "fetch", ingredient: "bun" });
		h.step(0.1);
		expect(typeOf(cookOf(h, "viewer"))).toBe("bun-shelf");

		const c = cookOf(h, "viewer");
		let wentToCounter = false;
		let fetched = false;

		for (let i = 0; i < 60 * 60; i++) {
			h.tick();
			if (typeOf(c) === "serving-counter") wentToCounter = true;
			if (c.carry?.item === "bun") fetched = true;
			if (c.order?.placed.length === 1) break;
		}

		expect(fetched).toBe(true);
		expect(wentToCounter).toBe(true);
		expect(c.order?.placed).toEqual(["bun"]);
		expect(c.carry?.item).toBeNull();
	});

	it("!отдать ведёт на кассу, когда несёт бургер", () => {
		const order = createOrder(makeRecipe(["bun"]));
		order.placed.push("bun");
		const cook = chatCook({ order, carry: { item: "dish-burger" } });
		const h = harness([cook]);

		issue(h, { kind: "deliver" });
		h.step(0.1);

		expect(typeOf(cookOf(h, "viewer"))).toBe("cash-register");
	});

	it("выполненный запрос сбрасывается", () => {
		const cook = chatCook();
		const h = harness([cook]);

		issue(h, { kind: "get-order" });
		h.step(20);

		const c = cookOf(h, "viewer");
		expect(c.control?.request).toBeNull();
		expect(c.order).not.toBeNull();
	});

	it("запрос сбрасывается только один раз, повар не бежит по кругу", () => {
		const cook = chatCook({ order: createOrder(makeRecipe(["bun"])) });
		const h = harness([cook]);

		issue(h, { kind: "fetch", ingredient: "bun" });
		h.step(20);

		const c = cookOf(h, "viewer");
		expect(c.control?.request).toBeNull();
		expect(c.carry?.item).toBeNull();
		expect(typeOf(c)).toBeNull();
	});
});

describe("блуждание при простое", () => {
	function idleCook(random?: () => number) {
		return makeCook(
			{
				name: "viewer",
				control: createControlState("chat", random),
			},
			{ x: SCREEN.width / 2, y: SCREEN.height / 2 },
		);
	}

	it("до порога стоит на месте", () => {
		const h = harness([idleCook(() => 0)], () => 0);
		const c = cookOf(h, "viewer");

		h.step(IDLE_WANDER_MIN_MS / 1000 - 0.5);

		expect(speedOf(c)).toBe(0);
		expect(c.wander).toBeNull();
	});

	it("после минимального порога уже уходит бродить", () => {
		const h = harness([idleCook(() => 0)], () => 0);
		const c = cookOf(h, "viewer");

		h.step(IDLE_WANDER_MIN_MS / 1000 + 0.5);

		expect(speedOf(c)).toBeCloseTo(WANDER_SPEED);
	});

	it("до максимального порога при random = 1 ещё стоит", () => {
		const h = harness([idleCook(() => 1)], () => 1);
		const c = cookOf(h, "viewer");

		h.step(IDLE_WANDER_MAX_MS / 1000 - 0.5);
		expect(speedOf(c)).toBe(0);

		h.step(1);
		expect(speedOf(c)).toBeCloseTo(WANDER_SPEED);
	});

	it("порог каждого ожидания разный: random меняет момент старта", () => {
		const early = harness([idleCook(() => 0)], () => 0);
		const late = harness([idleCook(() => 1)], () => 1);

		early.step(8);
		late.step(8);

		expect(speedOf(cookOf(early, "viewer"))).toBeCloseTo(WANDER_SPEED);
		expect(speedOf(cookOf(late, "viewer"))).toBe(0);
	});

	it("после порога уходит бродить со скоростью WANDER_SPEED", () => {
		const h = harness([idleCook()]);
		const c = cookOf(h, "viewer");
		let moved = false;

		for (let i = 0; i < 60 * 90; i++) {
			h.tick();
			if (Math.abs(speedOf(c) - WANDER_SPEED) < 0.001) {
				moved = true;
				break;
			}
		}

		expect(moved).toBe(true);
		expect(typeOf(c)).toBeNull();
	});

	it("скорость блуждания всегда 0 или WANDER_SPEED, никогда между", () => {
		const h = harness([idleCook()]);
		const c = cookOf(h, "viewer");

		for (let i = 0; i < 60 * 60; i++) {
			h.tick();
			const speed = speedOf(c);
			const allowed = [0, WANDER_SPEED, AGENT_SPEED];

			expect(allowed.some((value) => Math.abs(speed - value) < 0.001)).toBe(
				true,
			);
		}
	});

	it("блуждает внутри WANDER_AREA", () => {
		const h = harness([idleCook()]);
		const c = cookOf(h, "viewer");
		const points: Vector2[] = [];

		for (let i = 0; i < 60 * 60; i++) {
			h.tick();
			if (c.wander) points.push({ ...c.wander });
		}

		expect(points.length).toBeGreaterThan(0);

		for (const point of points) {
			expect(point.x).toBeGreaterThanOrEqual(SCREEN.width * WANDER_AREA.xMin);
			expect(point.x).toBeLessThanOrEqual(SCREEN.width * WANDER_AREA.xMax);
			expect(point.y).toBeGreaterThanOrEqual(SCREEN.height * WANDER_AREA.yMin);
			expect(point.y).toBeLessThanOrEqual(SCREEN.height * WANDER_AREA.yMax);
		}
	});

	it("не наезжает на станции, пока блуждает", () => {
		const h = harness([idleCook()]);
		const c = cookOf(h, "viewer");

		for (let i = 0; i < 60 * 60; i++) {
			h.tick();

			for (const station of stationPositions()) {
				const distance = Math.hypot(
					(c.position?.x ?? 0) - station.position.x,
					(c.position?.y ?? 0) - station.position.y,
				);

				expect(distance).toBeGreaterThan(0);
			}
		}
	});

	it("по достижении точки останавливается и ждёт нового порога", () => {
		const h = harness([idleCook()]);
		const c = cookOf(h, "viewer");

		let started = false;
		for (let i = 0; i < 60 * 90; i++) {
			h.tick();
			if (c.wander !== null) started = true;
			if (started && c.wander === null) break;
		}

		expect(started).toBe(true);
		expect(c.wander).toBeNull();
		expect(speedOf(c)).toBe(0);
		expect(c.control?.idleMs).toBeLessThan(100);

		h.step(2);
		expect(speedOf(c)).toBe(0);
		expect(c.wander).toBeNull();
	});

	it("даёт паузу на каждой точке, а не мечется непрерывно", () => {
		const h = harness([idleCook()]);
		const c = cookOf(h, "viewer");

		let arrivals = 0;
		let previousWander = c.wander ?? null;
		for (let i = 0; i < 60 * 90; i++) {
			h.tick();
			if (previousWander !== null && c.wander === null) arrivals++;
			previousWander = c.wander ?? null;
		}

		expect(arrivals).toBeGreaterThan(2);
		expect(arrivals).toBeLessThan(14);
	});

	it("команда из чата прерывает блуждание", () => {
		const h = harness([idleCook()]);
		const c = cookOf(h, "viewer");

		let walking = false;
		for (let i = 0; i < 60 * 90; i++) {
			h.tick();
			if (Math.abs(speedOf(c) - WANDER_SPEED) < 0.001) {
				walking = true;
				break;
			}
		}
		expect(walking).toBe(true);

		issueRequest(c, { kind: "get-order" });
		h.step(0.1);

		expect(c.wander).toBeNull();
		expect(c.control?.idleMs).toBe(0);
		expect(typeOf(c)).toBe("serving-counter");
		expect(speedOf(c)).toBeCloseTo(AGENT_SPEED);
	});
});

describe("бот-гуляка из тестового прогона", () => {
	function roamer(random: () => number = () => 0.5) {
		return makeCook({
			name: "roamer",
			control: createControlState("chat", random),
		});
	}

	it("ждёт порог, а не идёт сразу", () => {
		const h = harness([roamer(() => 1)], () => 1);
		const c = cookOf(h, "roamer");

		h.tick();
		expect(c.wander).toBeNull();
		expect(speedOf(c)).toBe(0);
	});

	it("не идёт к станциям без заказа", () => {
		const h = harness([roamer()]);
		const c = cookOf(h, "roamer");

		h.step(2);
		expect(typeOf(c)).toBeNull();
	});

	it("никогда не берёт заказ и не появляется на станции", () => {
		const h = harness([roamer()]);
		const c = cookOf(h, "roamer");

		h.step(60);

		expect(c.order).toBeNull();
		expect(c.carry?.item).toBeNull();
		expect(c.control?.action).toBeNull();
	});

	it("меняет точку по ходу, а не топчется на месте", () => {
		const h = harness([roamer()]);
		const c = cookOf(h, "roamer");

		const points = new Set<string>();
		for (let i = 0; i < 60 * 120; i++) {
			h.tick();
			if (c.wander) points.add(`${c.wander.x}:${c.wander.y}`);
		}

		expect(points.size).toBeGreaterThan(1);
	});

	it("реагирует на команду из чата так же, как настоящий зритель", () => {
		const h = harness([roamer()]);
		const c = cookOf(h, "roamer");

		issueRequest(c, { kind: "get-order" });
		h.step(0.1);

		expect(c.wander).toBeNull();
		expect(typeOf(c)).toBe("serving-counter");
	});
});

function issueRequest(cook: Entity, request: CookRequest) {
	cook.control = { ...cook.control!, request, idleMs: 0 };
	cook.wander = null;
}

describe("пауза при работе со станцией", () => {
	function firstAction(h: Harness, name = "house") {
		for (let i = 0; i < 60 * 40; i++) {
			h.tick();
			const action = cookOf(h, name).control?.action;
			if (action) return action;
		}
		return null;
	}

	it("взять заказ занимает время: действие стартует и длится", () => {
		const h = harness([makeCook({ name: "house" })]);
		const c = cookOf(h, "house");

		const action = firstAction(h);
		expect(action?.kind).toBe("get-order");
		expect(action?.progress).toBeLessThan(1);

		const start = { ...c.position! };
		h.step(0.3);
		expect(
			Math.hypot(
				(c.position?.x ?? 0) - start.x,
				(c.position?.y ?? 0) - start.y,
			),
		).toBeLessThan(1);
	});

	it("время работы соответствует длительности действия", () => {
		const h = harness([makeCook({ name: "house" })]);
		const c = cookOf(h, "house");

		firstAction(h);
		const duration = (c.control?.action?.durationMs ?? 0) / 1000;

		expect(c.control?.action?.progress ?? 1).toBeLessThan(0.3);

		h.step(duration * 0.5);
		const mid = c.control?.action?.progress;
		expect(mid).toBeGreaterThan(0.2);
		expect(mid ?? 1).toBeLessThan(0.9);

		h.step(duration);
		expect(c.control?.action).toBeNull();
	});

	it("повар стоит с нулевой скоростью, пока работает", () => {
		const h = harness([makeCook({ name: "house" })]);
		const c = cookOf(h, "house");

		firstAction(h);
		for (let i = 0; i < 20; i++) {
			h.tick();
			if (c.control?.action) expect(speedOf(c)).toBe(0);
		}
	});

	it("действие не накапливает простое время", () => {
		const cook = makeCook({
			name: "viewer",
			control: createControlState("chat"),
		});
		const h = harness([cook]);
		const c = cookOf(h, "viewer");

		issueRequest(c, { kind: "get-order" });
		let sawAction = false;
		for (let i = 0; i < 60 * 40; i++) {
			h.tick();
			if (c.control?.action) {
				sawAction = true;
				expect(c.control.idleMs).toBeLessThan(100);
			}
		}

		expect(sawAction).toBe(true);
	});

	it("все виды работы запускаются с прогрессом", () => {
		const order = createOrder(makeRecipe(["bun"]));
		const cook = makeCook({
			name: "house",
			order,
			carry: { item: "dish-burger" },
		});
		const h = harness([cook]);
		const c = cookOf(h, "house");

		const kinds = new Set<string>();
		for (let i = 0; i < 60 * 60; i++) {
			h.tick();
			const action = c.control?.action;
			if (action) kinds.add(action.kind);
		}

		expect(kinds.has("sell")).toBe(true);
	});

	it("предмет появляется в руках только после окончания полоски", () => {
		const order = createOrder(makeRecipe(["bun"]));
		order.placed.push("bun");
		const cook = makeCook({ name: "house", order });
		const h = harness([cook]);
		const c = cookOf(h, "house");

		firstAction(h);
		expect(c.control?.action?.kind).toBe("finish");
		const duration = (c.control?.action?.durationMs ?? 0) / 1000;

		h.step(duration * 0.5);
		expect(c.carry?.item).toBeNull();
		expect(c.control?.action?.kind).toBe("finish");

		h.step(duration * 0.6);
		expect(c.carry?.item).toBe("dish-burger");
		expect(c.control?.action).toBeNull();
	});

	it("ингредиент попадает на сервировку только после окончания полоски", () => {
		const order = createOrder(makeRecipe(["bun", "cheese"]));
		const cook = makeCook({ name: "house", order, carry: { item: "bun" } });
		const h = harness([cook]);
		const c = cookOf(h, "house");

		firstAction(h);
		expect(c.control?.action?.kind).toBe("place");
		const duration = (c.control?.action?.durationMs ?? 0) / 1000;

		h.step(duration * 0.5);
		expect(c.carry?.item).toBe("bun");
		expect(c.order?.placed).toEqual([]);

		h.step(duration * 0.6);
		expect(c.carry?.item).toBeNull();
		expect(c.order?.placed).toEqual(["bun"]);
	});

	it("заказ появляется только после окончания полоски", () => {
		const cook = makeCook({ name: "house" });
		const h = harness([cook]);
		const c = cookOf(h, "house");

		firstAction(h);
		expect(c.control?.action?.kind).toBe("get-order");
		expect(c.order).toBeNull();
		const duration = (c.control?.action?.durationMs ?? 0) / 1000;

		h.step(duration * 0.5);
		expect(c.order).toBeNull();

		h.step(duration * 0.6);
		expect(c.order).not.toBeNull();
		expect(c.order?.placed).toEqual([]);
	});

	it("продажа снимает заказ и бургер только после окончания полоски", () => {
		const order = createOrder(makeRecipe(["bun"]));
		order.placed.push("bun");
		const cook = makeCook({
			name: "house",
			order,
			carry: { item: "dish-burger" },
		});
		const h = harness([cook]);
		const c = cookOf(h, "house");

		firstAction(h);
		expect(c.control?.action?.kind).toBe("sell");
		const duration = (c.control?.action?.durationMs ?? 0) / 1000;

		h.step(duration * 0.5);
		expect(c.carry?.item).toBe("dish-burger");
		expect(c.order).not.toBeNull();

		h.step(duration * 0.6);
		expect(c.carry?.item).toBeNull();
		expect(c.order).toBeNull();
	});

	it("ингредиент запоминается в действии, а не берётся из заказа позже", () => {
		const order = createOrder(makeRecipe(["bun", "cheese"]));
		const cook = makeCook({ name: "house", order, carry: { item: "bun" } });
		const h = harness([cook]);
		const c = cookOf(h, "house");

		firstAction(h);
		expect(c.control?.action?.item).toBe("bun");
		const duration = (c.control?.action?.durationMs ?? 0) / 1000;

		h.step(duration * 1.2);
		expect(c.order?.placed).toEqual(["bun"]);
	});
});

describe("цепочки подготовки в auto-режиме", () => {
	it("нарезка: полка → доска → выдача → финиш", () => {
		const order = createOrder(makeRecipe(["chopped-tomato"]));
		const cook = makeCook({ name: "house", order });
		const h = harness([cook]);
		const c = cookOf(h, "house");

		const visited = new Set<StationType | null>();
		let carriedRaw = false;
		let carriedSemi = false;

		for (let i = 0; i < 60 * 120; i++) {
			h.tick();
			visited.add(typeOf(c));
			if (c.carry?.item === "tomato") carriedRaw = true;
			if (c.carry?.item === "chopped-tomato") carriedSemi = true;
			if (c.order?.placed.length === 1) break;
		}

		expect(visited).toContain("produce-shelf");
		expect(visited).toContain("cutting-board");
		expect(visited).toContain("serving-counter");
		expect(carriedRaw).toBe(true);
		expect(carriedSemi).toBe(true);
		expect(c.order?.placed).toEqual(["chopped-tomato"]);

		for (let i = 0; i < 60 * 30; i++) {
			h.tick();
			if (c.carry?.item === "dish-burger") break;
		}

		expect(c.carry?.item).toBe("dish-burger");
	});

	it("двухшаговая цепочка: мука → тесто → основа", () => {
		const order = createOrder(makeRecipe(["pizza-base"]));
		const cook = makeCook({ name: "house", order });
		const h = harness([cook]);
		const c = cookOf(h, "house");

		const visited = new Set<StationType | null>();
		const carries: string[] = [];

		for (let i = 0; i < 60 * 180; i++) {
			h.tick();
			visited.add(typeOf(c));
			const item = c.carry?.item;
			if (item && carries.at(-1) !== item) carries.push(item);
			if (c.order?.placed.length === 1) break;
		}

		expect(carries).toEqual(["flour", "dough", "pizza-base"]);
		expect(visited).toContain("pantry-shelf");
		expect(visited).toContain("dough-mixer");
		expect(visited).toContain("pizza-oven");
		expect(c.order?.placed).toEqual(["pizza-base"]);
	});

	it("суп кладётся прямо в кастрюлю и доводится там же", () => {
		const order = createOrder(
			makeRecipe(["beans"], { dish: "dish-soup", finishAt: "stove-pot" }),
		);
		const cook = makeCook({ name: "house", order });
		const h = harness([cook]);
		const c = cookOf(h, "house");

		const visited = new Set<StationType | null>();
		let placedAt: StationType | null = null;

		for (let i = 0; i < 60 * 120; i++) {
			h.tick();
			visited.add(typeOf(c));
			if (c.control?.action?.kind === "place") {
				placedAt = c.target?.stationType ?? null;
			}
			if (c.carry?.item === "dish-soup") break;
		}

		expect(visited).toContain("pantry-shelf");
		expect(visited).not.toContain("serving-counter");
		expect(placedAt).toBe("stove-pot");
		expect(c.carry?.item).toBe("dish-soup");
	});

	it("assorted-заказ собирается в любом порядке до конца", () => {
		const order = createOrder(
			makeRecipe(["cheese", "bun"], { order: "assorted" }),
		);
		const cook = makeCook({ name: "house", order });
		const h = harness([cook]);
		const c = cookOf(h, "house");

		for (let i = 0; i < 60 * 180; i++) {
			h.tick();
			if (c.carry?.item === "dish-burger") break;
		}

		expect(c.order?.placed.slice().sort()).toEqual(["bun", "cheese"]);
		expect(c.carry?.item).toBe("dish-burger");
	});
});

describe("устойчивость", () => {
	it("повар без заказа в chat-режиме не падает за 30 секунд", () => {
		const h = harness([
			makeCook({ name: "v", control: createControlState("chat") }),
		]);

		expect(() => h.step(30)).not.toThrow();

		const c = cookOf(h, "v");
		expect(Number.isFinite(c.position?.x)).toBe(true);
		expect(Number.isFinite(c.position?.y)).toBe(true);
		expect(Number.isFinite(c.velocity?.x)).toBe(true);
	});

	it("повар без заказа в chat-режиме стоит до порога блуждания", () => {
		const h = harness(
			[makeCook({ name: "v", control: createControlState("chat", () => 1) })],
			() => 1,
		);
		const c = cookOf(h, "v");
		const start = { ...c.position! };

		h.step(IDLE_WANDER_MAX_MS / 1000 - 0.5);

		expect(speedOf(c)).toBe(0);
		expect(c.position?.x).toBeCloseTo(start.x);
		expect(c.position?.y).toBeCloseTo(start.y);
	});

	it("два повара в одном мире не мешают друг другу", () => {
		const auto = makeCook({ name: "house" });
		const chat = makeCook(
			{ name: "viewer", control: createControlState("chat") },
			{ x: SCREEN.width / 3, y: SCREEN.height / 3 },
		);
		const h = harness([auto, chat]);

		issueRequest(chat, { kind: "get-order" });
		h.step(20);

		expect(cookOf(h, "house").order).not.toBeNull();
		expect(cookOf(h, "viewer").order).not.toBeNull();
	});

	it("повар доходит до станции и забирает заказ", () => {
		const cook = makeCook({ name: "house" });
		const h = harness([cook]);
		const c = cookOf(h, "house");
		const counter = stationAt("serving-counter");

		for (let i = 0; i < 60 * 30 && !c.order; i++) {
			h.tick();
		}

		expect(c.order).not.toBeNull();
		expect(
			Math.hypot(
				(c.position?.x ?? 0) - counter.x,
				(c.position?.y ?? 0) - counter.y,
			),
		).toBeLessThanOrEqual(AI_ARRIVE_DISTANCE + (AGENT_SPEED * FRAME) / 1000);
	});

	it("повар стоит вплотную к точке подхода, а не где-то рядом", () => {
		const cook = makeCook({ name: "house" });
		const h = harness([cook]);
		const c = cookOf(h, "house");
		const counter = stationAt("serving-counter");

		let atArrival: Vector2 | null = null;
		for (let i = 0; i < 60 * 30; i++) {
			h.tick();
			if (c.order && !atArrival) {
				atArrival = { ...c.position! };
				break;
			}
		}

		expect(atArrival).not.toBeNull();

		const distance = Math.hypot(
			atArrival!.x - counter.x,
			atArrival!.y - counter.y,
		);

		expect(distance).toBeLessThanOrEqual(AI_ARRIVE_DISTANCE + 1);
	});
});
