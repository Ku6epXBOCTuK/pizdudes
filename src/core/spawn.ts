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
import { FIELD_SLOTS, SPAWN_AREA } from "../config/field";
import { createControlState, type ControlMode } from "../config/control";
import { createCarryState } from "../config/recipes";
import type { GameAssets, GameContext } from "../shared/context";
import { createCookBadge } from "../ui/cook-badge";
import type { CookEntity, CookIdentity, Entity, Vector2 } from "./world";

export interface Size {
	width: number;
	height: number;
}

const FLOOR_LABEL = "floor";
const HOUSE_COOK_ID = "house";
const HOUSE_COOK_NAME = "Повар";

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

export function randomSpawnPoint(
	screen: Size,
	random: () => number = Math.random,
): Vector2 {
	return {
		x:
			screen.width *
			(SPAWN_AREA.xMin + random() * (SPAWN_AREA.xMax - SPAWN_AREA.xMin)),
		y:
			screen.height *
			(SPAWN_AREA.yMin + random() * (SPAWN_AREA.yMax - SPAWN_AREA.yMin)),
	};
}

export function spawnCook(
	world: World<Entity>,
	assets: GameAssets,
	uiLayer: Container,
	identity: CookIdentity,
	position: Vector2,
	mode: ControlMode = "auto",
): CookEntity {
	const view = new AnimatedSprite({
		textures: cookWalkFrames(assets.cookSheet)["south-east"],
		animationSpeed: COOK_WALK_FPS,
		autoUpdate: false,
		loop: true,
	});
	view.anchor.set(0.5);
	view.scale.set(SPRITE_SCALE);

	const badge = createCookBadge(identity.name);
	uiLayer.addChild(badge.root);

	const cook = {
		name: identity.name,
		cookId: identity.userId,
		position: { ...position },
		velocity: { x: 0, y: 0 },
		order: null,
		carry: createCarryState(),
		control: createControlState(mode),
		target: null,
		view,
		badge,
		animated: true,
		playerTag: true,
	} satisfies Entity;

	return world.add(cook);
}

export function spawnField(ctx: GameContext): TilingSprite {
	const screen = ctx.app.screen;
	const center = { x: screen.width / 2, y: screen.height / 2 };

	const floor = spawnFloor(ctx.layers.background, ctx.assets.floor, screen);
	spawnStations(ctx.world, ctx.assets, screen);
	spawnCook(
		ctx.world,
		ctx.assets,
		ctx.layers.ui,
		{ userId: HOUSE_COOK_ID, name: HOUSE_COOK_NAME },
		center,
	);

	return floor;
}
