import { World } from "miniplex";
import { beforeEach, describe, expect, it } from "vitest";

import { approachPoint, FIELD_SLOTS, slotPosition } from "../src/config/field";
import {
	createCarryState,
	createOrder,
	type Item,
} from "../src/config/recipes";
import {
	ACTION_DURATIONS_MS,
	createControlState,
	type CookRequest,
} from "../src/config/control";
import type { Entity, TargetState, Vector2 } from "../src/core/world";
import { createOrderAiSystem } from "../src/systems/order-ai";
import { createOrderAssemblySystem } from "../src/systems/order-assembly";
import {
	AGENT_SPEED,
	AI_ARRIVE_DISTANCE,
	CHAT_IDLE_WANDER_MS,
	MAX_FRAME_MS,
	WANDER_SPEED,
} from "../src/constants";

const SCREEN = { width: 1280, height: 800 };
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

function harness(cooks: Entity[]): Harness {
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

	const ai = createOrderAiSystem({
		world,
		app: { screen: SCREEN },
	} as never);
	const assembly = createOrderAssemblySystem({
		world,
		app: { screen: SCREEN },
	} as never);

	const tick = () => {
		// dt зажат в MAX_FRAME_MS, как в реальном игровом цикле
		ai(Math.min(FRAME, MAX_FRAME_MS));
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
	const target = cook.target as TargetState | null;
	return target ? target.type : null;
}

type StationType = NonNullable<Entity["target"]>["type"];

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
		cook.order = createOrder(["bun", "cheese", "bun"]);
		h.step(0.1);
		expect(typeOf(cookOf(h, "house"))).toBe("bun-shelf");
	});

	it("меняет цель по мере выкладки слоёв", () => {
		const order = createOrder(["bun", "cheese", "bun"]);
		cook.order = order;

		const seen: Array<StationType | null> = [];
		for (let i = 0; i < 60 * 120; i++) {
			h.tick();
			seen.push(typeOf(cookOf(h, "house")));
			if (order.placed.length === 1) order.placed.push("bun");
		}

		expect(seen).toContain("cheese-shelf");
	});

	it("несёт бургер на кассу", () => {
		cook.order = createOrder(["bun"]);
		(cook.order as { placed: Item[] }).placed.push("bun");
		cook.carry = { item: "burger" };

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
		const cook = chatCook();
		const h = harness([cook]);

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
		// стартуем далеко от полки, иначе забор случится на первом же кадре
		const cook = chatCook({ order: createOrder(["bun", "cheese", "bun"]) });
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
		const order = createOrder(["bun"]);
		order.placed.push("bun");
		const cook = chatCook({ order, carry: { item: "burger" } });
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
		const cook = chatCook({ order: createOrder(["bun"]) });
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
	function idleCook() {
		return makeCook(
			{ name: "viewer", control: createControlState("chat") },
			{ x: SCREEN.width / 2, y: SCREEN.height / 2 },
		);
	}

	it("до порога стоит на месте", () => {
		const h = harness([idleCook()]);
		const c = cookOf(h, "viewer");

		h.step(CHAT_IDLE_WANDER_MS / 1000 - 1);

		expect(speedOf(c)).toBe(0);
		expect(c.wander).toBeNull();
	});

	it("после порога уходит бродить со скоростью WANDER_SPEED", () => {
		const h = harness([idleCook()]);
		const c = cookOf(h, "viewer");
		let moved = false;

		// случайная точка может оказаться рядом с поваром, поэтому ждём
		// первый настоящий переход, а не смотрим на кадр через порог
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
			expect(point.x).toBeGreaterThanOrEqual(SCREEN.width * 0.26);
			expect(point.x).toBeLessThanOrEqual(SCREEN.width * 0.74);
			expect(point.y).toBeGreaterThanOrEqual(SCREEN.height * 0.12);
			expect(point.y).toBeLessThanOrEqual(SCREEN.height * 0.88);
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

		// ждём первого перехода, потом его завершения
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

		// и стоит дальше, пока не набежит новый порог
		h.step(CHAT_IDLE_WANDER_MS / 1000 - 1);
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

		// 90с: 12с пауза + переход, значит меньше 7 точек
		expect(arrivals).toBeGreaterThan(1);
		expect(arrivals).toBeLessThan(8);
	});

	it("команда из чата прерывает блуждание", () => {
		const h = harness([idleCook()]);
		const c = cookOf(h, "viewer");

		// ждём именно перехода: точка блуждания иногда выпадает рядом
		// с поваром и он успевает дойти за один кадр
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

		// за время работы повар не уходит со станции
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
		const duration = ACTION_DURATIONS_MS["get-order"] / 1000;

		// сразу после старта прогресс близок к нулю
		expect(c.control?.action?.progress ?? 1).toBeLessThan(0.3);

		h.step(duration * 0.5);
		const mid = c.control?.action?.progress;
		expect(mid).toBeGreaterThan(0.2);
		expect(mid ?? 1).toBeLessThan(0.9);

		// после полного срока действие завершено
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
		const order = createOrder(["bun"]);
		const cook = makeCook({
			name: "house",
			order,
			carry: { item: "burger" },
		});
		const h = harness([cook]);
		const c = cookOf(h, "house");

		const kinds = new Set<string>();
		for (let i = 0; i < 60 * 60; i++) {
			h.tick();
			const action = c.control?.action;
			if (action) kinds.add(action.kind);
		}

		// этот сценарий проходит через продажу, а дальше новый заказ
		expect(kinds.has("sell")).toBe(true);
	});

	it("предмет появляется в руках только после окончания полоски", () => {
		const order = createOrder(["bun"]);
		order.placed.push("bun");
		const cook = makeCook({ name: "house", order });
		const h = harness([cook]);
		const c = cookOf(h, "house");

		firstAction(h);
		expect(c.control?.action?.kind).toBe("take-burger");

		// бар ещё не заполнен — руки пусты
		h.step((ACTION_DURATIONS_MS["take-burger"] / 1000) * 0.5);
		expect(c.carry?.item).toBeNull();
		expect(c.control?.action?.kind).toBe("take-burger");

		// бар дошёл до конца — предмет в руках, действие завершено
		h.step((ACTION_DURATIONS_MS["take-burger"] / 1000) * 0.6);
		expect(c.carry?.item).toBe("burger");
		expect(c.control?.action).toBeNull();
	});

	it("ингредиент попадает на сервировку только после окончания полоски", () => {
		const order = createOrder(["bun", "cheese"]);
		const cook = makeCook({ name: "house", order, carry: { item: "bun" } });
		const h = harness([cook]);
		const c = cookOf(h, "house");

		firstAction(h);
		expect(c.control?.action?.kind).toBe("place-ingredient");

		// половина полоски — ингредиент ещё в руках, точка не отмечена
		h.step((ACTION_DURATIONS_MS["place-ingredient"] / 1000) * 0.5);
		expect(c.carry?.item).toBe("bun");
		expect(c.order?.placed).toEqual([]);

		// полоска заполнена — ингредиент сдан, руки свободны
		h.step((ACTION_DURATIONS_MS["place-ingredient"] / 1000) * 0.6);
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

		h.step((ACTION_DURATIONS_MS["get-order"] / 1000) * 0.5);
		expect(c.order).toBeNull();

		h.step((ACTION_DURATIONS_MS["get-order"] / 1000) * 0.6);
		expect(c.order).not.toBeNull();
		expect(c.order?.placed).toEqual([]);
	});

	it("продажа снимает заказ и бургер только после окончания полоски", () => {
		const order = createOrder(["bun"]);
		order.placed.push("bun");
		const cook = makeCook({
			name: "house",
			order,
			carry: { item: "burger" },
		});
		const h = harness([cook]);
		const c = cookOf(h, "house");

		firstAction(h);
		expect(c.control?.action?.kind).toBe("sell");

		h.step((ACTION_DURATIONS_MS.sell / 1000) * 0.5);
		expect(c.carry?.item).toBe("burger");
		expect(c.order).not.toBeNull();

		h.step((ACTION_DURATIONS_MS.sell / 1000) * 0.6);
		expect(c.carry?.item).toBeNull();
		expect(c.order).toBeNull();
	});

	it("ингредиент запоминается в действии, а не берётся из заказа позже", () => {
		const order = createOrder(["bun", "cheese"]);
		const cook = makeCook({ name: "house", order, carry: { item: "bun" } });
		const h = harness([cook]);
		const c = cookOf(h, "house");

		firstAction(h);
		expect(c.control?.action?.item).toBe("bun");

		// заказ не меняется за время работы, сдаётся именно тот ингредиент
		h.step((ACTION_DURATIONS_MS["place-ingredient"] / 1000) * 1.2);
		expect(c.order?.placed).toEqual(["bun"]);
	});
});

describe("устойчивость", () => {
	it("повар без заказа в chat-режиме не падает за 30 секунд", () => {
		const h = harness([
			makeCook({ name: "v", control: createControlState("chat") }),
		]);

		// 30с заведомо больше порога блуждания, поэтому координаты и скорость
		// здесь не проверяем — проверяем только отсутствие исключений
		expect(() => h.step(30)).not.toThrow();

		const c = cookOf(h, "v");
		expect(Number.isFinite(c.position?.x)).toBe(true);
		expect(Number.isFinite(c.position?.y)).toBe(true);
		expect(Number.isFinite(c.velocity?.x)).toBe(true);
	});

	it("повар без заказа в chat-режиме стоит до порога блуждания", () => {
		const h = harness([
			makeCook({ name: "v", control: createControlState("chat") }),
		]);
		const c = cookOf(h, "v");
		const start = { ...c.position! };

		h.step(CHAT_IDLE_WANDER_MS / 1000 - 1);

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

		// момент получения заказа — повар как раз стоит у точки подхода
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

		// стоит у самой точки подхода, а не в радиусе прибытия от неё
		expect(distance).toBeLessThanOrEqual(AI_ARRIVE_DISTANCE + 1);
	});
});
