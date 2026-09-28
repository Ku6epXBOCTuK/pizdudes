import type { World } from "miniplex";
import type { Application } from "pixi.js";
import type { GameEngine } from "../core/event-bus";
import type { Entity } from "../core/world";
import type { Layers } from "../pixi";

export type BaseContext = {
	world: World<Entity>;
	eventBus: typeof GameEngine;
};

export type GameContext = BaseContext & {
	app: Application;
	layers: Layers;
};
