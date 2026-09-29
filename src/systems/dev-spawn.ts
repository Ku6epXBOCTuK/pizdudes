import { DEV_SPAWN } from "../config/dev-spawn";
import { randomSpawnPoint } from "../config/field";
import { GameEngine, GameEvents } from "../core/event-bus";
import { spawnCook } from "../core/spawn";
import type { Entity } from "../core/world";
import type { GameContext } from "../shared/context";
import type { DevCommand } from "../twitch/dev-commands";

export const BOT_ID_PREFIX = "bot:";

export type SpawnIntent = "work" | "idle";

export interface DevCook {
	userId: string;
	name: string;
}

export interface DevCommandsOptions {
	ownerId: string | null;
}

function isOwner(cook: DevCook, ownerId: string | null): boolean {
	if (!ownerId) {
		return false;
	}

	return cook.userId === ownerId;
}

export interface DevQueueItem {
	intent: SpawnIntent;
}

export interface DevSpawnStats {
	pending: number;
	alive: number;
	spawned: number;
	working: number;
	wandering: number;
	intervalMs: number;
}

export interface DevSpawnController {
	enqueue(count: number): void;
	clearQueue(): void;
	stats(): DevSpawnStats;
	consume(dt: number): void;
	toggleNames(): void;
}

function isBot(cook: Entity): boolean {
	return cook.cookId?.startsWith(BOT_ID_PREFIX) ?? false;
}

export function pickIntent(
	random: () => number = Math.random,
	wanderChance: number = DEV_SPAWN.wanderChance,
): SpawnIntent {
	return random() < wanderChance ? "idle" : "work";
}

export function createDevSpawnSystem(
	ctx: GameContext,
	random: () => number = Math.random,
): DevSpawnController {
	const { world, app, assets, layers } = ctx;
	const cooks = world.with("position", "playerTag");

	const queue: DevQueueItem[] = [];
	let spawned = 0;
	let accumulatorMs = 0;

	function bots() {
		return [...cooks].filter(isBot);
	}

	function removeCook(cook: Entity) {
		cook.view?.destroy();
		cook.badge?.root.destroy();
		world.remove(cook);
	}

	function spawnOne(item: DevQueueItem) {
		const position = randomSpawnPoint(app.screen, random);

		spawned++;

		spawnCook(
			world,
			assets,
			layers.ui,
			{ userId: `${BOT_ID_PREFIX}${spawned}`, name: `Бот ${spawned}` },
			position,
			item.intent === "work" ? "auto" : "chat",
		);
	}

	function enqueue(count: number) {
		const room = Math.max(0, DEV_SPAWN.maxBots - bots().length - queue.length);

		for (let index = 0; index < Math.min(count, room); index++) {
			queue.push({ intent: pickIntent(random) });
		}

		console.info(
			`[dev] в очередь добавлено ${Math.min(count, room)} ботов, ` +
				`в очереди ${queue.length}, на поле ${bots().length}/${DEV_SPAWN.maxBots}`,
		);
	}

	function clearQueue() {
		const removed = queue.length;
		queue.length = 0;
		accumulatorMs = 0;

		const alive = bots();
		for (const cook of alive) {
			removeCook(cook);
		}

		spawned = 0;

		console.info(
			`[dev] сброшено: из очереди ${removed}, с поля ${alive.length}. ` +
				`Остался только настоящий повар.`,
		);
	}

	function stats(): DevSpawnStats {
		const alive = bots();

		return {
			pending: queue.length,
			alive: alive.length,
			spawned,
			working: alive.filter((cook) => cook.control?.mode === "auto").length,
			wandering: alive.filter((cook) => cook.control?.mode === "chat").length,
			intervalMs: DEV_SPAWN.intervalMs,
		};
	}

	function consume(dt: number) {
		if (queue.length === 0) {
			accumulatorMs = 0;
			return;
		}

		accumulatorMs += dt;

		while (
			queue.length > 0 &&
			accumulatorMs >= DEV_SPAWN.intervalMs &&
			bots().length < DEV_SPAWN.maxBots
		) {
			accumulatorMs -= DEV_SPAWN.intervalMs;
			spawnOne(queue.shift()!);
		}
	}

	function toggleNames() {
		const config = world.with("config").first;

		if (!config) {
			return;
		}

		config.config.namesVisible = !config.config.namesVisible;
		console.info(
			`[dev] имена ${config.config.namesVisible ? "включены" : "выключены"}`,
		);
	}

	return {
		enqueue,
		clearQueue,
		stats,
		consume,
		toggleNames,
	};
}

export function createDevSpawnRuntime(
	ctx: GameContext,
	controller: DevSpawnController,
	{ ownerId }: DevCommandsOptions,
) {
	let worstFrameMs = 0;

	function onActivity({
		cook,
		dev,
	}: {
		cook: DevCook;
		dev?: DevCommand | null;
	}) {
		if (!dev) {
			return;
		}

		if (!ownerId) {
			console.info(
				"[dev] VITE_TWITCH_OWNER_ID не задан, тестовые команды отключены",
			);
			return;
		}

		if (!isOwner(cook, ownerId)) {
			console.info(`[dev] ${cook.name} не владелец канала, команда отклонена`);
			return;
		}

		switch (dev.kind) {
			case "spawn-bots":
				controller.enqueue(dev.count);
				return;
			case "clear-bots":
				controller.clearQueue();
				return;
			case "report-count":
				console.info(`[dev] ${formatStats(controller.stats())}`);
				return;
			case "report-stats":
				console.info(
					`[dev] ${formatStats(controller.stats())}, ` +
						`FPS ${ctx.app.ticker.FPS.toFixed(1)}, худший кадр ${worstFrameMs.toFixed(1)}мс`,
				);
				worstFrameMs = 0;
				return;
			case "toggle-names":
				controller.toggleNames();
		}
	}

	GameEngine.on(GameEvents.CHAT_ACTIVITY, onActivity);

	const system = (dt: number) => {
		controller.consume(dt);
		worstFrameMs = Math.max(worstFrameMs, ctx.app.ticker.deltaMS);
	};

	return Object.assign(system, {
		dispose() {
			GameEngine.off(GameEvents.CHAT_ACTIVITY, onActivity);
		},
	});
}

function formatStats(stats: DevSpawnStats): string {
	return (
		`в очереди ${stats.pending}, на поле ${stats.alive} ` +
		`(работают ${stats.working}, бродят ${stats.wandering}), ` +
		`интервал ${stats.intervalMs}мс`
	);
}
