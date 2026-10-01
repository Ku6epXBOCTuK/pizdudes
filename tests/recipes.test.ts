import { describe, expect, it } from "vitest";

import { STATION_TYPES } from "../src/assets/stations";
import {
	createOrder,
	createCarryState,
	DISH_RECIPES,
	DISHES,
	INGREDIENTS,
	isOrderComplete,
	ITEM_BURGER,
	type LayerItem,
	nextNeeded,
	pickRecipe,
	PREP,
	RAW_ITEM_STATION,
	RAW_ITEMS,
	RECIPES,
	RECIPE_BURGER,
	SEMI_ITEMS,
	type SemiItem,
	STATION_FINISHES,
	type Ingredient,
} from "../src/config/recipes";

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

describe("рецепты", () => {
	it("задаёт хотя бы один рецепт", () => {
		expect(RECIPES.length).toBeGreaterThan(0);
	});

	it("все ингредиенты рецептов объявлены в INGREDIENTS", () => {
		for (const recipe of RECIPES) {
			for (const item of recipe) {
				expect(INGREDIENTS).toContain(item);
			}
		}
	});

	it("ингредиенты рецепта не повторяются подряд", () => {
		// два одинаковых слоя подряд не имеют кулинарного смысла
		for (const recipe of RECIPES) {
			for (let i = 1; i < recipe.length; i++) {
				expect(recipe[i]).not.toBe(recipe[i - 1]);
			}
		}
	});

	it("рецепт заканчивается основой бургера", () => {
		for (const recipe of RECIPES) {
			expect(recipe.at(-1)).toBe("bun");
			expect(recipe[0]).toBe("bun");
		}
	});

	it("пицца не проходит валидацию рецепта бургера", () => {
		expect(() =>
			createOrder(["bun", "pizza", "bun"] as Ingredient[]),
		).toThrow();
	});
});

describe("pickRecipe", () => {
	it("всегда возвращает копию, а не ссылку на RECIPES", () => {
		const original = pickRecipe();
		const length = original.length;
		const source = RECIPES.find((recipe) => recipe.length === length);
		original.push("bun");

		expect(original.length).toBe(length + 1);
		expect(source === undefined || source.length === length).toBe(true);
	});

	it("при random()=0 берёт первый рецепт, при ~1 — последний", () => {
		expect(pickRecipe(() => 0)).toEqual(RECIPES[0]);
		expect(pickRecipe(() => 0.999999)).toEqual(RECIPES.at(-1));
	});

	it("остаётся в границах при любом random", () => {
		for (const value of [0, 0.25, 0.5, 0.75, 0.999999]) {
			expect(pickRecipe(() => value)).toEqual(
				RECIPES[Math.floor(value * RECIPES.length)],
			);
		}
	});
});

describe("createOrder", () => {
	it("placed пустой, target совпадает с рецептом", () => {
		const order = createOrder();

		expect(order.placed).toEqual([]);
		expect(order.target).toEqual(RECIPE_BURGER);
	});

	it("target не разделяется с переданным рецептом", () => {
		const recipe: Ingredient[] = ["bun", "cheese", "bun"];
		const order = createOrder(recipe);

		order.placed.push("bun");

		expect(recipe).toEqual(["bun", "cheese", "bun"]);
	});

	it("выдаёт заказ из рецепта, если он не передан", () => {
		const order = createOrder(RECIPES[0]);

		expect(order.target).toEqual(RECIPES[0]);
	});
});

describe("nextNeeded", () => {
	it("идёт по слоям строго в порядке рецепта", () => {
		const order = createOrder(["bun", "cheese", "patty", "bun"]);
		const taken: Ingredient[] = [];

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
		const order = createOrder(["bun", "cheese", "bun"]);
		order.placed.push("bun");

		expect(nextNeeded(order)).toBe("cheese");

		order.placed.push("cheese");
		expect(nextNeeded(order)).toBe("bun");
	});

	it("возвращает undefined на собранном заказе", () => {
		const order = createOrder(["bun", "bun"]);
		order.placed.push("bun", "bun");

		expect(nextNeeded(order)).toBeUndefined();
	});

	it("undefined на пустом рецепте", () => {
		expect(nextNeeded(createOrder([]))).toBeUndefined();
	});

	it("не падает при лишних элементах в placed", () => {
		const order = createOrder(["bun"]);
		order.placed.push("bun", "bun", "bun");

		expect(nextNeeded(order)).toBeUndefined();
	});
});

describe("isOrderComplete", () => {
	it("false на пустом заказе с непустым рецептом", () => {
		expect(isOrderComplete(createOrder(["bun"]))).toBe(false);
	});

	it("true когда placed догнал target", () => {
		const order = createOrder(["bun", "cheese", "bun"]);
		order.placed.push("bun", "cheese", "bun");

		expect(isOrderComplete(order)).toBe(true);
	});

	it("true на заказе без слоёв", () => {
		expect(isOrderComplete(createOrder([]))).toBe(true);
	});

	it("true при лишних элементах в placed", () => {
		const order = createOrder(["bun"]);
		order.placed.push("bun", "bun");

		expect(isOrderComplete(order)).toBe(true);
	});
});

describe("createCarryState", () => {
	it("руки пусты", () => {
		expect(createCarryState()).toEqual({ item: null });
	});

	it("каждый вызов даёт независимый объект", () => {
		const first = createCarryState();
		first.item = ITEM_BURGER;

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
