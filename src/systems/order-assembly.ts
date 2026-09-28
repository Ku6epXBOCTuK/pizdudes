import type { StationType } from "../assets/stations";
import { hasArrived } from "../core/navigation";
import { stationFinder, type Stations } from "../core/stations";
import { AI_ACTION_COOLDOWN_MS } from "../constants";
import {
	CASH_REGISTER,
	type CarryState,
	createAssembly,
	INGREDIENT_STATIONS,
	isAssemblyComplete,
	ITEM_BURGER,
	nextNeeded,
	SERVING_COUNTER,
} from "../config/recipes";
import type { GameContext } from "../shared/context";

function interact(
	stations: Stations,
	target: StationType,
	carry: CarryState,
): boolean {
	const counter = stations.assembler(SERVING_COUNTER);

	if (target === SERVING_COUNTER && counter) {
		if (carry.item === null) {
			if (!isAssemblyComplete(counter.assembly)) {
				return false;
			}

			carry.item = ITEM_BURGER;
			return true;
		}

		if (nextNeeded(counter.assembly) !== carry.item) {
			return false;
		}

		counter.assembly.placed.push(carry.item);
		carry.item = null;
		return true;
	}

	if (target === CASH_REGISTER) {
		if (carry.item !== ITEM_BURGER) {
			return false;
		}

		carry.item = null;
		if (counter) {
			counter.assembly = createAssembly();
		}

		return true;
	}

	const needed = counter ? nextNeeded(counter.assembly) : undefined;

	if (
		carry.item !== null ||
		!needed ||
		INGREDIENT_STATIONS[needed] !== target
	) {
		return false;
	}

	carry.item = needed;
	return true;
}

export function createOrderAssemblySystem({ world }: GameContext) {
	const cooks = world.with("position", "carry", "target");
	const stations = stationFinder(world);

	return (dt: number) => {
		for (const cook of cooks) {
			const carry = cook.carry;
			carry.cooldownMs = Math.max(0, carry.cooldownMs - dt);

			if (!cook.target || !hasArrived(cook) || carry.cooldownMs > 0) {
				continue;
			}

			if (interact(stations, cook.target.type, carry)) {
				carry.cooldownMs = AI_ACTION_COOLDOWN_MS;
			}
		}
	};
}
