// Voice Recognition Service for Intelligent Kitchen

export interface VoiceCommand {
  command: string;
  action: string;
  parameters?: string[];
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;
  private onCommandCallback?: (command: VoiceCommand) => void;
  private onResultCallback?: (result: VoiceRecognitionResult) => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition is not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const result = event.results[last];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      
      // Always send result - interim or final
      this.onResultCallback?.({
        transcript,
        confidence,
        isFinal: result.isFinal
      });
      
      // Only process command when final
      if (result.isFinal) {
        this.processVoiceCommand(transcript);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Ignore aborted errors - these happen when user manually stops
      if (event.error === 'aborted') {
        return;
      }
      
      let errorMessage = 'Unknown error occurred';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected - try again';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone is not available';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission was denied';
          break;
        case 'network':
          errorMessage = 'Network error occurred';
          break;
        case 'service-not-allowed':
          errorMessage = 'Service is not allowed';
          break;
        default:
          errorMessage = `Error: ${event.error}`;
      }
      
      this.onErrorCallback?.(errorMessage);
      console.error('Speech recognition error:', event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };
  }

  public startListening(): boolean {
    if (!this.recognition) {
      this.onErrorCallback?.('Speech recognition is not supported in your browser');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.onErrorCallback?.('Failed to start speech recognition');
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  public onCommand(callback: (command: VoiceCommand) => void): void {
    this.onCommandCallback = callback;
  }

  public onResult(callback: (result: VoiceRecognitionResult) => void): void {
    this.onResultCallback = callback;
  }

  public onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  private processVoiceCommand(transcript: string): void {
    const normalizedText = transcript.toLowerCase().trim();
    
    // Meal Planning Commands - check these first as they're more specific
    // Pattern: "add [food] as/for [meal] on/for [day]"
    const mealPlanMatch = normalizedText.match(/(?:add|set|plan|schedule)\s+(.+?)\s+(?:as|for)\s+(breakfast|lunch|dinner|snack)\s+(?:on|for)?\s*(.+)?/i);
    if (mealPlanMatch) {
      const [, food, mealType, dateStr] = mealPlanMatch;
      this.onCommandCallback?.({
        command: 'add_meal',
        action: 'add_meal',
        parameters: [food.trim(), mealType.trim(), dateStr?.trim() || 'today']
      });
      return;
    }

    // Pattern: "[food] for [meal] [day]"
    const simpleMealMatch = normalizedText.match(/^(.+?)\s+for\s+(breakfast|lunch|dinner|snack)\s+(?:on\s+)?(.+)?$/i);
    if (simpleMealMatch) {
      const [, food, mealType, dateStr] = simpleMealMatch;
      this.onCommandCallback?.({
        command: 'add_meal',
        action: 'add_meal',
        parameters: [food.trim(), mealType.trim(), dateStr?.trim() || 'today']
      });
      return;
    }

    // Shopping List Commands
    if (this.matchesPattern(normalizedText, ['add', 'put', 'create']) && 
        !normalizedText.includes('breakfast') && 
        !normalizedText.includes('lunch') && 
        !normalizedText.includes('dinner')) {
      const item = this.extractItemFromCommand(normalizedText);
      if (item) {
        this.onCommandCallback?.({
          command: 'add_to_shopping_list',
          action: 'add',
          parameters: [item]
        });
        return;
      }
    }

    if (this.matchesPattern(normalizedText, ['remove', 'delete', 'clear'])) {
      const item = this.extractItemFromCommand(normalizedText);
      if (item) {
        this.onCommandCallback?.({
          command: 'remove_from_shopping_list',
          action: 'remove',
          parameters: [item]
        });
        return;
      }
    }

    if (this.matchesPattern(normalizedText, ['check off', 'mark done', 'complete'])) {
      const item = this.extractItemFromCommand(normalizedText);
      if (item) {
        this.onCommandCallback?.({
          command: 'check_off_item',
          action: 'check',
          parameters: [item]
        });
        return;
      }
    }

    if (this.matchesPattern(normalizedText, ['consolidate', 'merge', 'combine'])) {
      this.onCommandCallback?.({
        command: 'consolidate_shopping_list',
        action: 'consolidate',
        parameters: []
      });
      return;
    }

    // Navigation Commands
    if (this.matchesPattern(normalizedText, ['plan meals', 'meal plan', 'go to meal', 'open meal'])) {
      this.onCommandCallback?.({
        command: 'plan_meals',
        action: 'navigate',
        parameters: ['meal-planning']
      });
      return;
    }

    if (this.matchesPattern(normalizedText, ['recipes', 'recipe book', 'go to recipe', 'open recipe'])) {
      this.onCommandCallback?.({
        command: 'view_recipes',
        action: 'navigate',
        parameters: ['recipes']
      });
      return;
    }

    if (this.matchesPattern(normalizedText, ['shopping list', 'groceries', 'go to shopping', 'open shopping'])) {
      this.onCommandCallback?.({
        command: 'view_shopping_list',
        action: 'navigate',
        parameters: ['shopping-lists']
      });
      return;
    }

    // Help command
    if (this.matchesPattern(normalizedText, ['help', 'what can i say', 'commands'])) {
      this.speak('You can say: Add cereal for breakfast Friday, Add milk to shopping list, Consolidate list, Go to recipes, or Help');
      this.onCommandCallback?.({
        command: 'help',
        action: 'help',
        parameters: []
      });
      return;
    }

    // Unrecognized - pass through as general command
    this.onCommandCallback?.({
      command: 'unrecognized',
      action: 'unknown',
      parameters: [transcript]
    });
    console.log('Unrecognized command:', transcript);
  }

  private matchesPattern(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }

  private extractItemFromCommand(text: string): string | null {
    // Extract item after the command verb
    const patterns = [
      /(?:add|put|create|remove|delete|clear|check off|mark done|complete)\s+(.+?)(?:\s+(?:to|from)\s+(?:the\s+)?(?:shopping\s+list|list))?$/i,
      /(?:add|put|create|remove|delete|clear|check off|mark done|complete)\s+(.+?)\s+(?:please|now)$/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  public speak(text: string): void {
    if (!this.synthesis) {
      console.warn('Speech synthesis is not supported');
      return;
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    this.synthesis.speak(utterance);
  }

  public getSupportedLanguages(): string[] {
    if (!this.recognition) {
      return [];
    }

    // Common supported languages for speech recognition
    return [
      'en-US',
      'en-GB',
      'en-AU',
      'en-CA',
      'en-IN',
      'en-IE',
      'en-ZA',
      'es-ES',
      'es-MX',
      'fr-FR',
      'fr-CA',
      'de-DE',
      'de-AT',
      'it-IT',
      'pt-BR',
      'ja-JP',
      'ko-KR',
      'zh-CN'
    ];
  }

  public isSupported(): boolean {
    return !!(this.recognition && this.synthesis);
  }
}

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  
  start(): void;
  stop(): void;
  abort(): void;
  
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string | 'no-speech' | 'audio-capture' | 'not-allowed' | 'network' | 'service-not-allowed';
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechGrammarList {
  length: number;
  addFromString(string: string, weight?: number): void;
  addFromURI(src: string, weight?: number): void;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

// Extend Window interface
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const voiceService = new VoiceService();
