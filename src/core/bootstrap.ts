import { World } from "miniplex";
import { Assets, type Application, type Texture, type Ticker } from "pixi.js";

import cookTextureUrl from "../../assets/characters/cook/cook.png";
import { loadFloor } from "../assets/floor";
import { loadStations } from "../assets/stations";
import { MAX_FRAME_MS } from "../constants";
import type { Layers } from "../pixi";
import type { GameAssets, GameContext } from "../shared/context";
import { createAnimationSystem } from "../systems/animation";
import { createCookBadgeSystem } from "../systems/cook-badge";
import { createCookCommandsSystem } from "../systems/cook-commands";
import {
	createDevSpawnRuntime,
	createDevSpawnSystem,
	type DevCommandsOptions,
} from "../systems/dev-spawn";
import { createMarqueeSystem } from "../systems/marquee";
import { createMovementSystem } from "../systems/movement";
import { createOrderAiSystem } from "../systems/order-ai";
import { createOrderAssemblySystem } from "../systems/order-assembly";
import { createRenderSystem } from "../systems/render";
import { GameEngine, GameEvents } from "./event-bus";
import { spawnField } from "./spawn";
import type { Entity } from "./world";

type System = ((dt: number) => void) & { dispose?: () => void };
type SystemFactory = (ctx: GameContext) => System;
type SystemGroup = { name: string; factories: SystemFactory[] };

function systemGroups(devOptions: DevCommandsOptions): SystemGroup[] {
	return [
		{
			name: "ai",
			factories: [createOrderAiSystem],
		},
		{
			name: "order",
			factories: [createOrderAssemblySystem, createCookCommandsSystem],
		},
		{
			name: "dev",
			factories: [
				(ctx) =>
					createDevSpawnRuntime(ctx, createDevSpawnSystem(ctx), devOptions),
			],
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
		{
			name: "ui",
			factories: [createCookBadgeSystem, createMarqueeSystem],
		},
	];
}

async function loadInitialTextures(): Promise<GameAssets> {
	const [cookSheet, floor, stations] = await Promise.all([
		Assets.load<Texture>(cookTextureUrl),
		loadFloor(),
		loadStations(),
	]);

	return { cookSheet, floor, stations };
}

export async function bootstrapGame(
	app: Application,
	layers: Layers,
	devOptions: DevCommandsOptions = { ownerId: null },
) {
	const assets = await loadInitialTextures();

	const world = new World<Entity>();
	const ctx: GameContext = {
		world,
		app,
		layers,
		assets,
		eventBus: GameEngine,
	};

	const groups = systemGroups(devOptions).map((group) =>
		group.factories.map((factory) => factory(ctx)),
	);

	let timeScale = 1;
	let isPaused = false;
	let isDestroyed = false;

	let floor = spawnField(ctx);

	const onResize = (width: number, height: number) => {
		floor.width = width;
		floor.height = height;
	};

	app.renderer.on("resize", onResize);

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
			floor = spawnField(ctx);
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
			app.renderer.off("resize", onResize);
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
