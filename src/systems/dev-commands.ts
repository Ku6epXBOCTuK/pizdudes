import { randomSpawnPoint } from "../config/field";
import type { DevCommand } from "../twitch/dev-commands";
import { GameEngine, GameEvents } from "../core/event-bus";
import { spawnCook } from "../core/spawn";
import type { Entity } from "../core/world";
import type { GameContext } from "../shared/context";

export const BOT_ID_PREFIX = "bot:";

export interface DevCommandsOptions {
	ownerId: string | null;
}

export function createDevCommandsSystem(
	ctx: GameContext,
	{ ownerId }: DevCommandsOptions,
) {
	const { world, app, assets, layers } = ctx;
	const cooks = world.with("cookId", "playerTag");

	let botCount = 0;
	let lastSpawnMs = 0;
	let worstFrameMs = 0;

	function isBot(cook: Entity): boolean {
		return cook.cookId?.startsWith(BOT_ID_PREFIX) ?? false;
	}

	function countCooks() {
		let total = 0;

		for (const _ of cooks) {
			total++;
		}

		return total;
	}

	function removeCook(cook: Entity) {
		cook.view?.destroy();
		cook.badge?.root.destroy();
		world.remove(cook);
	}

	function spawnBots(count: number) {
		const startedAt = performance.now();
		let spawned = 0;

		for (let index = 0; index < count; index++) {
			botCount++;

			spawnCook(
				world,
				assets,
				layers.ui,
				{ userId: `${BOT_ID_PREFIX}${botCount}`, name: `Бот ${botCount}` },
				randomSpawnPoint(app.screen),
				"auto",
			);

			spawned++;
		}

		lastSpawnMs = performance.now() - startedAt;

		console.info(
			`[dev] +${spawned} ботов за ${lastSpawnMs.toFixed(1)}мс, всего ${countCooks()}`,
		);
	}

	function clearBots() {
		let removed = 0;

		for (const cook of [...cooks]) {
			if (isBot(cook)) {
				removeCook(cook);
				removed++;
			}
		}

		botCount = 0;

		console.info(`[dev] -${removed} ботов, осталось ${countCooks()}`);
	}

	function reportStats() {
		console.info(
			`[dev] FPS ${app.ticker.FPS.toFixed(1)}, худший кадр ${worstFrameMs.toFixed(1)}мс, ` +
				`поваров ${countCooks()} (ботов ${botCount}), спавн ${lastSpawnMs.toFixed(1)}мс`,
		);

		worstFrameMs = 0;
	}

	function run(cook: { userId: string; name: string }, dev: DevCommand) {
		if (!ownerId) {
			console.info(
				"[dev] VITE_TWITCH_OWNER_ID не задан в .env, тестовые команды отключены",
			);
			return;
		}

		if (cook.userId !== ownerId) {
			console.info(`[dev] ${cook.name} не владелец канала, команда отклонена`);
			return;
		}

		switch (dev.kind) {
			case "spawn-bots":
				spawnBots(dev.count);
				return;

			case "clear-bots":
				clearBots();
				return;

			case "report-count":
				console.info(`[dev] поваров ${countCooks()} (ботов ${botCount})`);
				return;

			case "report-stats":
				reportStats();
		}
	}

	function onActivity({
		cook,
		dev,
	}: {
		cook: { userId: string; name: string };
		dev?: DevCommand | null;
	}) {
		if (dev) {
			run(cook, dev);
		}
	}

	GameEngine.on(GameEvents.CHAT_ACTIVITY, onActivity);

	const system = () => {
		// dt приходит зажатым в MAX_FRAME_MS, поэтому пик кадра берём из тикера
		worstFrameMs = Math.max(worstFrameMs, app.ticker.deltaMS);
	};

	return Object.assign(system, {
		dispose() {
			GameEngine.off(GameEvents.CHAT_ACTIVITY, onActivity);
		},
	});
}
