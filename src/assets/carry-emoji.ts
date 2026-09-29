import { CanvasSource, Texture } from "pixi.js";

import { CARRY_EMOJI } from "../config/items";
import type { Item } from "../config/recipes";

const EMOJI_FONT =
	'"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
const SIZE = 32;
const RESOLUTION = 2;

let textures: Map<Item, Texture> | null = null;

function draw(item: Item): Texture {
	const canvas = document.createElement("canvas");
	canvas.width = SIZE;
	canvas.height = SIZE;

	const context = canvas.getContext("2d")!;
	context.font = `${SIZE - 4}px ${EMOJI_FONT}`;
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.fillText(CARRY_EMOJI[item], SIZE / 2, SIZE / 2);

	return new Texture({
		source: new CanvasSource({
			resource: canvas,
			resolution: RESOLUTION,
			scaleMode: "linear",
		}),
	});
}

export function loadCarryTextures(): Map<Item, Texture> {
	textures ??= new Map(
		(Object.keys(CARRY_EMOJI) as Item[]).map((item) => [item, draw(item)]),
	);

	return textures;
}

export function carryTexture(item: Item | null): Texture | null {
	if (!item) {
		return null;
	}

	return loadCarryTextures().get(item) ?? null;
}
