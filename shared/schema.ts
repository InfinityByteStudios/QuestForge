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
  type: string;
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
  turn: string;
  active: boolean;
  nextEnemyAttackAt?: number;
  lastEnemyAttackAt?: number;
  lastEnemyAttackDamage?: number;
}

export interface Item {
  id: string;
  name: string;
  type: string;
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

// Insert types
export type InsertCharacter = Omit<Character, 'id'>;
export type InsertLocation = Location;
export type InsertQuest = Quest;
export type InsertCharacterQuest = Omit<CharacterQuest, 'id'>;
export type InsertEnemy = Enemy;
export type InsertCombatSession = Omit<CombatSession, 'id'>;
export type InsertItem = Item;

// Validation schemas
export const insertCharacterSchema = z.object({
  name: z.string(),
  class: z.string(),
  level: z.number().optional(),
  experience: z.number().optional(),
  health: z.number().optional(),
  maxHealth: z.number().optional(),
  strength: z.number().optional(),
  magic: z.number().optional(),
  agility: z.number().optional(),
  defense: z.number().optional(),
  gold: z.number().optional(),
  unspentPoints: z.number().optional(),
  currentLocationId: z.string().optional(),
  equipment: z.object({
    weapon: z.string().optional(),
    armor: z.string().optional(),
    helmet: z.string().optional(),
    boots: z.string().optional(),
    accessory: z.string().optional(),
  }).optional(),
  inventory: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    quantity: z.number(),
    icon: z.string(),
  })).optional(),
});

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