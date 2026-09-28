import type { Sprite } from "pixi.js";
import type { StationType } from "../assets/stations";
import type { AssemblyState, CarryState } from "../config/recipes";

export interface Vector2 {
	x: number;
	y: number;
}

export interface TargetState {
	type: StationType;
	position: Vector2;
}

export type Entity = Partial<{
	id: string;
	name: string;
	position: Vector2;
	velocity: Vector2;
	carry: CarryState;
	target: TargetState | null;
	view: Sprite;
	stationTag: true;
	stationType: StationType;
	assembly: AssemblyState;
	animated: true;
	playerTag: true;
}>;
