import { bootstrapGame, type Game } from "./core/bootstrap";
import { GameEngine, GameEvents } from "./core/event-bus";
import { createPixiApp } from "./pixi";
import { createTwitchChat } from "./twitch/chat";
import { readTwitchConfig } from "./twitch/config";
import { attachDebugGrid } from "./ui/debug-grid";

const host = document.querySelector<HTMLElement>("#app");

if (!host) {
	throw new Error("Не найден контейнер #app");
}

const { app, layers } = await createPixiApp(host);

if (new URLSearchParams(window.location.search).has("grid")) {
	attachDebugGrid(layers.ui, app.renderer);
}

const twitch = readTwitchConfig();

const game: Game = await bootstrapGame(app, layers, {
	ownerId: twitch?.ownerId ?? null,
});
game.start();

(window as unknown as { game: Game }).game = game;

if (!twitch) {
	console.info(
		"[twitch] нет VITE_TWITCH_CHANNEL в .env, чат не подключён, повар играет сам",
	);
} else {
	const chat = createTwitchChat(twitch, ({ cook, request, dev }) => {
		GameEngine.emit(GameEvents.CHAT_ACTIVITY, { cook, request, dev });
		console.info(
			`[twitch] ${cook.name}:`,
			dev ?? request ?? "(обычное сообщение)",
		);
	});

	chat.onConnect(() => {
		console.info(
			`[twitch] подключён к #${twitch.channel}, каждый чаттер получает своего повара`,
		);
	});

	chat.onError((error) => {
		console.error("[twitch]", error.message);
	});

	chat.connect();
}
