import { describe, expect, it } from "vitest";

import {
	createOrder,
	createCarryState,
	INGREDIENTS,
	isOrderComplete,
	ITEM_BURGER,
	nextNeeded,
	pickRecipe,
	RECIPES,
	RECIPE_BURGER,
	type Ingredient,
} from "../src/config/recipes";

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
