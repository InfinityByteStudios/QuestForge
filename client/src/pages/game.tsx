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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { GooglePixelIcon, GithubPixelIcon } from '@/components/PixelIcons';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { getUserCharacterSnapshot, getUserLastCharacterId, saveUserCharacter } from '@/lib/firebase';
import { getUserLastCharacterIdFirestore, saveUserCharacterFirestore } from '@/lib/firestore-questforge';
import { saveUserCharacterFirestore, getUserLastCharacterIdFirestore, getUserCharacterSnapshotFirestore } from '@/lib/firestore-saves';

export default function GamePage() {
  const { state, dispatch, addToActionLog } = useGame();
  const { user, signInGoogle, signInGithub, signInAnonymous, signOut } = useAuth();

  // Auto-load character when user is signed in or check local storage
  useEffect(() => {
    const autoLoadCharacter = async () => {
      // If user is signed in, try to load their character automatically
      if (user) {
        try {
          // Try to get cloud character ID first
          let cloudCharacterId: string | null = null;
          try {
            cloudCharacterId = await getUserLastCharacterIdFirestore(user.uid);
          } catch {
            cloudCharacterId = await getUserLastCharacterId(user.uid);
          }
          
          if (cloudCharacterId) {
            dispatch({ type: 'SET_CHARACTER_ID', payload: cloudCharacterId });
            localStorage.setItem('adventureQuestCharacter', cloudCharacterId);
            return;
          }
        } catch (error) {
          console.log('Could not load cloud character, checking local storage');
        }
      }
      
      // Fallback to local storage
      const savedCharacterId = localStorage.getItem('adventureQuestCharacter');
      if (savedCharacterId) {
        dispatch({ type: 'SET_CHARACTER_ID', payload: savedCharacterId });
      } else {
        dispatch({ type: 'TOGGLE_CHARACTER_CREATION' });
      }
    };

    autoLoadCharacter();
  }, [dispatch, user]);

  const { data: character } = useQuery<Character>({
    queryKey: ['/api/characters', state.characterId],
    enabled: !!state.characterId
  });

  // Auto-save: persist the last-used character id every 30 seconds
  useEffect(() => {
    if (!state.characterId) return;
    const interval = setInterval(() => {
      try {
        localStorage.setItem('adventureQuestCharacter', state.characterId!);
        if (character) {
          // Persist a snapshot for rebuilds (serverless cold starts)
          localStorage.setItem('adventureQuestCharacterSnapshot', JSON.stringify(character));
          // If signed in, also save to cloud
          if (user) {
            // async IIFE so we can await inside a sync setInterval callback
            (async () => {
              try {
                await saveUserCharacterFirestore(user.uid, state.characterId!, character);
              } catch (e) {
                // Fall back to RTDB
                saveUserCharacter(user.uid, state.characterId!, character).catch(() => {});
              }
            })();
          }
        }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [state.characterId, character, user]);

  const handleSave = () => {
    if (state.characterId) {
      localStorage.setItem('adventureQuestCharacter', state.characterId);
        if (character) {
        localStorage.setItem('adventureQuestCharacterSnapshot', JSON.stringify(character));
        if (user) {
          // Try Firestore first, fall back to RTDB
          (async () => {
            try {
              await saveUserCharacterFirestore(user.uid, state.characterId!, character);
            } catch (e) {
              saveUserCharacter(user.uid, state.characterId!, character).catch(() => {});
            }
          })();
        }
      }
      addToActionLog('Game saved!', 'success');
    }
  };

  const handleLoad = async () => {
    // If signed in, try cloud last id but gracefully fall back to local on any error
    let savedCharacterId: string | null = localStorage.getItem('adventureQuestCharacter');
    if (user) {
      try {
        const cloudId = await getUserLastCharacterIdFirestore(user.uid);
        if (cloudId) savedCharacterId = cloudId;
      } catch (err) {
        try {
          const cloudId = await getUserLastCharacterId(user.uid);
          if (cloudId) savedCharacterId = cloudId;
        } catch (e) {
          addToActionLog('Cloud save unavailable; using local save.', 'info');
        }
      }
    }
    if (!savedCharacterId) {
      addToActionLog('No saved game found!', 'error');
      return;
    }
    // First, verify the character still exists server-side
    try {
      const resp = await apiRequest('GET', `/api/characters/${savedCharacterId}`);
      if (resp.ok) {
        dispatch({ type: 'SET_CHARACTER_ID', payload: savedCharacterId });
        addToActionLog('Game loaded!', 'success');
        return;
      }
      // If missing (404), attempt restore from snapshot
      if (resp.status === 404) {
        // Try cloud snapshot first if signed in
        let snap: Partial<Character> | null = null;
        if (user) {
          snap = (await getUserCharacterSnapshot(user.uid, savedCharacterId)) as any;
        }
        const snapStr = !snap ? localStorage.getItem('adventureQuestCharacterSnapshot') : null;
        if (!snap && !snapStr) {
          addToActionLog('Save not found on server and no snapshot to restore.', 'error');
          return;
        }
        if (!snap && snapStr) snap = JSON.parse(snapStr) as Partial<Character>;
        if (!snap || !snap.name || !snap.class) {
          addToActionLog('Snapshot incomplete; cannot restore.', 'error');
          return;
        }
        // Recreate with core stats (inventory/equipment will be patched next)
        const baseInsert: any = {
          name: snap.name,
          class: snap.class,
          level: snap.level ?? 1,
          experience: snap.experience ?? 0,
          health: snap.health ?? 100,
          maxHealth: snap.maxHealth ?? 100,
          strength: snap.strength ?? 10,
          magic: snap.magic ?? 10,
          agility: snap.agility ?? 10,
          defense: snap.defense ?? 10,
          gold: snap.gold ?? 50,
          unspentPoints: (snap as any).unspentPoints ?? 0,
          currentLocationId: snap.currentLocationId ?? 'village',
          equipment: snap.equipment ?? {}
        };
        const createResp = await apiRequest('POST', `/api/characters`, baseInsert);
        if (!createResp.ok) {
          addToActionLog('Failed to recreate character from snapshot.', 'error');
          return;
        }
        const created = await createResp.json();
        // Patch inventory/equipment in case create used defaults
        const patch: any = {};
        if (snap.inventory) patch.inventory = snap.inventory;
        if (snap.equipment) patch.equipment = snap.equipment as any;
        if (Object.keys(patch).length > 0) {
          await apiRequest('PATCH', `/api/characters/${created.id}`, patch);
        }
        // Persist new id and load
        localStorage.setItem('adventureQuestCharacter', created.id);
        dispatch({ type: 'SET_CHARACTER_ID', payload: created.id });
        addToActionLog('Game restored from snapshot!', 'success');
        return;
      }
    } catch (e) {
      // Network or other error; try snapshot regardless
      // Try cloud snapshot first if signed in
      let snap: Partial<Character> | null = null;
      if (user && savedCharacterId) {
        try { snap = (await getUserCharacterSnapshot(user.uid, savedCharacterId)) as any; } catch {}
      }
      const snapStr = !snap ? localStorage.getItem('adventureQuestCharacterSnapshot') : null;
      if (!snap && !snapStr) {
        addToActionLog('Load failed and no snapshot available.', 'error');
        return;
      }
      if (!snap && snapStr) snap = JSON.parse(snapStr) as Partial<Character>;
      if (!snap || !snap.name || !snap.class) {
        addToActionLog('Snapshot incomplete; cannot restore.', 'error');
        return;
      }
      const baseInsert: any = {
        name: snap.name,
        class: snap.class,
        level: snap.level ?? 1,
        experience: snap.experience ?? 0,
        health: snap.health ?? 100,
        maxHealth: snap.maxHealth ?? 100,
        strength: snap.strength ?? 10,
        magic: snap.magic ?? 10,
        agility: snap.agility ?? 10,
        defense: snap.defense ?? 10,
        gold: snap.gold ?? 50,
        unspentPoints: (snap as any).unspentPoints ?? 0,
        currentLocationId: snap.currentLocationId ?? 'village',
        equipment: snap.equipment ?? {}
      };
      const createResp = await apiRequest('POST', `/api/characters`, baseInsert);
      if (!createResp.ok) {
        addToActionLog('Failed to recreate character from snapshot.', 'error');
        return;
      }
      const created = await createResp.json();
      const patch: any = {};
      if (snap.inventory) patch.inventory = snap.inventory;
      if (snap.equipment) patch.equipment = snap.equipment as any;
      if (Object.keys(patch).length > 0) {
        await apiRequest('PATCH', `/api/characters/${created.id}`, patch);
      }
      localStorage.setItem('adventureQuestCharacter', created.id);
      dispatch({ type: 'SET_CHARACTER_ID', payload: created.id });
      addToActionLog('Game restored from snapshot!', 'success');
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
          <div className="flex gap-2 items-center">
            {/* Auth controls */}
            <div className="flex items-center gap-2 text-xs">
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{user.isAnonymous ? 'Guest' : (user.displayName || user.email)}</span>
                  <Button className="pixel-button pixel-border bg-secondary text-secondary-foreground px-2 py-1 text-[10px]" onClick={() => signOut()}>
                    Sign out
                  </Button>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="pixel-button pixel-border bg-secondary text-secondary-foreground px-3 py-1 text-xs">
                      Sign in
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[160px]">
                    <DropdownMenuItem onClick={() => signInGoogle()} className="flex items-center gap-2">
                      <GooglePixelIcon />
                      <span>Continue with Google</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => signInGithub()} className="flex items-center gap-2">
                      <GithubPixelIcon />
                      <span>Continue with GitHub</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => signInAnonymous()} className="flex items-center gap-2">
                      <span className="w-[14px] h-[14px] bg-foreground inline-block" />
                      <span>Continue as Guest</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
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
