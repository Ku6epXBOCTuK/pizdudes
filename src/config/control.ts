import { IDLE_WANDER_MAX_MS, IDLE_WANDER_MIN_MS } from "../constants";
import {
	type CarryItem,
	type CarryState,
	isOrderComplete,
	type LayerItem,
	neededNow,
	type OrderState,
} from "./recipes";

export type ControlMode = "auto" | "chat";

export type CookRequest =
	| { kind: "get-order" }
	| { kind: "fetch"; ingredient: CookRequestIngredient }
	| { kind: "deliver" };

export type CookRequestIngredient = LayerItem;

export type ActionKind =
	"get-order" | "take" | "transform" | "place" | "finish" | "sell";

export interface ActionDuration {
	min: number;
	max: number;
}

export const ACTION_DURATIONS_MS: Record<ActionKind, ActionDuration> = {
	"get-order": { min: 700, max: 1100 },
	take: { min: 1000, max: 1400 },
	transform: { min: 1500, max: 2200 },
	place: { min: 700, max: 1100 },
	finish: { min: 800, max: 1200 },
	sell: { min: 1200, max: 1600 },
};

export interface ActionState {
	kind: ActionKind;
	progress: number;
	item: CarryItem | null;
	durationMs: number;
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
	item: CarryItem | null = null,
	random: () => number = Math.random,
) {
	const { min, max } = ACTION_DURATIONS_MS[kind];
	const durationMs = min + random() * (max - min);

	control.action = { kind, progress: 0, item, durationMs };
}

export function isBusy(cook: { control: ControlState }): boolean {
	return cook.control.action !== null;
}

export function advanceAction(control: ControlState, dt: number): boolean {
	const action = control.action;

	if (!action) {
		return false;
	}

	action.progress += dt / action.durationMs;

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
				neededNow(order).includes(request.ingredient)
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
				(!order || !neededNow(order).includes(request.ingredient))
			);
	}
}
