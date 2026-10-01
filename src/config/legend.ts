import { CATALOG_EMOJI } from "./items";
import { DISH_RECIPES } from "./recipes";

const SEPARATOR = "   •   ";

function dishesLegend() {
	return DISH_RECIPES.map(
		(recipe) => `${CATALOG_EMOJI[recipe.dish]} ${recipe.name}`,
	).join(", ");
}

const COMMANDS = [
	"!взять — взять заказ на выдаче",
	"!положи <ингредиент> — сходить за ингредиентом и добавить в заказ",
	"!отдать — довести блюдо и отнести на кассу",
];

export function buildLegend(): string {
	return [
		`МЕНЮ: ${dishesLegend()}`,
		`КОМАНДЫ ЧАТА: ${COMMANDS.join("  |  ")}`,
	].join(SEPARATOR);
}
