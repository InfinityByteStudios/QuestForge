import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Character } from '@shared/schema';
import { cumulativeXpForLevel, xpNeededForNext, levelFromExperience } from '@shared/leveling';
import { useGame } from '@/contexts/GameContext';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';

export function CharacterStats() {
  const { state, addToActionLog } = useGame();
  const queryClient = useQueryClient();
  
  const { data: character, isLoading } = useQuery<Character>({
    queryKey: ['/api/characters', state.characterId],
    enabled: !!state.characterId
  });
  
  const grantLevelMutation = useMutation({
    mutationFn: async () => {
      if (!character) return;
      const response = await apiRequest('PATCH', `/api/characters/${character.id}`, {
        level: 5,
        experience: 5000
      });
      return response.json();
    },
    onSuccess: (updatedCharacter) => {
      if (updatedCharacter) {
        queryClient.setQueryData(['/api/characters', character?.id], updatedCharacter);
        addToActionLog('Granted Level 5 for testing!', 'success');
      }
    }
  });

  if (isLoading || !character) {
    return (
      <div className="pixel-border bg-card p-3">
        <div className="text-xs">Loading character...</div>
      </div>
    );
  }

  const healthPercent = (character.health / character.maxHealth) * 100;
  const derivedLevel = levelFromExperience(character.experience);
  // Always trust derived level from XP for progression math
  const displayLevel = derivedLevel;
  const currentLevelBase = cumulativeXpForLevel(displayLevel);
  const nextLevelRequirement = cumulativeXpForLevel(displayLevel + 1);
  let expInLevel = character.experience - currentLevelBase;
  const expForNextLevel = nextLevelRequirement - currentLevelBase;
  if (expInLevel < 0) {
    // Stored level may be ahead of XP; clamp for UI clarity
    expInLevel = 0;
  }
  const expPercent = Math.min(100, (expInLevel / expForNextLevel) * 100);
  const unspentPoints = (character as any).unspentPoints || 0;

  const allocateStatMutation = useMutation({
    mutationFn: async (stat: 'strength' | 'magic' | 'agility' | 'defense') => {
      if (unspentPoints <= 0) return;
      const response = await apiRequest('PATCH', `/api/characters/${character.id}`, {
        [stat]: (character as any)[stat] + 1,
        unspentPoints: unspentPoints - 1
      });
      return response.json();
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['/api/characters', character.id], updated);
      addToActionLog('Allocated 1 stat point.', 'success');
    }
  });

  return (
    <div className="pixel-border bg-card p-3">
      <h2 className="text-accent text-xs mb-3">CHARACTER</h2>
      <div className="space-y-2">
        {/* Character Avatar */}
        <div className="pixel-border bg-background w-16 h-16 mx-auto mb-3 flex items-center justify-center">
          <span className="text-accent text-xs">HERO</span>
        </div>
        
        <div className="text-center mb-3">
          <div className="text-xs text-accent" data-testid="text-character-name">{character.name}</div>
          <div className="text-xs">Level {displayLevel} {character.class}{displayLevel !== character.level && <span className="text-warning ml-1">(sync {character.level})</span>}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Total XP: {character.experience}</div>
        </div>
        
        {/* Health Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>HP</span>
            <span data-testid="text-health">{character.health}/{character.maxHealth}</span>
          </div>
          <div className="pixel-border bg-background h-3">
            <div 
              className="health-bar h-full" 
              style={{ '--health-percent': `${healthPercent}%` } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Experience Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>EXP</span>
            <span data-testid="text-experience">{expInLevel}/{expForNextLevel}</span>
          </div>
          <div className="pixel-border bg-background h-3">
            <div 
              className="exp-bar h-full" 
              style={{ '--exp-percent': `${expPercent}%` } as React.CSSProperties}
            />
          </div>
          {unspentPoints > 0 && (
            <div className="text-[10px] text-accent mt-1 flex items-center justify-between" data-testid="text-unspent-points">
              <span>Unspent Stat Points: {unspentPoints}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs mt-3">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span>STR</span>
              <div className="flex items-center gap-1">
                <span data-testid="text-strength">{character.strength}</span>
                <button
                  type="button"
                  className="pixel-border px-1 text-[10px] disabled:opacity-30"
                  disabled={unspentPoints <= 0 || allocateStatMutation.isPending}
                  onClick={() => allocateStatMutation.mutate('strength')}
                >+
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>MAG</span>
              <div className="flex items-center gap-1">
                <span data-testid="text-magic">{character.magic}</span>
                <button
                  type="button"
                  className="pixel-border px-1 text-[10px] disabled:opacity-30"
                  disabled={unspentPoints <= 0 || allocateStatMutation.isPending}
                  onClick={() => allocateStatMutation.mutate('magic')}
                >+
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span>AGI</span>
              <div className="flex items-center gap-1">
                <span data-testid="text-agility">{character.agility}</span>
                <button
                  type="button"
                  className="pixel-border px-1 text-[10px] disabled:opacity-30"
                  disabled={unspentPoints <= 0 || allocateStatMutation.isPending}
                  onClick={() => allocateStatMutation.mutate('agility')}
                >+
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>DEF</span>
              <div className="flex items-center gap-1">
                <span data-testid="text-defense">{character.defense}</span>
                <button
                  type="button"
                  className="pixel-border px-1 text-[10px] disabled:opacity-30"
                  disabled={unspentPoints <= 0 || allocateStatMutation.isPending}
                  onClick={() => allocateStatMutation.mutate('defense')}
                >+
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Gold */}
        <div className="flex justify-between text-xs mt-2 pt-2 border-t border-border">
          <span>GOLD</span>
          <span className="text-accent" data-testid="text-gold">{character.gold}</span>
        </div>

        {/* Equipment */}
        <div className="mt-2 pt-2 border-t border-border text-xs">
          <div className="font-bold mb-1 text-accent">EQUIPMENT</div>
          <div className="flex justify-between">
            <span>Weapon</span>
            <span>{(character.equipment as any)?.weapon || 'None'}</span>
          </div>
          <div className="flex justify-between">
            <span>Armor</span>
            <span>{(character.equipment as any)?.armor || 'None'}</span>
          </div>
        </div>
        
        {/* Debug Controls */}
        {import.meta.env.MODE !== 'production' && new URLSearchParams(window.location.search).has('debug') && (
          <div className="mt-3 pt-2 border-t border-border">
            <div className="text-xs text-accent mb-2">DEBUG CONTROLS</div>
            <Button
              className="pixel-button pixel-border bg-ui text-foreground w-full py-1 text-xs"
              onClick={() => grantLevelMutation.mutate()}
              disabled={grantLevelMutation.isPending}
              data-testid="button-grant-level"
            >
              {grantLevelMutation.isPending ? 'GRANTING...' : 'GRANT LEVEL 5'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
