import type { With } from "miniplex";
import { AI_ARRIVE_DISTANCE, AGENT_SPEED } from "../constants";
import type { Entity, Vector2 } from "./world";

export type Positioned = With<Entity, "position" | "target">;

export type Mover = With<Entity, "position" | "velocity">;

export function hasArrived(agent: Positioned): boolean {
	if (!agent.target) {
		return false;
	}

	return distance(agent.target.position, agent.position) <= AI_ARRIVE_DISTANCE;
}

export function moveToward(agent: Mover, point: Vector2) {
	const dx = point.x - agent.position.x;
	const dy = point.y - agent.position.y;
	const dist = Math.sqrt(dx * dx + dy * dy);

	if (dist <= AI_ARRIVE_DISTANCE) {
		agent.velocity.x = 0;
		agent.velocity.y = 0;
		return;
	}

	agent.velocity.x = (dx / dist) * AGENT_SPEED;
	agent.velocity.y = (dy / dist) * AGENT_SPEED;
}

export function distance(a: Vector2, b: Vector2): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return Math.sqrt(dx * dx + dy * dy);
}
