import { AnimatedSprite } from "pixi.js";
import { cookDirectionFromVelocity, cookWalkFrames } from "../assets/cook";
import type { GameContext } from "../shared/context";

export function createAnimationSystem({ app, assets, world }: GameContext) {
	const animated = world.with("view", "velocity", "animated");
	const walkFrames = cookWalkFrames(assets.cookSheet);

	return () => {
		for (const entity of animated) {
			const view = entity.view;
			if (!(view instanceof AnimatedSprite)) continue;

			const isMoving = entity.velocity.x !== 0 || entity.velocity.y !== 0;

			if (!isMoving) {
				view.stop();
				continue;
			}

			const frames = walkFrames[cookDirectionFromVelocity(entity.velocity)];
			if (view.textures !== frames) {
				view.textures = frames;
			}

			view.play();
			view.update(app.ticker);
		}
	};
}
