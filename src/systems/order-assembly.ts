import type { With } from "miniplex";
import type { StationType } from "../assets/stations";
import { hasArrived } from "../core/navigation";
import { AI_ACTION_COOLDOWN_MS } from "../constants";
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

type OrderCook = With<Entity, "carry" | "order">;

function interact(target: StationType, cook: OrderCook): boolean {
	const carry = cook.carry;
	const order = cook.order;

	if (target === SERVING_COUNTER) {
		if (carry.item === null) {
			if (!order) {
				cook.order = createOrder();
				return true;
			}

			if (isOrderComplete(order)) {
				carry.item = ITEM_BURGER;
				return true;
			}

			return false;
		}

		if (carry.item === ITEM_BURGER || !order) {
			return false;
		}

		if (nextNeeded(order) !== carry.item) {
			return false;
		}

		order.placed.push(carry.item);
		carry.item = null;
		return true;
	}

	if (target === CASH_REGISTER) {
		if (carry.item !== ITEM_BURGER) {
			return false;
		}

		carry.item = null;
		cook.order = null;
		return true;
	}

	if (carry.item !== null || !order) {
		return false;
	}

	const needed = nextNeeded(order);

	if (!needed || INGREDIENT_STATIONS[needed] !== target) {
		return false;
	}

	carry.item = needed;
	return true;
}

export function createOrderAssemblySystem({ world }: GameContext) {
	const cooks = world.with("position", "carry", "order", "target");

	return (dt: number) => {
		for (const cook of cooks) {
			const carry = cook.carry;
			carry.cooldownMs = Math.max(0, carry.cooldownMs - dt);

			if (!cook.target || !hasArrived(cook) || carry.cooldownMs > 0) {
				continue;
			}

			if (interact(cook.target.type, cook)) {
				carry.cooldownMs = AI_ACTION_COOLDOWN_MS;
			}
		}
	};
}
