import {
	BADGE_OFFSET_Y,
	badgeSignature,
	drawCookBadge,
} from "../ui/cook-badge";
import type { GameContext } from "../shared/context";

export function createCookBadgeSystem({ world }: GameContext) {
	const cooks = world.with("position", "order", "carry", "control", "badge");
	const configs = world.with("config");

	return () => {
		const showNames = configs.first?.config.namesVisible ?? true;

		for (const cook of cooks) {
			const { root, signature } = cook.badge;
			root.position.set(cook.position.x, cook.position.y - BADGE_OFFSET_Y);

			const order = cook.order ?? null;
			const item = cook.carry.item;
			const progress = cook.control.action?.progress ?? null;

			const next = badgeSignature(order, item, progress, showNames);

			if (next === signature) {
				continue;
			}

			cook.badge.signature = next;
			drawCookBadge(cook.badge, order, item, progress, showNames);
		}
	};
}
