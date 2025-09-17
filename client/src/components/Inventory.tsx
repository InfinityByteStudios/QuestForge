import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Character, Item } from '@shared/schema';
import { useGame } from '@/contexts/GameContext';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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

  // Equip mutation (manual drag-drop)
  const equipMutation = useMutation({
    mutationFn: async (vars: { itemId: string; slot: string }) => {
      const response = await apiRequest('POST', `/api/characters/${state.characterId}/equip`, vars);
      return response.json();
    },
    onSuccess: (result: any) => {
      queryClient.setQueryData(['/api/characters', state.characterId], result.character);
      addToActionLog(result.message || 'Equipped item.', 'success');
    },
    onError: (error: any) => addToActionLog(error.message, 'error')
  });

  const handleEquip = (itemId: string, slot: string) => {
    equipMutation.mutate({ itemId, slot });
  };

  // Drag handlers
  const onDragStart = (e: React.DragEvent, item: any) => {
    e.dataTransfer.setData('application/item-id', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOverSlot = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDropSlot = (e: React.DragEvent, slot: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('application/item-id');
    if (!itemId) return;
    handleEquip(itemId, slot);
  };

  const getItemMeta = (id?: string) => {
    if (!id || !character) return undefined;
    return character.inventory?.find(i => i.id === id);
  };

  const renderTooltipContent = (item: any) => {
    if (!item) return null;
    const lines: string[] = [];
    if (item.type === 'weapon') {
      const full = (item as any).stats?.attack;
      if (full != null) lines.push(`Attack +${full}`);
    } else if (item.type === 'armor') {
      const full = (item as any).stats?.defense;
      if (full != null) lines.push(`Defense +${full}`);
    } else if (item.type === 'consumable') {
      if ((item as any).stats?.health) lines.push(`Heals ${item.stats.health} HP`);
      if ((item as any).stats?.magic) lines.push(`Magic +${item.stats.magic} (temp)`);
    }
    return (
      <div className="space-y-1">
        <div className="font-semibold text-xs">{item.name}</div>
        {lines.length > 0 && (
          <ul className="text-[10px] leading-tight list-none m-0 p-0">
            {lines.map(l => <li key={l}>{l}</li>)}
          </ul>
        )}
        {item.quantity > 1 && <div className="text-[10px]">Qty: {item.quantity}</div>}
        <div className="text-[10px] italic opacity-80">
          {item.type === 'consumable' ? 'Click to use' : 'Drag to an equipment slot'}
        </div>
      </div>
    );
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
        <TooltipProvider>
          <div className="grid grid-cols-4 gap-1">
            {quickItems.map((item, index) => (
              <Tooltip key={`${item.id}-${index}`}>
                <TooltipTrigger asChild>
                  <div
                    className="pixel-border bg-background aspect-square flex flex-col items-center justify-center text-xs cursor-pointer hover:bg-primary transition-colors relative"
                    onClick={() => item.type === 'consumable' && handleUseItem(item.id)}
                    data-testid={`inventory-item-${item.id}`}
                    draggable={item.type !== 'consumable'}
                    onDragStart={(e) => onDragStart(e, item)}
                  >
                    <span className="text-accent">{item.icon}</span>
                    {item.quantity > 1 && (
                      <span className="absolute bottom-0 right-0 text-[10px] bg-accent text-accent-foreground px-1">
                        {item.quantity}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">{renderTooltipContent(item)}</TooltipContent>
              </Tooltip>
            ))}
          {emptySlots.map((_, index) => (
            <div
              key={`empty-${index}`}
              className="pixel-border bg-background aspect-square"
            />
          ))}
          </div>
        </TooltipProvider>
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
                  <div
                    className={cn("pixel-border bg-background aspect-square flex items-center justify-center cursor-pointer relative", equipMutation.status === 'pending' && 'opacity-50')}
                    onDragOver={onDragOverSlot}
                    onDrop={(e) => onDropSlot(e, 'helmet')}
                  >
                    {(() => { const it = getItemMeta((character.equipment as any)?.helmet); return it ? <span title={it.name}>{it.icon}</span> : <span className="text-muted-foreground text-[10px]">HEAD</span>; })()}
                  </div>
                  <div></div>

                  {/* Weapon, Armor, Shield */}
                  <div
                    className={cn("pixel-border bg-background aspect-square flex items-center justify-center cursor-pointer relative", equipMutation.status === 'pending' && 'opacity-50')}
                    onDragOver={onDragOverSlot}
                    onDrop={(e) => onDropSlot(e, 'weapon')}
                  >
                    {(() => { const it = getItemMeta((character.equipment as any)?.weapon); return it ? <span title={it.name}>{it.icon}</span> : <span className="text-muted-foreground text-[10px]">WEAPON</span>; })()}
                  </div>
                  <div
                    className={cn("pixel-border bg-background aspect-square flex items-center justify-center cursor-pointer relative", equipMutation.status === 'pending' && 'opacity-50')}
                    onDragOver={onDragOverSlot}
                    onDrop={(e) => onDropSlot(e, 'armor')}
                  >
                    {(() => { const it = getItemMeta((character.equipment as any)?.armor); return it ? <span title={it.name}>{it.icon}</span> : <span className="text-muted-foreground text-[10px]">ARMOR</span>; })()}
                  </div>
                  <div
                    className={cn("pixel-border bg-background aspect-square flex items-center justify-center cursor-pointer relative", equipMutation.status === 'pending' && 'opacity-50')}
                    onDragOver={onDragOverSlot}
                    onDrop={(e) => onDropSlot(e, 'accessory')}
                  >
                    {(() => { const it = getItemMeta((character.equipment as any)?.accessory); return it ? <span title={it.name}>{it.icon}</span> : <span className="text-muted-foreground text-[10px]">RING</span>; })()}
                  </div>

                  {/* Boots */}
                  <div></div>
                  <div
                    className={cn("pixel-border bg-background aspect-square flex items-center justify-center cursor-pointer relative", equipMutation.status === 'pending' && 'opacity-50')}
                    onDragOver={onDragOverSlot}
                    onDrop={(e) => onDropSlot(e, 'boots')}
                  >
                    {(() => { const it = getItemMeta((character.equipment as any)?.boots); return it ? <span title={it.name}>{it.icon}</span> : <span className="text-muted-foreground text-[10px]">BOOTS</span>; })()}
                  </div>
                  <div></div>
                </div>
              </div>

              {/* Item Inventory */}
              <div>
                <h3 className="text-accent text-xs mb-3">ITEMS</h3>
                <TooltipProvider>
                  <div className="grid grid-cols-8 gap-1">
                    {(character.inventory || []).map((item, index) => (
                      <Tooltip key={`${item.id}-${index}`}>
                        <TooltipTrigger asChild>
                          <div
                            className="pixel-border bg-background aspect-square flex flex-col items-center justify-center text-[11px] cursor-pointer hover:bg-primary transition-colors relative"
                            onClick={() => item.type === 'consumable' && handleUseItem(item.id)}
                            data-testid={`full-inventory-item-${item.id}`}
                            draggable={item.type !== 'consumable'}
                            onDragStart={(e) => onDragStart(e, item)}
                          >
                            <span className="text-accent" aria-label={item.name}>{item.icon}</span>
                            {item.quantity > 1 && (
                              <span className="absolute bottom-0 right-0 text-[10px] bg-accent text-accent-foreground px-1">
                                {item.quantity}
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">{renderTooltipContent(item)}</TooltipContent>
                      </Tooltip>
                    ))}
                  {/* Empty slots */}
                  {Array(32 - (character.inventory || []).length).fill(null).map((_, index) => (
                    <div
                      key={`empty-full-${index}`}
                      className="pixel-border bg-background aspect-square"
                    />
                  ))}
                  </div>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
