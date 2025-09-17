import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertCharacterSchema,
  moveCharacterSchema,
  combatActionSchema,
  useItemSchema,
  equipItemSchema
} from "@shared/schema";
import { applyLevelUps, levelFromExperience } from "@shared/leveling";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Character routes
  app.post("/api/characters", async (req, res) => {
    try {
      const characterData = insertCharacterSchema.parse(req.body);
      const character = await storage.createCharacter(characterData);
      res.json(character);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/characters/:id", async (req, res) => {
    try {
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }
      const derivedLevel = levelFromExperience(character.experience);
      if (derivedLevel !== character.level) {
        const updated = await storage.updateCharacter(character.id, { level: derivedLevel });
        return res.json(updated);
      }
      res.json(character);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/characters/:id", async (req, res) => {
    try {
      const character = await storage.updateCharacter(req.params.id, req.body);
      res.json(character);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Location routes
  app.get("/api/locations", async (req, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/locations/:id", async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Character movement
  app.post("/api/characters/:id/move", async (req, res) => {
    try {
      const { locationId } = moveCharacterSchema.parse(req.body);
      const character = await storage.updateCharacter(req.params.id, { 
        currentLocationId: locationId 
      });

      res.json(character);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Quest routes
  app.get("/api/quests", async (req, res) => {
    try {
      const quests = await storage.getAllQuests();
      res.json(quests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/characters/:id/quests", async (req, res) => {
    try {
      const characterQuests = await storage.getCharacterQuests(req.params.id);
      res.json(characterQuests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/characters/:id/quests", async (req, res) => {
    try {
      const characterQuest = await storage.createCharacterQuest({
        characterId: req.params.id,
        questId: req.body.questId
      });
      res.json(characterQuest);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Combat routes
  app.get("/api/characters/:id/combat", async (req, res) => {
    try {
      const combat = await storage.getCombatSession(req.params.id);
      if (!combat) return res.json(null);

      const enemy = await storage.getEnemy(combat.enemyId);
      const character = await storage.getCharacter(req.params.id);
      if (!enemy || !character) return res.json(combat); // leave as-is

      // Skip auto-attacks for training dummy
      if (enemy.id !== 'training_dummy') {
        const now = Date.now();
        if (combat.nextEnemyAttackAt && now >= combat.nextEnemyAttackAt && combat.active) {
          // Perform an auto-attack using similar (but slightly reduced) formula
          const characterLevelFactor = Math.floor(character.level * 0.25);
          const randComponent = Math.floor(Math.random() * Math.max(4, Math.ceil(enemy.attack * 0.5)));
          const raw = (enemy.attack * 0.75) + randComponent + characterLevelFactor;
          const defenseMitigation = Math.floor(character.defense * 0.35);
          const computed = Math.max(1, Math.floor(raw - defenseMitigation));
          const newHealth = Math.max(0, character.health - computed);
          await storage.updateCharacter(character.id, { health: newHealth });

          // Schedule next attack between 2.5s - 4s
          const nextIn = 2500 + Math.floor(Math.random() * 1500);
          await storage.updateCombatSession(combat.id, {
            lastEnemyAttackAt: now,
            lastEnemyAttackDamage: computed,
            nextEnemyAttackAt: now + nextIn
          });

          // If character dies, end combat
          if (newHealth <= 0) {
            await storage.deleteCombatSession(combat.id);
            return res.json({
              message: "You have been defeated!",
              defeated: true
            });
          }
        }
      }

      const updated = await storage.getCombatSession(req.params.id);
      res.json(updated || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/characters/:id/combat/start", async (req, res) => {
    try {
      const { enemyId } = req.body;
      const enemy = await storage.getEnemy(enemyId);
      if (!enemy) {
        return res.status(404).json({ message: "Enemy not found" });
      }
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      // Dynamic scaling for training dummy: base 30 + (level-1)*10, capped modestly
      let startingEnemyHealth = enemy.health;
      if (enemy.id === 'training_dummy') {
        startingEnemyHealth = 30 + (character.level - 1) * 10;
        startingEnemyHealth = Math.min(startingEnemyHealth, 30 + 10 * 20); // soft cap at level 21 scaling
      }

      const combat = await storage.createCombatSession({
        characterId: req.params.id,
        enemyId,
        enemyHealth: startingEnemyHealth
      });
      res.json(combat);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/characters/:id/combat/action", async (req, res) => {
    try {
      const { action } = combatActionSchema.parse(req.body);
      const combat = await storage.getCombatSession(req.params.id);
      
      if (!combat) {
        return res.status(404).json({ message: "No active combat session" });
      }

      const character = await storage.getCharacter(req.params.id);
      const enemy = await storage.getEnemy(combat.enemyId);
      
      if (!character || !enemy) {
        return res.status(404).json({ message: "Character or enemy not found" });
      }

      let damage = 0;
      let message = "";

      // Helper to derive equipment bonuses
      const allItems = await storage.getAllItems();
      const weaponId = (character.equipment as any)?.weapon;
      const armorId = (character.equipment as any)?.armor;
      const weaponItem = allItems.find(i => i.id === weaponId);
      const armorItem = allItems.find(i => i.id === armorId);
      const weaponAttack = weaponItem?.stats?.attack || 0;
      const armorDefense = armorItem?.stats?.defense || 0;

      switch (action) {
        case "attack":
          damage = Math.max(1, character.strength + weaponAttack + Math.floor(Math.random() * 10) - enemy.defense);
          message = `You deal ${damage} damage!`;
          break;
        case "defend":
          damage = 0;
          message = "You defend and reduce incoming damage!";
          break;
        case "magic":
          damage = Math.max(1, character.magic + Math.floor(Math.random() * 15) - enemy.defense);
          message = `Your magic deals ${damage} damage!`;
          break;
        case "flee":
          await storage.deleteCombatSession(combat.id);
          return res.json({ message: "You fled from combat!", fled: true });
      }

      const newEnemyHealth = Math.max(0, combat.enemyHealth - damage);
      
      if (newEnemyHealth <= 0) {
        // Enemy defeated
        await storage.deleteCombatSession(combat.id);
        const newExp = character.experience + enemy.experience;
        let newGold = character.gold + enemy.gold;

        // Determine level ups & stat points reward
        const { level: newLevel, statPointsGained } = applyLevelUps(character.level, newExp);
        const existingUnspent = (character as any).unspentPoints || 0;

        // If level up occurred: restore health to max and give a small gold bonus (e.g., 5 per level gained) and optionally increase max health slightly (e.g., +5 per level gained)
        const levelsGained = newLevel - character.level;
        let newMaxHealth = character.maxHealth;
        let newHealth = character.health;
        const MAX_HEALTH = 250;
        if (levelsGained > 0) {
          const gainedMax = 5 * levelsGained;
          newMaxHealth = Math.min(MAX_HEALTH, character.maxHealth + gainedMax);
          // Full heal only if newLevel <= 5; otherwise keep current health but add the gained max (so effectively +gainedMax HP, not exceeding new max)
          if (newLevel <= 5) {
            newHealth = newMaxHealth; // early game generosity
          } else {
            // Add only the extra max increase; don't heal existing missing portion
            const tentative = character.health + gainedMax;
            newHealth = Math.min(tentative, newMaxHealth);
          }
          newGold += 5 * levelsGained; // bonus gold for leveling
        }
        // Clamp in case of external modifications
        newMaxHealth = Math.min(newMaxHealth, MAX_HEALTH);
        newHealth = Math.min(newHealth, newMaxHealth);

        // Quest kill progress & completion handling
        // For simplicity: iterate character quests in memory (only kill type implemented here)
        let extraQuestGold = 0;
        let extraQuestExp = 0;
        const gainedItems: { id: string; quantity: number }[] = [];
        const characterQuests = await storage.getCharacterQuests(character.id).catch(() => []);
        for (const cq of characterQuests) {
          // Need quest data; currently only have questId reference
          // We'll pull from storage quests map indirectly by calling getQuest via storage (not exposed; using workaround not available) -> skipping unless quest target matches enemy.id.
          // Since storage lacks direct API for single quest retrieval in routes (it does: getQuest), we import it above.
        }
        // NOTE: Minimal quest reward system due to limited existing quest assignment flow: detect quests whose target equals enemy.id.
        // To avoid multiple storage calls per quest, we'll fetch all quests once.
        try {
          const allQuests = await storage.getAllQuests();
          for (const quest of allQuests) {
            if (quest.type === 'kill' && quest.target === enemy.id) {
              // Find character quest entry
              const cqs = await storage.getCharacterQuests(character.id);
              const match = cqs.find(q => q.questId === quest.id && !q.completed);
              if (match) {
                const newProgress = match.progress + 1;
                await storage.updateCharacterQuest(match.id, { progress: newProgress });
                if (newProgress >= quest.targetAmount) {
                  // Complete quest
                  await storage.updateCharacterQuest(match.id, { completed: true, active: false });
                  extraQuestGold += quest.reward.gold || 0;
                  extraQuestExp += quest.reward.experience || 0;
                  if (quest.reward.items) {
                    gainedItems.push(...quest.reward.items);
                  }
                }
              }
            }
          }
        } catch {}

        let finalExp = newExp + extraQuestExp;
        let finalGold = newGold + extraQuestGold;

        // Apply gained items to inventory
        let finalInventory = [...(character.inventory || [])];
        if (gainedItems.length > 0) {
          for (const gi of gainedItems) {
            const existingInv = finalInventory.find(i => i.id === gi.id);
            if (existingInv) existingInv.quantity += gi.quantity; else finalInventory.push({ id: gi.id, name: gi.id, type: 'misc', quantity: gi.quantity, icon: '🎁' });
          }
        }

        const updated = await storage.updateCharacter(req.params.id, {
          experience: newExp,
          gold: finalGold,
          level: newLevel,
          maxHealth: newMaxHealth,
          health: newHealth,
          ...(statPointsGained > 0 ? { unspentPoints: existingUnspent + statPointsGained } : {}),
          ...(gainedItems.length > 0 ? { inventory: finalInventory } : {})
        });

        const questRewardText = (extraQuestGold || extraQuestExp || gainedItems.length > 0)
          ? ` Quest Rewards: ${extraQuestExp ? `+${extraQuestExp} EXP ` : ''}${extraQuestGold ? `+${extraQuestGold} gold ` : ''}${gainedItems.length ? `+items` : ''}`
          : '';
        return res.json({ 
          message: `Enemy defeated! +${enemy.experience} EXP, +${enemy.gold} gold${levelsGained > 0 ? `, LEVEL UP! (+${statPointsGained} stat points, +${5 * levelsGained} bonus gold, +${5 * levelsGained} max HP & fully healed)` : ''}${questRewardText}`,
          victory: true,
          character: updated
        });
      }

      // Guarantee: training dummy never deals damage. Return immediately after updating enemy health.
      if (enemy.id === 'training_dummy') {
        await storage.updateCombatSession(combat.id, { enemyHealth: newEnemyHealth });
        return res.json({
          message,
          enemyDamage: 0,
          enemyMessage: `${enemy.name} harmlessly sways.`,
          lastEnemyAttackAt: combat.lastEnemyAttackAt,
          lastEnemyAttackDamage: combat.lastEnemyAttackDamage
        });
      }

      // Enemy turn (skip damage entirely for training dummy)
      let enemyDamage = 0;
      let newCharacterHealth = character.health;

      if (enemy.id !== 'training_dummy') {
        // Revised enemy damage: ensure non-dummy enemies feel threatening.
        // Formula: (enemy.attack * 0.8 + random(0..enemy.attack*0.6) + characterLevelFactor) - defenseFactor
        // Where defenseFactor is a fraction of character defense to avoid full negation.
        const characterLevelFactor = Math.floor(character.level * 0.3); // modest scaling with player level
        const randComponent = Math.floor(Math.random() * Math.max(4, Math.ceil(enemy.attack * 0.6)));
        const raw = (enemy.attack * 0.8) + randComponent + characterLevelFactor;
        const defenseMitigation = Math.floor((character.defense + armorDefense) * 0.4); // include armor bonus
        const computed = Math.max(1, Math.floor(raw - defenseMitigation));
        enemyDamage = computed;
        const appliedDamage = action === "defend" ? Math.max(1, Math.floor(enemyDamage / 2)) : enemyDamage; // defend never reduces to 0
        newCharacterHealth = Math.max(0, character.health - appliedDamage);
        await storage.updateCharacter(req.params.id, { health: newCharacterHealth });
      }

      await storage.updateCombatSession(combat.id, { enemyHealth: newEnemyHealth });

      if (newCharacterHealth <= 0) {
        await storage.deleteCombatSession(combat.id);
        return res.json({ 
          message: "You have been defeated!",
          defeated: true 
        });
      }

      res.json({ 
        message, 
        enemyDamage: enemy.id === 'training_dummy' ? 0 : (action === "defend" ? Math.floor(enemyDamage / 2) : enemyDamage),
        enemyMessage: enemy.id === 'training_dummy' ? `${enemy.name} harmlessly sways.` : `${enemy.name} attacks for ${action === "defend" ? Math.floor(enemyDamage / 2) : enemyDamage} damage!`,
        lastEnemyAttackAt: combat.lastEnemyAttackAt,
        lastEnemyAttackDamage: combat.lastEnemyAttackDamage
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Item routes
  app.get("/api/items", async (req, res) => {
    try {
      const items = await storage.getAllItems();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Shop purchase route (simple validation)
  app.post("/api/characters/:id/shop/buy", async (req, res) => {
    try {
      const { itemId } = req.body as { itemId?: string };
      if (!itemId) return res.status(400).json({ message: 'Missing itemId' });
      const character = await storage.getCharacter(req.params.id);
      if (!character) return res.status(404).json({ message: 'Character not found' });
      const item = await storage.getItem(itemId);
      if (!item) return res.status(404).json({ message: 'Item not found' });
      // Restrict purchasing to items available at current location (if shop inventory defined)
      const locationItems = storage.getShopItemsForLocation(character.currentLocationId);
      if (locationItems.length > 0 && !locationItems.find(i => i.id === item.id)) {
        return res.status(400).json({ message: 'Item not sold here' });
      }
      const cost = item.sellValue || 1;
      if (character.gold < cost) return res.status(400).json({ message: 'Not enough gold' });

      // Add or increment item in inventory
      const inventory = [...(character.inventory || [])];
      const existing = inventory.find(i => i.id === item.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        inventory.push({ id: item.id, name: item.name, type: item.type, quantity: 1, icon: item.icon });
      }
      // Auto-equip logic for upgrades (weapon or armor slot). We only compare attack for weapons, defense for armor.
      let equipment = { ...(character.equipment as any) };
      let upgradeMessage = '';
      if (item.type === 'weapon') {
        const allItems = await storage.getAllItems();
        const currentWeaponId = equipment.weapon;
        const currentWeapon = allItems.find(i => i.id === currentWeaponId);
        const currentAttack = currentWeapon?.stats?.attack || 0;
        const newAttack = item.stats?.attack || 0;
        if (!currentWeaponId || newAttack > currentAttack) {
          equipment.weapon = item.id;
          upgradeMessage = ` (auto-equipped new weapon +${newAttack} ATK)`;
        }
      } else if (item.type === 'armor') {
        const allItems = await storage.getAllItems();
        const currentArmorId = equipment.armor;
        const currentArmor = allItems.find(i => i.id === currentArmorId);
        const currentDefense = currentArmor?.stats?.defense || 0;
        const newDefense = item.stats?.defense || 0;
        if (!currentArmorId || newDefense > currentDefense) {
          equipment.armor = item.id;
          upgradeMessage = ` (auto-equipped new shield +${newDefense} DEF)`;
        }
      }

      const updated = await storage.updateCharacter(character.id, { gold: character.gold - cost, inventory, equipment });
      res.json({ character: updated, purchased: item.id, upgradeMessage });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Shop inventory for location
  app.get('/api/locations/:id/shop', async (req, res) => {
    try {
      const locationId = req.params.id;
      const items = storage.getShopItemsForLocation(locationId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/characters/:id/use-item", async (req, res) => {
    try {
      const { itemId } = useItemSchema.parse(req.body);
      const character = await storage.getCharacter(req.params.id);
      const item = await storage.getItem(itemId);
      
      if (!character || !item) {
        return res.status(404).json({ message: "Character or item not found" });
      }

      const inventoryItem = character.inventory?.find(invItem => invItem.id === itemId);
      if (!inventoryItem || inventoryItem.quantity <= 0) {
        return res.status(400).json({ message: "Item not in inventory" });
      }

      if (!item.consumable) {
        return res.status(400).json({ message: "Item is not consumable" });
      }

      // Apply item effects
      const updates: Partial<typeof character> = {};
      if (item.stats?.health) {
        updates.health = Math.min(character.maxHealth, character.health + item.stats.health);
      }

      // Remove item from inventory
      const newInventory = (character.inventory || []).map(invItem => 
        invItem.id === itemId 
          ? { ...invItem, quantity: invItem.quantity - 1 }
          : invItem
      ).filter(invItem => invItem.quantity > 0);

      updates.inventory = newInventory;

      const updatedCharacter = await storage.updateCharacter(req.params.id, updates);
      res.json({ character: updatedCharacter, message: `Used ${item.name}` });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Manual equip route (drag-drop from client)
  app.post('/api/characters/:id/equip', async (req, res) => {
    try {
      const { itemId, slot } = equipItemSchema.parse(req.body);
      const character = await storage.getCharacter(req.params.id);
      if (!character) return res.status(404).json({ message: 'Character not found' });
      const item = await storage.getItem(itemId);
      if (!item) return res.status(404).json({ message: 'Item not found' });
      // Validate slot compatibility
      const slotToType: Record<string, string> = {
        weapon: 'weapon',
        armor: 'armor',
        helmet: 'helmet',
        boots: 'boots',
        accessory: 'accessory'
      };
      const expectedType = slotToType[slot];
      if (!expectedType) return res.status(400).json({ message: 'Invalid slot' });
      if (item.type !== expectedType) {
        return res.status(400).json({ message: `Cannot equip ${item.type} into ${slot}` });
      }
      // Ensure item exists in inventory
      const invItem = character.inventory?.find(i => i.id === itemId);
      if (!invItem) return res.status(400).json({ message: 'Item not in inventory' });
      const newEquipment = { ...(character.equipment as any), [slot]: itemId };
      const updated = await storage.updateCharacter(character.id, { equipment: newEquipment });
      return res.json({ character: updated, message: `Equipped ${item.name}` });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  });

  // Enemy routes
  app.get("/api/enemies/:id", async (req, res) => {
    try {
      const enemy = await storage.getEnemy(req.params.id);
      if (!enemy) {
        return res.status(404).json({ message: "Enemy not found" });
      }
      res.json(enemy);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/locations/:locationId/enemies", async (req, res) => {
    try {
      const enemies = await storage.getEnemiesByLocation(req.params.locationId);
      res.json(enemies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Exploration: return a random list (2-7) of enemies available in current location context including training grounds enemy
  app.post('/api/characters/:id/explore', async (req, res) => {
    try {
      const character = await storage.getCharacter(req.params.id);
      if (!character) return res.status(404).json({ message: 'Character not found' });
      const now = Date.now();
      const nextAllowed = storage.getExploreCooldown(character.id);
      if (now < nextAllowed) {
        return res.status(429).json({ message: 'Explore on cooldown', retryAt: nextAllowed });
      }
      // Determine base pool: enemies in current location + always include training dummy if exists
      const locationEnemies = await storage.getEnemiesByLocation(character.currentLocationId);
      const allEnemies = await storage.getAllEnemies();
      const dummy = allEnemies.find(e => e.id === 'training_dummy');
      const poolMap: Record<string, any> = {};
      for (const e of locationEnemies) poolMap[e.id] = e;
      if (dummy) poolMap[dummy.id] = dummy;
      const pool = Object.values(poolMap);
      if (pool.length === 0) return res.json({ enemies: [], cooldownMs: 0 });
      const count = 2 + Math.floor(Math.random() * 6); // 2-7
      const shuffled = pool.sort(() => Math.random() - 0.5);
      const selection = shuffled.slice(0, Math.min(count, shuffled.length));
      // Set cooldown (e.g., 5 seconds)
      const cooldownMs = 5000;
      storage.setExploreCooldown(character.id, now + cooldownMs);
      res.json({ enemies: selection, cooldownMs, nextAllowed: now + cooldownMs });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
