import {
	type CarryState,
	isOrderComplete,
	nextNeeded,
	type OrderState,
} from "./recipes";

export type ControlMode = "auto" | "chat";

export type CookRequest =
	| { kind: "get-order" }
	| { kind: "fetch"; ingredient: CookRequestIngredient }
	| { kind: "deliver" };

export type CookRequestIngredient = NonNullable<ReturnType<typeof nextNeeded>>;

export interface ControlState {
	mode: ControlMode;
	request: CookRequest | null;
	idleMs: number;
}

export interface CookProgress {
	carry: CarryState;
	order: OrderState | null | undefined;
}

export function createControlState(mode: ControlMode = "auto"): ControlState {
	return { mode, request: null, idleMs: 0 };
}

export function markActive(control: ControlState) {
	control.idleMs = 0;
}

export function canRequest(request: CookRequest, cook: CookProgress): boolean {
	const { carry, order } = cook;

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
