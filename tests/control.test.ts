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
	type DishRecipe,
	type LayerItem,
	type OrderState,
} from "../src/config/recipes";
import { IDLE_WANDER_MAX_MS, IDLE_WANDER_MIN_MS } from "../src/constants";

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

const ORDER: CookRequest = { kind: "get-order" };
const DELIVER: CookRequest = { kind: "deliver" };
const PLACE: CookRequest = { kind: "place" };
const DROP: CookRequest = { kind: "drop" };
const takeOf = (item: LayerItem): CookRequest => ({ kind: "take", item });
const transformAt = (at: "cutting-board" | "grill"): CookRequest => ({
	kind: "transform",
	at,
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
		startAction(control, "take");

		expect(control.action).toMatchObject({
			kind: "take",
			progress: 0,
			item: null,
		});
		expect(isBusy({ control })).toBe(true);
	});

	it("ингредиент сохраняется в действии, чтобы применить позже", () => {
		const control = createControlState("chat");
		startAction(control, "take", "cheese");

		expect(control.action).toMatchObject({
			kind: "take",
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
		startAction(control, "place");

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
		const order = createOrder(makeRecipe(["bun", "cheese"]));
		const cook = makeCook({ order });
		startAction(cook.control, "take");

		expect(canRequest(takeOf("bun"), cook)).toBe(false);
		expect(canRequest(ORDER, cook)).toBe(false);
		expect(canRequest(DELIVER, cook)).toBe(false);
	});

	it("после завершения работы команды снова принимаются", () => {
		const order = createOrder(makeRecipe(["bun", "cheese"]));
		const cook = makeCook({ order });
		startAction(cook.control, "take");
		advanceAction(cook.control, cook.control.action?.durationMs ?? 0);

		expect(canRequest(takeOf("bun"), cook)).toBe(true);
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
		control.request = ORDER;

		markActive(control);

		expect(control.mode).toBe("chat");
		expect(control.request).toBe(ORDER);
	});
});

describe("canRequest: get-order", () => {
	it("разрешён, когда заказа нет", () => {
		expect(canRequest(ORDER, makeCook({ order: null }))).toBe(true);
	});

	it("запрещён, когда заказ уже есть", () => {
		expect(canRequest(ORDER, makeCook({ order: createOrder() }))).toBe(false);
	});
});

describe("canRequest: take", () => {
	it("разрешён для сырья с пустыми руками, заказ не обязателен", () => {
		expect(canRequest(takeOf("bun"), makeCook({ order: null }))).toBe(true);

		const order = createOrder(makeRecipe(["bun", "cheese"]));
		expect(canRequest(takeOf("bun"), makeCook({ order }))).toBe(true);
	});

	it("запрещён для полуфабриката: его надо готовить, а не брать", () => {
		expect(canRequest(takeOf("patty"), makeCook())).toBe(false);
		expect(canRequest(takeOf("dish-burger" as LayerItem), makeCook())).toBe(
			false,
		);
	});

	it("запрещён когда руки заняты", () => {
		const cook = makeCook({ carry: { item: "cheese" } });

		expect(canRequest(takeOf("bun"), cook)).toBe(false);
	});
});

describe("canRequest: transform", () => {
	it("разрешён когда в руках предмет, трансформируемый на этой станции", () => {
		const cook = makeCook({ carry: { item: "tomato" } });

		expect(canRequest(transformAt("cutting-board"), cook)).toBe(true);
	});

	it("запрещён с пустыми руками", () => {
		expect(canRequest(transformAt("cutting-board"), makeCook())).toBe(false);
	});

	it("запрещён когда предмет на этой станции не трансформируется", () => {
		const cook = makeCook({ carry: { item: "tomato" } });

		expect(canRequest(transformAt("grill"), cook)).toBe(false);
	});

	it("запрещён для готового блюда", () => {
		const cook = makeCook({ carry: { item: "dish-burger" } });

		expect(canRequest(transformAt("grill"), cook)).toBe(false);
	});
});

describe("canRequest: drop", () => {
	it("разрешён когда руки заняты чем угодно", () => {
		expect(canRequest(DROP, makeCook({ carry: { item: "bun" } }))).toBe(true);
		expect(canRequest(DROP, makeCook({ carry: { item: "dish-burger" } }))).toBe(
			true,
		);
	});

	it("запрещён с пустыми руками", () => {
		expect(canRequest(DROP, makeCook())).toBe(false);
	});
});

describe("isRequestSettled: drop", () => {
	it("не выполнен пока предмет в руках, выполнен когда руки пусты", () => {
		const cook = makeCook({ carry: { item: "bun" } });

		expect(isRequestSettled(DROP, cook)).toBe(false);

		cook.carry.item = null;
		expect(isRequestSettled(DROP, cook)).toBe(true);
	});
});

describe("canRequest: place", () => {
	it("разрешён когда повар несёт нужный слой", () => {
		const order = createOrder(makeRecipe(["bun", "cheese", "bun"]));
		const cook = makeCook({ order, carry: { item: "bun" } });

		expect(canRequest(PLACE, cook)).toBe(true);
	});

	it("запрещён когда несёт слой не по порядку", () => {
		const order = createOrder(makeRecipe(["bun", "cheese", "bun"]));
		const cook = makeCook({ order, carry: { item: "cheese" } });

		expect(canRequest(PLACE, cook)).toBe(false);
	});

	it("assorted: разрешён любой недостающий слой", () => {
		const order = createOrder(
			makeRecipe(["bun", "cheese", "bun"], { order: "assorted" }),
		);
		const cook = makeCook({ order, carry: { item: "cheese" } });

		expect(canRequest(PLACE, cook)).toBe(true);
	});

	it("запрещён с пустыми руками, без заказа и на собранном заказе", () => {
		const order = createOrder(makeRecipe(["bun"]));

		expect(canRequest(PLACE, makeCook({ order }))).toBe(false);
		expect(canRequest(PLACE, makeCook({ carry: { item: "bun" } }))).toBe(false);

		const done = createOrder(makeRecipe(["bun"]));
		done.placed.push("bun");
		const cook = makeCook({ order: done, carry: { item: "bun" } });
		expect(canRequest(PLACE, cook)).toBe(false);
	});
});

describe("canRequest: deliver", () => {
	it("разрешён на собранном заказе с пустыми руками", () => {
		const order = createOrder(makeRecipe(["bun"]));
		order.placed.push("bun");

		expect(canRequest(DELIVER, makeCook({ order }))).toBe(true);
	});

	it("запрещён без заказа", () => {
		expect(canRequest(DELIVER, makeCook({ order: null }))).toBe(false);
	});

	it("запрещён на несобранном заказе", () => {
		expect(canRequest(DELIVER, makeCook({ order: createOrder() }))).toBe(false);
	});

	it("разрешён когда повар несёт готовое блюдо", () => {
		const order = createOrder(makeRecipe(["bun"]));
		order.placed.push("bun");
		const cook = makeCook({ order, carry: { item: "dish-burger" } });

		expect(canRequest(DELIVER, cook)).toBe(true);
	});

	it("запрещён когда руки заняты ингредиентом", () => {
		const order = createOrder(makeRecipe(["bun"]));
		order.placed.push("bun");
		const cook = makeCook({ order, carry: { item: "cheese" } });

		expect(canRequest(DELIVER, cook)).toBe(false);
	});
});

describe("isRequestSettled: get-order", () => {
	it("не выполнен без заказа", () => {
		expect(isRequestSettled(ORDER, makeCook({ order: null }))).toBe(false);
	});

	it("выполнен когда заказ появился", () => {
		expect(isRequestSettled(ORDER, makeCook({ order: createOrder() }))).toBe(
			true,
		);
	});
});

describe("isRequestSettled: take", () => {
	it("не выполнен пока руки пусты", () => {
		expect(isRequestSettled(takeOf("bun"), makeCook())).toBe(false);
	});

	it("выполнен когда предмет в руках", () => {
		const cook = makeCook({ carry: { item: "bun" } });

		expect(isRequestSettled(takeOf("bun"), cook)).toBe(true);
	});

	it("не выполнен когда в руках что-то другое", () => {
		const cook = makeCook({ carry: { item: "cheese" } });

		expect(isRequestSettled(takeOf("bun"), cook)).toBe(false);
	});
});

describe("isRequestSettled: transform", () => {
	it("не выполнен пока предмет ещё трансформируем на этой станции", () => {
		const cook = makeCook({ carry: { item: "tomato" } });

		expect(isRequestSettled(transformAt("cutting-board"), cook)).toBe(false);
	});

	it("выполнен когда предмет превратился в продукт", () => {
		const cook = makeCook({ carry: { item: "chopped-tomato" } });

		expect(isRequestSettled(transformAt("cutting-board"), cook)).toBe(true);
	});

	it("выполнен если руки опустели", () => {
		expect(isRequestSettled(transformAt("grill"), makeCook())).toBe(true);
	});
});

describe("isRequestSettled: place", () => {
	it("не выполнен пока повар несёт слой", () => {
		const order = createOrder(makeRecipe(["bun", "cheese"]));
		const cook = makeCook({ order, carry: { item: "bun" } });

		expect(isRequestSettled(PLACE, cook)).toBe(false);
	});

	it("выполнен когда руки опустели", () => {
		const order = createOrder(makeRecipe(["bun", "cheese"]));
		order.placed.push("bun");

		expect(isRequestSettled(PLACE, makeCook({ order }))).toBe(true);
	});
});

describe("isRequestSettled: deliver", () => {
	it("не выполнен пока несёт бургер", () => {
		const order = createOrder(makeRecipe(["bun"]));
		order.placed.push("bun");
		const cook = makeCook({ order, carry: { item: "dish-burger" } });

		expect(isRequestSettled(DELIVER, cook)).toBe(false);
	});

	it("не выполнен когда бургер отдан, но заказ ещё есть", () => {
		const order = createOrder(makeRecipe(["bun"]));
		order.placed.push("bun");
		const cook = makeCook({ order, carry: { item: "dish-burger" } });
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

		expect(canRequest(ORDER, cook)).toBe(true);
		cook.order = createOrder();
		expect(canRequest(ORDER, cook)).toBe(false);
	});

	it("take + place проводят слой от полки до заказа", () => {
		const order = createOrder(makeRecipe(["bun", "cheese"]));
		const cook = makeCook({ order });

		const take = takeOf("bun");
		expect(canRequest(take, cook)).toBe(true);
		expect(isRequestSettled(take, cook)).toBe(false);

		cook.carry.item = "bun";
		expect(isRequestSettled(take, cook)).toBe(true);

		expect(canRequest(PLACE, cook)).toBe(true);
		expect(isRequestSettled(PLACE, cook)).toBe(false);

		order.placed.push("bun");
		cook.carry.item = null;
		expect(isRequestSettled(PLACE, cook)).toBe(true);
	});

	it("весь заказ проходит цепочкой запросов в порядке рецепта", () => {
		const order = createOrder(makeRecipe(["bun", "cheese", "bun"]));
		const cook = makeCook({ order });
		const used: string[] = [];

		let guard = 0;
		while (guard < 10) {
			guard++;
			const next =
				order.placed.length < order.recipe.layers.length
					? order.recipe.layers[order.placed.length]
					: undefined;

			if (next === undefined) {
				if (!canRequest(DELIVER, cook)) break;
				used.push("deliver");
				break;
			}

			const take = takeOf(next);
			if (!canRequest(take, cook)) break;
			used.push(next);
			cook.carry.item = next;
			expect(isRequestSettled(take, cook)).toBe(true);

			if (!canRequest(PLACE, cook)) break;
			order.placed.push(next);
			cook.carry.item = null;
			expect(isRequestSettled(PLACE, cook)).toBe(true);
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
