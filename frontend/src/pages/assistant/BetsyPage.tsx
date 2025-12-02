import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { voiceService } from '../../services/voiceService';
import { shoppingListService } from '../../services/shoppingListService';
import { betsyService, BetsyInterpretation } from '../../services/betsyService';

interface Message {
  id: string;
  role: 'user' | 'betsy';
  content: string;
  timestamp: Date;
  action?: {
    type: string;
    details: string;
    success: boolean;
  };
}

const STORAGE_KEY = 'betsy-conversation-history';

export const BetsyPage: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversation history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch (e) {
        console.error('Failed to load conversation history:', e);
      }
    } else {
      // Add welcome message
      addBetsyMessage("Hi! I'm Betsy, your kitchen assistant. I can help you manage your meal plans, recipes, and shopping lists. Just type or tap the microphone to talk to me!\n\nTry saying: \"Add milk to shopping list\" or \"Go to recipes\"");
    }
  }, []);

  // Save conversation history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100))); // Keep last 100 messages
    }
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up voice recognition
  useEffect(() => {
    const unsubResult = voiceService.onResult((result) => {
      setLiveTranscript(result.transcript);
      if (result.isFinal) {
        setIsListening(false);
        setLiveTranscript('');
        handleUserInput(result.transcript);
      }
    });

    const unsubError = voiceService.onError((error) => {
      setIsListening(false);
      setLiveTranscript('');
      if (error && !error.includes('aborted')) {
        addBetsyMessage(`I had trouble hearing you: ${error}. Please try again.`);
      }
    });

    return () => {
      unsubResult();
      unsubError();
      voiceService.stopListening();
    };
  }, []);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const addUserMessage = (content: string) => {
    const msg: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, msg]);
  };

  const addBetsyMessage = (content: string, action?: Message['action']) => {
    const msg: Message = {
      id: generateId(),
      role: 'betsy',
      content,
      timestamp: new Date(),
      action
    };
    setMessages(prev => [...prev, msg]);
  };

  const handleUserInput = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    addUserMessage(trimmed);
    setIsProcessing(true);
    setInputText('');

    try {
      await processCommand(trimmed.toLowerCase());
    } catch (error) {
      addBetsyMessage("Sorry, something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processCommand = async (text: string) => {
    // Clear history is handled locally (no LLM needed)
    if (text.toLowerCase().includes('clear') && text.toLowerCase().includes('history')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      addBetsyMessage("I've cleared our conversation history. Fresh start!");
      return;
    }

    // Use LLM to interpret the command
    const interpretation = await betsyService.interpret(text);
    console.log('[BetsyPage] Interpretation:', interpretation);

    // Execute based on intent
    await executeIntent(interpretation);
  };

  const executeIntent = async (interpretation: BetsyInterpretation) => {
    const { intent, entities, response, confidence } = interpretation;

    switch (intent) {
      case 'add_shopping_item':
        if (entities.items && entities.items.length > 0) {
          try {
            const addedItems: string[] = [];
            for (const item of entities.items) {
              const itemText = formatShoppingItem(item);
              await shoppingListService.addShoppingListItem(itemText);
              addedItems.push(itemText);
            }
            addBetsyMessage(response || `Done! I've added ${addedItems.join(', ')} to your shopping list.`, {
              type: 'shopping_list',
              details: `Added: ${addedItems.join(', ')}`,
              success: true
            });
          } catch (e) {
            addBetsyMessage(`I had trouble adding items to the list. Please try again.`, {
              type: 'shopping_list',
              details: 'Failed to add items',
              success: false
            });
          }
        } else {
          addBetsyMessage(response || "I couldn't identify what to add. Please try again.");
        }
        break;

      case 'navigate':
        const destinations: Record<string, { path: string; label: string }> = {
          recipes: { path: '/recipes', label: 'Recipes' },
          shopping_list: { path: '/shopping-lists', label: 'Shopping List' },
          meal_planning: { path: '/meal-planning', label: 'Meal Planning' }
        };
        const dest = destinations[entities.destination || ''];
        if (dest) {
          addBetsyMessage(response || `Taking you to ${dest.label}!`, {
            type: 'navigate',
            details: dest.label,
            success: true
          });
          setTimeout(() => navigate(dest.path), 500);
        } else {
          addBetsyMessage("I'm not sure where you want to go. Try 'recipes', 'shopping list', or 'meal planning'.");
        }
        break;

      case 'add_meal':
        if (entities.food && entities.mealType) {
          sessionStorage.setItem('pendingMeal', JSON.stringify({
            food: entities.food,
            mealType: entities.mealType,
            dateStr: entities.day || 'today'
          }));
          addBetsyMessage(response || `I'll add "${entities.food}" for ${entities.mealType}. Taking you to the meal planner!`, {
            type: 'meal_plan',
            details: `${entities.food} for ${entities.mealType}${entities.day ? ` on ${entities.day}` : ''}`,
            success: true
          });
          setTimeout(() => navigate('/meal-planning'), 500);
        } else {
          addBetsyMessage("I need to know what food and which meal. Try 'add pancakes for breakfast'.");
        }
        break;

      case 'clear_meals':
        if (entities.timeRange) {
          try {
            const result = await betsyService.clearMeals(entities.timeRange);
            if (result.success) {
              const timeLabel = entities.timeRange.replace('_', ' ');
              addBetsyMessage(
                result.deletedCount > 0 
                  ? `Done! I've cleared ${result.deletedCount} meal${result.deletedCount === 1 ? '' : 's'} for ${timeLabel}.`
                  : `There were no meals to clear for ${timeLabel}.`,
                {
                  type: 'meal_plan',
                  details: `Cleared ${result.deletedCount} meals`,
                  success: true
                }
              );
            } else {
              addBetsyMessage(`I had trouble clearing the meals: ${result.error}`, {
                type: 'meal_plan',
                details: 'Failed to clear meals',
                success: false
              });
            }
          } catch (e) {
            addBetsyMessage("I couldn't clear the meals. Please try again.", {
              type: 'meal_plan',
              details: 'Error clearing meals',
              success: false
            });
          }
        } else {
          addBetsyMessage("I need to know which meals to clear. Try 'clear meals for this week' or 'clear today's meals'.");
        }
        break;

      case 'generate_meals':
        if (entities.timeRange) {
          try {
            const timeLabel = entities.timeRange.replace('_', ' ');
            addBetsyMessage(`Generating meals for ${timeLabel}... This may take a moment.`);
            
            const result = await betsyService.generateMeals(entities.timeRange);
            if (result.success) {
              addBetsyMessage(
                result.mealCount > 0 
                  ? `Done! I've created ${result.mealCount} meal${result.mealCount === 1 ? '' : 's'} for ${timeLabel}. Go to Meal Planning to see them!`
                  : `The meal plan was generated. Go to Meal Planning to see the results!`,
                {
                  type: 'meal_plan',
                  details: `Generated ${result.mealCount} meals`,
                  success: true
                }
              );
            } else {
              addBetsyMessage(`I had trouble generating the meal plan: ${result.error}`, {
                type: 'meal_plan',
                details: 'Failed to generate meals',
                success: false
              });
            }
          } catch (e) {
            addBetsyMessage("I couldn't generate the meal plan. Please try again or use the Meal Planning page directly.", {
              type: 'meal_plan',
              details: 'Error generating meals',
              success: false
            });
          }
        } else {
          addBetsyMessage("I need to know the time range. Try 'generate meals for this week' or 'create meals for tomorrow'.");
        }
        break;

      case 'help':
        addBetsyMessage(
          "Here's what I can help you with:\n\n" +
          "🛒 **Shopping List**\n" +
          "• \"Add a gallon of milk\"\n" +
          "• \"Put eggs, butter, and bread on the list\"\n" +
          "• \"I need 2 dozen eggs\"\n\n" +
          "🍳 **Meal Planning**\n" +
          "• \"Generate meals for this week\"\n" +
          "• \"Plan pancakes for breakfast Saturday\"\n" +
          "• \"Clear all meals for this week\"\n\n" +
          "🧭 **Navigation**\n" +
          "• \"Go to recipes\"\n" +
          "• \"Show me my shopping list\"\n" +
          "• \"Open meal planning\"\n\n" +
          "Just type or tap the microphone!"
        );
        break;

      case 'greeting':
        addBetsyMessage(response || "Hello! I'm Betsy, your kitchen assistant. How can I help you today?");
        break;

      case 'unknown':
      default:
        addBetsyMessage(response || `I'm not sure how to help with that. Try saying "help" to see what I can do!`);
        break;
    }
  };

  const formatShoppingItem = (item: { name: string; quantity?: string; unit?: string }): string => {
    if (item.quantity && item.unit) {
      return `${item.quantity} ${item.unit} ${item.name}`;
    } else if (item.quantity) {
      return `${item.quantity} ${item.name}`;
    }
    return item.name;
  };

  const toggleListening = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      setLiveTranscript('');
    } else {
      const started = voiceService.startListening();
      if (started) {
        setIsListening(true);
      } else {
        addBetsyMessage("Voice recognition isn't available in your browser. Please type your request instead.");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUserInput(inputText);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 120px)',
      maxWidth: '800px',
      margin: '0 auto'
    }
  }, [
    // Header
    React.createElement('div', {
      key: 'header',
      style: {
        textAlign: 'center',
        marginBottom: '1rem'
      }
    }, [
      React.createElement('h1', {
        key: 'title',
        style: { fontSize: '2rem', color: '#f1f5f9', margin: 0 }
      }, '👩‍🍳 Betsy'),
      React.createElement('p', {
        key: 'subtitle',
        style: { color: '#94a3b8', margin: '0.5rem 0 0 0' }
      }, 'Your Kitchen Assistant')
    ]),

    // Messages container
    React.createElement('div', {
      key: 'messages',
      style: {
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        background: '#1e293b',
        borderRadius: '0.75rem',
        marginBottom: '1rem'
      }
    }, [
      ...messages.map(msg => 
        React.createElement('div', {
          key: msg.id,
          style: {
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '1rem'
          }
        }, 
          React.createElement('div', {
            style: {
              maxWidth: '80%',
              padding: '0.75rem 1rem',
              borderRadius: msg.role === 'user' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
              background: msg.role === 'user' ? '#6366f1' : '#334155',
              color: '#f1f5f9'
            }
          }, [
            React.createElement('div', {
              key: 'content',
              style: { whiteSpace: 'pre-wrap' }
            }, msg.content),
            msg.action && React.createElement('div', {
              key: 'action',
              style: {
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: msg.action.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                color: msg.action.success ? '#10b981' : '#ef4444'
              }
            }, `${msg.action.success ? '✓' : '✗'} ${msg.action.details}`),
            React.createElement('div', {
              key: 'time',
              style: {
                fontSize: '0.625rem',
                color: '#64748b',
                marginTop: '0.25rem',
                textAlign: msg.role === 'user' ? 'right' : 'left'
              }
            }, formatTime(msg.timestamp))
          ])
        )
      ),
      // Live transcript while listening
      isListening && liveTranscript && React.createElement('div', {
        key: 'live-transcript',
        style: {
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '1rem'
        }
      },
        React.createElement('div', {
          style: {
            maxWidth: '80%',
            padding: '0.75rem 1rem',
            borderRadius: '1rem 1rem 0 1rem',
            background: '#4f46e5',
            color: '#e0e7ff',
            fontStyle: 'italic',
            opacity: 0.8
          }
        }, liveTranscript + '...')
      ),
      // Processing indicator
      isProcessing && React.createElement('div', {
        key: 'processing',
        style: {
          display: 'flex',
          justifyContent: 'flex-start',
          marginBottom: '1rem'
        }
      },
        React.createElement('div', {
          style: {
            padding: '0.75rem 1rem',
            borderRadius: '1rem 1rem 1rem 0',
            background: '#334155',
            color: '#94a3b8'
          }
        }, '⏳ Thinking...')
      ),
      React.createElement('div', { key: 'scroll-anchor', ref: messagesEndRef })
    ]),

    // Input area
    React.createElement('form', {
      key: 'input-form',
      onSubmit: handleSubmit,
      style: {
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center'
      }
    }, [
      // Voice button
      React.createElement('button', {
        key: 'voice-btn',
        type: 'button',
        onClick: toggleListening,
        style: {
          background: isListening ? '#f97316' : '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          cursor: 'pointer',
          fontSize: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          animation: isListening ? 'pulse 1s ease-in-out infinite' : 'none'
        }
      }, isListening ? '🛑' : '🎤'),

      // Text input
      React.createElement('input', {
        key: 'text-input',
        ref: inputRef,
        type: 'text',
        value: inputText,
        onChange: (e) => setInputText(e.target.value),
        placeholder: isListening ? 'Listening...' : 'Type a message or tap the mic...',
        disabled: isListening || isProcessing,
        style: {
          flex: 1,
          padding: '1rem',
          borderRadius: '1.5rem',
          border: '1px solid #475569',
          background: '#0f172a',
          color: '#f1f5f9',
          fontSize: '1rem',
          outline: 'none'
        }
      }),

      // Send button
      React.createElement('button', {
        key: 'send-btn',
        type: 'submit',
        disabled: !inputText.trim() || isProcessing,
        style: {
          background: inputText.trim() ? '#10b981' : '#475569',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          cursor: inputText.trim() ? 'pointer' : 'not-allowed',
          fontSize: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }
      }, '➤')
    ]),

    // Listening indicator
    isListening && React.createElement('div', {
      key: 'listening-indicator',
      style: {
        textAlign: 'center',
        marginTop: '0.75rem',
        color: '#f97316',
        fontSize: '0.875rem',
        fontWeight: 'bold'
      }
    }, '🎤 Listening... speak now')
  ]);
};

export default BetsyPage;
