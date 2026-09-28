import type { StationType } from "../assets/stations";
import { moveToward } from "../core/navigation";
import { stationFinder } from "../core/stations";
import {
	type AssemblyState,
	CASH_REGISTER,
	INGREDIENT_STATIONS,
	isAssemblyComplete,
	type Item,
	ITEM_BURGER,
	nextNeeded,
	SERVING_COUNTER,
} from "../config/recipes";
import type { GameContext } from "../shared/context";

function nextTargetType(
	item: Item | null,
	assembly: AssemblyState | undefined,
): StationType | undefined {
	if (item === ITEM_BURGER) {
		return CASH_REGISTER;
	}

	if (item) {
		return SERVING_COUNTER;
	}

	if (!assembly) {
		return undefined;
	}

	if (isAssemblyComplete(assembly)) {
		return SERVING_COUNTER;
	}

	const needed = nextNeeded(assembly);
	return needed ? INGREDIENT_STATIONS[needed] : undefined;
}

export function createOrderAiSystem({ world }: GameContext) {
	const cooks = world.with("position", "velocity", "carry", "target");
	const stations = stationFinder(world);

	return () => {
		for (const cook of cooks) {
			const counter = stations.assembler(SERVING_COUNTER);
			const type = nextTargetType(cook.carry.item, counter?.assembly);
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
