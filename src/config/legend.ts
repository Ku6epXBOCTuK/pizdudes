import { CATALOG_EMOJI } from "./items";
import { DISH_RECIPES } from "./recipes";

const SEPARATOR = "   •   ";

function dishesLegend() {
	return DISH_RECIPES.map(
		(recipe) => `${CATALOG_EMOJI[recipe.dish]} ${recipe.name}`,
	).join(", ");
}

const COMMANDS = [
	"!заказ — взять заказ на выдаче",
	"!взять <ингредиент> — взять сырьё с полки",
	"!резать/!жарить/!варить/!месить/!печь — подготовить несомое на станции",
	"!положи — добавить несомое в заказ",
	"!выкинь — выбросить несомое",
	"!отдать — довести блюдо и отнести на кассу",
];

export function buildLegend(): string {
	return [
		`МЕНЮ: ${dishesLegend()}`,
		`КОМАНДЫ ЧАТА: ${COMMANDS.join("  |  ")}`,
	].join(SEPARATOR);
}
