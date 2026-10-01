import { createMarquee, updateMarquee } from "../ui/marquee";
import type { GameContext } from "../shared/context";

export function createMarqueeSystem({ app, layers }: GameContext) {
	const view = createMarquee();
	layers.ui.addChild(view.root);

	const system = (dt: number) => {
		updateMarquee(view, app.screen, dt);
	};

	return Object.assign(system, {
		dispose() {
			view.root.destroy();
		},
	});
}
