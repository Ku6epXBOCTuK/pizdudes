import type { With } from "miniplex";
import type { StationType } from "../assets/stations";
import { moveToward } from "../core/navigation";
import { randomWanderPoint } from "../config/field";
import { stationFinder } from "../core/stations";
import type { Entity, Vector2 } from "../core/world";
import { CHAT_IDLE_WANDER_MS, WANDER_SPEED } from "../constants";
import {
	type ControlState,
	isRequestSettled,
	markActive,
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
import type { GameContext } from "../shared/context";

const WANDER_ARRIVE_DISTANCE = 24;

type Cook = With<
	Entity,
	"position" | "velocity" | "carry" | "order" | "target" | "control" | "wander"
>;

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

function walkTo(cook: Cook, point: Vector2) {
	const dx = point.x - cook.position.x;
	const dy = point.y - cook.position.y;
	const distance = Math.hypot(dx, dy);

	if (distance <= WANDER_ARRIVE_DISTANCE) {
		cook.velocity.x = 0;
		cook.velocity.y = 0;
		return true;
	}

	cook.velocity.x = (dx / distance) * WANDER_SPEED;
	cook.velocity.y = (dy / distance) * WANDER_SPEED;
	return false;
}

export function createOrderAiSystem({ app, world }: GameContext) {
	const cooks = world.with(
		"position",
		"velocity",
		"carry",
		"order",
		"target",
		"control",
		"wander",
	);
	const stations = stationFinder(world);

	return (dt: number) => {
		for (const cook of cooks) {
			const control = cook.control;

			if (control.action) {
				markActive(control);
				cook.wander = null;
				cook.velocity.x = 0;
				cook.velocity.y = 0;
				continue;
			}

			if (control.request && isRequestSettled(control.request, cook)) {
				control.request = null;
			}

			if (control.request) {
				markActive(control);
				cook.wander = null;
			} else if (control.idleMs < CHAT_IDLE_WANDER_MS) {
				control.idleMs += dt;
			}

			const type = nextTargetType(cook.carry.item, cook.order, control);
			const station = type ? stations.byType(type) : undefined;

			if (type && station) {
				cook.wander = null;
				cook.target = { type, position: { ...station.approach } };
				moveToward(cook, station.approach);
				continue;
			}

			cook.target = null;

			if (control.mode !== "chat" || control.idleMs < CHAT_IDLE_WANDER_MS) {
				cook.velocity.x = 0;
				cook.velocity.y = 0;
				continue;
			}

			if (!cook.wander) {
				cook.wander = randomWanderPoint(app.screen);
			}

			if (walkTo(cook, cook.wander)) {
				cook.wander = null;
				control.idleMs = 0;
			}
		}
	};
}
