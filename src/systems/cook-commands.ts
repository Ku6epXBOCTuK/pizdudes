import { canRequest, markActive } from "../config/control";
import type { ChatRequestEvent } from "../core/event-bus";
import { GameEvents } from "../core/event-bus";
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

	const index = new Map<string, CookEntity>();

	for (const cook of byCookId) {
		index.set(cook.cookId, cook);
	}

	const indexSubscriptions = [
		byCookId.onEntityAdded.subscribe((cook) => {
			index.set(cook.cookId, cook);
		}),

		byCookId.onEntityRemoved.subscribe((cook) => {
			index.delete(cook.cookId);
		}),
	];

	function ensureCook(identity: CookIdentity): CookEntity | undefined {
		const existing = index.get(identity.userId);

		if (existing) {
			return existing;
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

	ctx.eventBus.on(GameEvents.CHAT_ACTIVITY, enqueue);
	ctx.eventBus.on(GameEvents.CHAT_REQUEST, enqueue);

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
			ctx.eventBus.off(GameEvents.CHAT_ACTIVITY, enqueue);
			ctx.eventBus.off(GameEvents.CHAT_REQUEST, enqueue);
			pending.length = 0;
			for (const unsubscribe of indexSubscriptions) {
				unsubscribe();
			}
		},
	});
}
