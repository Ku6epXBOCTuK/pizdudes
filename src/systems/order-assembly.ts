import type { With } from "miniplex";
import type { StationType } from "../assets/stations";
import { hasArrived } from "../core/navigation";
import { type ActionKind, advanceAction, startAction } from "../config/control";
import {
	CASH_REGISTER,
	createOrder,
	INGREDIENT_STATIONS,
	isOrderComplete,
	ITEM_BURGER,
	nextNeeded,
	SERVING_COUNTER,
} from "../config/recipes";
import type { Entity } from "../core/world";
import type { GameContext } from "../shared/context";

type OrderCook = With<Entity, "carry" | "order" | "control">;

function interact(target: StationType, cook: OrderCook): ActionKind | null {
	const carry = cook.carry;
	const order = cook.order;

	if (target === SERVING_COUNTER) {
		if (carry.item === null) {
			if (!order) {
				cook.order = createOrder();
				return "get-order";
			}

			if (isOrderComplete(order)) {
				carry.item = ITEM_BURGER;
				return "take-burger";
			}

			return null;
		}

		if (carry.item === ITEM_BURGER || !order) {
			return null;
		}

		if (nextNeeded(order) !== carry.item) {
			return null;
		}

		order.placed.push(carry.item);
		carry.item = null;
		return "place-ingredient";
	}

	if (target === CASH_REGISTER) {
		if (carry.item !== ITEM_BURGER) {
			return null;
		}

		carry.item = null;
		cook.order = null;
		return "sell";
	}

	if (carry.item !== null || !order) {
		return null;
	}

	const needed = nextNeeded(order);

	if (!needed || INGREDIENT_STATIONS[needed] !== target) {
		return null;
	}

	carry.item = needed;
	return "take-ingredient";
}

export function createOrderAssemblySystem({ world }: GameContext) {
	const cooks = world.with("position", "carry", "order", "control", "target");

	return (dt: number) => {
		for (const cook of cooks) {
			if (advanceAction(cook.control, dt)) {
				continue;
			}

			if (cook.control.action) {
				continue;
			}

			if (!cook.target || !hasArrived(cook)) {
				continue;
			}

			const kind = interact(cook.target.type, cook);

			if (kind) {
				startAction(cook.control, kind);
			}
		}
	};
}
