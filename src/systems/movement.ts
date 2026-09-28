import { SECOND_MS } from "../constants";
import type { BaseContext } from "../shared/context";

export function createMovementSystem(ctx: BaseContext) {
	const movable = ctx.world.with("velocity", "position");

	return (dt: number) => {
		for (const entity of movable) {
			const v = entity.velocity;
			entity.position.x += (v.x * dt) / SECOND_MS;
			entity.position.y += (v.y * dt) / SECOND_MS;
		}
	};
}
