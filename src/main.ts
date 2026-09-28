import { bootstrapGame, type Game } from "./core/bootstrap";
import { createPixiApp } from "./pixi";

const host = document.querySelector<HTMLElement>("#app");

if (!host) {
	throw new Error("Не найден контейнер #app");
}

const { app, layers } = await createPixiApp(host);

const game: Game = await bootstrapGame(app, layers);
game.start();

(window as unknown as { game: Game }).game = game;
