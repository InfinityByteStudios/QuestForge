import { 
  type Character, 
  type InsertCharacter,
  type Location,
  type InsertLocation,
  type Quest,
  type InsertQuest,
  type CharacterQuest,
  type InsertCharacterQuest,
  type Enemy,
  type InsertEnemy,
  type CombatSession,
  type InsertCombatSession,
  type Item,
  type InsertItem
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Character operations
  getCharacter(id: string): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: string, updates: Partial<Character>): Promise<Character>;
  
  // Location operations
  getLocation(id: string): Promise<Location | undefined>;
  getAllLocations(): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  
  // Quest operations
  getQuest(id: string): Promise<Quest | undefined>;
  getAllQuests(): Promise<Quest[]>;
  getQuestsByLocation(locationId: string): Promise<Quest[]>;
  
  // Character quest operations
  getCharacterQuests(characterId: string): Promise<CharacterQuest[]>;
  createCharacterQuest(characterQuest: InsertCharacterQuest): Promise<CharacterQuest>;
  updateCharacterQuest(id: string, updates: Partial<CharacterQuest>): Promise<CharacterQuest>;
  
  // Enemy operations
  getEnemy(id: string): Promise<Enemy | undefined>;
  getEnemiesByLocation(locationId: string): Promise<Enemy[]>;
  
  // Combat operations
  getCombatSession(characterId: string): Promise<CombatSession | undefined>;
  createCombatSession(session: InsertCombatSession): Promise<CombatSession>;
  updateCombatSession(id: string, updates: Partial<CombatSession>): Promise<CombatSession>;
  deleteCombatSession(id: string): Promise<void>;
  
  // Item operations
  getItem(id: string): Promise<Item | undefined>;
  getAllItems(): Promise<Item[]>;
}

export class MemStorage implements IStorage {
  private characters: Map<string, Character>;
  private locations: Map<string, Location>;
  private quests: Map<string, Quest>;
  private characterQuests: Map<string, CharacterQuest>;
  private enemies: Map<string, Enemy>;
  private combatSessions: Map<string, CombatSession>;
  private items: Map<string, Item>;
  private shopInventories: Map<string, string[]>; // locationId -> item ids

  constructor() {
    this.characters = new Map();
    this.locations = new Map();
    this.quests = new Map();
    this.characterQuests = new Map();
    this.enemies = new Map();
    this.combatSessions = new Map();
    this.items = new Map();
  this.shopInventories = new Map();
    
    this.initializeGameData();
  }

  private initializeGameData() {
    // Initialize locations
    const locations: Location[] = [
      {
        id: "village",
        name: "Village Center",
        description: "The bustling heart of the starting village",
        levelRecommendation: 1,
        x: 32,
        y: 32,
        icon: "🏘️",
        accessible: true
      },
      {
        id: "village_shop",
        name: "Village Shop",
        description: "A small shop selling basic gear and supplies",
        levelRecommendation: 1,
        x: 160,
        y: 40,
        icon: "🛒",
        accessible: true
      },
      {
        id: "training_grounds",
        name: "Training Grounds",
        description: "A safe area to practice combat against a dummy",
        levelRecommendation: 1,
        x: 32,
        y: 176,
        icon: "�",
        accessible: true
      },
      {
        id: "forest",
        name: "Dark Forest",
        description: "A mysterious forest filled with dangerous creatures",
        levelRecommendation: 5,
        x: 240,
        y: 200,
        icon: "🌲",
        accessible: true
      },
      {
        id: "ruins",
        name: "Ancient Ruins",
        description: "Crumbling structures hiding ancient secrets",
        levelRecommendation: 15,
        x: 400,
        y: 120,
        icon: "🏛️",
        accessible: true
      }
    ];
    
    locations.forEach(location => {
      const fullLocation: Location = {
        ...location,
        levelRecommendation: location.levelRecommendation || 1,
        accessible: location.accessible !== false
      };
      this.locations.set(fullLocation.id, fullLocation);
    });

    // Initialize items
    const items: Item[] = [
      {
        id: "wooden_sword",
        name: "Wooden Sword",
        type: "weapon",
        icon: "🗡️",
        description: "A basic wooden practice sword",
        stats: { attack: 2 },
        consumable: false,
        sellValue: 10
      },
      {
        id: "sword",
        name: "Iron Sword",
        type: "weapon",
        icon: "⚔️",
        description: "A sturdy iron sword",
        stats: { attack: 5 },
        consumable: false,
        sellValue: 50
      },
      {
        id: "steel_sword",
        name: "Steel Sword",
        type: "weapon",
        icon: "⚔️",
        description: "A sharp steel sword",
        stats: { attack: 9 },
        consumable: false,
        sellValue: 120
      },
      {
        id: "shield",
        name: "Wooden Shield",
        type: "armor",
        icon: "🛡️",
        description: "A basic wooden shield",
        stats: { defense: 3 },
        consumable: false,
        sellValue: 30
      },
      {
        id: "iron_shield",
        name: "Iron Shield",
        type: "armor",
        icon: "🛡️",
        description: "A reinforced iron shield",
        stats: { defense: 5 },
        consumable: false,
        sellValue: 70
      },
      {
        id: "steel_shield",
        name: "Steel Shield",
        type: "armor",
        icon: "🛡️",
        description: "A durable steel shield",
        stats: { defense: 9 },
        consumable: false,
        sellValue: 140
      },
      {
        id: "health_potion",
        name: "Health Potion",
        type: "consumable",
        icon: "💊",
        description: "Restores 30 HP",
        stats: { health: 30 },
        consumable: true,
        sellValue: 10
      },
      {
        id: "magic_scroll",
        name: "Magic Scroll",
        type: "consumable",
        icon: "🔮",
        description: "Casts a magic spell",
        stats: { magic: 15 },
        consumable: true,
        sellValue: 25
      },
      {
        id: "herb",
        name: "Healing Herb",
        type: "consumable",
        icon: "🌿",
        description: "A natural healing herb",
        stats: { health: 10 },
        consumable: true,
        sellValue: 5
      }
    ];
    
  items.forEach(item => this.items.set(item.id, item));

  // Define per-location shop inventories (basic example)
  this.shopInventories.set('village_shop', ['wooden_sword', 'sword', 'shield', 'health_potion']);
  this.shopInventories.set('forest', ['sword', 'steel_sword', 'iron_shield', 'health_potion', 'herb']);
  this.shopInventories.set('ruins', ['steel_sword', 'steel_shield', 'magic_scroll', 'health_potion']);

    // Initialize enemies
    const enemies: Enemy[] = [
      {
        id: "training_dummy",
        name: "Training Dummy",
        health: 30,
        attack: 3,
        defense: 0,
        experience: 10,
        gold: 0,
        icon: "🪵",
        locationId: "training_grounds"
      },
      {
        id: "goblin",
        name: "Forest Goblin",
        health: 45,
        attack: 8,
        defense: 2,
        experience: 25,
        gold: 10,
        icon: "👹",
        locationId: "forest"
      },
      {
        id: "skeleton",
        name: "Ancient Skeleton",
        health: 60,
        attack: 12,
        defense: 5,
        experience: 50,
        gold: 25,
        icon: "💀",
        locationId: "ruins"
      }
    ];
    
    enemies.forEach(enemy => this.enemies.set(enemy.id, enemy));

    // Initialize quests
    const quests: Quest[] = [
      {
        id: "goblin_problem",
        title: "Goblin Problem",
        description: "The village elder asks you to defeat forest goblins",
        type: "kill",
        target: "goblin",
        targetAmount: 5,
        reward: { experience: 200, gold: 50 },
        locationId: "village"
      },
      {
        id: "herb_gathering",
        title: "Herb Gathering",
        description: "Collect healing herbs for the village healer",
        type: "collect",
        target: "herb",
        targetAmount: 10,
        reward: { experience: 100, items: [{ id: "magic_scroll", quantity: 1 }] },
        locationId: "village"
      }
    ];
    
    quests.forEach(quest => this.quests.set(quest.id, quest));
  }

  // Character operations
  async getCharacter(id: string): Promise<Character | undefined> {
    return this.characters.get(id);
  }

  async createCharacter(insertCharacter: InsertCharacter): Promise<Character> {
    const id = randomUUID();
    const character: Character = { 
      ...insertCharacter, 
      id,
      level: insertCharacter.level || 1,
      experience: insertCharacter.experience || 0,
      health: insertCharacter.health || 100,
      maxHealth: insertCharacter.maxHealth || 100,
      strength: insertCharacter.strength || 10,
      magic: insertCharacter.magic || 10,
      agility: insertCharacter.agility || 10,
      defense: insertCharacter.defense || 10,
      gold: insertCharacter.gold || 50,
        unspentPoints: insertCharacter as any && (insertCharacter as any).unspentPoints ? (insertCharacter as any).unspentPoints : 0,
      currentLocationId: insertCharacter.currentLocationId || 'village',
      equipment: (insertCharacter.equipment as any) || { weapon: 'wooden_sword', armor: 'shield' },
      inventory: [
        { id: "wooden_sword", name: "Wooden Sword", type: "weapon", quantity: 1, icon: "🗡️" },
        { id: "shield", name: "Wooden Shield", type: "armor", quantity: 1, icon: "🛡️" },
        { id: "health_potion", name: "Health Potion", type: "consumable", quantity: 3, icon: "💊" }
      ]
    };
    this.characters.set(id, character);
    return character;
  }

  async updateCharacter(id: string, updates: Partial<Character>): Promise<Character> {
    const character = this.characters.get(id);
    if (!character) throw new Error("Character not found");
    
    const updated = { ...character, ...updates };
    this.characters.set(id, updated);
    return updated;
  }

  // Location operations
  async getLocation(id: string): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async getAllLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const fullLocation: Location = {
      ...location,
      levelRecommendation: location.levelRecommendation || 1,
      accessible: location.accessible !== false
    };
    this.locations.set(location.id, fullLocation);
    return fullLocation;
  }

  // Quest operations
  async getQuest(id: string): Promise<Quest | undefined> {
    return this.quests.get(id);
  }

  async getAllQuests(): Promise<Quest[]> {
    return Array.from(this.quests.values());
  }

  async getQuestsByLocation(locationId: string): Promise<Quest[]> {
    return Array.from(this.quests.values()).filter(quest => quest.locationId === locationId);
  }

  // Character quest operations
  async getCharacterQuests(characterId: string): Promise<CharacterQuest[]> {
    return Array.from(this.characterQuests.values()).filter(
      quest => quest.characterId === characterId
    );
  }

  async createCharacterQuest(characterQuest: InsertCharacterQuest): Promise<CharacterQuest> {
    const id = randomUUID();
    const quest: CharacterQuest = { 
      ...characterQuest, 
      id,
      progress: characterQuest.progress || 0,
      completed: characterQuest.completed || false,
      active: characterQuest.active !== false
    };
    this.characterQuests.set(id, quest);
    return quest;
  }

  async updateCharacterQuest(id: string, updates: Partial<CharacterQuest>): Promise<CharacterQuest> {
    const quest = this.characterQuests.get(id);
    if (!quest) throw new Error("Character quest not found");
    
    const updated = { ...quest, ...updates };
    this.characterQuests.set(id, updated);
    return updated;
  }

  // Enemy operations
  async getEnemy(id: string): Promise<Enemy | undefined> {
    return this.enemies.get(id);
  }

  async getEnemiesByLocation(locationId: string): Promise<Enemy[]> {
    return Array.from(this.enemies.values()).filter(enemy => enemy.locationId === locationId);
  }

  // Combat operations
  async getCombatSession(characterId: string): Promise<CombatSession | undefined> {
    return Array.from(this.combatSessions.values()).find(
      session => session.characterId === characterId && session.active
    );
  }

  async createCombatSession(session: InsertCombatSession): Promise<CombatSession> {
    const id = randomUUID();
    const combat: CombatSession = { 
      ...session, 
      id,
      turn: session.turn || 'player',
      active: session.active !== false,
  nextEnemyAttackAt: (Date.now() + 2500),
      lastEnemyAttackAt: 0,
      lastEnemyAttackDamage: 0
    };
    this.combatSessions.set(id, combat);
    return combat;
  }

  async updateCombatSession(id: string, updates: Partial<CombatSession>): Promise<CombatSession> {
    const session = this.combatSessions.get(id);
    if (!session) throw new Error("Combat session not found");
    
    const updated = { ...session, ...updates };
    this.combatSessions.set(id, updated);
    return updated;
  }

  async deleteCombatSession(id: string): Promise<void> {
    this.combatSessions.delete(id);
  }

  // Item operations
  async getItem(id: string): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async getAllItems(): Promise<Item[]> {
    return Array.from(this.items.values());
  }

  getShopItemsForLocation(locationId: string): Item[] {
    const ids = this.shopInventories.get(locationId) || [];
    return ids.map(id => this.items.get(id)).filter(Boolean) as Item[];
  }
}

export const storage = new MemStorage();
