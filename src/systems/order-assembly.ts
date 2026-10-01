import type { With } from "miniplex";
import type { StationType } from "../assets/stations";
import { hasArrived } from "../core/navigation";
import {
	type ActionState,
	advanceAction,
	type ActionKind,
	startAction,
} from "../config/control";
import {
	CASH_REGISTER,
	type CarryItem,
	chainRoot,
	createOrder,
	isDish,
	isOrderComplete,
	neededNow,
	placeStation,
	prepChain,
	RAW_ITEM_STATION,
	SERVING_COUNTER,
	transformResult,
} from "../config/recipes";
import type { Entity } from "../core/world";
import type { GameContext } from "../shared/context";

type OrderCook = With<Entity, "carry" | "order" | "control">;

type ActionPlan = { kind: ActionKind; item: CarryItem | null };

function planAction(target: StationType, cook: OrderCook): ActionPlan | null {
	const carry = cook.carry.item;
	const order = cook.order ?? null;

	if (target === CASH_REGISTER) {
		return order && carry !== null && isDish(carry)
			? { kind: "sell", item: null }
			: null;
	}

	if (!order) {
		return target === SERVING_COUNTER && carry === null
			? { kind: "get-order", item: null }
			: null;
	}

	if (carry !== null && isDish(carry)) {
		return null;
	}

	if (isOrderComplete(order)) {
		return target === order.recipe.finishAt && carry === null
			? { kind: "finish", item: order.recipe.dish }
			: null;
	}

	const requested =
		cook.control.request?.kind === "fetch"
			? cook.control.request.ingredient
			: null;
	const candidates = neededNow(order);
	const layer =
		requested && candidates.includes(requested) ? requested : candidates[0];

	if (!layer) {
		return null;
	}

	if (carry !== null) {
		if (carry === layer) {
			return target === placeStation(order.recipe)
				? { kind: "place", item: carry }
				: null;
		}

		const step = prepChain(layer).find(
			(s) => s.from === carry && s.at === target,
		);

		if (step) {
			return { kind: "transform", item: transformResult(carry, target) };
		}

		return null;
	}

	const root = chainRoot(layer);

	return target === RAW_ITEM_STATION[root]
		? { kind: "take", item: root }
		: null;
}

function applyAction(cook: OrderCook, action: ActionState) {
	switch (action.kind) {
		case "get-order":
			cook.order = createOrder();
			return;

		case "take":
		case "transform":
			cook.carry.item = action.item;
			return;

		case "place":
			if (action.item && cook.order && !isDish(action.item)) {
				cook.order.placed.push(action.item);
			}
			cook.carry.item = null;
			return;

		case "finish":
			cook.carry.item = action.item;
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

			const plan = planAction(cook.target.stationType, cook);

			if (plan) {
				startAction(cook.control, plan.kind, plan.item);
			}
		}
	};
}
