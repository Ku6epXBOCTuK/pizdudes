import type { With } from "miniplex";
import type { StationType } from "../assets/stations";
import { hasArrived } from "../core/navigation";
import {
	type ActionState,
	advanceAction,
	startAction,
} from "../config/control";
import {
	CASH_REGISTER,
	createOrder,
	type Ingredient,
	INGREDIENT_STATIONS,
	isOrderComplete,
	ITEM_BURGER,
	nextNeeded,
	SERVING_COUNTER,
} from "../config/recipes";
import type { Entity } from "../core/world";
import type { GameContext } from "../shared/context";

type OrderCook = With<Entity, "carry" | "order" | "control">;

type ActionPlan =
	| { kind: "get-order"; item: null }
	| { kind: "take-ingredient"; item: Ingredient }
	| { kind: "place-ingredient"; item: Ingredient }
	| { kind: "take-burger"; item: null }
	| { kind: "sell"; item: null };

function planAction(target: StationType, cook: OrderCook): ActionPlan | null {
	const carry = cook.carry;
	const order = cook.order;

	if (target === SERVING_COUNTER) {
		if (carry.item === null) {
			if (!order) {
				return { kind: "get-order", item: null };
			}

			if (isOrderComplete(order)) {
				return { kind: "take-burger", item: null };
			}

			return null;
		}

		if (carry.item === ITEM_BURGER || !order) {
			return null;
		}

		if (nextNeeded(order) !== carry.item) {
			return null;
		}

		return { kind: "place-ingredient", item: carry.item };
	}

	if (target === CASH_REGISTER) {
		if (carry.item !== ITEM_BURGER) {
			return null;
		}

		return { kind: "sell", item: null };
	}

	if (carry.item !== null || !order) {
		return null;
	}

	const needed = nextNeeded(order);

	if (!needed || INGREDIENT_STATIONS[needed] !== target) {
		return null;
	}

	return { kind: "take-ingredient", item: needed };
}

function applyAction(cook: OrderCook, action: ActionState) {
	switch (action.kind) {
		case "get-order":
			cook.order = createOrder();
			return;

		case "take-ingredient":
			if (action.item) {
				cook.carry.item = action.item;
			}
			return;

		case "place-ingredient":
			if (action.item && cook.order) {
				cook.order.placed.push(action.item);
			}
			cook.carry.item = null;
			return;

		case "take-burger":
			cook.carry.item = ITEM_BURGER;
			return;

		case "sell":
			cook.carry.item = null;
			cook.order = null;
	}
}

export function createOrderAssemblySystem({ world }: GameContext) {
	const cooks = world.with("position", "carry", "order", "control", "target");

	return (dt: number) => {
		for (const cook of cooks) {
			const action = cook.control.action;

			if (action) {
				if (advanceAction(cook.control, dt)) {
					applyAction(cook, action);
				}
				continue;
			}

			if (!cook.target || !hasArrived(cook)) {
				continue;
			}

			const plan = planAction(cook.target.type, cook);

			if (plan) {
				startAction(cook.control, plan.kind, plan.item);
			}
		}
	};
}
