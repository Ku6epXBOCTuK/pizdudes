import { rollIdleGoalMs } from "../config/control";
import { randomWanderPoint } from "../config/field";
import { WANDER_SPEED } from "../constants";
import { moveToward } from "../core/navigation";
import type { GameContext } from "../shared/context";

const WANDER_ARRIVE_DISTANCE = 24;

export function createCookWanderSystem(
	{ app, world }: GameContext,
	random: () => number = Math.random,
) {
	const cooks = world.with(
		"position",
		"velocity",
		"control",
		"target",
		"wander",
	);

	return () => {
		for (const cook of cooks) {
			const control = cook.control;

			if (control.action || cook.target) {
				continue;
			}

			const mayWander =
				control.mode === "chat" && control.idleMs >= control.idleGoalMs;

			if (!mayWander) {
				cook.velocity.x = 0;
				cook.velocity.y = 0;
				continue;
			}

			if (!cook.wander) {
				cook.wander = randomWanderPoint(app.screen, random);
			}

			const arrived = moveToward(
				cook,
				cook.wander,
				WANDER_SPEED,
				WANDER_ARRIVE_DISTANCE,
			);

			if (arrived) {
				cook.wander = null;
				control.idleMs = 0;
				control.idleGoalMs = rollIdleGoalMs(random);
			}
		}
	};
}
