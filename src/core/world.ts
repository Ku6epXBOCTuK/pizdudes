import type { With } from "miniplex";
import type { Sprite } from "pixi.js";
import type { StationType } from "../assets/stations";
import type { ControlState } from "../config/control";
import type { CarryState, OrderState } from "../config/recipes";
import type { CookBadge } from "../ui/cook-badge";

export interface Vector2 {
	x: number;
	y: number;
}

export interface TargetState {
	type: StationType;
	position: Vector2;
}

export interface CookIdentity {
	userId: string;
	name: string;
}

export type Entity = Partial<{
	id: string;
	name: string;
	cookId: string;
	position: Vector2;
	velocity: Vector2;
	order: OrderState | null;
	carry: CarryState;
	control: ControlState;
	target: TargetState | null;
	wander: Vector2 | null;
	view: Sprite;
	badge: CookBadge;
	stationTag: true;
	stationType: StationType;
	approach: Vector2;
	animated: true;
	playerTag: true;
}>;

export type CookEntity = With<
	Entity,
	"name" | "cookId" | "order" | "carry" | "control" | "wander"
>;
