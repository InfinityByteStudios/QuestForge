import { z } from "zod";

// TypeScript interfaces for your game entities
export interface Character {
  id: string;
  name: string;
  class: string;
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  strength: number;
  magic: number;
  agility: number;
  defense: number;
  gold: number;
  unspentPoints: number;
  currentLocationId: string;
  equipment: {
    weapon?: string;
    armor?: string;
    helmet?: string;
    boots?: string;
    accessory?: string;
  };
  inventory: Array<{
    id: string;
    name: string;
    type: string;
    quantity: number;
    icon: string;
  }>;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  levelRecommendation: number;
  x: number;
  y: number;
  icon: string;
  accessible: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: string; // "kill", "collect", "talk"
  target: string;
  targetAmount: number;
  reward: {
    experience?: number;
    gold?: number;
    items?: Array<{ id: string; quantity: number }>;
  };
  locationId?: string;
}

export interface CharacterQuest {
  id: string;
  characterId: string;
  questId: string;
  progress: number;
  completed: boolean;
  active: boolean;
}

export interface Enemy {
  id: string;
  name: string;
  health: number;
  attack: number;
  defense: number;
  experience: number;
  gold: number;
  icon: string;
  locationId: string;
}

export interface CombatSession {
  id: string;
  characterId: string;
  enemyId: string;
  enemyHealth: number;
  turn: string; // "player" | "enemy"
  active: boolean;
  nextEnemyAttackAt?: number; // epoch ms when enemy can next auto-attack
  lastEnemyAttackAt?: number;  // epoch ms of last auto-attack
  lastEnemyAttackDamage?: number; // damage dealt last auto attack
}

export interface Item {
  id: string;
  name: string;
  type: string; // "weapon", "armor", "consumable", "misc"
  icon: string;
  description: string;
  stats: {
    attack?: number;
    defense?: number;
    health?: number;
    magic?: number;
  };
  consumable: boolean;
  sellValue: number;
}

// Insert types (for creating new entities)
export type InsertCharacter = Omit<Character, 'id'>;
export type InsertLocation = Location;
export type InsertQuest = Quest;
export type InsertCharacterQuest = Omit<CharacterQuest, 'id'>;
export type InsertEnemy = Enemy;
export type InsertCombatSession = Omit<CombatSession, 'id'>;
export type InsertItem = Item;

// Game action schemas
export const moveCharacterSchema = z.object({
  locationId: z.string(),
});

export const combatActionSchema = z.object({
  action: z.enum(["attack", "defend", "magic", "flee"]),
});

export const useItemSchema = z.object({
  itemId: z.string(),
});

export const equipItemSchema = z.object({
  itemId: z.string(),
  slot: z.enum(["weapon", "armor", "helmet", "boots", "accessory"]),
});
