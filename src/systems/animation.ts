import { cookDirectionFromVelocity } from "../assets/cook";
import type { GameContext } from "../shared/context";

export function createAnimationSystem({ app, world }: GameContext) {
	const animated = world.with("velocity", "animation");

	return () => {
		for (const entity of animated) {
			const { sprite, frames } = entity.animation;
			const isMoving = entity.velocity.x !== 0 || entity.velocity.y !== 0;

			if (!isMoving) {
				sprite.stop();
				continue;
			}

			const direction = cookDirectionFromVelocity(entity.velocity);
			if (entity.animation.direction !== direction) {
				entity.animation.direction = direction;
				sprite.textures = frames[direction];
			}

			sprite.play();
			sprite.update(app.ticker);
		}
	};
}
