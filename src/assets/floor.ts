import { Assets, type Texture } from "pixi.js";

import floorUrl from "../../assets/floor.jpg";

export async function loadFloor(): Promise<Texture> {
	return Assets.load<Texture>(floorUrl);
}
