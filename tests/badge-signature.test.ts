import { describe, expect, it } from "vitest";

import { badgeSignature } from "../src/ui/cook-badge";
import {
	createOrder,
	type DishRecipe,
	type LayerItem,
} from "../src/config/recipes";

const LAYERS: LayerItem[] = [
	"bun",
	"patty",
	"cheese",
	"chopped-lettuce",
	"chopped-tomato",
	"bun",
];

const RECIPE: DishRecipe = {
	id: "test-recipe",
	name: "Тестовый",
	dish: "dish-burger",
	layers: LAYERS,
	order: "layered",
	finishAt: "serving-counter",
};

describe("badgeSignature", () => {
	it("пусто, средне и полно дают разные подписи", () => {
		const empty = badgeSignature(null, null, null, true);

		const middle = createOrder(RECIPE);
		middle.placed.push("bun", "patty", "cheese");
		const middleSignature = badgeSignature(
			middle,
			"chopped-lettuce",
			0.5,
			true,
		);

		const full = createOrder(RECIPE);
		full.placed.push(...LAYERS);
		const fullSignature = badgeSignature(full, "dish-burger", 1, true);

		expect(empty).not.toBe(middleSignature);
		expect(middleSignature).not.toBe(fullSignature);
		expect(empty).not.toBe(fullSignature);
	});

	it("состояние не изменилось — подпись та же, перерисовывать незачем", () => {
		const order = createOrder(RECIPE);
		order.placed.push("bun");

		expect(badgeSignature(order, "patty", 0.3, true)).toBe(
			badgeSignature(order, "patty", 0.3, true),
		);
	});

	it("сдвиг на шаг слоя рецепта меняет подпись", () => {
		const order = createOrder(RECIPE);
		const before = badgeSignature(order, null, null, true);

		order.placed.push("bun");

		expect(badgeSignature(order, null, null, true)).not.toBe(before);
	});

	it("переключение имён меняет подпись, иначе бейдж не перерисуется", () => {
		const order = createOrder(RECIPE);

		expect(badgeSignature(order, "bun", 0.5, true)).not.toBe(
			badgeSignature(order, "bun", 0.5, false),
		);
	});
});
