import { describe, expect, it } from "vitest";

import {
	ACTION_DURATIONS_MS,
	type ActionKind,
	advanceAction,
	canRequest,
	createControlState,
	type CookRequest,
	isBusy,
	isRequestSettled,
	markActive,
	rollIdleGoalMs,
	startAction,
} from "../src/config/control";
import {
	type CarryState,
	createCarryState,
	createOrder,
	type Ingredient,
	type OrderState,
} from "../src/config/recipes";
import { IDLE_WANDER_MAX_MS, IDLE_WANDER_MIN_MS } from "../src/constants";

interface CookState {
	carry: CarryState;
	order: OrderState | null | undefined;
}

function makeCook(overrides: Partial<CookState> = {}) {
	return {
		carry: createCarryState(),
		order: null,
		control: createControlState("chat"),
		...overrides,
	};
}

const TAKE: CookRequest = { kind: "get-order" };
const DELIVER: CookRequest = { kind: "deliver" };
const fetchOf = (ingredient: Ingredient): CookRequest => ({
	kind: "fetch",
	ingredient,
});

describe("createControlState", () => {
	it("по умолчанию auto, без запроса и действия, idle сброшен", () => {
		const control = createControlState();

		expect(control.mode).toBe("auto");
		expect(control.request).toBeNull();
		expect(control.idleMs).toBe(0);
		expect(control.action).toBeNull();
		expect(control.idleGoalMs).toBeGreaterThanOrEqual(IDLE_WANDER_MIN_MS);
		expect(control.idleGoalMs).toBeLessThanOrEqual(IDLE_WANDER_MAX_MS);
	});

	it("принимает режим", () => {
		expect(createControlState("chat").mode).toBe("chat");
		expect(createControlState("auto").mode).toBe("auto");
	});
});

describe("работа у станции", () => {
	it("стартует с нулевого прогресса", () => {
		const control = createControlState("chat");
		startAction(control, "take-ingredient");

		expect(control.action).toMatchObject({
			kind: "take-ingredient",
			progress: 0,
			item: null,
		});
		expect(isBusy({ control })).toBe(true);
	});

	it("ингредиент сохраняется в действии, чтобы применить позже", () => {
		const control = createControlState("chat");
		startAction(control, "take-ingredient", "cheese");

		expect(control.action).toMatchObject({
			kind: "take-ingredient",
			progress: 0,
			item: "cheese",
		});

		advanceAction(control, control.action?.durationMs ?? 0);
		expect(control.action).toBeNull();
	});

	it("прогресс растёт пропорционально длительности действия", () => {
		const control = createControlState("chat");
		startAction(control, "sell");
		const duration = control.action?.durationMs ?? 0;

		advanceAction(control, duration / 4);
		expect(control.action?.progress).toBeCloseTo(0.25, 5);

		advanceAction(control, duration / 4);
		expect(control.action?.progress).toBeCloseTo(0.5, 5);
	});

	it("действие завершается ровно один раз и очищает прогресс", () => {
		const control = createControlState("chat");
		startAction(control, "place-ingredient");

		expect(advanceAction(control, control.action?.durationMs ?? 0)).toBe(true);
		expect(control.action).toBeNull();
		expect(isBusy({ control })).toBe(false);
		expect(advanceAction(control, 1000)).toBe(false);
	});

	it("перелёт по времени всё равно завершает действие, а не зависает", () => {
		const control = createControlState("chat");
		startAction(control, "get-order");

		advanceAction(control, (control.action?.durationMs ?? 0) * 10);

		expect(control.action).toBeNull();
	});

	it("длительность роллится в пределах диапазона", () => {
		const control = createControlState("chat");
		const range = ACTION_DURATIONS_MS.transform;

		startAction(control, "transform", null, () => 0);
		expect(control.action?.durationMs).toBe(range.min);

		startAction(control, "transform", null, () => 0.5);
		expect(control.action?.durationMs).toBeCloseTo(
			(range.min + range.max) / 2,
			5,
		);

		startAction(control, "transform", null, () => 0.999999);
		expect(control.action?.durationMs).toBeLessThanOrEqual(range.max);
		expect(control.action?.durationMs).toBeGreaterThan(range.min);
	});

	it("без действия advance ничего не делает", () => {
		const control = createControlState("chat");

		expect(advanceAction(control, 500)).toBe(false);
		expect(control.action).toBeNull();
	});

	it.each(["take", "transform", "place", "finish"] as const)(
		"новое действие %s стартует, держит предмет и завершается по своей длительности",
		(kind) => {
			const control = createControlState("chat");
			startAction(control, kind, "chopped-tomato");

			expect(control.action).toMatchObject({
				kind,
				progress: 0,
				item: "chopped-tomato",
			});
			expect(isBusy({ control })).toBe(true);

			const duration = control.action?.durationMs ?? 0;

			advanceAction(control, duration / 2);
			expect(control.action).not.toBeNull();

			expect(advanceAction(control, duration)).toBe(true);
			expect(control.action).toBeNull();
		},
	);

	it.each(Object.keys(ACTION_DURATIONS_MS) as ActionKind[])(
		"у действия %s корректный диапазон длительности",
		(kind) => {
			const { min, max } = ACTION_DURATIONS_MS[kind];

			expect(min).toBeGreaterThan(0);
			expect(max).toBeGreaterThanOrEqual(min);
		},
	);

	it("повара нельзя дёрнуть новой командой, пока он работает", () => {
		const order = createOrder(["bun", "cheese"]);
		const cook = makeCook({ order });
		startAction(cook.control, "take-ingredient");

		expect(canRequest(fetchOf("bun"), cook)).toBe(false);
		expect(canRequest(TAKE, cook)).toBe(false);
		expect(canRequest(DELIVER, cook)).toBe(false);
	});

	it("после завершения работы команды снова принимаются", () => {
		const order = createOrder(["bun", "cheese"]);
		const cook = makeCook({ order });
		startAction(cook.control, "take-ingredient");
		advanceAction(cook.control, cook.control.action?.durationMs ?? 0);

		expect(canRequest(fetchOf("bun"), cook)).toBe(true);
	});
});

describe("markActive", () => {
	it("обнуляет idle", () => {
		const control = createControlState("chat");
		control.idleMs = 5000;

		markActive(control);

		expect(control.idleMs).toBe(0);
	});

	it("не трогает режим и запрос", () => {
		const control = createControlState("chat");
		control.request = TAKE;

		markActive(control);

		expect(control.mode).toBe("chat");
		expect(control.request).toBe(TAKE);
	});
});

describe("canRequest: get-order", () => {
	it("разрешён, когда заказа нет", () => {
		expect(canRequest(TAKE, makeCook({ order: null }))).toBe(true);
	});

	it("запрещён, когда заказ уже есть", () => {
		expect(canRequest(TAKE, makeCook({ order: createOrder() }))).toBe(false);
	});
});

describe("canRequest: fetch", () => {
	it("разрешён для следующего по рецепту слоя", () => {
		const order = createOrder(["bun", "cheese", "bun"]);

		expect(canRequest(fetchOf("bun"), makeCook({ order }))).toBe(true);
	});

	it("запрещён для слоя не по порядку", () => {
		const order = createOrder(["bun", "cheese", "bun"]);

		expect(canRequest(fetchOf("cheese"), makeCook({ order }))).toBe(false);
	});

	it("после первого bun запрашивается следующий слой, а не bun", () => {
		const order = createOrder(["bun", "cheese", "bun"]);
		order.placed.push("bun");

		expect(canRequest(fetchOf("cheese"), makeCook({ order }))).toBe(true);
		expect(canRequest(fetchOf("bun"), makeCook({ order }))).toBe(false);
	});

	it("второй bun запрашивается после cheese", () => {
		const order = createOrder(["bun", "cheese", "bun"]);
		order.placed.push("bun", "cheese");

		expect(canRequest(fetchOf("bun"), makeCook({ order }))).toBe(true);
	});

	it("запрещён без заказа", () => {
		expect(canRequest(fetchOf("bun"), makeCook({ order: null }))).toBe(false);
	});

	it("запрещён когда руки заняты", () => {
		const order = createOrder(["bun"]);
		const cook = makeCook({ order, carry: { item: "cheese" } });

		expect(canRequest(fetchOf("bun"), cook)).toBe(false);
	});

	it("запрещён на собранном заказе", () => {
		const order = createOrder(["bun"]);
		order.placed.push("bun");

		expect(canRequest(fetchOf("bun"), makeCook({ order }))).toBe(false);
	});
});

describe("canRequest: deliver", () => {
	it("разрешён на собранном заказе с пустыми руками", () => {
		const order = createOrder(["bun"]);
		order.placed.push("bun");

		expect(canRequest(DELIVER, makeCook({ order }))).toBe(true);
	});

	it("запрещён без заказа", () => {
		expect(canRequest(DELIVER, makeCook({ order: null }))).toBe(false);
	});

	it("запрещён на несобранном заказе", () => {
		expect(canRequest(DELIVER, makeCook({ order: createOrder() }))).toBe(false);
	});

	it("запрещён когда руки заняты", () => {
		const order = createOrder(["bun"]);
		order.placed.push("bun");
		const cook = makeCook({ order, carry: { item: "cheese" } });

		expect(canRequest(DELIVER, cook)).toBe(false);
	});
});

describe("isRequestSettled: get-order", () => {
	it("не выполнен без заказа", () => {
		expect(isRequestSettled(TAKE, makeCook({ order: null }))).toBe(false);
	});

	it("выполнен когда заказ появился", () => {
		expect(isRequestSettled(TAKE, makeCook({ order: createOrder() }))).toBe(
			true,
		);
	});
});

describe("isRequestSettled: fetch", () => {
	it("не выполнен пока нужный слой впереди", () => {
		const order = createOrder(["bun", "cheese"]);

		expect(isRequestSettled(fetchOf("bun"), makeCook({ order }))).toBe(false);
	});

	it("не выполнен пока повар несёт ингредиент", () => {
		const order = createOrder(["bun", "cheese"]);
		const cook = makeCook({ order, carry: { item: "bun" } });

		expect(isRequestSettled(fetchOf("bun"), cook)).toBe(false);
	});

	it("выполнен после выкладки", () => {
		const order = createOrder(["bun", "cheese"]);
		order.placed.push("bun");

		expect(isRequestSettled(fetchOf("bun"), makeCook({ order }))).toBe(true);
	});

	it("выполнен если заказ исчез", () => {
		expect(isRequestSettled(fetchOf("bun"), makeCook({ order: null }))).toBe(
			true,
		);
	});

	it("не выполнен если несёт что-то другое, а слой ещё впереди", () => {
		const order = createOrder(["bun", "cheese"]);
		const cook = makeCook({ order, carry: { item: "patty" } });

		expect(isRequestSettled(fetchOf("bun"), cook)).toBe(false);
	});
});

describe("isRequestSettled: deliver", () => {
	it("не выполнен пока несёт бургер", () => {
		const order = createOrder(["bun"]);
		order.placed.push("bun");
		const cook = makeCook({ order, carry: { item: "burger" } });

		expect(isRequestSettled(DELIVER, cook)).toBe(false);
	});

	it("не выполнен когда бургер отдан, но заказ ещё есть", () => {
		const order = createOrder(["bun"]);
		order.placed.push("bun");
		const cook = makeCook({ order, carry: { item: "burger" } });
		cook.carry.item = null;

		expect(isRequestSettled(DELIVER, cook)).toBe(false);
	});

	it("выполнен после продажи", () => {
		expect(isRequestSettled(DELIVER, makeCook({ order: null }))).toBe(true);
	});
});

describe("связка canRequest и isRequestSettled", () => {
	it("заказ нельзя взять дважды подряд", () => {
		const cook = makeCook({ order: null });

		expect(canRequest(TAKE, cook)).toBe(true);
		cook.order = createOrder();
		expect(canRequest(TAKE, cook)).toBe(false);
	});

	it("fetch нельзя повторить, пока слой не выложен", () => {
		const order = createOrder(["bun", "cheese"]);
		const cook = makeCook({ order });
		const request = fetchOf("bun");

		expect(canRequest(request, cook)).toBe(true);
		expect(isRequestSettled(request, cook)).toBe(false);

		cook.carry.item = "bun";
		expect(isRequestSettled(request, cook)).toBe(false);

		order.placed.push("bun");
		cook.carry.item = null;
		expect(isRequestSettled(request, cook)).toBe(true);
	});

	it("весь заказ проходит цепочкой запросов в порядке рецепта", () => {
		const order = createOrder(["bun", "cheese", "bun"]);
		const cook = makeCook({ order });
		const used: string[] = [];

		let guard = 0;
		while (guard < 10) {
			guard++;
			const next =
				order.placed.length < order.target.length
					? order.target[order.placed.length]
					: undefined;

			if (next === undefined) {
				if (!canRequest(DELIVER, cook)) break;
				used.push("deliver");
				break;
			}

			const request = fetchOf(next);
			if (!canRequest(request, cook)) break;
			used.push(next);
			cook.carry.item = next;
			expect(isRequestSettled(request, cook)).toBe(false);
			order.placed.push(next);
			cook.carry.item = null;
			expect(isRequestSettled(request, cook)).toBe(true);
		}

		expect(used).toEqual(["bun", "cheese", "bun", "deliver"]);
	});
});

describe("rollIdleGoalMs", () => {
	it("всегда попадает в диапазон 4..12с", () => {
		for (let i = 0; i <= 100; i++) {
			const goal = rollIdleGoalMs(() => i / 100);
			expect(goal).toBeGreaterThanOrEqual(IDLE_WANDER_MIN_MS);
			expect(goal).toBeLessThanOrEqual(IDLE_WANDER_MAX_MS);
		}
	});

	it("на краях диапазона даёт точные границы", () => {
		expect(rollIdleGoalMs(() => 0)).toBe(IDLE_WANDER_MIN_MS);
		expect(rollIdleGoalMs(() => 1)).toBe(IDLE_WANDER_MAX_MS);
	});

	it("середина даёт ровно половину", () => {
		expect(rollIdleGoalMs(() => 0.5)).toBe(8000);
	});

	it("каждый бросок даёт своё значение", () => {
		const values = [0, 0.25, 0.5, 0.75, 1].map((seed) =>
			rollIdleGoalMs(() => seed),
		);

		expect(new Set(values).size).toBe(5);
	});

	it("createControlState сразу задаёт порог из диапазона", () => {
		const control = createControlState("chat", () => 0);

		expect(control.idleGoalMs).toBe(IDLE_WANDER_MIN_MS);
	});
});
