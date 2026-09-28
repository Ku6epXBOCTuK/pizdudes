import type { World } from "miniplex";
import type { Application, Texture } from "pixi.js";

import type { StationTextures } from "../assets/stations";
import type { GameEngine } from "../core/event-bus";
import type { Entity } from "../core/world";
import type { Layers } from "../pixi";

export type BaseContext = {
	world: World<Entity>;
	eventBus: typeof GameEngine;
};

export type GameAssets = {
	cookSheet: Texture;
	floor: Texture;
	stations: StationTextures;
};

export type GameContext = BaseContext & {
	app: Application;
	layers: Layers;
	assets: GameAssets;
};
