import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { Location, Character, Enemy } from '@shared/schema';
import { levelFromExperience } from '@shared/leveling';
import { useGame } from '@/contexts/GameContext';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';

export function WorldMap() {
  const { state, addToActionLog } = useGame();
  const queryClient = useQueryClient();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [labelOffsets, setLabelOffsets] = useState<Record<string, { dx: number; dy: number }>>({});

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['/api/locations']
  });

  const { data: character } = useQuery<Character>({
    queryKey: ['/api/characters', state.characterId],
    enabled: !!state.characterId
  });

  const { data: enemies = [] } = useQuery<Enemy[]>({
    queryKey: ['/api/locations', character?.currentLocationId, 'enemies'],
    enabled: !!character?.currentLocationId
  });

  const moveMutation = useMutation({
    mutationFn: async (locationId: string) => {
      // Begin movement animation
      if (character) {
        setTravel({
          from: character.currentLocationId,
          to: locationId,
          start: performance.now(),
          duration: 1200
        });
      }
      const response = await apiRequest('POST', `/api/characters/${state.characterId}/move`, {
        locationId
      });
      return response.json();
    },
    onSuccess: (updatedCharacter) => {
      queryClient.setQueryData(['/api/characters', state.characterId], updatedCharacter);
      const location = locations.find(l => l.id === updatedCharacter.currentLocationId);
      addToActionLog(`You traveled to ${location?.name || 'Unknown Location'}.`, 'info');
      // Refetch enemies for new location
      queryClient.invalidateQueries({
        queryKey: ['/api/locations', updatedCharacter.currentLocationId, 'enemies']
      });
    }
  });

  // Travel animation state
  const [travel, setTravel] = useState<{
    from: string; to: string; start: number; duration: number;
  } | null>(null);
  const [animTime, setAnimTime] = useState(0);

  useEffect(() => {
    if (!travel) return;
    let raf: number;
    const tick = (t: number) => {
      setAnimTime(t);
      if (t - travel.start < travel.duration) {
        raf = requestAnimationFrame(tick);
      } else {
        setTravel(null);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [travel]);

  const startCombatMutation = useMutation({
    mutationFn: async (enemyId: string) => {
      const response = await apiRequest('POST', `/api/characters/${state.characterId}/combat/start`, {
        enemyId
      });
      return response.json();
    },
    onSuccess: (combatSession) => {
      console.log('[WorldMap] Combat started, setting cache data:', combatSession, 'Key:', ['/api/characters', state.characterId, 'combat']);
      addToActionLog('Combat has begun!', 'combat');
      // Set combat data directly for immediate UI update
      queryClient.setQueryData(['/api/characters', state.characterId, 'combat'], combatSession);
    }
  });

  const handleLocationClick = (location: Location) => {
    if (!character || location.id === character.currentLocationId) return;

    // Derive level from XP to avoid stale cached level edge cases
    const effectiveLevel = levelFromExperience(character.experience);
    const visibleLevel = character.level; // stored level (for debugging)

    if (effectiveLevel < location.levelRecommendation) {
      addToActionLog(
        `Blocked: Need level ${location.levelRecommendation} for ${location.name}. (You are level ${effectiveLevel}${visibleLevel !== effectiveLevel ? ` / stored ${visibleLevel}` : ''})`,
        'error'
      );
      return;
    }

    moveMutation.mutate(location.id);
  };

  const handleEnemyEncounter = () => {
    if (enemies.length === 0) return;
    const isVillage = currentLocation?.id === 'village';
    const isTraining = isVillage && (character?.level ?? 1) < 5;
    if (isTraining) {
      // Prefer the training dummy if present
      const dummy = enemies.find(e => e.id === 'training_dummy' || /training/i.test(e.name));
      if (dummy) {
        startCombatMutation.mutate(dummy.id);
        return;
      }
    }
    const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
    startCombatMutation.mutate(randomEnemy.id);
  };

  const currentLocation = locations.find(l => l.id === character?.currentLocationId);

  // Compute non-overlapping label offsets after first paint
  useLayoutEffect(() => {
    if (!mapRef.current || locations.length === 0) return;

    const margin = 4; // extra breathing room around labels
    const candidates: Array<{ dx: number; dy: number }> = [
      { dx: 16, dy: -28 },
      { dx: -16, dy: 18 },
      { dx: 18, dy: 22 },
      { dx: -18, dy: -24 },
      { dx: 32, dy: 0 },
      { dx: 0, dy: 32 },
      { dx: -32, dy: 0 },
      { dx: 0, dy: -32 },
    ];

    type Rect = { left: number; top: number; right: number; bottom: number };
    const placedRects: Rect[] = [];
    const offsets: Record<string, { dx: number; dy: number }> = {};

    const intersects = (a: Rect, b: Rect) =>
      !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);

    const inflate = (r: Rect, by: number): Rect => ({
      left: r.left - by,
      top: r.top - by,
      right: r.right + by,
      bottom: r.bottom + by,
    });

    // Sort by Y then X so we place top-left items first
    const sorted = [...locations].sort((a, b) => (a.y - b.y) || (a.x - b.x));

    for (const loc of sorted) {
      const el = labelRefs.current[loc.id];
      const w = el?.offsetWidth ?? Math.max(64, (loc.name?.length ?? 6) * 8);
      const h = el?.offsetHeight ?? 18;

      let chosen: { dx: number; dy: number } | null = null;

      // Try basic candidates
      for (const c of candidates) {
        const trial: Rect = {
          left: loc.x + c.dx,
          top: loc.y + c.dy,
          right: loc.x + c.dx + w,
          bottom: loc.y + c.dy + h,
        };
        const trialInf = inflate(trial, margin);
        if (!placedRects.some(r => intersects(trialInf, r))) {
          chosen = c;
          placedRects.push(trialInf);
          break;
        }
      }

      // If still overlapping, progressively nudge further away
      if (!chosen) {
        let found = false;
        for (let scale = 2; scale <= 4 && !found; scale++) {
          for (const base of candidates) {
            const c = { dx: base.dx * scale, dy: base.dy * scale };
            const trial: Rect = {
              left: loc.x + c.dx,
              top: loc.y + c.dy,
              right: loc.x + c.dx + w,
              bottom: loc.y + c.dy + h,
            };
            const trialInf = inflate(trial, margin);
            if (!placedRects.some(r => intersects(trialInf, r))) {
              chosen = c;
              placedRects.push(trialInf);
              found = true;
              break;
            }
          }
        }
      }

      // Final fallback: place to the right by width + padding
      if (!chosen) {
        chosen = { dx: 40 + w, dy: -h / 2 };
        const trial: Rect = {
          left: loc.x + chosen.dx,
          top: loc.y + chosen.dy,
          right: loc.x + chosen.dx + w,
          bottom: loc.y + chosen.dy + h,
        };
        placedRects.push(inflate(trial, margin));
      }

      offsets[loc.id] = chosen;
    }

    setLabelOffsets(offsets);
  }, [locations]);

  return (
    <div className="space-y-4">
      {/* Current Location Info */}
      {currentLocation && (
        <div className="pixel-border bg-background p-3">
          <h3 className="text-accent text-xs mb-2">CURRENT LOCATION</h3>
          <div className="text-xs">
            <div className="font-bold" data-testid="text-current-location">{currentLocation.icon} {currentLocation.name}</div>
            <div className="mt-1">{currentLocation.description}</div>
            <div className="text-secondary mt-1">Recommended Level: {currentLocation.levelRecommendation}</div>
          </div>
          {enemies.length > 0 && (
            <Button
              className="pixel-button pixel-border bg-destructive text-destructive-foreground w-full mt-2 py-1 text-xs"
              onClick={handleEnemyEncounter}
              disabled={startCombatMutation.isPending}
              data-testid="button-find-enemy"
            >
              {currentLocation.id === 'village' && (character?.level ?? 1) < 5 ? 'TRAINING FIGHT' : 'EXPLORE FOR ENEMIES'}
            </Button>
          )}
          {currentLocation.id === 'village' && (character?.level ?? 1) < 5 && (
            <div className="text-[10px] text-muted-foreground mt-1">Training available in the village until level 5.</div>
          )}
        </div>
      )}

      {/* World Map */}
  <div ref={mapRef} className="pixel-border bg-background p-4 h-96 relative overflow-hidden">
        {/* Map Background Grid */}
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />
        
        {/* Location Markers */}
        <div className="relative z-10 h-full">
          {locations.map((location) => {
            const isCurrent = character?.currentLocationId === location.id;
            const off = labelOffsets[location.id] ?? { dx: 16, dy: -24 };

            return (
              <div
                key={location.id}
                className={`absolute cursor-pointer group ${isCurrent ? 'animate-pulse' : ''}`}
                style={{
                  top: `${location.y}px`,
                  left: `${location.x}px`,
                }}
                onClick={() => handleLocationClick(location)}
                data-testid={`location-${location.id}`}
              >
                {/* Anchor dot at exact map coordinate */}
                <div className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-sm bg-primary border border-primary-foreground/50" />

                {/* Label offset from anchor to reduce collisions */}
                <div
                  ref={(el) => { labelRefs.current[location.id] = el; }}
                  className={`relative pixel-border text-xs whitespace-nowrap ${
                    isCurrent ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'
                  } px-2 py-0.5 z-20`}
                  style={{ transform: `translate(${off.dx}px, ${off.dy}px)` }}
                >
                  {location.icon} {location.name.toUpperCase()}
                  <div className="hidden group-hover:block absolute top-full left-0 mt-1 pixel-border bg-card text-card-foreground px-2 py-1 text-xs whitespace-nowrap z-30">
                    {location.description} - Level {location.levelRecommendation}+
                  </div>
                </div>
              </div>
            );
          })}

          {/* Player Position Marker */}
          {character && (() => {
            const getLoc = (id: string | undefined) => locations.find(l => l.id === id);
            const fromLoc = travel ? getLoc(travel.from) : null;
            const toLoc = travel ? getLoc(travel.to) : null;
            const baseLoc = getLoc(character.currentLocationId);
            let x = baseLoc?.x || 0;
            let y = baseLoc?.y || 0;
            if (travel && fromLoc && toLoc) {
              const p = Math.min(1, (animTime - travel.start) / travel.duration);
              x = fromLoc.x + (toLoc.x - fromLoc.x) * p;
              y = fromLoc.y + (toLoc.y - fromLoc.y) * p;
            }
            return (
              <div
                className="absolute z-30 transition-none"
                style={{
                  top: `${y}px`,
                  left: `${x}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="pixel-border bg-accent text-accent-foreground px-1 py-1 text-xs">
                  👤
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Movement Controls */}
      <div className="flex justify-center">
        <div className="grid grid-cols-3 gap-1">
          <div></div>
          <Button className="pixel-button pixel-border bg-primary text-primary-foreground w-12 h-10 flex items-center justify-center text-xs">
            ↑
          </Button>
          <div></div>
          <Button className="pixel-button pixel-border bg-primary text-primary-foreground w-12 h-10 flex items-center justify-center text-xs">
            ←
          </Button>
          <Button className="pixel-button pixel-border bg-accent text-accent-foreground w-12 h-10 flex items-center justify-center text-xs">
            🎯
          </Button>
          <Button className="pixel-button pixel-border bg-primary text-primary-foreground w-12 h-10 flex items-center justify-center text-xs">
            →
          </Button>
          <div></div>
          <Button className="pixel-button pixel-border bg-primary text-primary-foreground w-12 h-10 flex items-center justify-center text-xs">
            ↓
          </Button>
          <div></div>
        </div>
      </div>
    </div>
  );
}
