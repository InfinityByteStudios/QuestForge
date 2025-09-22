// Mock API for local development
import { Character } from '@shared/schema';

const mockCharacters = new Map<string, Character>();
const mockLocations = [
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
    icon: "⚔️",
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
    id: "dark_forest_shop",
    name: "Dark Forest Shop",
    description: "An outpost trading in forest spoils",
    levelRecommendation: 5,
    x: 280,
    y: 240,
    icon: "🛒",
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
  },
  {
    id: "ruins_shop",
    name: "Ruins Camp",
    description: "An expedition camp trading ancient relics",
    levelRecommendation: 15,
    x: 440,
    y: 160,
    icon: "🛒",
    accessible: true
  }
];

// Create a Response-like object for mocking
function createMockResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => data,
    text: async () => JSON.stringify(data)
  };
}

export const mockApi = {
  async get(url: string) {
    console.log('Mock API GET:', url);
    
    if (url.includes('/api/health')) {
      return createMockResponse({ status: 'OK', platform: 'mock' });
    }
    
    if (url.includes('/api/locations')) {
      return createMockResponse(mockLocations);
    }
    
    if (url.includes('/api/characters/')) {
      const characterId = url.split('/').pop();
      if (characterId && mockCharacters.has(characterId)) {
        return createMockResponse(mockCharacters.get(characterId));
      }
      return createMockResponse({ message: 'Character not found' }, 404);
    }
    
    return createMockResponse({ message: 'Not found' }, 404);
  },
  
  async post(url: string, data: any) {
    console.log('Mock API POST:', url, data);
    
    // Character movement
    if (url.includes('/move')) {
      const characterId = url.split('/')[3]; // /api/characters/:id/move
      if (characterId && mockCharacters.has(characterId)) {
        const character = mockCharacters.get(characterId)!;
        const updatedCharacter = { ...character, currentLocationId: data.locationId };
        mockCharacters.set(characterId, updatedCharacter);
        console.log('Character moved to:', data.locationId);
        return createMockResponse(updatedCharacter);
      }
      return createMockResponse({ message: 'Character not found' }, 404);
    }

    // Create character
    if (url.includes('/api/characters')) {
      const characterId = Math.random().toString(36).substring(2, 15);
      const character: Character = {
        id: characterId,
        name: data.name || "Hero",
        class: data.class || "Warrior", 
        level: 1,
        experience: 0,
        health: 100,
        maxHealth: 100,
        strength: 10,
        magic: 10,
        agility: 10,
        defense: 10,
        gold: 50,
        unspentPoints: 0,
        currentLocationId: 'village', // Start at village, not training_grounds
        equipment: { weapon: 'wooden_sword', armor: 'shield' },
        inventory: [
          { id: "wooden_sword", name: "Wooden Sword", type: "weapon", quantity: 1, icon: "🗡️" },
          { id: "shield", name: "Wooden Shield", type: "armor", quantity: 1, icon: "🛡️" }
        ]
      };
      
      mockCharacters.set(characterId, character);
      return createMockResponse(character);
    }
    
    return createMockResponse({ message: 'Not found' }, 404);
  },
  
  async patch(url: string, data: any) {
    console.log('Mock API PATCH:', url, data);
    
    if (url.includes('/api/characters/')) {
      const characterId = url.split('/').pop();
      if (characterId && mockCharacters.has(characterId)) {
        const character = { ...mockCharacters.get(characterId)!, ...data };
        mockCharacters.set(characterId, character);
        console.log('Updated character location to:', character.currentLocationId);
        return createMockResponse(character);
      }
      return createMockResponse({ message: 'Character not found' }, 404);
    }
    
    return createMockResponse({ message: 'Not found' }, 404);
  },

  async put(url: string, data: any) {
    console.log('Mock API PUT:', url, data);
    return this.patch(url, data); // Treat PUT same as PATCH for simplicity
  }
};