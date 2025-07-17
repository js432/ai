// Memory Agent - Manages persistent state and retrieval

import { BaseAgent } from './base_agent.js';

export class MemoryAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: 'MemoryAgent',
      description: 'Manages persistent state and retrieval',
      ...config
    });
  }
  
  /**
   * Processes a memory-related prompt
   * @param {string} prompt - The prompt to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Memory operation result
   */
  async _processPrompt(prompt, options = {}) {
    console.log('MemoryAgent processing prompt:', prompt);
    
    try {
      // Determine the memory operation
      const operation = this._determineMemoryOperation(prompt);
      console.log(`Memory operation: ${operation}`);
      
      let result;
      
      switch (operation) {
        case 'store':
          result = await this._storeMemory(prompt, options);
          break;
          
        case 'retrieve':
          result = await this._retrieveMemory(prompt, options);
          break;
          
        case 'search':
          result = await this._searchMemory(prompt, options);
          break;
          
        case 'summarize':
          result = await this._summarizeMemory(prompt, options);
          break;
          
        default:
          throw new Error(`Unknown memory operation: ${operation}`);
      }
      
      // Save the operation to memory
      await this.saveToMemory({
        type: 'memory_operation',
        data: {
          prompt,
          operation,
          result,
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        operation,
        ...result
      };
    } catch (error) {
      console.error('Error in MemoryAgent:', error);
      throw error;
    }
  }
  
  /**
   * Determines the memory operation from the prompt
   * @param {string} prompt - The prompt text
   * @returns {string} - Memory operation
   */
  _determineMemoryOperation(prompt) {
    const prompt_lower = prompt.toLowerCase();
    
    if (prompt_lower.includes('store') || prompt_lower.includes('save') || prompt_lower.includes('remember')) {
      return 'store';
    } else if (prompt_lower.includes('retrieve') || prompt_lower.includes('get') || prompt_lower.includes('recall')) {
      return 'retrieve';
    } else if (prompt_lower.includes('search') || prompt_lower.includes('find') || prompt_lower.includes('query')) {
      return 'search';
    } else if (prompt_lower.includes('summarize') || prompt_lower.includes('summary')) {
      return 'summarize';
    }
    
    // Default to retrieve
    return 'retrieve';
  }
  
  /**
   * Stores information in memory
   * @param {string} prompt - The prompt text
   * @param {Object} options - Storage options
   * @returns {Promise<Object>} - Storage result
   */
  async _storeMemory(prompt, options = {}) {
    console.log('Storing memory:', prompt);
    
    // Extract key and value from the prompt
    const { key, value } = this._extractKeyValue(prompt, options);
    
    if (!key) {
      throw new Error('No memory key specified');
    }
    
    // Store in the database
    const { db } = window.HermesX;
    
    // Check if the key already exists
    const existingMemory = await db.memory.where('data.key').equals(key).first();
    
    if (existingMemory) {
      // Update existing memory
      await db.memory.update(existingMemory.id, {
        data: {
          ...existingMemory.data,
          value,
          updated: new Date().toISOString()
        }
      });
      
      return {
        key,
        value,
        updated: true
      };
    } else {
      // Create new memory
      const id = await db.memory.add({
        agent: this.id,
        type: 'user_memory',
        data: {
          key,
          value,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      });
      
      return {
        key,
        value,
        id,
        created: true
      };
    }
  }
  
  /**
   * Retrieves information from memory
   * @param {string} prompt - The prompt text
   * @param {Object} options - Retrieval options
   * @returns {Promise<Object>} - Retrieval result
   */
  async _retrieveMemory(prompt, options = {}) {
    console.log('Retrieving memory:', prompt);
    
    // Extract key from the prompt
    const key = this._extractKey(prompt, options);
    
    if (!key) {
      throw new Error('No memory key specified');
    }
    
    // Retrieve from the database
    const { db } = window.HermesX;
    const memory = await db.memory.where('data.key').equals(key).first();
    
    if (!memory) {
      return {
        key,
        found: false,
        error: `Memory not found: ${key}`
      };
    }
    
    return {
      key,
      value: memory.data.value,
      created: memory.data.created,
      updated: memory.data.updated,
      found: true
    };
  }
  
  /**
   * Searches for information in memory
   * @param {string} prompt - The prompt text
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Search result
   */
  async _searchMemory(prompt, options = {}) {
    console.log('Searching memory:', prompt);
    
    // Extract search query from the prompt
    const query = this._extractQuery(prompt, options);
    
    if (!query) {
      throw new Error('No search query specified');
    }
    
    // Search in the database
    const { db } = window.HermesX;
    const memories = await db.memory.toArray();
    
    // Filter memories by query
    const results = memories.filter(memory => {
      // Check if the memory has a key and value
      if (!memory.data || !memory.data.key || !memory.data.value) {
        return false;
      }
      
      // Check if the query matches the key or value
      const key = String(memory.data.key).toLowerCase();
      const value = String(memory.data.value).toLowerCase();
      const queryLower = query.toLowerCase();
      
      return key.includes(queryLower) || value.includes(queryLower);
    });
    
    return {
      query,
      count: results.length,
      results: results.map(memory => ({
        key: memory.data.key,
        value: memory.data.value,
        created: memory.data.created,
        updated: memory.data.updated,
        agent: memory.agent,
        type: memory.type
      }))
    };
  }
  
  /**
   * Summarizes information in memory
   * @param {string} prompt - The prompt text
   * @param {Object} options - Summarization options
   * @returns {Promise<Object>} - Summarization result
   */
  async _summarizeMemory(prompt, options = {}) {
    console.log('Summarizing memory:', prompt);
    
    // Extract agent and type filters from the prompt
    const { agent, type } = this._extractFilters(prompt, options);
    
    // Get memories from the database
    const { db } = window.HermesX;
    let query = db.memory;
    
    if (agent) {
      query = query.where('agent').equals(agent);
    }
    
    if (type) {
      query = query.where('type').equals(type);
    }
    
    const memories = await query.toArray();
    
    // Group memories by agent and type
    const groupedMemories = {};
    
    for (const memory of memories) {
      const agentKey = memory.agent || 'unknown';
      const typeKey = memory.type || 'unknown';
      
      if (!groupedMemories[agentKey]) {
        groupedMemories[agentKey] = {};
      }
      
      if (!groupedMemories[agentKey][typeKey]) {
        groupedMemories[agentKey][typeKey] = [];
      }
      
      groupedMemories[agentKey][typeKey].push(memory);
    }
    
    // Create summary statistics
    const summary = {
      totalMemories: memories.length,
      agentCounts: {},
      typeCounts: {},
      recentMemories: this._getRecentMemories(memories, 5)
    };
    
    // Count memories by agent
    for (const [agentKey, agentMemories] of Object.entries(groupedMemories)) {
      summary.agentCounts[agentKey] = Object.values(agentMemories).flat().length;
    }
    
    // Count memories by type
    for (const memory of memories) {
      const typeKey = memory.type || 'unknown';
      summary.typeCounts[typeKey] = (summary.typeCounts[typeKey] || 0) + 1;
    }
    
    return {
      summary,
      filters: {
        agent,
        type
      }
    };
  }
  
  /**
   * Extracts key and value from a prompt
   * @param {string} prompt - The prompt text
   * @param {Object} options - Extraction options
   * @returns {Object} - Extracted key and value
   */
  _extractKeyValue(prompt, options = {}) {
    // Check if key and value are directly provided in options
    if (options.key) {
      return {
        key: options.key,
        value: options.value
      };
    }
    
    // Extract key and value from the prompt
    const keyValueMatch = prompt.match(/(?:store|save|remember)\s+(?:the\s+)?(?:key\s+)?["']?([^"':]+)["']?\s*(?::|as|with|value)\s*["']?([^"']+)["']?/i);
    
    if (keyValueMatch) {
      return {
        key: keyValueMatch[1].trim(),
        value: keyValueMatch[2].trim()
      };
    }
    
    // Try alternative pattern
    const altMatch = prompt.match(/(?:store|save|remember)\s+(?:that\s+)?["']?([^"']+)["']?/i);
    
    if (altMatch) {
      // Use the matched text as both key and value
      const text = altMatch[1].trim();
      return {
        key: `memory_${Date.now()}`,
        value: text
      };
    }
    
    return {
      key: options.key || `memory_${Date.now()}`,
      value: options.value || prompt
    };
  }
  
  /**
   * Extracts a key from a prompt
   * @param {string} prompt - The prompt text
   * @param {Object} options - Extraction options
   * @returns {string} - Extracted key
   */
  _extractKey(prompt, options = {}) {
    // Check if key is directly provided in options
    if (options.key) {
      return options.key;
    }
    
    // Extract key from the prompt
    const keyMatch = prompt.match(/(?:retrieve|get|recall)\s+(?:the\s+)?(?:key\s+)?["']?([^"']+)["']?/i);
    
    if (keyMatch) {
      return keyMatch[1].trim();
    }
    
    return '';
  }
  
  /**
   * Extracts a search query from a prompt
   * @param {string} prompt - The prompt text
   * @param {Object} options - Extraction options
   * @returns {string} - Extracted query
   */
  _extractQuery(prompt, options = {}) {
    // Check if query is directly provided in options
    if (options.query) {
      return options.query;
    }
    
    // Extract query from the prompt
    const queryMatch = prompt.match(/(?:search|find|query)\s+(?:for\s+)?["']?([^"']+)["']?/i);
    
    if (queryMatch) {
      return queryMatch[1].trim();
    }
    
    // Use the prompt as the query
    return prompt;
  }
  
  /**
   * Extracts agent and type filters from a prompt
   * @param {string} prompt - The prompt text
   * @param {Object} options - Extraction options
   * @returns {Object} - Extracted filters
   */
  _extractFilters(prompt, options = {}) {
    // Check if filters are directly provided in options
    if (options.agent || options.type) {
      return {
        agent: options.agent,
        type: options.type
      };
    }
    
    // Extract agent from the prompt
    const agentMatch = prompt.match(/(?:agent|by)\s+["']?([a-zA-Z]+Agent)["']?/i);
    const agent = agentMatch ? agentMatch[1].trim() : '';
    
    // Extract type from the prompt
    const typeMatch = prompt.match(/(?:type|of type)\s+["']?([a-zA-Z_]+)["']?/i);
    const type = typeMatch ? typeMatch[1].trim() : '';
    
    return {
      agent,
      type
    };
  }
  
  /**
   * Gets the most recent memories
   * @param {Array<Object>} memories - All memories
   * @param {number} count - Number of recent memories to get
   * @returns {Array<Object>} - Recent memories
   */
  _getRecentMemories(memories, count = 5) {
    // Sort memories by timestamp
    const sortedMemories = [...memories].sort((a, b) => {
      const aTime = a.data?.updated || a.data?.created || a.timestamp || '';
      const bTime = b.data?.updated || b.data?.created || b.timestamp || '';
      return new Date(bTime) - new Date(aTime);
    });
    
    // Return the most recent memories
    return sortedMemories.slice(0, count).map(memory => ({
      agent: memory.agent,
      type: memory.type,
      key: memory.data?.key,
      timestamp: memory.data?.updated || memory.data?.created || memory.timestamp
    }));
  }
}