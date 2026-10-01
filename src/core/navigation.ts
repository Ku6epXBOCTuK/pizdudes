import type { With } from "miniplex";
import { AI_ARRIVE_DISTANCE, AGENT_SPEED } from "../constants";
import type { Entity, Vector2 } from "./world";

export type Positioned = With<Entity, "position" | "target">;

export type Mover = With<Entity, "position" | "velocity">;

export function hasArrived(agent: Positioned): boolean {
	if (!agent.target) {
		return false;
	}

	return distance(agent.target.approach, agent.position) <= AI_ARRIVE_DISTANCE;
}

export function moveToward(
	agent: Mover,
	point: Vector2,
	speed: number = AGENT_SPEED,
	arriveDistance: number = AI_ARRIVE_DISTANCE,
): boolean {
	const dx = point.x - agent.position.x;
	const dy = point.y - agent.position.y;
	const dist = Math.sqrt(dx * dx + dy * dy);

	if (dist <= arriveDistance) {
		agent.velocity.x = 0;
		agent.velocity.y = 0;
		return true;
	}

	agent.velocity.x = (dx / dist) * speed;
	agent.velocity.y = (dy / dist) * speed;
	return false;
}

export function distance(a: Vector2, b: Vector2): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return Math.sqrt(dx * dx + dy * dy);
}
