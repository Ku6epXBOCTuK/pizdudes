import type { World } from "miniplex";
import {
	AnimatedSprite,
	type Container,
	Sprite,
	type Texture,
	TilingSprite,
} from "pixi.js";

import { cookWalkFrames, COOK_WALK_FPS } from "../assets/cook";
import { FLOOR_TILE_SCALE, FLOOR_TINT, SPRITE_SCALE } from "../constants";
import { FIELD_SLOTS } from "../config/field";
import type { GameAssets, GameContext } from "../shared/context";
import { patrolVertices } from "../systems/patrol";
import type { Entity, Vector2 } from "./world";

export interface Size {
	width: number;
	height: number;
}

const FLOOR_LABEL = "floor";

export function spawnFloor(
	layer: Container,
	floor: Texture,
	screen: Size,
): TilingSprite {
	const previous = layer.children.find((child) => child.label === FLOOR_LABEL);

	if (previous) {
		layer.removeChild(previous);
		previous.destroy();
	}

	const view = new TilingSprite({
		texture: floor,
		width: screen.width,
		height: screen.height,
	});
	view.tileScale.set(FLOOR_TILE_SCALE);
	view.tint = FLOOR_TINT;
	view.label = FLOOR_LABEL;

	layer.addChild(view);
	return view;
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

export function spawnField(ctx: GameContext): TilingSprite {
	const screen = ctx.app.screen;
	const center = { x: screen.width / 2, y: screen.height / 2 };

	const floor = spawnFloor(ctx.layers.background, ctx.assets.floor, screen);
	spawnStations(ctx.world, ctx.assets, screen);
	spawnCook(ctx.world, ctx.assets, center);

	return floor;
}
