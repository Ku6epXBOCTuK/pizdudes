import { Assets, type Texture } from "pixi.js";

import bunShelfUrl from "../../assets/stations/bun-shelf.png";
import cashRegisterUrl from "../../assets/stations/cash-register.png";
import cheeseShelfUrl from "../../assets/stations/cheese-shelf.png";
import cuttingBoardUrl from "../../assets/stations/cutting-board.png";
import doughMixerUrl from "../../assets/stations/dough-mixer.png";
import fridgeUrl from "../../assets/stations/fridge.png";
import pattyGrillUrl from "../../assets/stations/patty-grill.png";
import pizzaOvenUrl from "../../assets/stations/pizza-oven.png";
import sauceDispenserUrl from "../../assets/stations/sauce-dispenser.png";
import servingCounterUrl from "../../assets/stations/serving-counter.png";
import stovePotUrl from "../../assets/stations/stove-pot.png";
import trashCanUrl from "../../assets/stations/trash-can.png";
import veggieShelfUrl from "../../assets/stations/veggie-shelf.png";

export const STATION_TYPES = [
	"bun-shelf",
	"produce-shelf",
	"dairy-shelf",
	"pantry-shelf",
	"fridge",
	"cutting-board",
	"grill",
	"dough-mixer",
	"pizza-oven",
	"stove-pot",
	"serving-counter",
	"cash-register",
	"trash-can",
] as const;

export type StationType = (typeof STATION_TYPES)[number];

export type StationTextures = Record<StationType, Texture>;

const STATION_URLS: Record<StationType, string> = {
	"bun-shelf": bunShelfUrl,
	"produce-shelf": veggieShelfUrl,
	"dairy-shelf": cheeseShelfUrl,
	"pantry-shelf": sauceDispenserUrl,
	fridge: fridgeUrl,
	"cutting-board": cuttingBoardUrl,
	grill: pattyGrillUrl,
	"dough-mixer": doughMixerUrl,
	"pizza-oven": pizzaOvenUrl,
	"stove-pot": stovePotUrl,
	"serving-counter": servingCounterUrl,
	"cash-register": cashRegisterUrl,
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
