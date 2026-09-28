import { World } from "miniplex";
import {
	Assets,
	Sprite,
	type Application,
	type Texture,
	type Ticker,
} from "pixi.js";

import cookTextureUrl from "../../assets/characters/cook/cook.png";
import { cookFrame, COOK_POSE } from "../assets/cook";
import { MAX_FRAME_MS, SPRITE_SCALE } from "../constants";
import type { Layers } from "../pixi";
import type { GameContext } from "../shared/context";
import { createMovementSystem } from "../systems/movement";
import { createRenderSystem } from "../systems/render";
import { GameEngine, GameEvents } from "./event-bus";
import type { Entity } from "./world";

type System = ((dt: number) => void) & { dispose?: () => void };
type SystemFactory = (ctx: GameContext) => System;
type SystemGroup = { name: string; factories: SystemFactory[] };

const SYSTEM_GROUPS: SystemGroup[] = [
	{
		name: "physics",
		factories: [createMovementSystem],
	},
	{
		name: "render",
		factories: [createRenderSystem],
	},
];

const INITIAL_SPAWN = {
	position: { x: 160, y: 160 },
	velocity: { x: 90, y: 45 },
};

async function loadInitialTextures() {
	return {
		cook: await Assets.load<Texture>(cookTextureUrl),
	};
}

function createInitialState(world: World<Entity>, cookSheet: Texture) {
	const view = new Sprite(cookFrame(cookSheet, 0, COOK_POSE.walkRight));
	view.anchor.set(0.5);
	view.scale.set(SPRITE_SCALE);

	world.add({
		name: "cook",
		position: { ...INITIAL_SPAWN.position },
		velocity: { ...INITIAL_SPAWN.velocity },
		view,
		playerTag: true,
	});
}

export async function bootstrapGame(app: Application, layers: Layers) {
	const textures = await loadInitialTextures();

	const world = new World<Entity>();
	const ctx: GameContext = {
		world,
		app,
		layers,
		eventBus: GameEngine,
	};

	const groups = SYSTEM_GROUPS.map((group) =>
		group.factories.map((factory) => factory(ctx)),
	);

	let timeScale = 1;
	let isPaused = false;
	let isDestroyed = false;

	createInitialState(world, textures.cook);

	const onPause = () => {
		isPaused = true;
		app.ticker.stop();
	};

	const onResume = () => {
		isPaused = false;
		app.ticker.start();
	};

	GameEngine.on(GameEvents.PAUSE_GAME, onPause);
	GameEngine.on(GameEvents.RESUME_GAME, onResume);

	const update = (ticker: Ticker) => {
		const dt = Math.min(ticker.deltaMS, MAX_FRAME_MS) * timeScale;
		for (const group of groups) {
			for (const system of group) {
				system(dt);
			}
		}
	};

	app.ticker.add(update);

	return {
		start() {
			if (isDestroyed) return;
			app.ticker.start();
		},

		stop() {
			app.ticker.stop();
		},

		isRunning() {
			return app.ticker.started && !isPaused;
		},

		setTimeScale(scale: number) {
			timeScale = scale;
		},

		reset() {
			world.clear();
			createInitialState(world, textures.cook);
			timeScale = 1;

			if (isPaused) {
				onResume();
			}
		},

		destroy() {
			if (isDestroyed) return;
			isDestroyed = true;

			app.ticker.remove(update);
			app.ticker.stop();
			GameEngine.off(GameEvents.PAUSE_GAME, onPause);
			GameEngine.off(GameEvents.RESUME_GAME, onResume);

			world.clear();

			for (const group of groups) {
				for (const system of group) {
					system.dispose?.();
				}
			}
		},
	};
}

export type Game = Awaited<ReturnType<typeof bootstrapGame>>;
