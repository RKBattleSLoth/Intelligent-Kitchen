/**
 * AI Chat Redux Slice
 * Manages AI chat state, messages, and conversations
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { aiService, ChatMessage, ChatResponse, UsageStats } from '../../services/aiService';

interface AIState {
  isOpen: boolean;
  isMinimized: boolean;
  conversationId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  usageStats: UsageStats | null;
  isLoadingStats: boolean;
}

const initialState: AIState = {
  isOpen: false,
  isMinimized: false,
  conversationId: null,
  messages: [],
  isLoading: false,
  error: null,
  usageStats: null,
  isLoadingStats: false,
};

// Async thunks
export const sendMessage = createAsyncThunk(
  'ai/sendMessage',
  async ({ message, conversationId }: { message: string; conversationId?: string }, { rejectWithValue }) => {
    try {
      const response = await aiService.chat(message, conversationId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const sendImageMessage = createAsyncThunk(
  'ai/sendImageMessage',
  async (
    { message, image, conversationId }: { message: string; image: File; conversationId?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await aiService.chatWithImage(message, image, conversationId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUsageStats = createAsyncThunk(
  'ai/fetchUsageStats',
  async (period: string = '30d', { rejectWithValue }) => {
    try {
      const stats = await aiService.getUsageStats(period);
      return stats;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const analyzePantry = createAsyncThunk(
  'ai/analyzePantry',
  async (
    { preferences, constraints }: { preferences?: string; constraints?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await aiService.analyzePantry(preferences, constraints);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const generateMealPlan = createAsyncThunk(
  'ai/generateMealPlan',
  async (
    {
      duration = 7,
      mealsPerDay = ['breakfast', 'lunch', 'dinner'],
      constraints,
    }: {
      duration?: number;
      mealsPerDay?: string[];
      constraints?: any;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await aiService.generateMealPlan(duration, mealsPerDay, constraints);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    openChat: (state) => {
      state.isOpen = true;
      state.isMinimized = false;
    },
    closeChat: (state) => {
      state.isOpen = false;
    },
    toggleChat: (state) => {
      state.isOpen = !state.isOpen;
      if (state.isOpen) {
        state.isMinimized = false;
      }
    },
    minimizeChat: (state) => {
      state.isMinimized = true;
    },
    maximizeChat: (state) => {
      state.isMinimized = false;
    },
    clearMessages: (state) => {
      state.messages = [];
      state.conversationId = null;
    },
    addUserMessage: (state, action: PayloadAction<string>) => {
      const message: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: action.payload,
        timestamp: new Date().toISOString(),
      };
      state.messages.push(message);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Send message
    builder
      .addCase(sendMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversationId = action.payload.conversationId;
        
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: action.payload.message,
          timestamp: new Date().toISOString(),
          metadata: action.payload.metadata,
        };
        state.messages.push(assistantMessage);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Send image message
    builder
      .addCase(sendImageMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendImageMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversationId = action.payload.conversationId;
        
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: action.payload.message,
          timestamp: new Date().toISOString(),
          metadata: action.payload.metadata,
        };
        state.messages.push(assistantMessage);
      })
      .addCase(sendImageMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch usage stats
    builder
      .addCase(fetchUsageStats.pending, (state) => {
        state.isLoadingStats = true;
      })
      .addCase(fetchUsageStats.fulfilled, (state, action) => {
        state.isLoadingStats = false;
        state.usageStats = action.payload;
      })
      .addCase(fetchUsageStats.rejected, (state) => {
        state.isLoadingStats = false;
      });

    // Analyze pantry
    builder
      .addCase(analyzePantry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(analyzePantry.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversationId = action.payload.conversationId;
        
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: action.payload.message,
          timestamp: new Date().toISOString(),
          metadata: action.payload.metadata,
        };
        state.messages.push(assistantMessage);
      })
      .addCase(analyzePantry.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Generate meal plan
    builder
      .addCase(generateMealPlan.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(generateMealPlan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversationId = action.payload.conversationId;
        
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: action.payload.message,
          timestamp: new Date().toISOString(),
          metadata: action.payload.metadata,
        };
        state.messages.push(assistantMessage);
      })
      .addCase(generateMealPlan.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  openChat,
  closeChat,
  toggleChat,
  minimizeChat,
  maximizeChat,
  clearMessages,
  addUserMessage,
  clearError,
} = aiSlice.actions;

export default aiSlice.reducer;
