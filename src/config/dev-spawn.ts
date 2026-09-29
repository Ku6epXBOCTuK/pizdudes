export interface DevSpawnConfig {
	intervalMs: number;
	wanderChance: number;
	maxBots: number;
}

export const DEV_SPAWN: DevSpawnConfig = {
	intervalMs: 10,
	wanderChance: 0.5,
	maxBots: 5000,
};
