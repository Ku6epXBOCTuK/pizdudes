import { canRequest, markActive } from "../config/control";
import type { ChatRequestEvent } from "../core/event-bus";
import { GameEngine, GameEvents } from "../core/event-bus";
import { randomSpawnPoint } from "../config/field";
import { spawnCook } from "../core/spawn";
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

	const pending: ChatRequestEvent[] = [];

	function enqueue(event: ChatRequestEvent) {
		pending.push(event);
	}

	function process({ cook, request }: ChatRequestEvent) {
		const target = ensureCook(cook);

		if (!target) {
			return;
		}

		if (!request) {
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

	GameEngine.on(GameEvents.CHAT_ACTIVITY, enqueue);
	GameEngine.on(GameEvents.CHAT_REQUEST, enqueue);

	const system = () => {
		if (pending.length === 0) {
			return;
		}

		for (const event of pending.splice(0)) {
			process(event);
		}
	};

	return Object.assign(system, {
		dispose() {
			GameEngine.off(GameEvents.CHAT_ACTIVITY, enqueue);
			GameEngine.off(GameEvents.CHAT_REQUEST, enqueue);
			pending.length = 0;
		},
	});
}
