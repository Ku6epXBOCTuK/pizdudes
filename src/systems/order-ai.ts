import type { StationType } from "../assets/stations";
import { moveToward } from "../core/navigation";
import { stationFinder } from "../core/stations";
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

function nextTargetType(
	item: Item | null,
	order: OrderState | null | undefined,
): StationType | undefined {
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
	const cooks = world.with("position", "velocity", "carry", "target");
	const stations = stationFinder(world);

	return () => {
		for (const cook of cooks) {
			const type = nextTargetType(cook.carry.item, cook.order);
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
