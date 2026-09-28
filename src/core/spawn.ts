import type { World } from "miniplex";
import { AnimatedSprite, Sprite } from "pixi.js";

import { cookWalkFrames, COOK_WALK_FPS } from "../assets/cook";
import { SPRITE_SCALE } from "../constants";
import { FIELD_SLOTS } from "../config/field";
import type { GameAssets } from "../shared/context";
import { patrolVertices } from "../systems/patrol";
import type { Entity, Vector2 } from "./world";

export interface Size {
	width: number;
	height: number;
}

export function spawnStations(
	world: World<Entity>,
	assets: GameAssets,
	screen: Size,
) {
	for (const slot of FIELD_SLOTS) {
		const view = new Sprite(assets.stations[slot.station]);
		view.anchor.set(0.5);

		world.add({
			position: { x: slot.x * screen.width, y: slot.y * screen.height },
			view,
			stationTag: true,
			stationType: slot.station,
		});
	}
}

export function spawnCook(
	world: World<Entity>,
	assets: GameAssets,
	center: Vector2,
) {
	const view = new AnimatedSprite({
		textures: cookWalkFrames(assets.cookSheet)["south-east"],
		animationSpeed: COOK_WALK_FPS,
		autoUpdate: false,
		loop: true,
	});
	view.anchor.set(0.5);
	view.scale.set(SPRITE_SCALE);

	world.add({
		name: "cook",
		position: patrolVertices(center)[0]!,
		velocity: { x: 0, y: 0 },
		patrol: { nextVertex: 1 },
		view,
		animated: true,
		playerTag: true,
	});
}

export function spawnField(
	world: World<Entity>,
	assets: GameAssets,
	screen: Size,
) {
	spawnStations(world, assets, screen);
	spawnCook(world, assets, { x: screen.width / 2, y: screen.height / 2 });
}
