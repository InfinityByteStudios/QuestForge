import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGame } from '@/contexts/GameContext';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Enemy } from '@shared/schema';
import { useState } from 'react';

interface ExploreResult {
  enemies: Enemy[];
  cooldownMs: number;
  nextAllowed: number;
}

export function ExplorePanel() {
  const { state, addToActionLog } = useGame();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<ExploreResult | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);

  const exploreMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/characters/${state.characterId}/explore`, {});
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Explore failed');
      }
      return response.json() as Promise<ExploreResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      setCooldownUntil(data.nextAllowed);
      addToActionLog(`Exploration found ${data.enemies.length} enemies.`, 'info');
    },
    onError: (error: any) => addToActionLog(error.message, 'error')
  });

  const timeLeft = Math.max(0, cooldownUntil - Date.now());
  const secondsLeft = Math.ceil(timeLeft / 1000);

  return (
    <div className="pixel-border bg-card p-3">
      <h2 className="text-accent text-xs mb-3">EXPLORE</h2>
      <Button
        className="pixel-button pixel-border bg-primary text-primary-foreground w-full py-2 text-xs mb-3"
        disabled={exploreMutation.isPending || timeLeft > 0 || !state.characterId}
        onClick={() => exploreMutation.mutate()}
      >
        {timeLeft > 0 ? `Cooldown (${secondsLeft}s)` : '🔍 Explore Area'}
      </Button>
      {result && (
        <div className="space-y-2 mt-2">
          <div className="text-xs text-muted-foreground">Discovered Enemies:</div>
          <div className="grid grid-cols-3 gap-2">
            {result.enemies.map(e => (
              <div key={e.id} className="pixel-border bg-background p-2 flex flex-col items-center text-[10px]">
                <span className="text-destructive text-lg" aria-label={e.name}>{e.icon}</span>
                <span className="mt-1 font-semibold" title={e.name}>{e.name}</span>
                <span>HP {e.health}</span>
                <span className="opacity-70">ATK {e.attack}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
