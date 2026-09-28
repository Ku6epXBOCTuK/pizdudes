import { canRequest, type CookRequest } from "../config/control";
import { GameEngine, GameEvents } from "../core/event-bus";
import type { GameContext } from "../shared/context";

export function createCookCommandsSystem({ world }: GameContext) {
	const cooks = world.with("position", "carry", "order", "control");

	const onRequest = (request: CookRequest) => {
		for (const cook of cooks) {
			if (cook.control.mode !== "chat") {
				continue;
			}

			if (canRequest(request, cook)) {
				cook.control.request = request;
				return;
			}
		}

		console.info("[chat] request ignored:", request);
	};

	GameEngine.on(GameEvents.CHAT_REQUEST, onRequest);

	const system = () => {};

	return Object.assign(system, {
		dispose() {
			GameEngine.off(GameEvents.CHAT_REQUEST, onRequest);
		},
	});
}
