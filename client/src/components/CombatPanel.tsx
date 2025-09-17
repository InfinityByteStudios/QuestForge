import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CombatSession, Enemy, Character } from '@shared/schema';
import { levelFromExperience, cumulativeXpForLevel } from '@shared/leveling';
import { useGame } from '@/contexts/GameContext';
import { apiRequest } from '@/lib/queryClient';
import { CombatResult } from '@/types/game';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export function CombatPanel() {
  const { state, addToActionLog } = useGame();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: combat, isLoading: combatLoading } = useQuery<CombatSession | null>({
    queryKey: ['/api/characters', state.characterId, 'combat'],
    enabled: !!state.characterId,
    refetchInterval: 1500, // Poll for auto enemy attacks
    refetchIntervalInBackground: true
  });
  
  // Debug logging
  console.log('[CombatPanel] Combat data:', combat, 'Loading:', combatLoading, 'CharId:', state.characterId);

  const { data: enemy } = useQuery<Enemy>({
    queryKey: ['/api/enemies', combat?.enemyId],
    enabled: !!combat?.enemyId
  });

  const { data: character } = useQuery<Character>({
    queryKey: ['/api/characters', state.characterId],
    enabled: !!state.characterId
  });

  const combatActionMutation = useMutation({
    mutationFn: async (action: string) => {
      const response = await apiRequest('POST', `/api/characters/${state.characterId}/combat/action`, {
        action
      });
      return response.json() as Promise<CombatResult>;
    },
    onSuccess: (result) => {
      addToActionLog(result.message, 'combat');
      
      if (result.enemyMessage) {
        setTimeout(() => {
          addToActionLog(result.enemyMessage!, 'combat');
        }, 1000);
      }

      if (result.victory || result.defeated || result.fled) {
        queryClient.invalidateQueries({
          queryKey: ['/api/characters', state.characterId, 'combat']
        });
      }

      // If server returned updated character (on victory), update cache immediately
      if ((result as any).character) {
        // Capture previous snapshot BEFORE overwriting cache
        const prev = queryClient.getQueryData<Character>(['/api/characters', state.characterId]);
        const updatedChar = (result as any).character as Character;

        // Derive levels from XP to avoid stale or desynced level fields
        const prevDerivedLevel = prev ? levelFromExperience(prev.experience) : updatedChar.level;
        const newDerivedLevel = levelFromExperience(updatedChar.experience);

        queryClient.setQueryData(['/api/characters', state.characterId], updatedChar);

        if (prev && newDerivedLevel > prevDerivedLevel) {
          const levelsGained = newDerivedLevel - prevDerivedLevel;
          const statPoints = (updatedChar as any).unspentPoints - ((prev as any).unspentPoints || 0);
          const prevLevelBase = cumulativeXpForLevel(prevDerivedLevel);
            const newLevelBase = cumulativeXpForLevel(newDerivedLevel);
            const xpGainedTotal = updatedChar.experience - prev.experience;
          toast({
            title: `Level Up! Now Level ${newDerivedLevel}`,
            description: `+${xpGainedTotal} XP (Lv ${prevDerivedLevel} → ${newDerivedLevel})${statPoints ? `, +${statPoints} stat pts` : ''}. Max HP: ${prev.maxHealth} → ${updatedChar.maxHealth}`,
            variant: 'default'
          });
        }
      } else {
        queryClient.invalidateQueries({
          queryKey: ['/api/characters', state.characterId]
        });
      }
    }
  });

  const handleCombatAction = (action: string) => {
    if (combat && combat.turn === 'player') {
      combatActionMutation.mutate(action);
    }
  };

  if (!combat || !enemy) {
    return (
      <div className="pixel-border bg-card p-3">
        <h2 className="text-accent text-xs mb-3">COMBAT STATUS</h2>
        <div className="text-xs text-center mb-3">
          <div data-testid="text-combat-status">No Active Combat</div>
          <div className="text-xs text-muted-foreground mt-1">
            Debug: Combat={combat ? 'exists' : 'null'}, Enemy={enemy ? 'exists' : 'null'}, Loading={combatLoading ? 'yes' : 'no'}
          </div>
        </div>
        
        <div className="space-y-1 opacity-50">
          <Button 
            className="pixel-button pixel-border bg-primary text-primary-foreground w-full py-2 text-xs" 
            disabled
          >
            ⚔️ ATTACK
          </Button>
          <Button 
            className="pixel-button pixel-border bg-secondary text-secondary-foreground w-full py-2 text-xs" 
            disabled
          >
            🛡️ DEFEND
          </Button>
          <Button 
            className="pixel-button pixel-border bg-ui text-foreground w-full py-2 text-xs" 
            disabled
          >
            🔮 MAGIC
          </Button>
          <Button 
            className="pixel-button pixel-border bg-destructive text-destructive-foreground w-full py-2 text-xs" 
            disabled
          >
            🏃 FLEE
          </Button>
        </div>

        <div className="mt-4 pixel-border bg-background p-2 opacity-50">
          <div className="text-xs text-center mb-2">ENEMY</div>
          <div className="pixel-border bg-card w-12 h-12 mx-auto mb-2 flex items-center justify-center">
            <span className="text-destructive">👹</span>
          </div>
          <div className="text-xs text-center">
            <div>No Enemy</div>
          </div>
        </div>
      </div>
    );
  }

  const enemyHealthPercent = (combat.enemyHealth / enemy.health) * 100;

  return (
    <div className="pixel-border bg-card p-3">
      <h2 className="text-accent text-xs mb-3">COMBAT STATUS</h2>
      <div className="text-xs text-center mb-3">
        <div className="text-destructive font-bold" data-testid="text-combat-active">ACTIVE COMBAT</div>
        <div className="text-xs mt-1">
          Turn: {combat.turn === 'player' ? 'YOUR TURN' : 'ENEMY TURN'}
        </div>
        {combat.lastEnemyAttackAt ? (
          <div className="text-[10px] text-muted-foreground mt-1">
            Last hit: {combat.lastEnemyAttackDamage} dmg {Math.max(0, Math.floor((Date.now() - combat.lastEnemyAttackAt)/1000))}s ago
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground mt-1">Enemy preparing...</div>
        )}
      </div>
      
      {/* Combat Actions */}
      <div className="space-y-1">
        <Button 
          className="pixel-button pixel-border bg-primary text-primary-foreground w-full py-2 text-xs"
          onClick={() => handleCombatAction('attack')}
          disabled={combat.turn !== 'player' || combatActionMutation.isPending}
          data-testid="button-attack"
        >
          ⚔️ ATTACK
        </Button>
        <Button 
          className="pixel-button pixel-border bg-secondary text-secondary-foreground w-full py-2 text-xs"
          onClick={() => handleCombatAction('defend')}
          disabled={combat.turn !== 'player' || combatActionMutation.isPending}
          data-testid="button-defend"
        >
          🛡️ DEFEND
        </Button>
        <Button 
          className="pixel-button pixel-border bg-ui text-foreground w-full py-2 text-xs"
          onClick={() => handleCombatAction('magic')}
          disabled={combat.turn !== 'player' || combatActionMutation.isPending}
          data-testid="button-magic"
        >
          🔮 MAGIC
        </Button>
        <Button 
          className="pixel-button pixel-border bg-destructive text-destructive-foreground w-full py-2 text-xs"
          onClick={() => handleCombatAction('flee')}
          disabled={combat.turn !== 'player' || combatActionMutation.isPending}
          data-testid="button-flee"
        >
          🏃 FLEE
        </Button>
      </div>

      {/* Enemy Info */}
      <div className="mt-4 pixel-border bg-background p-2">
        <div className="text-xs text-center mb-2">ENEMY</div>
        <div className="pixel-border bg-card w-12 h-12 mx-auto mb-2 flex items-center justify-center">
          <span className="text-destructive">{enemy.icon}</span>
        </div>
        <div className="text-xs text-center">
          <div className="font-bold" data-testid="text-enemy-name">{enemy.name}</div>
          <div className="text-destructive" data-testid="text-enemy-health">
            HP: {combat.enemyHealth}/{enemy.health}
          </div>
          <div className="pixel-border bg-background h-2 mt-1">
            <div 
              className="health-bar h-full" 
              style={{ '--health-percent': `${enemyHealthPercent}%` } as React.CSSProperties}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
