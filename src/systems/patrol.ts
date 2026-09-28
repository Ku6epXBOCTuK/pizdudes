import {
	PATROL_CORNER,
	PATROL_HALF,
	PATROL_SPEED,
	PATROL_VERTICES,
} from "../constants";
import type { Vector2 } from "../core/world";
import type { GameContext } from "../shared/context";

const ARRIVE_EPSILON = 2;

export function patrolVertices(center: Vector2): Vector2[] {
	const { x, y } = center;
	const far = PATROL_HALF;
	const near = PATROL_HALF - PATROL_CORNER;

	return [
		{ x: x - near, y: y - far },
		{ x: x + near, y: y - far },
		{ x: x + far, y: y - near },
		{ x: x + far, y: y + near },
		{ x: x + near, y: y + far },
		{ x: x - near, y: y + far },
		{ x: x - far, y: y + near },
		{ x: x - far, y: y - near },
	];
}

export function createPatrolSystem({ app, world }: GameContext) {
	const agents = world.with("position", "velocity", "patrol");

	return () => {
		const center = { x: app.screen.width / 2, y: app.screen.height / 2 };
		const vertices = patrolVertices(center);

		for (const agent of agents) {
			const target = vertices[agent.patrol.nextVertex]!;
			const dx = target.x - agent.position.x;
			const dy = target.y - agent.position.y;
			const distance = Math.hypot(dx, dy);

			if (distance < ARRIVE_EPSILON) {
				agent.patrol.nextVertex =
					(agent.patrol.nextVertex + 1) % PATROL_VERTICES;
				continue;
			}

			agent.velocity.x = (dx / distance) * PATROL_SPEED;
			agent.velocity.y = (dy / distance) * PATROL_SPEED;
		}
	};
}
