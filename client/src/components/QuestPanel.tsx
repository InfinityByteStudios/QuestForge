import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Quest, CharacterQuest } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGame } from '@/contexts/GameContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface QuestPanelProps {
  characterId: string;
}

export function QuestPanel({ characterId }: QuestPanelProps) {
  const { addToActionLog } = useGame();
  const queryClient = useQueryClient();

  // Fetch all available quests
  const { data: allQuests = [] } = useQuery<Quest[]>({
    queryKey: ['/api/quests'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/quests');
      return response.json();
    }
  });

  // Fetch character's active/completed quests
  const { data: characterQuests = [] } = useQuery<CharacterQuest[]>({
    queryKey: ['/api/characters', characterId, 'quests'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/characters/${characterId}/quests`);
      return response.json();
    },
    enabled: !!characterId
  });

  // Accept quest mutation
  const acceptQuestMutation = useMutation({
    mutationFn: async (questId: string) => {
      const response = await apiRequest('POST', `/api/characters/${characterId}/quests`, {
        questId
      });
      return response.json();
    },
    onSuccess: (data, questId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/characters', characterId, 'quests'] });
      const quest = allQuests.find(q => q.id === questId);
      if (quest) {
        addToActionLog(`Quest accepted: ${quest.title}`, 'info');
      }
    },
    onError: (error: any) => {
      addToActionLog(`Failed to accept quest: ${error.message}`, 'error');
    }
  });

  // Abandon quest mutation
  const abandonQuestMutation = useMutation({
    mutationFn: async (characterQuestId: string) => {
      const response = await apiRequest('DELETE', `/api/characters/${characterId}/quests/${characterQuestId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/characters', characterId, 'quests'] });
      addToActionLog('Quest abandoned', 'info');
    }
  });

  // Get quest details by ID
  const getQuestDetails = (questId: string): Quest | undefined => {
    return allQuests.find(q => q.id === questId);
  };

  // Filter quests
  const activeQuests = characterQuests.filter(cq => cq.active && !cq.completed);
  const completedQuests = characterQuests.filter(cq => cq.completed);
  const availableQuestIds = characterQuests.map(cq => cq.questId);
  const availableQuests = allQuests.filter(q => !availableQuestIds.includes(q.id));

  const renderQuestCard = (quest: Quest, characterQuest?: CharacterQuest) => {
    const isActive = characterQuest?.active && !characterQuest?.completed;
    const isCompleted = characterQuest?.completed;
    const progress = characterQuest?.progress || 0;
    const progressPercent = quest.targetAmount > 0 
      ? Math.min(100, (progress / quest.targetAmount) * 100)
      : 0;

    return (
      <Card key={quest.id} className="pixel-border p-4 mb-3 bg-card">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-accent flex items-center gap-2">
              {quest.title}
              {isCompleted && <Badge variant="outline" className="text-[10px]">✓ COMPLETE</Badge>}
              {isActive && <Badge variant="default" className="text-[10px]">ACTIVE</Badge>}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{quest.description}</p>
          </div>
        </div>

        {/* Quest Objective */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">
              {quest.type === 'kill' && `Defeat ${quest.target}`}
              {quest.type === 'collect' && `Collect ${quest.target}`}
              {quest.type === 'explore' && `Explore ${quest.target}`}
            </span>
            <span className="text-accent font-bold">
              {progress} / {quest.targetAmount}
            </span>
          </div>
          
          {/* Progress Bar */}
          {isActive && (
            <div className="w-full bg-muted h-2 pixel-border overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Rewards */}
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground mb-1">REWARDS:</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {quest.reward.experience && (
              <Badge variant="secondary" className="text-[10px]">
                +{quest.reward.experience} EXP
              </Badge>
            )}
            {quest.reward.gold && (
              <Badge variant="secondary" className="text-[10px]">
                +{quest.reward.gold} 💰
              </Badge>
            )}
            {quest.reward.items && quest.reward.items.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {quest.reward.items.length} Item(s)
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          {!characterQuest && (
            <Button
              size="sm"
              className="pixel-button w-full text-xs"
              onClick={() => acceptQuestMutation.mutate(quest.id)}
              disabled={acceptQuestMutation.isPending}
            >
              {acceptQuestMutation.isPending ? 'ACCEPTING...' : 'ACCEPT QUEST'}
            </Button>
          )}
          {isActive && !isCompleted && (
            <Button
              size="sm"
              variant="destructive"
              className="pixel-button w-full text-xs"
              onClick={() => characterQuest && abandonQuestMutation.mutate(characterQuest.id)}
              disabled={abandonQuestMutation.isPending}
            >
              ABANDON
            </Button>
          )}
          {isCompleted && (
            <div className="w-full text-center text-xs text-muted-foreground py-2">
              Quest Completed! ✓
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="pixel-border bg-card p-4 h-full flex flex-col">
      <h2 className="text-accent text-lg mb-4">📜 QUESTS</h2>
      
      <Tabs defaultValue="active" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="active" className="text-xs">
            ACTIVE ({activeQuests.length})
          </TabsTrigger>
          <TabsTrigger value="available" className="text-xs">
            AVAILABLE ({availableQuests.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            COMPLETED ({completedQuests.length})
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="active" className="mt-0">
            {activeQuests.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No active quests. Check the Available tab to accept new quests!
              </div>
            ) : (
              activeQuests.map(cq => {
                const quest = getQuestDetails(cq.questId);
                return quest ? renderQuestCard(quest, cq) : null;
              })
            )}
          </TabsContent>

          <TabsContent value="available" className="mt-0">
            {availableQuests.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No new quests available at the moment. Complete active quests or explore new locations!
              </div>
            ) : (
              availableQuests.map(quest => renderQuestCard(quest))
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            {completedQuests.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No completed quests yet. Start your adventure!
              </div>
            ) : (
              completedQuests.map(cq => {
                const quest = getQuestDetails(cq.questId);
                return quest ? renderQuestCard(quest, cq) : null;
              })
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
