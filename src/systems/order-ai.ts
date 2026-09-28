import type { StationType } from "../assets/stations";
import { moveToward } from "../core/navigation";
import { stationFinder } from "../core/stations";
import { type ControlState, isRequestSettled } from "../config/control";
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

export function createOrderAiSystem({ world }: GameContext) {
	const cooks = world.with(
		"position",
		"velocity",
		"carry",
		"order",
		"target",
		"control",
	);
	const stations = stationFinder(world);

	return () => {
		for (const cook of cooks) {
			if (
				cook.control.request &&
				isRequestSettled(cook.control.request, cook)
			) {
				cook.control.request = null;
			}

			const type = nextTargetType(cook.carry.item, cook.order, cook.control);
			const station = type ? stations.byType(type) : undefined;

			if (!type || !station) {
				cook.target = null;
				cook.velocity.x = 0;
				cook.velocity.y = 0;
				continue;
			}

			cook.target = { type, position: { ...station.position } };
			moveToward(cook, station.position);
		}
	};
}
