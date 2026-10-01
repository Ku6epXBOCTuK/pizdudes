import type { StationType } from "../assets/stations";

export const SERVING_COUNTER = "serving-counter";

export const CASH_REGISTER = "cash-register";

export const RAW_ITEMS = [
	"bun",
	"baguette",
	"pita",
	"lettuce",
	"tomato",
	"onion",
	"potato",
	"carrot",
	"mushrooms",
	"pepper",
	"cucumber",
	"corn",
	"lemon",
	"cheese",
	"egg",
	"cream",
	"butter",
	"flour",
	"pasta",
	"rice",
	"broth",
	"olive-oil",
	"beans",
	"mince",
	"chicken",
	"sausage",
	"bacon",
] as const;

export type RawItem = (typeof RAW_ITEMS)[number];

export const SEMI_ITEMS = [
	"chopped-lettuce",
	"chopped-tomato",
	"chopped-onion",
	"chopped-potato",
	"chopped-carrot",
	"chopped-mushrooms",
	"chopped-pepper",
	"chopped-cucumber",
	"chopped-corn",
	"patty",
	"fried-chicken",
	"fried-sausage",
	"crispy-bacon",
	"dough",
	"pizza-base",
	"toast",
	"hot-broth",
	"tomato-sauce",
] as const;

export type SemiItem = (typeof SEMI_ITEMS)[number];

export const DISHES = [
	"dish-burger",
	"dish-pizza",
	"dish-hotdog",
	"dish-soup",
	"dish-salad",
	"dish-pasta",
	"dish-rice",
	"dish-sandwich",
	"dish-shawarma",
	"dish-bruschetta",
	"dish-omelette",
] as const;

export type Dish = (typeof DISHES)[number];

export type CatalogItem = RawItem | SemiItem | Dish;

export type LayerItem = RawItem | SemiItem;

export const RAW_ITEM_STATION: Record<RawItem, StationType> = {
	bun: "bun-shelf",
	baguette: "bun-shelf",
	pita: "bun-shelf",
	lettuce: "produce-shelf",
	tomato: "produce-shelf",
	onion: "produce-shelf",
	potato: "produce-shelf",
	carrot: "produce-shelf",
	mushrooms: "produce-shelf",
	pepper: "produce-shelf",
	cucumber: "produce-shelf",
	corn: "produce-shelf",
	lemon: "produce-shelf",
	cheese: "dairy-shelf",
	egg: "dairy-shelf",
	cream: "dairy-shelf",
	butter: "dairy-shelf",
	flour: "pantry-shelf",
	pasta: "pantry-shelf",
	rice: "pantry-shelf",
	broth: "pantry-shelf",
	"olive-oil": "pantry-shelf",
	beans: "pantry-shelf",
	mince: "fridge",
	chicken: "fridge",
	sausage: "fridge",
	bacon: "fridge",
};

export interface PrepStep {
	from: RawItem | SemiItem;
	at: StationType;
}

export const PREP: Record<SemiItem, PrepStep[]> = {
	"chopped-lettuce": [{ from: "lettuce", at: "cutting-board" }],
	"chopped-tomato": [{ from: "tomato", at: "cutting-board" }],
	"chopped-onion": [{ from: "onion", at: "cutting-board" }],
	"chopped-potato": [{ from: "potato", at: "cutting-board" }],
	"chopped-carrot": [{ from: "carrot", at: "cutting-board" }],
	"chopped-mushrooms": [{ from: "mushrooms", at: "cutting-board" }],
	"chopped-pepper": [{ from: "pepper", at: "cutting-board" }],
	"chopped-cucumber": [{ from: "cucumber", at: "cutting-board" }],
	"chopped-corn": [{ from: "corn", at: "cutting-board" }],
	patty: [{ from: "mince", at: "grill" }],
	"fried-chicken": [{ from: "chicken", at: "grill" }],
	"fried-sausage": [{ from: "sausage", at: "grill" }],
	"crispy-bacon": [{ from: "bacon", at: "grill" }],
	dough: [{ from: "flour", at: "dough-mixer" }],
	"pizza-base": [{ from: "dough", at: "pizza-oven" }],
	toast: [{ from: "bun", at: "pizza-oven" }],
	"hot-broth": [{ from: "broth", at: "stove-pot" }],
	"tomato-sauce": [{ from: "chopped-tomato", at: "stove-pot" }],
};

export const STATION_FINISHES: Partial<Record<StationType, Dish[]>> = {
	"serving-counter": ["dish-burger", "dish-salad", "dish-shawarma"],
	grill: ["dish-burger", "dish-hotdog", "dish-sandwich", "dish-omelette"],
	"pizza-oven": ["dish-pizza", "dish-bruschetta"],
	"stove-pot": ["dish-soup", "dish-pasta", "dish-rice"],
};

export type RecipeOrder = "layered" | "assorted";

export interface DishRecipe {
	id: string;
	name: string;
	dish: Dish;
	layers: LayerItem[];
	order: RecipeOrder;
	finishAt: StationType;
}

export const DISH_RECIPES: DishRecipe[] = [
	{
		id: "burger-cheese",
		name: "Чизбургер",
		dish: "dish-burger",
		layers: [
			"bun",
			"patty",
			"cheese",
			"chopped-lettuce",
			"chopped-tomato",
			"bun",
		],
		order: "layered",
		finishAt: "serving-counter",
	},
	{
		id: "burger-bacon",
		name: "С беконом",
		dish: "dish-burger",
		layers: ["bun", "patty", "crispy-bacon", "cheese", "chopped-onion", "bun"],
		order: "layered",
		finishAt: "serving-counter",
	},
	{
		id: "burger-double",
		name: "Двойной",
		dish: "dish-burger",
		layers: ["bun", "patty", "cheese", "patty", "chopped-onion", "bun"],
		order: "layered",
		finishAt: "serving-counter",
	},
	{
		id: "burger-chicken",
		name: "Куриный",
		dish: "dish-burger",
		layers: ["bun", "fried-chicken", "chopped-lettuce", "tomato-sauce", "bun"],
		order: "layered",
		finishAt: "grill",
	},
	{
		id: "burger-mushroom",
		name: "С грибами",
		dish: "dish-burger",
		layers: [
			"bun",
			"patty",
			"chopped-mushrooms",
			"cheese",
			"chopped-onion",
			"bun",
		],
		order: "layered",
		finishAt: "grill",
	},
	{
		id: "pizza-margherita",
		name: "Маргарита",
		dish: "dish-pizza",
		layers: ["pizza-base", "tomato-sauce", "cheese", "chopped-tomato"],
		order: "layered",
		finishAt: "pizza-oven",
	},
	{
		id: "pizza-pepperoni",
		name: "Пепперони",
		dish: "dish-pizza",
		layers: ["pizza-base", "tomato-sauce", "cheese", "fried-sausage", "cheese"],
		order: "layered",
		finishAt: "pizza-oven",
	},
	{
		id: "pizza-mushroom",
		name: "Грибная",
		dish: "dish-pizza",
		layers: [
			"pizza-base",
			"tomato-sauce",
			"chopped-mushrooms",
			"cheese",
			"chopped-pepper",
		],
		order: "layered",
		finishAt: "pizza-oven",
	},
	{
		id: "pizza-chicken",
		name: "Куриная",
		dish: "dish-pizza",
		layers: [
			"pizza-base",
			"tomato-sauce",
			"cheese",
			"chopped-pepper",
			"fried-chicken",
		],
		order: "layered",
		finishAt: "pizza-oven",
	},
	{
		id: "pizza-veggie",
		name: "Овощная",
		dish: "dish-pizza",
		layers: [
			"pizza-base",
			"tomato-sauce",
			"cheese",
			"chopped-corn",
			"chopped-onion",
			"chopped-pepper",
		],
		order: "layered",
		finishAt: "pizza-oven",
	},
	{
		id: "hotdog-classic",
		name: "Классический",
		dish: "dish-hotdog",
		layers: ["bun", "fried-sausage", "chopped-onion", "chopped-cucumber"],
		order: "layered",
		finishAt: "grill",
	},
	{
		id: "hotdog-chili",
		name: "Чили-дог",
		dish: "dish-hotdog",
		layers: ["bun", "fried-sausage", "tomato-sauce", "beans", "chopped-onion"],
		order: "layered",
		finishAt: "grill",
	},
	{
		id: "hotdog-cheese",
		name: "Сырный",
		dish: "dish-hotdog",
		layers: [
			"bun",
			"fried-sausage",
			"cheese",
			"chopped-cucumber",
			"tomato-sauce",
		],
		order: "layered",
		finishAt: "grill",
	},
	{
		id: "soup-tomato",
		name: "Томатный",
		dish: "dish-soup",
		layers: ["chopped-tomato", "hot-broth", "cream", "chopped-onion"],
		order: "assorted",
		finishAt: "stove-pot",
	},
	{
		id: "soup-potato",
		name: "Картофельный",
		dish: "dish-soup",
		layers: ["chopped-potato", "chopped-carrot", "chopped-onion", "hot-broth"],
		order: "assorted",
		finishAt: "stove-pot",
	},
	{
		id: "soup-chicken",
		name: "Куриный",
		dish: "dish-soup",
		layers: ["chopped-potato", "chopped-carrot", "fried-chicken", "hot-broth"],
		order: "assorted",
		finishAt: "stove-pot",
	},
	{
		id: "soup-mushroom",
		name: "Грибной",
		dish: "dish-soup",
		layers: ["chopped-mushrooms", "chopped-onion", "cream", "hot-broth"],
		order: "assorted",
		finishAt: "stove-pot",
	},
	{
		id: "soup-corn",
		name: "Кукурузный",
		dish: "dish-soup",
		layers: ["chopped-corn", "chopped-potato", "cream", "hot-broth"],
		order: "assorted",
		finishAt: "stove-pot",
	},
	{
		id: "soup-bean",
		name: "Фасольный",
		dish: "dish-soup",
		layers: [
			"beans",
			"chopped-carrot",
			"chopped-potato",
			"chopped-onion",
			"hot-broth",
		],
		order: "assorted",
		finishAt: "stove-pot",
	},
	{
		id: "salad-veggie",
		name: "Овощной",
		dish: "dish-salad",
		layers: [
			"chopped-lettuce",
			"chopped-tomato",
			"chopped-cucumber",
			"chopped-onion",
			"olive-oil",
		],
		order: "assorted",
		finishAt: "serving-counter",
	},
	{
		id: "salad-caesar",
		name: "Цезарь",
		dish: "dish-salad",
		layers: [
			"chopped-lettuce",
			"fried-chicken",
			"cheese",
			"lemon",
			"olive-oil",
		],
		order: "assorted",
		finishAt: "serving-counter",
	},
	{
		id: "salad-greek",
		name: "Греческий",
		dish: "dish-salad",
		layers: [
			"chopped-tomato",
			"chopped-cucumber",
			"cheese",
			"chopped-pepper",
			"olive-oil",
		],
		order: "assorted",
		finishAt: "serving-counter",
	},
	{
		id: "salad-corn",
		name: "Кукурузный",
		dish: "dish-salad",
		layers: [
			"chopped-lettuce",
			"chopped-corn",
			"chopped-tomato",
			"chopped-onion",
			"olive-oil",
		],
		order: "assorted",
		finishAt: "serving-counter",
	},
	{
		id: "salad-egg",
		name: "С яйцом",
		dish: "dish-salad",
		layers: [
			"chopped-lettuce",
			"chopped-tomato",
			"egg",
			"chopped-onion",
			"olive-oil",
		],
		order: "assorted",
		finishAt: "serving-counter",
	},
	{
		id: "pasta-tomato",
		name: "Паста с соусом",
		dish: "dish-pasta",
		layers: ["pasta", "tomato-sauce", "chopped-mushrooms", "cheese"],
		order: "layered",
		finishAt: "stove-pot",
	},
	{
		id: "pasta-cream",
		name: "Со сливками",
		dish: "dish-pasta",
		layers: ["pasta", "cream", "cheese", "fried-chicken"],
		order: "layered",
		finishAt: "stove-pot",
	},
	{
		id: "rice-veggie",
		name: "Рис с овощами",
		dish: "dish-rice",
		layers: [
			"rice",
			"chopped-carrot",
			"chopped-pepper",
			"chopped-onion",
			"butter",
		],
		order: "layered",
		finishAt: "stove-pot",
	},
	{
		id: "rice-chicken",
		name: "Рис с курицей",
		dish: "dish-rice",
		layers: ["rice", "fried-chicken", "chopped-carrot", "chopped-onion"],
		order: "layered",
		finishAt: "stove-pot",
	},
	{
		id: "sandwich-chicken",
		name: "С курицей",
		dish: "dish-sandwich",
		layers: ["toast", "fried-chicken", "chopped-lettuce", "tomato-sauce"],
		order: "layered",
		finishAt: "grill",
	},
	{
		id: "sandwich-bacon",
		name: "С беконом",
		dish: "dish-sandwich",
		layers: ["toast", "crispy-bacon", "cheese", "chopped-tomato"],
		order: "layered",
		finishAt: "grill",
	},
	{
		id: "sandwich-baguette",
		name: "Куриный на багете",
		dish: "dish-sandwich",
		layers: ["baguette", "fried-chicken", "cheese", "chopped-tomato"],
		order: "layered",
		finishAt: "grill",
	},
	{
		id: "shawarma",
		name: "Шаурма в пите",
		dish: "dish-shawarma",
		layers: [
			"pita",
			"fried-chicken",
			"chopped-lettuce",
			"chopped-tomato",
			"chopped-onion",
		],
		order: "layered",
		finishAt: "serving-counter",
	},
	{
		id: "pita-veggie",
		name: "Овощная пита",
		dish: "dish-shawarma",
		layers: [
			"pita",
			"chopped-mushrooms",
			"chopped-pepper",
			"chopped-tomato",
			"chopped-onion",
		],
		order: "layered",
		finishAt: "serving-counter",
	},
	{
		id: "bruschetta",
		name: "Брускета",
		dish: "dish-bruschetta",
		layers: [
			"baguette",
			"olive-oil",
			"chopped-tomato",
			"chopped-onion",
			"lemon",
		],
		order: "layered",
		finishAt: "pizza-oven",
	},
	{
		id: "omelette",
		name: "Омлет",
		dish: "dish-omelette",
		layers: ["egg", "cheese", "chopped-pepper", "chopped-onion", "butter"],
		order: "assorted",
		finishAt: "grill",
	},
	{
		id: "omelette-bacon",
		name: "Омлет с беконом",
		dish: "dish-omelette",
		layers: ["egg", "crispy-bacon", "cheese", "chopped-onion"],
		order: "assorted",
		finishAt: "grill",
	},
];

export type CarryItem = LayerItem | Dish;

export interface OrderState {
	recipe: DishRecipe;
	placed: LayerItem[];
}

export interface CarryState {
	item: CarryItem | null;
}

export function isSemiItem(item: CarryItem): item is SemiItem {
	return (SEMI_ITEMS as readonly string[]).includes(item);
}

export function isDish(item: CarryItem): item is Dish {
	return (DISHES as readonly string[]).includes(item);
}

export function pickDishRecipe(random: () => number = Math.random): DishRecipe {
	return DISH_RECIPES[Math.floor(random() * DISH_RECIPES.length)]!;
}

export function createOrder(recipe: DishRecipe = pickDishRecipe()): OrderState {
	const known: readonly string[] = [...RAW_ITEMS, ...SEMI_ITEMS];
	const unknown = recipe.layers.find((layer) => !known.includes(layer));

	if (unknown) {
		throw new Error(`Неизвестный слой в рецепте ${recipe.id}: ${unknown}`);
	}

	return { recipe, placed: [] };
}

export function createCarryState(): CarryState {
	return { item: null };
}

export function missingLayers(order: OrderState): LayerItem[] {
	const remaining = [...order.placed];

	return order.recipe.layers.filter((layer) => {
		const index = remaining.indexOf(layer);
		if (index < 0) {
			return true;
		}
		remaining.splice(index, 1);
		return false;
	});
}

export function neededNow(order: OrderState): LayerItem[] {
	if (order.recipe.order === "assorted") {
		return missingLayers(order);
	}

	const next = order.recipe.layers[order.placed.length];
	return next === undefined ? [] : [next];
}

export function nextNeeded(order: OrderState): LayerItem | undefined {
	return neededNow(order)[0];
}

export function isOrderComplete(order: OrderState): boolean {
	return missingLayers(order).length === 0;
}

export function prepChain(item: LayerItem): PrepStep[] {
	const chain: PrepStep[] = [];

	const visit = (current: LayerItem) => {
		if (!isSemiItem(current)) {
			return;
		}
		for (const step of PREP[current]) {
			visit(step.from);
			chain.push(step);
		}
	};

	visit(item);
	return chain;
}

export function chainRoot(item: LayerItem): RawItem {
	const chain = prepChain(item);

	if (chain.length === 0) {
		return item as RawItem;
	}

	return chain[0]!.from as RawItem;
}

export function transformResult(
	item: CarryItem,
	station: StationType,
): SemiItem | null {
	for (const semi of SEMI_ITEMS) {
		if (PREP[semi].some((step) => step.from === item && step.at === station)) {
			return semi;
		}
	}

	return null;
}

export function placeStation(recipe: DishRecipe): StationType {
	return recipe.finishAt === "stove-pot" ? "stove-pot" : SERVING_COUNTER;
}

export function routeForLayer(
	carry: LayerItem | null,
	layer: LayerItem,
	recipe: DishRecipe,
): StationType {
	if (carry === layer) {
		return placeStation(recipe);
	}

	if (carry === null) {
		return RAW_ITEM_STATION[chainRoot(layer)];
	}

	const step = prepChain(layer).find((s) => s.from === carry);
	return step ? step.at : placeStation(recipe);
}
