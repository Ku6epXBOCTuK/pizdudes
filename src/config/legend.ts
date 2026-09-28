import { CARRY_EMOJI, INGREDIENT_LABELS } from "./items";
import { INGREDIENTS, ITEM_BURGER, RECIPE_BURGER } from "./recipes";

const SEPARATOR = "   •   ";

function recipeLegend() {
	return RECIPE_BURGER.map((item, index) => {
		const label =
			item === "bun"
				? index === 0
					? "нижняя булка"
					: "верхняя булка"
				: INGREDIENT_LABELS[item];
		return `${CARRY_EMOJI[item]} ${label}`;
	}).join(" → ");
}

function ingredientsLegend() {
	return INGREDIENTS.map(
		(item) => `${CARRY_EMOJI[item]} ${INGREDIENT_LABELS[item]}`,
	).join(", ");
}

const COMMANDS = [
	"!взять — взять заказ на serving-станции",
	"!положить <ингредиент> — сходить за ингредиентом и положить на стол",
	"!отдать — отнести готовый бургер на кассу",
];

export function buildLegend(): string {
	return [
		`РЕЦЕПТ БУРГЕРА: ${recipeLegend()}`,
		`СОСТАВ: ${ingredientsLegend()}`,
		`ГОТОВЫЙ БУРГЕР: ${CARRY_EMOJI[ITEM_BURGER]}`,
		`КОМАНДЫ ЧАТА: ${COMMANDS.join("  |  ")}`,
	].join(SEPARATOR);
}
