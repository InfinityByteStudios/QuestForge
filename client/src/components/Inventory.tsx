import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Character, Item } from '@shared/schema';
import { useGame } from '@/contexts/GameContext';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';

export function Inventory() {
  const { state, dispatch, addToActionLog } = useGame();
  const queryClient = useQueryClient();

  const { data: character } = useQuery<Character>({
    queryKey: ['/api/characters', state.characterId],
    enabled: !!state.characterId
  });

  const useItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiRequest('POST', `/api/characters/${state.characterId}/use-item`, {
        itemId
      });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['/api/characters', state.characterId], result.character);
      addToActionLog(result.message, 'success');
    },
    onError: (error: any) => {
      addToActionLog(error.message, 'error');
    }
  });

  const handleUseItem = (itemId: string) => {
    useItemMutation.mutate(itemId);
  };

  if (!character) return null;

  // Quick inventory items (first 8 items)
  const quickItems = (character.inventory || []).slice(0, 8);
  const emptySlots = Array(8 - quickItems.length).fill(null);

  return (
    <>
      {/* Quick Inventory Panel */}
      <div className="pixel-border bg-card p-3">
        <h2 className="text-accent text-xs mb-3">INVENTORY</h2>
        <div className="grid grid-cols-4 gap-1">
          {quickItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="pixel-border bg-background aspect-square flex flex-col items-center justify-center text-xs cursor-pointer hover:bg-primary transition-colors relative"
              onClick={() => item.type === 'consumable' && handleUseItem(item.id)}
              data-testid={`inventory-item-${item.id}`}
            >
              <span className="text-accent">{item.icon}</span>
              {item.quantity > 1 && (
                <span className="absolute bottom-0 right-0 text-xs bg-accent text-accent-foreground px-1">
                  {item.quantity}
                </span>
              )}
            </div>
          ))}
          {emptySlots.map((_, index) => (
            <div
              key={`empty-${index}`}
              className="pixel-border bg-background aspect-square"
            />
          ))}
        </div>
        <Button
          className="pixel-button pixel-border bg-secondary text-secondary-foreground w-full mt-3 py-1 text-xs"
          onClick={() => dispatch({ type: 'TOGGLE_INVENTORY' })}
          data-testid="button-full-inventory"
        >
          FULL INVENTORY
        </Button>
      </div>

      {/* Full Inventory Modal */}
      {state.showInventory && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" data-testid="inventory-modal">
          <div className="pixel-border bg-card p-6 max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-accent">INVENTORY</h2>
              <Button
                className="pixel-button pixel-border bg-destructive text-destructive-foreground px-3 py-1 text-xs"
                onClick={() => dispatch({ type: 'TOGGLE_INVENTORY' })}
                data-testid="button-close-inventory"
              >
                CLOSE
              </Button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Equipment Slots */}
              <div>
                <h3 className="text-accent text-xs mb-3">EQUIPMENT</h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {/* Helmet */}
                  <div></div>
                  <div className="pixel-border bg-background aspect-square flex items-center justify-center cursor-pointer">
                    {character.equipment?.helmet ? (
                      <span className="text-ui">🎩</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">HEAD</span>
                    )}
                  </div>
                  <div></div>

                  {/* Weapon, Armor, Shield */}
                  <div className="pixel-border bg-background aspect-square flex items-center justify-center cursor-pointer">
                    {character.equipment?.weapon ? (
                      <span className="text-accent">⚔️</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">WEAPON</span>
                    )}
                  </div>
                  <div className="pixel-border bg-background aspect-square flex items-center justify-center cursor-pointer">
                    {character.equipment?.armor ? (
                      <span className="text-primary">👕</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">ARMOR</span>
                    )}
                  </div>
                  <div className="pixel-border bg-background aspect-square flex items-center justify-center cursor-pointer">
                    <span className="text-accent">🛡️</span>
                  </div>

                  {/* Boots */}
                  <div></div>
                  <div className="pixel-border bg-background aspect-square flex items-center justify-center cursor-pointer">
                    {character.equipment?.boots ? (
                      <span className="text-primary">👢</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">BOOTS</span>
                    )}
                  </div>
                  <div></div>
                </div>
              </div>

              {/* Item Inventory */}
              <div>
                <h3 className="text-accent text-xs mb-3">ITEMS</h3>
                <div className="grid grid-cols-8 gap-1">
                  {(character.inventory || []).map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className="pixel-border bg-background aspect-square flex flex-col items-center justify-center text-xs cursor-pointer hover:bg-primary transition-colors relative"
                      onClick={() => item.type === 'consumable' && handleUseItem(item.id)}
                      title={`${item.name} ${item.quantity > 1 ? `(${item.quantity})` : ''}`}
                      data-testid={`full-inventory-item-${item.id}`}
                    >
                      <span className="text-accent">{item.icon}</span>
                      {item.quantity > 1 && (
                        <span className="absolute bottom-0 right-0 text-xs bg-accent text-accent-foreground px-1">
                          {item.quantity}
                        </span>
                      )}
                    </div>
                  ))}
                  {/* Empty slots */}
                  {Array(32 - (character.inventory || []).length).fill(null).map((_, index) => (
                    <div
                      key={`empty-full-${index}`}
                      className="pixel-border bg-background aspect-square"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
