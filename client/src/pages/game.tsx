import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Character } from '@shared/schema';
import { useGame } from '@/contexts/GameContext';
import { CharacterCreation } from '@/components/CharacterCreation';
import { CharacterStats } from '@/components/CharacterStats';
import { WorldMap } from '@/components/WorldMap';
import { CombatPanel } from '@/components/CombatPanel';
import { ShopPanel } from '@/components/ShopPanel';
import { Inventory } from '@/components/Inventory';
import { ActionLog } from '@/components/ActionLog';
import { Button } from '@/components/ui/button';

export default function GamePage() {
  const { state, dispatch, addToActionLog } = useGame();

  // Check for saved character on load
  useEffect(() => {
    const savedCharacterId = localStorage.getItem('adventureQuestCharacter');
    if (savedCharacterId) {
      dispatch({ type: 'SET_CHARACTER_ID', payload: savedCharacterId });
    } else {
      dispatch({ type: 'TOGGLE_CHARACTER_CREATION' });
    }
  }, [dispatch]);

  const { data: character } = useQuery<Character>({
    queryKey: ['/api/characters', state.characterId],
    enabled: !!state.characterId
  });

  const handleSave = () => {
    if (state.characterId) {
      localStorage.setItem('adventureQuestCharacter', state.characterId);
      addToActionLog('Game saved!', 'success');
    }
  };

  const handleLoad = () => {
    const savedCharacterId = localStorage.getItem('adventureQuestCharacter');
    if (savedCharacterId) {
      dispatch({ type: 'SET_CHARACTER_ID', payload: savedCharacterId });
      addToActionLog('Game loaded!', 'success');
    } else {
      addToActionLog('No saved game found!', 'error');
    }
  };

  const handleNewGame = () => {
    localStorage.removeItem('adventureQuestCharacter');
    dispatch({ type: 'SET_CHARACTER_ID', payload: '' });
    dispatch({ type: 'TOGGLE_CHARACTER_CREATION' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-pixel">
      {/* Game Header */}
      <header className="pixel-border bg-card p-2 mb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-accent text-lg">ADVENTURE QUEST</h1>
            {character && (
              <div className="text-xs text-accent">
                LEVEL {character.level} {character.name.toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              className="pixel-button pixel-border bg-primary text-primary-foreground px-3 py-1 text-xs"
              onClick={handleSave}
              disabled={!state.characterId}
              data-testid="button-save"
            >
              SAVE
            </Button>
            <Button
              className="pixel-button pixel-border bg-secondary text-secondary-foreground px-3 py-1 text-xs"
              onClick={handleLoad}
              data-testid="button-load"
            >
              LOAD
            </Button>
            <Button
              className="pixel-button pixel-border bg-ui text-foreground px-3 py-1 text-xs"
              onClick={handleNewGame}
              data-testid="button-new-game"
            >
              NEW GAME
            </Button>
          </div>
        </div>
      </header>

      {/* Main Game Layout */}
      {state.characterId && character ? (
        <div className="game-grid game-layout min-h-screen p-2 gap-2">
          {/* Left Panel - Character Stats and Inventory */}
          <aside style={{ gridArea: 'left-panel' }} className="space-y-2">
            <CharacterStats />
            <Inventory />
          </aside>

          {/* Main Game Area */}
          <main style={{ gridArea: 'main-game' }} className="pixel-border bg-card p-4">
            {/* Game Mode Tabs */}
            <div className="flex mb-4 gap-1">
              <Button
                className={`pixel-button pixel-border px-4 py-2 text-xs ${
                  state.currentView === 'explore'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
                onClick={() => dispatch({ type: 'SET_VIEW', payload: 'explore' })}
                data-testid="button-explore-tab"
              >
                ENEMIES
              </Button>
              <Button
                className={`pixel-button pixel-border px-4 py-2 text-xs ${
                  state.currentView === 'combat' 
                    ? 'bg-accent text-accent-foreground' 
                    : 'bg-primary text-primary-foreground'
                }`}
                onClick={() => dispatch({ type: 'SET_VIEW', payload: 'combat' })}
                data-testid="button-combat-tab"
              >
                COMBAT
              </Button>
              <Button
                className={`pixel-button pixel-border px-4 py-2 text-xs ${
                  state.currentView === 'quests' 
                    ? 'bg-accent text-accent-foreground' 
                    : 'bg-primary text-primary-foreground'
                }`}
                onClick={() => dispatch({ type: 'SET_VIEW', payload: 'quests' })}
                data-testid="button-quests-tab"
              >
                QUESTS
              </Button>
            </div>

            {/* View Content */}
            {state.currentView === 'explore' && (
              <div className="grid md:grid-cols-1 gap-4">
                <WorldMap />
              </div>
            )}
            {state.currentView === 'combat' && (
              <div className="text-center text-xs py-8">
                Combat view - switch to right panel for combat controls
              </div>
            )}
            {state.currentView === 'quests' && (
              <div className="text-center text-xs py-8">
                Quest system coming soon!
              </div>
            )}
          </main>

          {/* Right Panel - Combat and Quest Info */}
          <aside style={{ gridArea: 'right-panel' }} className="space-y-2">
            <CombatPanel />
            {(['village_shop','dark_forest_shop','ruins_shop','forest','ruins'].includes(character.currentLocationId)) && <ShopPanel />}
            {/* Quest Panel Placeholder */}
            <div className="pixel-border bg-card p-3">
              <h2 className="text-accent text-xs mb-3">ACTIVE QUESTS</h2>
              <div className="text-xs text-center text-muted-foreground">
                Quest system coming soon!
              </div>
            </div>
          </aside>

          {/* Bottom Panel - Action Log */}
          <section style={{ gridArea: 'bottom-panel' }}>
            <ActionLog />
          </section>
        </div>
      ) : null}

      {/* Modals */}
      {state.showCharacterCreation && <CharacterCreation />}
    </div>
  );
}
