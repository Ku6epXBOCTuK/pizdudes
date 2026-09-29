import { drawCookBadge, BADGE_OFFSET_Y } from "../ui/cook-badge";
import type { GameContext } from "../shared/context";

export function createCookBadgeSystem({ world }: GameContext) {
	const cooks = world.with("position", "order", "carry", "control", "badge");

	return () => {
		for (const cook of cooks) {
			const { root, signature } = cook.badge;
			root.position.set(cook.position.x, cook.position.y - BADGE_OFFSET_Y);

			const order = cook.order ?? null;
			const item = cook.carry.item;
			const progress = cook.control.action?.progress ?? null;
			const progressKey = progress === null ? "none" : progress.toFixed(2);
			const next = `${order ? `${order.placed.length}/${order.target.length}` : "none"}|${item ?? "empty"}|${progressKey}`;

			if (next === signature) {
				continue;
			}

			cook.badge.signature = next;
			drawCookBadge(cook.badge, order, item, progress);
		}
	};
}
