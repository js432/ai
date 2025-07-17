// Base agent class that all agents inherit from

import { callAPI } from '../utils/api.js';

export class BaseAgent {
  /**
   * Creates a new agent
   * @param {Object} config - Agent configuration
   */
  constructor(config = {}) {
    this.id = config.id || this.constructor.name.toLowerCase();
    this.name = config.name || this.constructor.name;
    this.description = config.description || 'A Hermes-X agent';
    this.config = config;
    this.initialized = false;
    this.memory = [];
  }
  
  /**
   * Initializes the agent
   * @returns {Promise<boolean>} - Success status
   */
  async init() {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Load agent state from memory if available
      const agentMemory = await this.loadMemory();
      
      if (agentMemory && agentMemory.length > 0) {
        this.memory = agentMemory;
        console.log(`Loaded ${agentMemory.length} memory entries for ${this.name}`);
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error(`Error initializing ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Processes a prompt
   * @param {string} prompt - The prompt to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Processing result
   */
  async process(prompt, options = {}) {
    if (!this.initialized) {
      throw new Error(`Agent ${this.name} not initialized`);
    }
    
    try {
      // Save prompt to memory
      await this.saveToMemory({
        type: 'prompt',
        data: {
          prompt,
          options,
          timestamp: new Date().toISOString()
        }
      });
      
      // Process the prompt (to be implemented by subclasses)
      const result = await this._processPrompt(prompt, options);
      
      // Save result to memory
      await this.saveToMemory({
        type: 'result',
        data: {
          prompt,
          result,
          timestamp: new Date().toISOString()
        }
      });
      
      return result;
    } catch (error) {
      console.error(`Error processing prompt in ${this.name}:`, error);
      
      // Save error to memory
      await this.saveToMemory({
        type: 'error',
        data: {
          prompt,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      });
      
      throw error;
    }
  }
  
  /**
   * Internal method to process a prompt (to be implemented by subclasses)
   * @param {string} prompt - The prompt to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Processing result
   */
  async _processPrompt(prompt, options) {
    throw new Error('_processPrompt must be implemented by subclasses');
  }
  
  /**
   * Calls the AI API with a prompt
   * @param {string} prompt - The prompt to send
   * @param {Object} options - API options
   * @returns {Promise<Object>} - API response
   */
  async callAPI(prompt, options = {}) {
    const apiOptions = {
      model: options.model || window.HermesX.settings.model,
      max_tokens: options.max_tokens || window.HermesX.settings.tokenLimit,
      temperature: options.temperature || 0.7,
      ...options
    };
    
    return callAPI(prompt, apiOptions);
  }
  
  /**
   * Saves data to the agent's memory
   * @param {Object} data - Memory data
   * @returns {Promise<Object>} - Saved memory entry
   */
  async saveToMemory(data) {
    // Add to local memory
    this.memory.push(data);
    
    // Save to global memory
    return window.HermesX.memory.saveMemory({
      agent: this.id,
      ...data
    });
  }
  
  /**
   * Loads the agent's memory from storage
   * @returns {Promise<Array>} - Memory entries
   */
  async loadMemory() {
    return window.HermesX.memory.getMemoryByAgent(this.id);
  }
  
  /**
   * Gets the agent's state
   * @returns {Object} - Agent state
   */
  getState() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      initialized: this.initialized,
      memoryCount: this.memory.length
    };
  }
}