import { canRequest, markActive } from "../config/control";
import type { ChatRequestEvent } from "../core/event-bus";
import { GameEngine, GameEvents } from "../core/event-bus";
import { randomSpawnPoint, spawnCook } from "../core/spawn";
import type { CookEntity, CookIdentity } from "../core/world";
import type { GameContext } from "../shared/context";

export function createCookCommandsSystem(ctx: GameContext) {
	const byCookId = ctx.world.with(
		"name",
		"cookId",
		"order",
		"carry",
		"control",
		"wander",
	);

	function ensureCook(identity: CookIdentity): CookEntity | undefined {
		for (const cook of byCookId) {
			if (cook.cookId === identity.userId) {
				return cook;
			}
		}

		const cook = spawnCook(
			ctx.world,
			ctx.assets,
			ctx.layers.ui,
			identity,
			randomSpawnPoint(ctx.app.screen),
			"chat",
		);

		console.info(`[cook] spawned for ${identity.name} (${identity.userId})`);

		return cook;
	}

	function onRequest({ cook, request }: ChatRequestEvent) {
		const target = ensureCook(cook);

		if (!target) {
			return;
		}

		if (canRequest(request, target)) {
			target.control.request = request;
			markActive(target.control);
			target.wander = null;
			return;
		}

		console.info(`[cook] ${cook.name} cannot do that yet:`, request);
	}

	GameEngine.on(GameEvents.CHAT_REQUEST, onRequest);

	const system = () => {};

	return Object.assign(system, {
		dispose() {
			GameEngine.off(GameEvents.CHAT_REQUEST, onRequest);
		},
	});
}
