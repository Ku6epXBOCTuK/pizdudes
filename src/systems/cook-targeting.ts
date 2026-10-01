import type { StationType } from "../assets/stations";
import {
	type ControlState,
	isRequestSettled,
	markActive,
	rollIdleGoalMs,
} from "../config/control";
import {
	CASH_REGISTER,
	INGREDIENT_STATIONS,
	isOrderComplete,
	type Item,
	ITEM_BURGER,
	nextNeeded,
	type OrderState,
	SERVING_COUNTER,
} from "../config/recipes";
import { stationFinder } from "../core/stations";
import type { GameContext } from "../shared/context";

function requestedType(
	item: Item | null,
	request: NonNullable<ControlState["request"]>,
): StationType {
	if (request.kind === "get-order") {
		return SERVING_COUNTER;
	}

	if (request.kind === "deliver") {
		return item === ITEM_BURGER ? CASH_REGISTER : SERVING_COUNTER;
	}

	return item === request.ingredient
		? SERVING_COUNTER
		: INGREDIENT_STATIONS[request.ingredient];
}

function nextTargetType(
	item: Item | null,
	order: OrderState | null | undefined,
	control: ControlState,
): StationType | undefined {
	if (control.mode === "chat") {
		return control.request ? requestedType(item, control.request) : undefined;
	}

	if (item === ITEM_BURGER) {
		return CASH_REGISTER;
	}

	if (item) {
		return SERVING_COUNTER;
	}

	if (!order || isOrderComplete(order)) {
		return SERVING_COUNTER;
	}

	const needed = nextNeeded(order);
	return needed ? INGREDIENT_STATIONS[needed] : undefined;
}

export function createCookTargetingSystem(
	{ world }: GameContext,
	random: () => number = Math.random,
) {
	const cooks = world.with("carry", "order", "target", "control", "wander");
	const stations = stationFinder(world);

	return (dt: number) => {
		for (const cook of cooks) {
			const control = cook.control;

			if (control.action) {
				markActive(control);
				cook.wander = null;
				continue;
			}

			if (control.request && isRequestSettled(control.request, cook)) {
				control.request = null;
				control.idleMs = 0;
				control.idleGoalMs = rollIdleGoalMs(random);
			}

			if (control.request) {
				markActive(control);
				cook.wander = null;
			} else if (control.idleMs < control.idleGoalMs) {
				control.idleMs += dt;
			}

			const type = nextTargetType(cook.carry.item, cook.order, control);
			const station = type ? stations.byType(type) : undefined;

			if (station) {
				cook.wander = null;
				cook.target = station;
			} else {
				cook.target = null;
			}
		}
	};
}
