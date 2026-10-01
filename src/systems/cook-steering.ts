import { moveToward } from "../core/navigation";
import type { GameContext } from "../shared/context";

export function createCookSteeringSystem({ world }: GameContext) {
	const cooks = world.with("position", "velocity", "control", "target");

	return () => {
		for (const cook of cooks) {
			if (cook.control.action) {
				cook.velocity.x = 0;
				cook.velocity.y = 0;
				continue;
			}

			if (cook.target) {
				moveToward(cook, cook.target.approach);
			}
		}
	};
}
