import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';

export function ActionLog() {
  const { state, dispatch } = useGame();

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'combat':
        return 'text-destructive';
      case 'success':
        return 'text-accent';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className="pixel-border bg-card p-3">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-accent text-xs">ACTION LOG</h2>
        <Button
          className="pixel-button pixel-border bg-ui text-foreground px-2 py-1 text-xs"
          onClick={() => dispatch({ type: 'CLEAR_ACTION_LOG' })}
          data-testid="button-clear-log"
        >
          CLEAR
        </Button>
      </div>
      <div className="pixel-border bg-background p-2 h-20 overflow-y-auto text-xs space-y-1" data-testid="action-log-content">
        {state.actionLog.length === 0 ? (
          <div className="text-muted-foreground text-center">No recent actions</div>
        ) : (
          state.actionLog.map((entry) => (
            <div key={entry.id} data-testid={`log-entry-${entry.id}`}>
              <span className="text-accent">[{entry.timestamp}]</span>{' '}
              <span className={getMessageColor(entry.type)}>{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
