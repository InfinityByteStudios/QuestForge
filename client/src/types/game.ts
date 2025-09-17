export interface GameState {
  characterId?: string;
  currentView: 'explore' | 'combat' | 'quests' | 'inventory';
  showCharacterCreation: boolean;
  showInventory: boolean;
  actionLog: ActionLogEntry[];
}

export interface ActionLogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'combat' | 'success' | 'error';
}

export interface CombatResult {
  message: string;
  victory?: boolean;
  defeated?: boolean;
  fled?: boolean;
  enemyDamage?: number;
  enemyMessage?: string;
}
