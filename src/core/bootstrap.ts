import { World } from "miniplex";
import {
	AnimatedSprite,
	Assets,
	type Application,
	type Texture,
	type Ticker,
} from "pixi.js";

import cookTextureUrl from "../../assets/characters/cook/cook.png";
import { cookWalkFrames, COOK_WALK_FPS } from "../assets/cook";
import { MAX_FRAME_MS, SPRITE_SCALE } from "../constants";
import type { Layers } from "../pixi";
import type { GameAssets, GameContext } from "../shared/context";
import { createAnimationSystem } from "../systems/animation";
import { createMovementSystem } from "../systems/movement";
import { createPatrolSystem, patrolVertices } from "../systems/patrol";
import { createRenderSystem } from "../systems/render";
import { GameEngine, GameEvents } from "./event-bus";
import type { Entity, Vector2 } from "./world";

type System = ((dt: number) => void) & { dispose?: () => void };
type SystemFactory = (ctx: GameContext) => System;
type SystemGroup = { name: string; factories: SystemFactory[] };

const SYSTEM_GROUPS: SystemGroup[] = [
	{
		name: "ai",
		factories: [createPatrolSystem],
	},
	{
		name: "physics",
		factories: [createMovementSystem],
	},
	{
		name: "animation",
		factories: [createAnimationSystem],
	},
	{
		name: "render",
		factories: [createRenderSystem],
	},
];

async function loadInitialTextures(): Promise<GameAssets> {
	return {
		cookSheet: await Assets.load<Texture>(cookTextureUrl),
	};
}

function createInitialState(
	world: World<Entity>,
	assets: GameAssets,
	center: Vector2,
) {
	const view = new AnimatedSprite({
		textures: cookWalkFrames(assets.cookSheet)["south-east"],
		animationSpeed: COOK_WALK_FPS,
		autoUpdate: false,
		loop: true,
	});
	view.anchor.set(0.5);
	view.scale.set(SPRITE_SCALE);

	world.add({
		name: "cook",
		position: patrolVertices(center)[0]!,
		velocity: { x: 0, y: 0 },
		patrol: { nextVertex: 1 },
		view,
		animated: true,
		playerTag: true,
	});
}

export async function bootstrapGame(app: Application, layers: Layers) {
	const assets = await loadInitialTextures();

	const world = new World<Entity>();
	const ctx: GameContext = {
		world,
		app,
		layers,
		assets,
		eventBus: GameEngine,
	};

	const groups = SYSTEM_GROUPS.map((group) =>
		group.factories.map((factory) => factory(ctx)),
	);

	let timeScale = 1;
	let isPaused = false;
	let isDestroyed = false;

	const center = { x: app.screen.width / 2, y: app.screen.height / 2 };
	createInitialState(world, assets, center);

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
			const center = { x: app.screen.width / 2, y: app.screen.height / 2 };
			createInitialState(world, assets, center);
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
