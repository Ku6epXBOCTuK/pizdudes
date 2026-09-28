import { Application, Container } from "pixi.js";

export type Layers = {
	background: Container;
	main: Container;
	ui: Container;
};

export type PixiApp = {
	app: Application;
	layers: Layers;
};

export async function createPixiApp(host: HTMLElement): Promise<PixiApp> {
	const app = new Application();

	await app.init({
		background: "#10131a",
		resizeTo: host,
		antialias: true,
		autoDensity: true,
		resolution: Math.min(window.devicePixelRatio || 1, 2),
		preference: "webgl",
	});

	host.appendChild(app.canvas);

	const layers: Layers = {
		background: new Container({ label: "background" }),
		main: new Container({ label: "main" }),
		ui: new Container({ label: "ui" }),
	};

	app.stage.addChild(layers.background, layers.main, layers.ui);

	return { app, layers };
}
