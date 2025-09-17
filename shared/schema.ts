import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const characters = pgTable("characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  class: text("class").notNull(),
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  health: integer("health").notNull().default(100),
  maxHealth: integer("max_health").notNull().default(100),
  strength: integer("strength").notNull().default(10),
  magic: integer("magic").notNull().default(10),
  agility: integer("agility").notNull().default(10),
  defense: integer("defense").notNull().default(10),
  gold: integer("gold").notNull().default(50),
  unspentPoints: integer("unspent_points").notNull().default(0),
  currentLocationId: text("current_location_id").notNull().default("village"),
  equipment: jsonb("equipment").$type<{
    weapon?: string;
    armor?: string;
    helmet?: string;
    boots?: string;
    accessory?: string;
  }>().default({}),
  inventory: jsonb("inventory").$type<Array<{
    id: string;
    name: string;
    type: string;
    quantity: number;
    icon: string;
  }>>().default([]),
});

export const locations = pgTable("locations", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  levelRecommendation: integer("level_recommendation").notNull().default(1),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  icon: text("icon").notNull(),
  accessible: boolean("accessible").notNull().default(true),
});

export const quests = pgTable("quests", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // "kill", "collect", "talk"
  target: text("target").notNull(),
  targetAmount: integer("target_amount").notNull().default(1),
  reward: jsonb("reward").$type<{
    experience?: number;
    gold?: number;
    items?: Array<{ id: string; quantity: number }>;
  }>().notNull(),
  locationId: text("location_id"),
});

export const characterQuests = pgTable("character_quests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: varchar("character_id").notNull(),
  questId: varchar("quest_id").notNull(),
  progress: integer("progress").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  active: boolean("active").notNull().default(true),
});

export const enemies = pgTable("enemies", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  health: integer("health").notNull(),
  attack: integer("attack").notNull(),
  defense: integer("defense").notNull(),
  experience: integer("experience").notNull(),
  gold: integer("gold").notNull(),
  icon: text("icon").notNull(),
  locationId: text("location_id").notNull(),
});

export const combatSessions = pgTable("combat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: varchar("character_id").notNull(),
  enemyId: varchar("enemy_id").notNull(),
  enemyHealth: integer("enemy_health").notNull(),
  turn: text("turn").notNull().default("player"), // "player" | "enemy"
  active: boolean("active").notNull().default(true),
  // Optional realtime combat timing fields (not yet persisted in real DB, used in-memory)
  nextEnemyAttackAt: integer("next_enemy_attack_at"), // epoch ms when enemy can next auto-attack
  lastEnemyAttackAt: integer("last_enemy_attack_at"),  // epoch ms of last auto-attack
  lastEnemyAttackDamage: integer("last_enemy_attack_damage"), // damage dealt last auto attack
});

export const items = pgTable("items", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "weapon", "armor", "consumable", "misc"
  icon: text("icon").notNull(),
  description: text("description").notNull(),
  stats: jsonb("stats").$type<{
    attack?: number;
    defense?: number;
    health?: number;
    magic?: number;
  }>().default({}),
  consumable: boolean("consumable").notNull().default(false),
  sellValue: integer("sell_value").notNull().default(1),
});

// Insert schemas
export const insertCharacterSchema = createInsertSchema(characters).omit({
  id: true,
});

export const insertLocationSchema = createInsertSchema(locations);
export const insertQuestSchema = createInsertSchema(quests);
export const insertCharacterQuestSchema = createInsertSchema(characterQuests).omit({
  id: true,
});
export const insertEnemySchema = createInsertSchema(enemies);
export const insertCombatSessionSchema = createInsertSchema(combatSessions).omit({
  id: true,
});
export const insertItemSchema = createInsertSchema(items);

// Types
export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Quest = typeof quests.$inferSelect;
export type InsertQuest = z.infer<typeof insertQuestSchema>;
export type CharacterQuest = typeof characterQuests.$inferSelect;
export type InsertCharacterQuest = z.infer<typeof insertCharacterQuestSchema>;
export type Enemy = typeof enemies.$inferSelect;
export type InsertEnemy = z.infer<typeof insertEnemySchema>;
export type CombatSession = typeof combatSessions.$inferSelect;
export type InsertCombatSession = z.infer<typeof insertCombatSessionSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

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
