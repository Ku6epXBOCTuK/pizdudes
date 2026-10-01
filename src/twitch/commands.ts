import type { CookRequest } from "../config/control";
import { CATALOG_LABELS } from "../config/items";
import { type LayerItem, RAW_ITEMS, SEMI_ITEMS } from "../config/recipes";

const INGREDIENT_ALIASES: Record<string, LayerItem> = Object.fromEntries(
	[...RAW_ITEMS, ...SEMI_ITEMS].flatMap((item) => [
		[item, item],
		[CATALOG_LABELS[item].toLowerCase().replace(/ё/g, "е"), item],
	]),
);

const COMMAND_TAKE = "!взять";
const COMMAND_PLACE = "!положи";
const COMMAND_PLACE_ALT = "!положить";
const COMMAND_DELIVER = "!отдать";

export function parseCommand(text: string): CookRequest | null {
	const message = text.trim().toLowerCase().replace(/ё/g, "е");
	const [word = "", ...rest] = message.split(/\s+/);

	switch (word) {
		case COMMAND_TAKE:
			return { kind: "get-order" };

		case COMMAND_DELIVER:
			return { kind: "deliver" };

		case COMMAND_PLACE:
		case COMMAND_PLACE_ALT: {
			const ingredient = INGREDIENT_ALIASES[rest.join(" ")];
			return ingredient ? { kind: "fetch", ingredient } : null;
		}

		default:
			return null;
	}
}
