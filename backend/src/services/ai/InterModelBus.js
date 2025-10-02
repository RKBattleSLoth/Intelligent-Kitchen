/**
 * Inter-Model Communication Bus
 * Manages data passing between Small, Medium, and Large model tiers
 * Enables collaborative inference where models work together
 */

const { v4: uuidv4 } = require('crypto');

class InterModelBus {
  constructor() {
    this.messageQueue = [];
    this.activeConversations = new Map();
    this.messageHistory = new Map();
  }

  /**
   * Create a new conversation context
   * @param {String} userId - User identifier
   * @returns {String} - Conversation ID
   */
  createConversation(userId) {
    const conversationId = this.generateId();
    this.activeConversations.set(conversationId, {
      id: conversationId,
      userId,
      createdAt: new Date(),
      messages: [],
      models: [],
    });
    return conversationId;
  }

  /**
   * Small Model -> Medium Model: Delegate task for logic/planning
   * @param {String} conversationId
   * @param {Object} task
   * @returns {Object} - Message object
   */
  delegateToLogic(conversationId, task) {
    const message = {
      id: this.generateId(),
      type: 'LOGIC_REQUEST',
      from: 'small',
      to: 'medium',
      conversationId,
      timestamp: new Date(),
      task: {
        intent: task.intent,
        parameters: task.parameters,
        constraints: task.constraints,
        userContext: task.context,
      },
      expectsResponse: true,
    };

    this.addMessage(conversationId, message);
    return message;
  }

  /**
   * Medium Model -> Large Model: Request data processing
   * @param {String} conversationId
   * @param {Object} dataRequest
   * @returns {Object} - Message object
   */
  requestDataProcessing(conversationId, dataRequest) {
    const message = {
      id: this.generateId(),
      type: 'DATA_REQUEST',
      from: 'medium',
      to: 'large',
      conversationId,
      timestamp: new Date(),
      dataRequest: {
        operation: dataRequest.operation, // 'search', 'analyze', 'aggregate', 'vision'
        dataset: dataRequest.dataset, // 'recipes', 'pantry', 'history', 'image'
        filters: dataRequest.filters || {},
        scope: dataRequest.scope || 'full', // 'full', 'summary', 'sample'
        data: dataRequest.data, // actual data to process
      },
      expectsResponse: true,
    };

    this.addMessage(conversationId, message);
    return message;
  }

  /**
   * Large Model -> Medium Model: Return processed data
   * @param {String} conversationId
   * @param {Object} results
   * @returns {Object} - Message object
   */
  returnDataResults(conversationId, results) {
    const message = {
      id: this.generateId(),
      type: 'DATA_RESPONSE',
      from: 'large',
      to: 'medium',
      conversationId,
      timestamp: new Date(),
      results: {
        summary: results.summary,
        detailedData: results.data,
        metadata: {
          itemsProcessed: results.count || 0,
          processingTime: results.time || 0,
          tokensUsed: results.tokens || 0,
        },
      },
    };

    this.addMessage(conversationId, message);
    return message;
  }

  /**
   * Medium Model -> Small Model: Return logic results
   * @param {String} conversationId
   * @param {Object} results
   * @returns {Object} - Message object
   */
  returnLogicResults(conversationId, results) {
    const message = {
      id: this.generateId(),
      type: 'LOGIC_RESPONSE',
      from: 'medium',
      to: 'small',
      conversationId,
      timestamp: new Date(),
      results: {
        decision: results.decision,
        plan: results.plan,
        reasoning: results.reasoning,
        confidence: results.confidence || 0.8,
        toolCalls: results.toolCalls || [],
        data: results.data,
      },
    };

    this.addMessage(conversationId, message);
    return message;
  }

  /**
   * Small Model -> Large Model: Request vision processing
   * @param {String} conversationId
   * @param {Object} visionRequest
   * @returns {Object} - Message object
   */
  requestVisionProcessing(conversationId, visionRequest) {
    const message = {
      id: this.generateId(),
      type: 'VISION_REQUEST',
      from: 'small',
      to: 'large',
      conversationId,
      timestamp: new Date(),
      visionRequest: {
        imageUrls: visionRequest.imageUrls,
        task: visionRequest.task, // 'identify', 'analyze', 'barcode', 'recipe_extraction'
        context: visionRequest.context || '',
      },
      expectsResponse: true,
    };

    this.addMessage(conversationId, message);
    return message;
  }

  /**
   * Add message to conversation history
   * @param {String} conversationId
   * @param {Object} message
   */
  addMessage(conversationId, message) {
    const conversation = this.activeConversations.get(conversationId);
    if (conversation) {
      conversation.messages.push(message);
      
      // Track which models have been used
      if (!conversation.models.includes(message.from)) {
        conversation.models.push(message.from);
      }
    }

    this.messageQueue.push(message);
  }

  /**
   * Get conversation by ID
   * @param {String} conversationId
   * @returns {Object|null}
   */
  getConversation(conversationId) {
    return this.activeConversations.get(conversationId);
  }

  /**
   * Get all messages for a conversation
   * @param {String} conversationId
   * @returns {Array}
   */
  getMessages(conversationId) {
    const conversation = this.activeConversations.get(conversationId);
    return conversation ? conversation.messages : [];
  }

  /**
   * Get models used in conversation
   * @param {String} conversationId
   * @returns {Array}
   */
  getModelsUsed(conversationId) {
    const conversation = this.activeConversations.get(conversationId);
    return conversation ? conversation.models : [];
  }

  /**
   * Clear old conversations (cleanup)
   * @param {Number} maxAgeHours - Maximum age in hours
   */
  cleanupOldConversations(maxAgeHours = 24) {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    for (const [id, conversation] of this.activeConversations.entries()) {
      const age = now - conversation.createdAt;
      if (age > maxAge) {
        this.activeConversations.delete(id);
      }
    }
  }

  /**
   * Generate unique ID
   * @returns {String}
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get conversation summary for debugging
   * @param {String} conversationId
   * @returns {Object}
   */
  getConversationSummary(conversationId) {
    const conversation = this.getConversation(conversationId);
    if (!conversation) return null;

    return {
      id: conversationId,
      userId: conversation.userId,
      createdAt: conversation.createdAt,
      messageCount: conversation.messages.length,
      modelsUsed: conversation.models,
      messageFlow: conversation.messages.map(m => `${m.from}→${m.to} (${m.type})`),
    };
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      activeConversations: this.activeConversations.size,
      totalMessages: this.messageQueue.length,
      averageMessagesPerConversation: this.messageQueue.length / Math.max(this.activeConversations.size, 1),
    };
  }
}

module.exports = InterModelBus;
