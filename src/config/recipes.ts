import type { StationType } from "../assets/stations";

export const INGREDIENTS = [
	"bun",
	"sauce",
	"patty",
	"cheese",
	"salad",
	"tomato",
] as const;

export type Ingredient = (typeof INGREDIENTS)[number];

export const ITEM_BURGER = "burger" as const;

export type Item = Ingredient | typeof ITEM_BURGER;

export const INGREDIENT_STATIONS: Record<Ingredient, StationType> = {
	bun: "bun-shelf",
	sauce: "pantry-shelf",
	patty: "grill",
	cheese: "dairy-shelf",
	salad: "produce-shelf",
	tomato: "produce-shelf",
};

export const SERVING_COUNTER = "serving-counter";

export const CASH_REGISTER = "cash-register";

export const RECIPE_BURGER: Ingredient[] = [
	"bun",
	"sauce",
	"patty",
	"cheese",
	"salad",
	"tomato",
	"bun",
];

export const RECIPES: Ingredient[][] = [RECIPE_BURGER];

export interface OrderState {
	target: Ingredient[];
	placed: Ingredient[];
}

export interface CarryState {
	item: Item | null;
}

export function pickRecipe(random: () => number = Math.random): Ingredient[] {
	return [...RECIPES[Math.floor(random() * RECIPES.length)]!];
}

export function isValidRecipe(recipe: readonly Ingredient[]): boolean {
	return recipe.every((item) => INGREDIENTS.includes(item));
}

export function createOrder(recipe = pickRecipe()): OrderState {
	if (!isValidRecipe(recipe)) {
		throw new Error(`Неизвестный ингредиент в рецепте: ${recipe.join(", ")}`);
	}

	return { target: [...recipe], placed: [] };
}

export function createCarryState(): CarryState {
	return { item: null };
}

export function nextNeeded(order: OrderState): Ingredient | undefined {
	return order.target[order.placed.length];
}

export function isOrderComplete(order: OrderState): boolean {
	return order.placed.length >= order.target.length;
}
