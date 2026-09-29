import type { World } from "miniplex";
import {
	AnimatedSprite,
	type Container,
	Sprite,
	type Texture,
	TilingSprite,
} from "pixi.js";
import { COOK_WALK_FPS, cookWalkFrames } from "../assets/cook";
import { type ControlMode, createControlState } from "../config/control";
import { approachPoint, FIELD_SLOTS, slotPosition } from "../config/field";
import { createCarryState } from "../config/recipes";
import { FLOOR_TILE_SCALE, FLOOR_TINT, SPRITE_SCALE } from "../constants";
import type { GameAssets, GameContext } from "../shared/context";
import { createCookBadge } from "../ui/cook-badge";
import type {
	CookEntity,
	CookIdentity,
	Entity,
	GlobalConfig,
	Vector2,
} from "./world";

export interface Size {
	width: number;
	height: number;
}

const FLOOR_LABEL = "floor";
const HOUSE_COOK_ID = "house";
const HOUSE_COOK_NAME = "Главный Пиздюдес";

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
			position: slotPosition(slot, screen),
			view,
			stationTag: true,
			stationType: slot.station,
			approach: approachPoint(slot, screen),
		});
	}
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
		wander: null,
		view,
		badge,
		animated: true,
		playerTag: true,
	} satisfies Entity;

	return world.add(cook);
}

export function spawnGlobalConfig(world: World<Entity>): GlobalConfig {
	const existing = world.with("config").first;

	if (existing) {
		return existing.config;
	}

	const config: GlobalConfig = { namesVisible: true };
	world.add({ config });

	return config;
}

export function spawnField(ctx: GameContext): TilingSprite {
	const screen = ctx.app.screen;
	const center = { x: screen.width / 2, y: screen.height / 2 };

	spawnGlobalConfig(ctx.world);

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
