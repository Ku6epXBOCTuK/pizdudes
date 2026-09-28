import { Text } from "pixi.js";

import "./style.css";
import { spawnEntity, world } from "./miniplex";
import { createPixiApp } from "./pixi";

const host = document.querySelector<HTMLElement>("#app");

if (!host) {
	throw new Error("Не найден контейнер #app");
}

const { app, layers } = await createPixiApp(host);

spawnEntity("player");

const label = new Text({
	text: `pixi + miniplex: ${world.size} entities`,
	style: { fill: "#7c8698", fontSize: 20 },
});

label.anchor.set(0.5);
label.position.set(app.screen.width / 2, app.screen.height / 2);
layers.ui.addChild(label);

console.log("Сущности в мире:", [...world]);
