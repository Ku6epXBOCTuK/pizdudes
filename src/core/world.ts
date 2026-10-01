import type { With } from "miniplex";
import type { AnimatedSprite, Sprite } from "pixi.js";
import type { CookDirection, CookWalkFrames } from "../assets/cook";
import type { StationType } from "../assets/stations";
import type { ControlState } from "../config/control";
import type { CarryState, OrderState } from "../config/recipes";
import type { CookBadge } from "../ui/cook-badge";

export interface Vector2 {
	x: number;
	y: number;
}

export type StationEntity = With<
	Entity,
	"position" | "stationTag" | "stationType" | "approach"
>;

export interface AnimationState {
	sprite: AnimatedSprite;
	frames: CookWalkFrames;
	direction: CookDirection;
}

export interface CookIdentity {
	userId: string;
	name: string;
}

export interface GlobalConfig {
	namesVisible: boolean;
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
	target: StationEntity | null;
	wander: Vector2 | null;
	view: Sprite;
	badge: CookBadge;
	stationTag: true;
	stationType: StationType;
	approach: Vector2;
	animation: AnimationState;
	playerTag: true;
	config: GlobalConfig;
}>;

export type CookEntity = With<
	Entity,
	"name" | "cookId" | "order" | "carry" | "control" | "wander"
>;
