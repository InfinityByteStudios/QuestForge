import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Item, Character } from '@shared/schema';
import { useGame } from '@/contexts/GameContext';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';

export function ShopPanel() {
  const { state, addToActionLog } = useGame();
  const queryClient = useQueryClient();

  const { data: character } = useQuery<Character>({
    queryKey: ['/api/characters', state.characterId],
    enabled: !!state.characterId
  });

  const currentLocationId = character?.currentLocationId;
  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ['/api/locations', currentLocationId, 'shop'],
    enabled: !!currentLocationId,
    queryFn: async () => {
      const res = await fetch(`/api/locations/${currentLocationId}/shop`);
      return res.json();
    }
  });

  const buyMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest('POST', `/api/characters/${state.characterId}/shop/buy`, { itemId });
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.character) {
        queryClient.setQueryData(['/api/characters', state.characterId], data.character);
        addToActionLog(`Purchased ${data.purchased}!${data.upgradeMessage || ''}`, 'success');
      }
    },
    onError: async (err: any) => {
      addToActionLog(err?.message || 'Purchase failed', 'error');
    }
  });

  if (!character) return null;

  const locationNames: Record<string,string> = {
    village_shop: 'Village Shop',
    dark_forest_shop: 'Dark Forest Shop',
    ruins_shop: 'Ancient Ruins Shop',
    forest: 'Dark Forest Shop',
    ruins: 'Ancient Ruins Shop'
  };
  const title = locationNames[currentLocationId || ''] || 'Shop';

  return (
    <div className="pixel-border bg-card p-3">
      <h2 className="text-accent text-xs mb-3">{title.toUpperCase()}</h2>
      <div className="text-[10px] mb-2">Gold: <span className="text-accent font-bold">{character.gold}</span></div>
      <div className="space-y-2 max-h-48 overflow-auto pr-1">
  {items.map(item => (
          <div key={item.id} className="flex items-center justify-between text-xs pixel-border bg-background px-2 py-1">
            <div className="flex items-center gap-2">
              <span>{item.icon}</span>
              <div>
                <div className="font-bold">{item.name}</div>
                <div className="text-[10px] text-muted-foreground">Cost: {item.sellValue}</div>
              </div>
            </div>
            <Button
              className="pixel-button pixel-border bg-primary text-primary-foreground px-2 py-1 text-[10px]"
              disabled={buyMutation.isPending || character.gold < (item.sellValue || 1)}
              onClick={() => buyMutation.mutate(item.id)}
            >BUY</Button>
          </div>
        ))}
      </div>
      {items.length === 0 && <div className="text-[10px] text-muted-foreground">No items available.</div>}
    </div>
  );
}
