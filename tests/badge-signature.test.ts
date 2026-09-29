import { describe, expect, it } from "vitest";

import { badgeSignature } from "../src/ui/cook-badge";
import { createOrder } from "../src/config/recipes";

import type { Ingredient } from "../src/config/recipes";

const RECIPE: Ingredient[] = [
	"bun",
	"sauce",
	"patty",
	"cheese",
	"salad",
	"tomato",
	"bun",
];

describe("badgeSignature", () => {
	it("пусто, средне и полно дают разные подписи", () => {
		const empty = badgeSignature(null, null, null);

		const middle = createOrder(RECIPE);
		middle.placed.push("bun", "sauce", "patty");
		const middleSignature = badgeSignature(middle, "cheese", 0.5);

		const full = createOrder(RECIPE);
		full.placed.push(...RECIPE);
		const fullSignature = badgeSignature(full, "burger", 1);

		expect(empty).not.toBe(middleSignature);
		expect(middleSignature).not.toBe(fullSignature);
		expect(empty).not.toBe(fullSignature);
	});

	it("состояние не изменилось — подпись та же, перерисовывать незачем", () => {
		const order = createOrder(RECIPE);
		order.placed.push("bun");

		expect(badgeSignature(order, "sauce", 0.3)).toBe(
			badgeSignature(order, "sauce", 0.3),
		);
	});

	it("сдвиг на шаг слоя рецепта меняет подпись", () => {
		const order = createOrder(RECIPE);
		const before = badgeSignature(order, null, null);

		order.placed.push("bun");

		expect(badgeSignature(order, null, null)).not.toBe(before);
	});
});
