// Shared leveling utilities
// New piecewise progression (cumulative XP):
// Levels 1 -> 2..5 : +50 XP per level (i.e. 1->2,2->3,3->4,4->5)
// Level 5 -> 6 and onward shifts to larger brackets below
// Levels 5 -> 6..25 : +100 XP per level (i.e. starting at level 5 heading to 6)
// Levels 26 -> 50 : +250 XP per level
// Levels 51+      : +500 XP per level (capable of extending indefinitely)

// We generate cumulative XP on demand using piecewise increments.

function xpIncrementForLevelUp(fromLevel: number): number {
  // Returns the XP required to go from `fromLevel` to `fromLevel + 1`.
  // Design: levels 1-4 need only 5 XP each (fast onboarding). Beginning with the jump FROM 5 TO 6
  // we enter the 100 XP bracket up through level 25.
  if (fromLevel < 1) return 0;
  if (fromLevel < 5) return 50;        // 1->2, 2->3, 3->4, 4->5
  if (fromLevel <= 25) return 100;     // 5->6 (first large jump) through 25->26
  if (fromLevel <= 50) return 250;     // 26->27 .. 50->51
  return 500;                          // 51+
}

export function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += xpIncrementForLevelUp(l);
  }
  return total;
}

export function xpNeededForNext(level: number): number {
  const currentCum = cumulativeXpForLevel(level);
  const nextCum = cumulativeXpForLevel(level + 1);
  return nextCum - currentCum;
}

export function levelFromExperience(experience: number): number {
  let level = 1;
  while (cumulativeXpForLevel(level + 1) <= experience) {
    level++;
    if (level > 200) break; // safety guard
  }
  return level;
}

export function applyLevelUps(currentLevel: number, experience: number): { level: number; statPointsGained: number } {
  const newLevel = levelFromExperience(experience);
  if (newLevel <= currentLevel) return { level: currentLevel, statPointsGained: 0 };
  // Example: 3 stat points per level gained
  const levelsGained = newLevel - currentLevel;
  const statPointsGained = levelsGained * 3;
  return { level: newLevel, statPointsGained };
}
