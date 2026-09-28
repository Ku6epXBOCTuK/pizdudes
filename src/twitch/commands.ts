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

	if (message.startsWith(COMMAND_TAKE)) {
		return { kind: "get-order" };
	}

	if (message.startsWith(COMMAND_DELIVER)) {
		return { kind: "deliver" };
	}

	if (message.startsWith(COMMAND_PLACE)) {
		const argument = message.slice(COMMAND_PLACE.length).trim();
		const ingredient = INGREDIENT_ALIASES[argument];

		return ingredient ? { kind: "fetch", ingredient } : null;
	}

	return null;
}
