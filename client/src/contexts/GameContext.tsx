import { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, ActionLogEntry } from '@/types/game';

interface GameContextType {
  state: GameState;
  dispatch: (action: GameAction) => void;
  addToActionLog: (message: string, type?: ActionLogEntry['type']) => void;
}

type GameAction = 
  | { type: 'SET_CHARACTER_ID'; payload: string }
  | { type: 'SET_VIEW'; payload: GameState['currentView'] }
  | { type: 'TOGGLE_CHARACTER_CREATION' }
  | { type: 'TOGGLE_INVENTORY' }
  | { type: 'ADD_ACTION_LOG'; payload: ActionLogEntry }
  | { type: 'CLEAR_ACTION_LOG' };

const initialState: GameState = {
  currentView: 'explore',
  showCharacterCreation: false,
  showInventory: false,
  actionLog: []
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_CHARACTER_ID':
      return { ...state, characterId: action.payload };
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'TOGGLE_CHARACTER_CREATION':
      return { ...state, showCharacterCreation: !state.showCharacterCreation };
    case 'TOGGLE_INVENTORY':
      return { ...state, showInventory: !state.showInventory };
    case 'ADD_ACTION_LOG':
      return { 
        ...state, 
        actionLog: [action.payload, ...state.actionLog].slice(0, 50) // Keep last 50 entries
      };
    case 'CLEAR_ACTION_LOG':
      return { ...state, actionLog: [] };
    default:
      return state;
  }
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const addToActionLog = (message: string, type: ActionLogEntry['type'] = 'info') => {
    const entry: ActionLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: 'numeric', 
        minute: '2-digit' 
      }),
      message,
      type
    };
    dispatch({ type: 'ADD_ACTION_LOG', payload: entry });
  };

  return (
    <GameContext.Provider value={{ state, dispatch, addToActionLog }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
