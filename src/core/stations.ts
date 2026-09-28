import type { World } from "miniplex";
import type { StationType } from "../assets/stations";
import type { Entity } from "./world";

export function stationFinder(world: World<Entity>) {
	const stations = world.with("position", "stationTag", "stationType");
	const assemblers = world.with(
		"position",
		"stationTag",
		"stationType",
		"assembly",
	);

	return {
		byType(type: StationType) {
			for (const station of stations) {
				if (station.stationType === type) {
					return station;
				}
			}
		},

		assembler(type: StationType) {
			for (const station of assemblers) {
				if (station.stationType === type) {
					return station;
				}
			}
		},
	};
}

export type Stations = ReturnType<typeof stationFinder>;
