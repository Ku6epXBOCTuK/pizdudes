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
	startAction,
} from "../src/config/control";
import {
	type CarryState,
	createCarryState,
	createOrder,
	type Ingredient,
	type OrderState,
} from "../src/config/recipes";
import { CHAT_IDLE_WANDER_MS } from "../src/constants";

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
		expect(createControlState()).toEqual({
			mode: "auto",
			request: null,
			idleMs: 0,
			action: null,
		});
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

		expect(control.action).toEqual({ kind: "take-ingredient", progress: 0 });
		expect(isBusy({ control })).toBe(true);
	});

	it("прогресс растёт пропорционально длительности действия", () => {
		const control = createControlState("chat");
		const duration = ACTION_DURATIONS_MS.sell;
		startAction(control, "sell");

		advanceAction(control, duration / 4);
		expect(control.action?.progress).toBeCloseTo(0.25, 5);

		advanceAction(control, duration / 4);
		expect(control.action?.progress).toBeCloseTo(0.5, 5);
	});

	it("действие завершается ровно один раз и очищает прогресс", () => {
		const control = createControlState("chat");
		startAction(control, "place-ingredient");

		expect(
			advanceAction(control, ACTION_DURATIONS_MS["place-ingredient"]),
		).toBe(true);
		expect(control.action).toBeNull();
		expect(isBusy({ control })).toBe(false);
		expect(advanceAction(control, 1000)).toBe(false);
	});

	it("перелёт по времени всё равно завершает действие, а не зависает", () => {
		const control = createControlState("chat");
		startAction(control, "get-order");

		advanceAction(control, ACTION_DURATIONS_MS["get-order"] * 10);

		expect(control.action).toBeNull();
	});

	it("без действия advance ничего не делает", () => {
		const control = createControlState("chat");

		expect(advanceAction(control, 500)).toBe(false);
		expect(control.action).toBeNull();
	});

	it.each(Object.keys(ACTION_DURATIONS_MS) as ActionKind[])(
		"у действия %s положительная длительность",
		(kind) => {
			expect(ACTION_DURATIONS_MS[kind]).toBeGreaterThan(0);
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
		advanceAction(cook.control, ACTION_DURATIONS_MS["take-ingredient"]);

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

	it("порог блуждания положителен", () => {
		expect(CHAT_IDLE_WANDER_MS).toBeGreaterThan(0);
	});
});
