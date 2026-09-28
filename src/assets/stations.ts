import { Assets, type Texture } from "pixi.js";

import bunShelfUrl from "../../assets/stations/bun-shelf.png";
import cashRegisterUrl from "../../assets/stations/cash-register.png";
import cheeseShelfUrl from "../../assets/stations/cheese-shelf.png";
import pattyGrillUrl from "../../assets/stations/patty-grill.png";
import sauceDispenserUrl from "../../assets/stations/sauce-dispenser.png";
import servingCounterUrl from "../../assets/stations/serving-counter.png";
import trashCanUrl from "../../assets/stations/trash-can.png";
import veggieShelfUrl from "../../assets/stations/veggie-shelf.png";

export const STATION_TYPES = [
	"bun-shelf",
	"veggie-shelf",
	"patty-grill",
	"cheese-shelf",
	"cash-register",
	"serving-counter",
	"sauce-dispenser",
	"trash-can",
] as const;

export type StationType = (typeof STATION_TYPES)[number];

export type StationTextures = Record<StationType, Texture>;

const STATION_URLS: Record<StationType, string> = {
	"bun-shelf": bunShelfUrl,
	"veggie-shelf": veggieShelfUrl,
	"patty-grill": pattyGrillUrl,
	"cheese-shelf": cheeseShelfUrl,
	"cash-register": cashRegisterUrl,
	"serving-counter": servingCounterUrl,
	"sauce-dispenser": sauceDispenserUrl,
	"trash-can": trashCanUrl,
};

export async function loadStations(): Promise<StationTextures> {
	const entries = await Promise.all(
		STATION_TYPES.map(
			async (type) =>
				[type, await Assets.load<Texture>(STATION_URLS[type])] as const,
		),
	);

	return Object.fromEntries(entries) as StationTextures;
}
