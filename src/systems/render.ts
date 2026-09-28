import type { GameContext } from "../shared/context";

export function createRenderSystem(ctx: GameContext) {
	const viewLayer = ctx.layers.main;
	const subscriptions = [
		ctx.world.onEntityAdded.subscribe((entity) => {
			if (entity.view && !entity.view.parent) {
				viewLayer.addChild(entity.view);
			}
		}),

		ctx.world.onEntityRemoved.subscribe((entity) => {
			entity.view?.destroy();
		}),
	];

	const withView = ctx.world.with("position", "view");

	const system = () => {
		for (const entity of withView) {
			entity.view.position.set(entity.position.x, entity.position.y);
		}
	};

	return Object.assign(system, {
		dispose() {
			for (const unsubscribe of subscriptions) {
				unsubscribe();
			}
		},
	});
}
