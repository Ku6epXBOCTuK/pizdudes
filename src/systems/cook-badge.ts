import { drawCookBadge, BADGE_OFFSET_Y } from "../ui/cook-badge";
import type { GameContext } from "../shared/context";

export function createCookBadgeSystem({ world }: GameContext) {
	const cooks = world.with("position", "order", "carry", "badge");

	return () => {
		for (const cook of cooks) {
			const { root, signature } = cook.badge;
			root.position.set(cook.position.x, cook.position.y - BADGE_OFFSET_Y);

			const order = cook.order ?? null;
			const item = cook.carry.item;
			const progress = order
				? `${order.placed.length}/${order.target.length}`
				: "none";
			const next = `${progress}|${item ?? "empty"}`;

			if (next === signature) {
				continue;
			}

			cook.badge.signature = next;
			drawCookBadge(cook.badge, order, item);
		}
	};
}
