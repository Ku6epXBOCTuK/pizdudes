import { CanvasSource, Texture } from "pixi.js";

import { CATALOG_EMOJI } from "../config/items";
import type { CarryItem } from "../config/recipes";

const EMOJI_FONT =
	'"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
const SIZE = 32;
const RESOLUTION = 2;

let textures: Map<CarryItem, Texture> | null = null;

function draw(item: CarryItem): Texture {
	const canvas = document.createElement("canvas");
	canvas.width = SIZE;
	canvas.height = SIZE;

	const context = canvas.getContext("2d")!;
	context.font = `${SIZE - 4}px ${EMOJI_FONT}`;
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.fillText(CATALOG_EMOJI[item], SIZE / 2, SIZE / 2);

	return new Texture({
		source: new CanvasSource({
			resource: canvas,
			resolution: RESOLUTION,
			scaleMode: "linear",
		}),
	});
}

export function loadCarryTextures(): Map<CarryItem, Texture> {
	textures ??= new Map(
		(Object.keys(CATALOG_EMOJI) as CarryItem[]).map((item) => [
			item,
			draw(item),
		]),
	);

	return textures;
}

export function carryTexture(item: CarryItem | null): Texture | null {
	if (!item) {
		return null;
	}

	return loadCarryTextures().get(item) ?? null;
}
