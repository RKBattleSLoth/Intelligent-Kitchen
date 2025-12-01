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
    console.log('Processing voice command:', normalizedText);
    
    // Help command - check first
    if (normalizedText.includes('help') || normalizedText.includes('commands')) {
      this.speak('Say: Add milk, Go to recipes, Go to shopping, Consolidate, or Add eggs for breakfast Friday');
      this.onCommandCallback?.({
        command: 'help',
        action: 'help',
        parameters: []
      });
      return;
    }

    // Navigation Commands - check early
    if (normalizedText.includes('recipe')) {
      console.log('Matched: recipes');
      this.onCommandCallback?.({
        command: 'view_recipes',
        action: 'navigate',
        parameters: ['recipes']
      });
      return;
    }

    if (normalizedText.includes('shopping') || normalizedText.includes('groceries')) {
      console.log('Matched: shopping list');
      this.onCommandCallback?.({
        command: 'view_shopping_list',
        action: 'navigate',
        parameters: ['shopping-lists']
      });
      return;
    }

    if (normalizedText.includes('meal plan') || normalizedText.includes('plan meal') || 
        (normalizedText.includes('meal') && normalizedText.includes('go'))) {
      console.log('Matched: meal planning');
      this.onCommandCallback?.({
        command: 'plan_meals',
        action: 'navigate',
        parameters: ['meal-planning']
      });
      return;
    }

    // Consolidate command
    if (normalizedText.includes('consolidate') || normalizedText.includes('merge') || normalizedText.includes('combine')) {
      console.log('Matched: consolidate');
      this.onCommandCallback?.({
        command: 'consolidate_shopping_list',
        action: 'consolidate',
        parameters: []
      });
      return;
    }

    // Meal Planning Commands - "add X for breakfast/lunch/dinner"
    if (normalizedText.includes('breakfast') || normalizedText.includes('lunch') || 
        normalizedText.includes('dinner') || normalizedText.includes('snack')) {
      const mealMatch = normalizedText.match(/(breakfast|lunch|dinner|snack)/i);
      const mealType = mealMatch ? mealMatch[1] : 'dinner';
      
      // Extract food - everything before "for breakfast" or after "add"
      let food = normalizedText
        .replace(/^(add|set|plan|schedule|put)\s+/i, '')
        .replace(/\s+(for|as)\s+(breakfast|lunch|dinner|snack).*/i, '')
        .replace(/\s+(on|for)\s+\w+day.*/i, '')
        .trim();
      
      // Extract date if present
      const dateMatch = normalizedText.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i);
      const dateStr = dateMatch ? dateMatch[1] : 'today';
      
      if (food) {
        console.log('Matched: add meal -', food, mealType, dateStr);
        this.onCommandCallback?.({
          command: 'add_meal',
          action: 'add_meal',
          parameters: [food, mealType, dateStr]
        });
        return;
      }
    }

    // Shopping List - Add item (simple pattern)
    if (normalizedText.startsWith('add ') || normalizedText.startsWith('put ')) {
      const item = normalizedText
        .replace(/^(add|put)\s+/i, '')
        .replace(/\s+(to|on|in)\s+(the\s+)?(shopping\s+)?list$/i, '')
        .replace(/\s+please$/i, '')
        .trim();
      
      if (item) {
        console.log('Matched: add to shopping list -', item);
        this.onCommandCallback?.({
          command: 'add_to_shopping_list',
          action: 'add',
          parameters: [item]
        });
        return;
      }
    }

    // Shopping List - Remove item
    if (normalizedText.startsWith('remove ') || normalizedText.startsWith('delete ')) {
      const item = normalizedText
        .replace(/^(remove|delete)\s+/i, '')
        .replace(/\s+(from\s+)?(the\s+)?(shopping\s+)?list$/i, '')
        .trim();
      
      if (item) {
        console.log('Matched: remove from shopping list -', item);
        this.onCommandCallback?.({
          command: 'remove_from_shopping_list',
          action: 'remove',
          parameters: [item]
        });
        return;
      }
    }

    // Shopping List - Check off item
    if (normalizedText.includes('check') || normalizedText.includes('done') || normalizedText.includes('complete')) {
      const item = normalizedText
        .replace(/^(check off|mark done|complete|check)\s+/i, '')
        .replace(/\s+(from\s+)?(the\s+)?(shopping\s+)?list$/i, '')
        .trim();
      
      if (item) {
        console.log('Matched: check off -', item);
        this.onCommandCallback?.({
          command: 'check_off_item',
          action: 'check',
          parameters: [item]
        });
        return;
      }
    }

    // Clear list
    if (normalizedText.includes('clear') && (normalizedText.includes('list') || normalizedText.includes('all'))) {
      console.log('Matched: clear completed');
      this.onCommandCallback?.({
        command: 'clear_completed',
        action: 'clear',
        parameters: []
      });
      return;
    }

    // Unrecognized
    console.log('Unrecognized command:', transcript);
    this.onCommandCallback?.({
      command: 'unrecognized',
      action: 'unknown',
      parameters: [transcript]
    });
  }

  private matchesPattern(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }

  private extractItemFromCommand(text: string): string | null {
    // Simple extraction - remove command words
    const cleaned = text
      .replace(/^(add|put|create|remove|delete|clear|check off|mark done|complete)\s+/i, '')
      .replace(/\s+(to|from|on|in)\s+(the\s+)?(shopping\s+)?list$/i, '')
      .trim();
    return cleaned || null;
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
