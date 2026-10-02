import type { StationType } from "../assets/stations";
import type { CookRequest } from "../config/control";
import { CATALOG_LABELS } from "../config/items";
import { type LayerItem, RAW_ITEMS, SEMI_ITEMS } from "../config/recipes";

const ITEM_ALIASES: Record<string, LayerItem> = Object.fromEntries(
	[...RAW_ITEMS, ...SEMI_ITEMS].flatMap((item) => [
		[item, item],
		[CATALOG_LABELS[item].toLowerCase().replace(/ё/g, "е"), item],
	]),
);

const TRANSFORM_COMMANDS: Record<string, StationType> = {
	"!резать": "cutting-board",
	"!нарезать": "cutting-board",
	"!нарежь": "cutting-board",
	"!жарить": "grill",
	"!пожарить": "grill",
	"!пожарь": "grill",
	"!варить": "stove-pot",
	"!сварить": "stove-pot",
	"!свари": "stove-pot",
	"!месить": "dough-mixer",
	"!замесить": "dough-mixer",
	"!замеси": "dough-mixer",
	"!печь": "pizza-oven",
	"!испечь": "pizza-oven",
	"!испеки": "pizza-oven",
	"!выпечь": "pizza-oven",
};

export function parseCommand(text: string): CookRequest | null {
	const message = text.trim().toLowerCase().replace(/ё/g, "е");
	const [word = "", ...rest] = message.split(/\s+/);

	switch (word) {
		case "!заказ":
			return { kind: "get-order" };

		case "!отдать":
			return { kind: "deliver" };

		case "!положи":
		case "!положить":
			return { kind: "place" };

		case "!выкинь":
		case "!выкинуть":
		case "!выбрось":
		case "!выбросить":
			return { kind: "drop" };

		case "!взять": {
			const item = ITEM_ALIASES[rest.join(" ")];
			return item ? { kind: "take", item } : null;
		}

		default: {
			const at = TRANSFORM_COMMANDS[word];
			return at ? { kind: "transform", at } : null;
		}
	}
}
