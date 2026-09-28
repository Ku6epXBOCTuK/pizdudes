import type { Sprite } from "pixi.js";
import type { StationType } from "../assets/stations";

export interface Vector2 {
	x: number;
	y: number;
}

export interface PatrolState {
	nextVertex: number;
}

export type Entity = Partial<{
	id: string;
	name: string;
	position: Vector2;
	velocity: Vector2;
	patrol: PatrolState;
	view: Sprite;
	stationTag: true;
	stationType: StationType;
	animated: true;
	playerTag: true;
}>;
