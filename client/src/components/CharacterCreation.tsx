import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useGame } from '@/contexts/GameContext';
import { InsertCharacter } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CLASSES = [
  { id: 'warrior', name: 'WARRIOR', icon: '⚔️', bonuses: { strength: 3, defense: 2 } },
  { id: 'mage', name: 'MAGE', icon: '🔮', bonuses: { magic: 3, agility: 2 } },
  { id: 'archer', name: 'ARCHER', icon: '🏹', bonuses: { agility: 3, strength: 1, magic: 1 } },
  { id: 'rogue', name: 'ROGUE', icon: '🗡️', bonuses: { agility: 2, strength: 2, magic: 1 } }
];

export function CharacterCreation() {
  const { dispatch, addToActionLog } = useGame();
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const STARTING_POINTS = 10;
  const [stats, setStats] = useState({
    strength: 10,
    magic: 10,
    agility: 10,
    health: 10
  });
  const [availablePoints, setAvailablePoints] = useState(STARTING_POINTS);

  const createCharacterMutation = useMutation({
    mutationFn: async (character: InsertCharacter) => {
      const response = await apiRequest('POST', '/api/characters', character);
      return response.json();
    },
    onSuccess: (character) => {
      localStorage.setItem('adventureQuestCharacter', character.id);
      dispatch({ type: 'SET_CHARACTER_ID', payload: character.id });
      dispatch({ type: 'TOGGLE_CHARACTER_CREATION' });
      addToActionLog(`Welcome, ${character.name}! Your adventure begins!`, 'success');
    }
  });

  const adjustStat = (stat: keyof typeof stats, change: number) => {
    const newValue = stats[stat] + change;
    const pointDifference = change;

    if (newValue >= 5 && newValue <= 25 && availablePoints - pointDifference >= 0) {
      setStats(prev => ({ ...prev, [stat]: newValue }));
      setAvailablePoints(prev => prev - pointDifference);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow creation even if there are unspent points
    if (!name.trim() || !selectedClass) return;

    const classBonus = CLASSES.find(c => c.id === selectedClass)?.bonuses || {
      strength: 0,
      magic: 0,
      agility: 0,
      defense: 0
    };
    const finalStats = {
      strength: stats.strength + (classBonus.strength || 0),
      magic: stats.magic + (classBonus.magic || 0),
      agility: stats.agility + (classBonus.agility || 0),
      defense: stats.health + (classBonus.defense || 0),
      health: 100,
      maxHealth: 100
    };

    createCharacterMutation.mutate({
      name: name.trim(),
      class: selectedClass,
      level: 1,
      experience: 0,
      gold: 0,
      unspentPoints: 0,
      currentLocationId: 'starting_village',
      equipment: {},
      inventory: [],
      ...finalStats
    });
  };

  return (
    <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" data-testid="character-creation-modal">
      <div className="pixel-border bg-card p-6 max-w-md w-full">
        <h2 className="text-accent text-center mb-6">CREATE CHARACTER</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="block text-xs mb-2">CHARACTER NAME</Label>
            <Input 
              type="text" 
              className="pixel-border bg-background text-foreground w-full p-2 text-xs" 
              placeholder="Enter hero name" 
              maxLength={12}
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-character-name"
            />
          </div>

          <div>
            <Label className="block text-xs mb-2">CLASS</Label>
            <div className="grid grid-cols-2 gap-2">
              {CLASSES.map((cls) => (
                <Button
                  key={cls.id}
                  type="button"
                  className={`pixel-button pixel-border p-2 text-xs ${
                    selectedClass === cls.id ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'
                  }`}
                  onClick={() => setSelectedClass(cls.id)}
                  data-testid={`button-class-${cls.id}`}
                >
                  {cls.icon} {cls.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="block text-xs mb-2">
              STAT POINTS: <span className="text-accent">{availablePoints}</span> 
              <span className="ml-2 text-xs text-muted-foreground">
                (Total: {Object.values(stats).reduce((a, b) => a + b, 0)})
              </span>
              <span className="block mt-1 text-[10px] text-muted-foreground">You can leave points unspent and allocate them later.</span>
            </Label>
            <div className="space-y-2">
              {Object.entries(stats).map(([stat, value]) => (
                <div key={stat} className="flex justify-between items-center">
                  <span className="text-xs uppercase">{stat}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      className="pixel-button pixel-border bg-destructive text-destructive-foreground w-6 h-6 text-xs"
                      onClick={() => adjustStat(stat as keyof typeof stats, -1)}
                      disabled={value <= 5}
                      data-testid={`button-decrease-${stat}`}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center text-xs" data-testid={`text-${stat}-value`}>{value}</span>
                    <Button
                      type="button"
                      className="pixel-button pixel-border bg-secondary text-secondary-foreground w-6 h-6 text-xs"
                      onClick={() => adjustStat(stat as keyof typeof stats, 1)}
                      disabled={value >= 25 || availablePoints <= 0}
                      data-testid={`button-increase-${stat}`}
                    >
                      +
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              className="pixel-button pixel-border bg-destructive text-destructive-foreground flex-1 py-2 text-xs"
              onClick={() => dispatch({ type: 'TOGGLE_CHARACTER_CREATION' })}
              data-testid="button-cancel"
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              className="pixel-button pixel-border bg-accent text-accent-foreground flex-1 py-2 text-xs"
              disabled={!name.trim() || !selectedClass || createCharacterMutation.isPending}
              data-testid="button-create"
            >
              {createCharacterMutation.isPending ? 'CREATING...' : 'CREATE'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
