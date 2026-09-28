import type { Ingredient, Item } from "./recipes";

export const CARRY_EMOJI: Record<Item, string> = {
	bun: "🍞",
	sauce: "🥫",
	patty: "🥩",
	cheese: "🧀",
	salad: "🥬",
	tomato: "🍅",
	burger: "🍔",
};

export const INGREDIENT_LABELS: Record<Ingredient, string> = {
	bun: "булка",
	sauce: "соус",
	patty: "котлета",
	cheese: "сыр",
	salad: "салат",
	tomato: "помидор",
};

export function carryEmoji(item: Item | null): string {
	return item ? CARRY_EMOJI[item] : "";
}
