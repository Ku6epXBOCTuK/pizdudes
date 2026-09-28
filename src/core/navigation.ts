import type { With } from "miniplex";
import { AI_ARRIVE_DISTANCE, AGENT_SPEED } from "../constants";
import type { Entity, Vector2 } from "./world";

export type Positioned = With<Entity, "position" | "target">;

export type Mover = With<Entity, "position" | "velocity">;

export function hasArrived(agent: Positioned): boolean {
	if (!agent.target) {
		return false;
	}

	return (
		Math.hypot(
			agent.target.position.x - agent.position.x,
			agent.target.position.y - agent.position.y,
		) <= AI_ARRIVE_DISTANCE
	);
}

export function moveToward(agent: Mover, point: Vector2) {
	const dx = point.x - agent.position.x;
	const dy = point.y - agent.position.y;
	const distance = Math.hypot(dx, dy);

	if (distance <= AI_ARRIVE_DISTANCE) {
		agent.velocity.x = 0;
		agent.velocity.y = 0;
		return;
	}

	agent.velocity.x = (dx / distance) * AGENT_SPEED;
	agent.velocity.y = (dy / distance) * AGENT_SPEED;
}
