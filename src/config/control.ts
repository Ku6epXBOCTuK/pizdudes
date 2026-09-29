import { IDLE_WANDER_MAX_MS, IDLE_WANDER_MIN_MS } from "../constants";
import {
	type CarryState,
	type Ingredient,
	isOrderComplete,
	nextNeeded,
	type OrderState,
} from "./recipes";

export type ControlMode = "auto" | "chat";

export type CookRequest =
	| { kind: "get-order" }
	| { kind: "fetch"; ingredient: CookRequestIngredient }
	| { kind: "deliver" };

export type CookRequestIngredient = Ingredient;

export type ActionKind =
	"get-order" | "take-ingredient" | "place-ingredient" | "take-burger" | "sell";

export const ACTION_DURATIONS_MS: Record<ActionKind, number> = {
	"get-order": 900,
	"take-ingredient": 1200,
	"place-ingredient": 900,
	"take-burger": 1000,
	sell: 1400,
};

export interface ActionState {
	kind: ActionKind;
	progress: number;
	item: Ingredient | null;
}

export interface ControlState {
	mode: ControlMode;
	request: CookRequest | null;
	idleMs: number;
	idleGoalMs: number;
	action: ActionState | null;
}

export interface CookProgress {
	carry: CarryState;
	order: OrderState | null | undefined;
	control: ControlState;
}

export function createControlState(
	mode: ControlMode = "auto",
	random: () => number = Math.random,
): ControlState {
	return {
		mode,
		request: null,
		idleMs: 0,
		idleGoalMs: rollIdleGoalMs(random),
		action: null,
	};
}

export function rollIdleGoalMs(random: () => number = Math.random): number {
	return (
		IDLE_WANDER_MIN_MS + random() * (IDLE_WANDER_MAX_MS - IDLE_WANDER_MIN_MS)
	);
}

export function markActive(control: ControlState) {
	control.idleMs = 0;
}

export function startAction(
	control: ControlState,
	kind: ActionKind,
	item: Ingredient | null = null,
) {
	control.action = { kind, progress: 0, item };
}

export function isBusy(cook: { control: ControlState }): boolean {
	return cook.control.action !== null;
}

export function advanceAction(control: ControlState, dt: number): boolean {
	const action = control.action;

	if (!action) {
		return false;
	}

	action.progress += dt / ACTION_DURATIONS_MS[action.kind];

	if (action.progress >= 1) {
		action.progress = 1;
		control.action = null;
		return true;
	}

	return false;
}

export function canRequest(request: CookRequest, cook: CookProgress): boolean {
	const { carry, order } = cook;

	if (cook.control.action) {
		return false;
	}

	switch (request.kind) {
		case "get-order":
			return !order;

		case "deliver":
			return !carry.item && !!order && isOrderComplete(order);

		case "fetch":
			return (
				!carry.item &&
				!!order &&
				!isOrderComplete(order) &&
				nextNeeded(order) === request.ingredient
			);
	}
}

export function isRequestSettled(
	request: CookRequest,
	cook: CookProgress,
): boolean {
	const { carry, order } = cook;

	switch (request.kind) {
		case "get-order":
			return !!order;

		case "deliver":
			return !carry.item && !order;

		case "fetch":
			return (
				carry.item !== request.ingredient &&
				(!order || nextNeeded(order) !== request.ingredient)
			);
	}
}
