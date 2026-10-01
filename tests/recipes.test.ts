import { describe, expect, it } from "vitest";

import { STATION_TYPES } from "../src/assets/stations";
import {
	chainRoot,
	createOrder,
	createCarryState,
	DISH_RECIPES,
	DISHES,
	type DishRecipe,
	isOrderComplete,
	type LayerItem,
	missingLayers,
	nextNeeded,
	pickDishRecipe,
	placeStation,
	PREP,
	prepChain,
	RAW_ITEM_STATION,
	RAW_ITEMS,
	routeForLayer,
	SEMI_ITEMS,
	type SemiItem,
	STATION_FINISHES,
	transformResult,
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

function isSemi(item: LayerItem): item is SemiItem {
	return (SEMI_ITEMS as readonly string[]).includes(item);
}

function expandChain(item: LayerItem): Set<LayerItem> {
	const seen = new Set<LayerItem>([item]);
	const queue: LayerItem[] = [item];

	while (queue.length > 0) {
		const current = queue.pop()!;
		if (!isSemi(current)) continue;

		for (const step of PREP[current]) {
			if (!seen.has(step.from)) {
				seen.add(step.from);
				queue.push(step.from);
			}
		}
	}

	return seen;
}

describe("pickDishRecipe", () => {
	it("при random()=0 берёт первый рецепт, при ~1 — последний", () => {
		expect(pickDishRecipe(() => 0)).toEqual(DISH_RECIPES[0]);
		expect(pickDishRecipe(() => 0.999999)).toEqual(DISH_RECIPES.at(-1));
	});

	it("остаётся в границах при любом random", () => {
		for (const value of [0, 0.25, 0.5, 0.75, 0.999999]) {
			expect(pickDishRecipe(() => value)).toEqual(
				DISH_RECIPES[Math.floor(value * DISH_RECIPES.length)],
			);
		}
	});
});

describe("createOrder", () => {
	it("placed пустой, рецепт совпадает с переданным", () => {
		const recipe = makeRecipe(["bun", "cheese", "bun"]);
		const order = createOrder(recipe);

		expect(order.placed).toEqual([]);
		expect(order.recipe).toBe(recipe);
	});

	it("выдаёт заказ из каталога, если рецепт не передан", () => {
		const order = createOrder();

		expect(DISH_RECIPES).toContainEqual(order.recipe);
	});

	it("бросает ошибку на неизвестном слое", () => {
		expect(() =>
			createOrder(makeRecipe(["bun", "dish-pizza" as LayerItem, "bun"])),
		).toThrow();
	});
});

describe("nextNeeded", () => {
	it("layered: идёт по слоям строго в порядке рецепта", () => {
		const order = createOrder(makeRecipe(["bun", "cheese", "patty", "bun"]));
		const taken: LayerItem[] = [];

		while (true) {
			const next = nextNeeded(order);
			if (!next) break;
			taken.push(next);
			order.placed.push(next);
		}

		expect(taken).toEqual(["bun", "cheese", "patty", "bun"]);
	});

	it("дубликаты в рецепте не теряются", () => {
		// регрессия: поиск через placed.includes() считал второй bun уже взятым
		const order = createOrder(makeRecipe(["bun", "cheese", "bun"]));
		order.placed.push("bun");

		expect(nextNeeded(order)).toBe("cheese");

		order.placed.push("cheese");
		expect(nextNeeded(order)).toBe("bun");
	});

	it("assorted: возвращает любой недостающий слой", () => {
		const order = createOrder(
			makeRecipe(["bun", "cheese", "bun"], { order: "assorted" }),
		);
		order.placed.push("bun");

		expect(missingLayers(order)).toEqual(["cheese", "bun"]);
		expect(nextNeeded(order)).toBe("cheese");
	});

	it("возвращает undefined на собранном заказе", () => {
		const order = createOrder(makeRecipe(["bun"]));
		order.placed.push("bun");

		expect(nextNeeded(order)).toBeUndefined();
	});

	it("не падает при лишних элементах в placed", () => {
		const order = createOrder(makeRecipe(["bun"]));
		order.placed.push("bun", "bun", "bun");

		expect(nextNeeded(order)).toBeUndefined();
	});
});

describe("isOrderComplete", () => {
	it("false на пустом заказе с непустым рецептом", () => {
		expect(isOrderComplete(createOrder(makeRecipe(["bun"])))).toBe(false);
	});

	it("true когда placed догнал рецепт", () => {
		const order = createOrder(makeRecipe(["bun", "cheese", "bun"]));
		order.placed.push("bun", "cheese", "bun");

		expect(isOrderComplete(order)).toBe(true);
	});

	it("true при лишних элементах в placed", () => {
		const order = createOrder(makeRecipe(["bun"]));
		order.placed.push("bun", "bun");

		expect(isOrderComplete(order)).toBe(true);
	});
});

describe("цепочки подготовки", () => {
	it("сырьё не имеет цепочки", () => {
		expect(prepChain("tomato")).toEqual([]);
	});

	it("одношаговая цепочка нарезки", () => {
		expect(prepChain("chopped-tomato")).toEqual([
			{ from: "tomato", at: "cutting-board" },
		]);
	});

	it("многошаговая цепочка разворачивается от сырья к продукту", () => {
		expect(prepChain("pizza-base")).toEqual([
			{ from: "flour", at: "dough-mixer" },
			{ from: "dough", at: "pizza-oven" },
		]);
	});

	it("chainRoot возвращает сырое начало цепочки", () => {
		expect(chainRoot("bun")).toBe("bun");
		expect(chainRoot("pizza-base")).toBe("flour");
		expect(chainRoot("tomato-sauce")).toBe("tomato");
	});

	it("transformResult находит продукт по предмету и станции", () => {
		expect(transformResult("tomato", "cutting-board")).toBe("chopped-tomato");
		expect(transformResult("dough", "pizza-oven")).toBe("pizza-base");
		expect(transformResult("tomato", "grill")).toBeNull();
	});
});

describe("маршрутизация слоя", () => {
	it("супы собираются сразу в кастрюле", () => {
		const soup = makeRecipe(["beans"], {
			dish: "dish-soup",
			finishAt: "stove-pot",
		});

		expect(placeStation(soup)).toBe("stove-pot");
		expect(placeStation(makeRecipe(["bun"]))).toBe("serving-counter");
	});

	it("пустые руки ведут к полке с корнем цепочки", () => {
		const recipe = makeRecipe(["pizza-base"]);

		expect(routeForLayer(null, "pizza-base", recipe)).toBe("pantry-shelf");
		expect(routeForLayer(null, "bun", recipe)).toBe("bun-shelf");
	});

	it("промежуточный полуфабрикат ведёт на следующую станцию цепочки", () => {
		const recipe = makeRecipe(["pizza-base"]);

		expect(routeForLayer("flour", "pizza-base", recipe)).toBe("dough-mixer");
		expect(routeForLayer("dough", "pizza-base", recipe)).toBe("pizza-oven");
	});

	it("готовый слой ведёт на станцию выкладки", () => {
		const recipe = makeRecipe(["chopped-tomato"]);

		expect(routeForLayer("chopped-tomato", "chopped-tomato", recipe)).toBe(
			"serving-counter",
		);
	});
});

describe("createCarryState", () => {
	it("руки пусты", () => {
		expect(createCarryState()).toEqual({ item: null });
	});

	it("каждый вызов даёт независимый объект", () => {
		const first = createCarryState();
		first.item = "dish-burger";

		expect(createCarryState()).toEqual({ item: null });
	});
});

describe("каталог: сырьё и полуфабрикаты", () => {
	it("id не пересекаются между сырьём, полуфабрикатами и блюдами", () => {
		const all = [...RAW_ITEMS, ...SEMI_ITEMS, ...DISHES];

		expect(new Set(all).size).toBe(all.length);
	});

	it("у каждого сырья есть станция-источник, и она существует", () => {
		for (const item of RAW_ITEMS) {
			expect(STATION_TYPES).toContain(RAW_ITEM_STATION[item]);
		}
	});

	it("каждый полуфабрикат имеет непустую цепочку на существующих станциях", () => {
		for (const item of SEMI_ITEMS) {
			const steps = PREP[item];

			expect(steps.length).toBeGreaterThan(0);

			for (const step of steps) {
				expect(STATION_TYPES).toContain(step.at);
				expect([...RAW_ITEMS, ...SEMI_ITEMS]).toContain(step.from);
			}
		}
	});

	it("цепочки без циклов и заканчиваются сырьём", () => {
		for (const item of SEMI_ITEMS) {
			const expanded = expandChain(item);
			const leaves = [...expanded].filter(
				(part) => part !== item && !isSemi(part),
			);

			expect(leaves.length).toBeGreaterThan(0);
			expect(expanded.size).toBeLessThanOrEqual(
				RAW_ITEMS.length + SEMI_ITEMS.length,
			);
		}
	});
});

describe("каталог: рецепты блюд", () => {
	it("id рецептов уникальны, названия непустые", () => {
		const ids = DISH_RECIPES.map((recipe) => recipe.id);

		expect(new Set(ids).size).toBe(ids.length);

		for (const recipe of DISH_RECIPES) {
			expect(recipe.name.trim().length).toBeGreaterThan(0);
		}
	});

	it("слои состоят только из сырья и полуфабрикатов, без блюд", () => {
		const known: readonly string[] = [...RAW_ITEMS, ...SEMI_ITEMS];

		for (const recipe of DISH_RECIPES) {
			for (const layer of recipe.layers) {
				expect(known).toContain(layer);
			}
		}
	});

	it("соседние слои не повторяются", () => {
		for (const recipe of DISH_RECIPES) {
			for (let i = 1; i < recipe.layers.length; i++) {
				expect(recipe.layers[i]).not.toBe(recipe.layers[i - 1]);
			}
		}
	});

	it("финишная станция умеет доводить блюдо рецепта", () => {
		for (const recipe of DISH_RECIPES) {
			expect(STATION_FINISHES[recipe.finishAt]).toContain(recipe.dish);
		}
	});

	it("у каждого типа блюда есть хотя бы один рецепт", () => {
		for (const dish of DISHES) {
			expect(DISH_RECIPES.some((recipe) => recipe.dish === dish)).toBe(true);
		}
	});

	it("каждое сырьё и полуфабрикат встречаются минимум в двух рецептах", () => {
		const usage = new Map<LayerItem, number>();

		for (const recipe of DISH_RECIPES) {
			const perRecipe = new Set<LayerItem>();

			for (const layer of recipe.layers) {
				for (const part of expandChain(layer)) {
					perRecipe.add(part);
				}
			}

			for (const part of perRecipe) {
				usage.set(part, (usage.get(part) ?? 0) + 1);
			}
		}

		for (const item of [...RAW_ITEMS, ...SEMI_ITEMS]) {
			expect(usage.get(item) ?? 0).toBeGreaterThanOrEqual(2);
		}
	});
});
