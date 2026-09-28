import { bootstrapGame, type Game } from "./core/bootstrap";
import { GameEngine, GameEvents } from "./core/event-bus";
import { createPixiApp } from "./pixi";
import { createTwitchChat } from "./twitch/chat";
import { readTwitchConfig } from "./twitch/config";

const host = document.querySelector<HTMLElement>("#app");

if (!host) {
	throw new Error("Не найден контейнер #app");
}

const { app, layers } = await createPixiApp(host);

const game: Game = await bootstrapGame(app, layers);
game.start();

(window as unknown as { game: Game }).game = game;

const twitch = readTwitchConfig();

if (!twitch) {
	console.info(
		"[twitch] нет credentials в .env, чат не подключён, повар играет сам",
	);
} else {
	const chat = createTwitchChat(twitch, (request, author) => {
		GameEngine.emit(GameEvents.CHAT_REQUEST, request);
		console.info(`[twitch] ${author}:`, request);
	});

	chat.onConnect(() => {
		game.setControlMode("chat");
		console.info(
			`[twitch] подключён к #${twitch.channel}, повар под управлением чата`,
		);
	});

	chat.onError((error) => {
		console.error("[twitch]", error.message);
	});

	chat.connect();
}
