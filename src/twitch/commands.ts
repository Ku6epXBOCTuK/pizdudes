import type { CookRequest } from "../config/control";
import type { Ingredient } from "../config/recipes";

const INGREDIENT_ALIASES: Record<string, Ingredient> = {
	булка: "bun",
	булочка: "bun",
	булки: "bun",
	bun: "bun",

	соус: "sauce",
	sauce: "sauce",

	котлета: "patty",
	котлеты: "patty",
	котлету: "patty",
	patty: "patty",

	сыр: "cheese",
	cheese: "cheese",

	салат: "salad",
	лист: "salad",
	листья: "salad",
	salad: "salad",

	помидор: "tomato",
	помидоры: "tomato",
	томат: "tomato",
	tomato: "tomato",
};

const COMMAND_TAKE = "!взять";
const COMMAND_PLACE = "!положи";
const COMMAND_DELIVER = "!отдать";

export function parseCommand(text: string): CookRequest | null {
	const message = text.trim().toLowerCase();
	const [word = "", ...rest] = message.split(/\s+/);

	switch (word) {
		case COMMAND_TAKE:
			return { kind: "get-order" };

		case COMMAND_DELIVER:
			return { kind: "deliver" };

		case COMMAND_PLACE: {
			const ingredient = INGREDIENT_ALIASES[rest.join(" ")];
			return ingredient ? { kind: "fetch", ingredient } : null;
		}

		default:
			return null;
	}
}
