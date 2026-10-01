import type { World } from "miniplex";
import type { StationType } from "../assets/stations";
import type { Entity, StationEntity } from "./world";

export function stationFinder(world: World<Entity>) {
	const stations = world.with(
		"position",
		"stationTag",
		"stationType",
		"approach",
	);

	const byTypeMap = new Map<StationType, StationEntity>();

	for (const station of stations) {
		byTypeMap.set(station.stationType, station);
	}

	const subscriptions = [
		stations.onEntityAdded.subscribe((station) => {
			byTypeMap.set(station.stationType, station);
		}),

		stations.onEntityRemoved.subscribe((station) => {
			byTypeMap.delete(station.stationType);
		}),
	];

	return {
		byType(type: StationType) {
			return byTypeMap.get(type);
		},

		dispose() {
			for (const unsubscribe of subscriptions) {
				unsubscribe();
			}
		},
	};
}

export type Stations = ReturnType<typeof stationFinder>;
