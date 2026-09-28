import { World } from "miniplex";

export type Entity = {
	name?: string;
};

export const world = new World<Entity>();

export function spawnEntity(name: string): Entity {
	return world.add({ name });
}
