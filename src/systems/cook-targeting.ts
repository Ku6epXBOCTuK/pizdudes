import type { StationType } from "../assets/stations";
import {
	type ControlState,
	type CookRequest,
	isRequestSettled,
	markActive,
	rollIdleGoalMs,
} from "../config/control";
import {
	CASH_REGISTER,
	type CarryItem,
	chainRoot,
	isDish,
	isOrderComplete,
	type LayerItem,
	neededNow,
	nextNeeded,
	type OrderState,
	placeStation,
	prepChain,
	RAW_ITEM_STATION,
	routeForLayer,
	SERVING_COUNTER,
	TRASH_CAN,
} from "../config/recipes";
import { stationFinder } from "../core/stations";
import type { GameContext } from "../shared/context";

function requestedType(
	carry: CarryItem | null,
	order: OrderState | null | undefined,
	request: CookRequest,
): StationType {
	switch (request.kind) {
		case "get-order":
			return SERVING_COUNTER;

		case "take":
			return RAW_ITEM_STATION[chainRoot(request.item)];

		case "transform":
			return request.at;

		case "place":
			return order ? placeStation(order.recipe) : SERVING_COUNTER;

		case "drop":
			return TRASH_CAN;

		case "deliver":
			if (carry !== null && isDish(carry)) {
				return CASH_REGISTER;
			}
			if (order && isOrderComplete(order)) {
				return order.recipe.finishAt;
			}
			return SERVING_COUNTER;
	}
}

function nextTargetType(
	carry: CarryItem | null,
	order: OrderState | null | undefined,
	control: ControlState,
): StationType | undefined {
	if (control.mode === "chat") {
		return control.request
			? requestedType(carry, order, control.request)
			: undefined;
	}

	if (carry !== null && isDish(carry)) {
		return CASH_REGISTER;
	}

	if (!order) {
		return SERVING_COUNTER;
	}

	if (isOrderComplete(order)) {
		return order.recipe.finishAt;
	}

	const carried = carry !== null && !isDish(carry) ? carry : null;
	const needed = neededNow(order);

	let layer: LayerItem | undefined =
		carried !== null && needed.includes(carried) ? carried : undefined;

	if (!layer && carried !== null) {
		layer = needed.find((candidate) =>
			prepChain(candidate).some((step) => step.from === carried),
		);
	}

	layer ??= nextNeeded(order);

	if (!layer) {
		return undefined;
	}

	return routeForLayer(carried, layer, order.recipe);
}

export function createCookTargetingSystem(
	{ world }: GameContext,
	random: () => number = Math.random,
) {
	const cooks = world.with("carry", "order", "target", "control", "wander");
	const stations = stationFinder(world);

	const system = (dt: number) => {
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

	return Object.assign(system, {
		dispose() {
			stations.dispose();
		},
	});
}
