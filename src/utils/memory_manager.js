// Memory Manager for storing and retrieving memory

export class MemoryManager {
  /**
   * Creates a new memory manager
   * @param {Dexie} db - Dexie database instance
   */
  constructor(db) {
    this.db = db;
  }
  
  /**
   * Saves a memory entry
   * @param {Object} memory - Memory entry
   * @returns {Promise<number>} - Memory ID
   */
  async saveMemory(memory) {
    if (!memory.agent) {
      throw new Error('Memory must have an agent');
    }
    
    if (!memory.type) {
      throw new Error('Memory must have a type');
    }
    
    // Add timestamp if not present
    if (!memory.timestamp) {
      memory.timestamp = new Date().toISOString();
    }
    
    // Save to database
    const id = await this.db.memory.add(memory);
    
    return id;
  }
  
  /**
   * Gets all memory entries
   * @returns {Promise<Array<Object>>} - Memory entries
   */
  async getAllMemory() {
    return this.db.memory.toArray();
  }
  
  /**
   * Gets memory entries by agent
   * @param {string} agent - Agent ID
   * @param {number} limit - Maximum number of entries to return
   * @returns {Promise<Array<Object>>} - Memory entries
   */
  async getMemoryByAgent(agent, limit = 0) {
    let query = this.db.memory.where('agent').equals(agent);
    
    if (limit > 0) {
      // Sort by timestamp (newest first) and limit
      const allMemories = await query.toArray();
      return allMemories
        .sort((a, b) => {
          const aTime = a.timestamp || a.data?.timestamp || '';
          const bTime = b.timestamp || b.data?.timestamp || '';
          return new Date(bTime) - new Date(aTime);
        })
        .slice(0, limit);
    }
    
    return query.toArray();
  }
  
  /**
   * Gets memory entries by type
   * @param {string} type - Memory type
   * @param {number} limit - Maximum number of entries to return
   * @returns {Promise<Array<Object>>} - Memory entries
   */
  async getMemoryByType(type, limit = 0) {
    let query = this.db.memory.where('type').equals(type);
    
    if (limit > 0) {
      // Sort by timestamp (newest first) and limit
      const allMemories = await query.toArray();
      return allMemories
        .sort((a, b) => {
          const aTime = a.timestamp || a.data?.timestamp || '';
          const bTime = b.timestamp || b.data?.timestamp || '';
          return new Date(bTime) - new Date(aTime);
        })
        .slice(0, limit);
    }
    
    return query.toArray();
  }
  
  /**
   * Searches memory entries
   * @param {string} query - Search query
   * @returns {Promise<Array<Object>>} - Matching memory entries
   */
  async searchMemory(query) {
    if (!query) {
      return [];
    }
    
    const allMemories = await this.db.memory.toArray();
    const queryLower = query.toLowerCase();
    
    return allMemories.filter(memory => {
      // Check agent and type
      if (memory.agent?.toLowerCase().includes(queryLower) || memory.type?.toLowerCase().includes(queryLower)) {
        return true;
      }
      
      // Check data
      if (memory.data) {
        // Convert data to string for searching
        const dataString = JSON.stringify(memory.data).toLowerCase();
        return dataString.includes(queryLower);
      }
      
      return false;
    });
  }
  
  /**
   * Clears all memory
   * @returns {Promise<void>}
   */
  async clearMemory() {
    await this.db.memory.clear();
  }
  
  /**
   * Clears memory for a specific agent
   * @param {string} agent - Agent ID
   * @returns {Promise<number>} - Number of deleted entries
   */
  async clearAgentMemory(agent) {
    return this.db.memory.where('agent').equals(agent).delete();
  }
  
  /**
   * Gets memory statistics
   * @returns {Promise<Object>} - Memory statistics
   */
  async getMemoryStats() {
    const allMemories = await this.db.memory.toArray();
    
    // Count by agent
    const agentCounts = {};
    for (const memory of allMemories) {
      const agent = memory.agent || 'unknown';
      agentCounts[agent] = (agentCounts[agent] || 0) + 1;
    }
    
    // Count by type
    const typeCounts = {};
    for (const memory of allMemories) {
      const type = memory.type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }
    
    // Get most recent memories
    const recentMemories = [...allMemories]
      .sort((a, b) => {
        const aTime = a.timestamp || a.data?.timestamp || '';
        const bTime = b.timestamp || b.data?.timestamp || '';
        return new Date(bTime) - new Date(aTime);
      })
      .slice(0, 5);
    
    return {
      totalCount: allMemories.length,
      agentCounts,
      typeCounts,
      recentMemories
    };
  }
}