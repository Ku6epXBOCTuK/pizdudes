import type { Sprite } from "pixi.js";

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
	animated: true;
	playerTag: true;
}>;
