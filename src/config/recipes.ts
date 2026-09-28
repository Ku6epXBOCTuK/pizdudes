import type { StationType } from "../assets/stations";

export const INGREDIENTS = ["bun", "veg", "patty"] as const;

export type Ingredient = (typeof INGREDIENTS)[number];

export const ITEM_BURGER = "burger" as const;

export type Item = Ingredient | typeof ITEM_BURGER;

export const INGREDIENT_STATIONS: Record<Ingredient, StationType> = {
	bun: "bun-shelf",
	veg: "veggie-shelf",
	patty: "patty-grill",
};

export const SERVING_COUNTER = "serving-counter";

export const CASH_REGISTER = "cash-register";

export const RECIPE_BURGER: Ingredient[] = ["bun", "veg", "patty", "bun"];

export const RECIPES: Ingredient[][] = [RECIPE_BURGER];

export interface AssemblyState {
	target: Ingredient[];
	placed: Ingredient[];
}

export interface CarryState {
	item: Item | null;
	cooldownMs: number;
}

export function pickRecipe(random: () => number = Math.random): Ingredient[] {
	return [...RECIPES[Math.floor(random() * RECIPES.length)]!];
}

export function createAssembly(recipe = pickRecipe()): AssemblyState {
	return { target: recipe, placed: [] };
}

export function createCarryState(): CarryState {
	return { item: null, cooldownMs: 0 };
}

export function nextNeeded(assembly: AssemblyState): Ingredient | undefined {
	return assembly.target[assembly.placed.length];
}

export function isAssemblyComplete(assembly: AssemblyState): boolean {
	return assembly.placed.length >= assembly.target.length;
}
