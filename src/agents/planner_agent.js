// Planner Agent - Interprets prompts and decomposes them into subtasks

import { BaseAgent } from './base_agent.js';

export class PlannerAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: 'PlannerAgent',
      description: 'Interprets prompts and decomposes them into subtasks',
      ...config
    });
  }
  
  /**
   * Processes a prompt to create a plan
   * @param {string} prompt - The prompt to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Plan result
   */
  async _processPrompt(prompt, options = {}) {
    console.log('PlannerAgent processing prompt:', prompt);
    
    // Create a system prompt for the planner
    const systemPrompt = `
You are the PlannerAgent in the Hermes-X Core system.
Your role is to interpret user prompts and decompose them into subtasks that can be executed by other agents.

Given the following prompt, create a detailed execution plan with the following structure:
1. Analyze the prompt to understand the user's intent
2. Break down the task into logical subtasks
3. Assign each subtask to the appropriate agent:
   - PlannerAgent: Task planning and coordination
   - CoderAgent: Writing code in Python, JavaScript, or other languages
   - LogicAgent: Handling complex reasoning and optimization
   - RuntimeAgent: Executing code and capturing output
   - ExplorationAgent: Interacting with external APIs or iframes
   - ExploitMapperAgent: Security analysis and vulnerability mapping
   - MemoryAgent: Managing persistent state and retrieval

For each subtask, specify:
- The agent responsible
- A clear description of the task
- Any dependencies on other subtasks
- Expected output format

USER PROMPT: ${prompt}
`;

    try {
      // Call the API to generate a plan
      const response = await this.callAPI(systemPrompt, {
        temperature: 0.7,
        max_tokens: 2000,
        ...options
      });
      
      // Parse the response to extract the plan
      const plan = this._parsePlanFromResponse(response.text);
      
      // Save the plan to memory
      await this.saveToMemory({
        type: 'plan',
        data: {
          prompt,
          plan,
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        plan,
        raw: response.text
      };
    } catch (error) {
      console.error('Error in PlannerAgent:', error);
      throw error;
    }
  }
  
  /**
   * Parses a plan from the API response
   * @param {string} response - API response text
   * @returns {Object} - Structured plan
   */
  _parsePlanFromResponse(response) {
    // Simple parsing for now - in a real implementation, this would be more sophisticated
    const sections = response.split(/\n#{1,3} /);
    
    // Extract subtasks
    const subtasksSection = sections.find(s => s.toLowerCase().includes('subtasks') || s.toLowerCase().includes('tasks'));
    const subtasks = subtasksSection ? this._extractSubtasks(subtasksSection) : [];
    
    // Extract analysis
    const analysisSection = sections.find(s => s.toLowerCase().includes('analysis'));
    const analysis = analysisSection || '';
    
    return {
      analysis: analysis.replace(/^analysis[:\s]*/i, '').trim(),
      subtasks,
      raw: response
    };
  }
  
  /**
   * Extracts subtasks from a section of text
   * @param {string} text - Text containing subtasks
   * @returns {Array<Object>} - Extracted subtasks
   */
  _extractSubtasks(text) {
    const subtasks = [];
    const lines = text.split('\n');
    
    let currentSubtask = null;
    
    for (const line of lines) {
      // Check for a new subtask (numbered or with agent prefix)
      const subtaskMatch = line.match(/^(?:\d+\.|\-|\*)\s*(?:Subtask\s*\d+:)?\s*(.+?)(?:\s*\(([^)]+)\))?$/i);
      const agentMatch = line.match(/^(?:\d+\.|\-|\*)\s*([A-Za-z]+Agent):\s*(.+)$/);
      
      if (subtaskMatch || agentMatch) {
        // Save the previous subtask if it exists
        if (currentSubtask) {
          subtasks.push(currentSubtask);
        }
        
        // Create a new subtask
        if (agentMatch) {
          currentSubtask = {
            agent: agentMatch[1],
            description: agentMatch[2],
            details: []
          };
        } else {
          const description = subtaskMatch[1];
          const agent = subtaskMatch[2] || this._inferAgentFromDescription(description);
          
          currentSubtask = {
            agent,
            description,
            details: []
          };
        }
      } else if (currentSubtask && line.trim()) {
        // Add details to the current subtask
        currentSubtask.details.push(line.trim());
      }
    }
    
    // Add the last subtask if it exists
    if (currentSubtask) {
      subtasks.push(currentSubtask);
    }
    
    return subtasks;
  }
  
  /**
   * Infers the appropriate agent from a task description
   * @param {string} description - Task description
   * @returns {string} - Agent name
   */
  _inferAgentFromDescription(description) {
    const description_lower = description.toLowerCase();
    
    if (description_lower.includes('code') || description_lower.includes('implement') || description_lower.includes('develop')) {
      return 'CoderAgent';
    } else if (description_lower.includes('execute') || description_lower.includes('run')) {
      return 'RuntimeAgent';
    } else if (description_lower.includes('analyze') || description_lower.includes('reason') || description_lower.includes('optimize')) {
      return 'LogicAgent';
    } else if (description_lower.includes('api') || description_lower.includes('request') || description_lower.includes('fetch')) {
      return 'ExplorationAgent';
    } else if (description_lower.includes('security') || description_lower.includes('vulnerability') || description_lower.includes('exploit')) {
      return 'ExploitMapperAgent';
    } else if (description_lower.includes('memory') || description_lower.includes('store') || description_lower.includes('retrieve')) {
      return 'MemoryAgent';
    } else {
      return 'PlannerAgent';
    }
  }
  
  /**
   * Executes a plan by delegating subtasks to appropriate agents
   * @param {Object} plan - The plan to execute
   * @returns {Promise<Object>} - Execution results
   */
  async executePlan(plan) {
    console.log('Executing plan:', plan);
    
    const results = [];
    
    // Execute each subtask in sequence
    for (const subtask of plan.subtasks) {
      console.log(`Executing subtask: ${subtask.description} (${subtask.agent})`);
      
      try {
        // Get the agent
        const agent = window.HermesX.agents[subtask.agent.toLowerCase()];
        
        if (!agent) {
          throw new Error(`Agent not found: ${subtask.agent}`);
        }
        
        // Process the subtask
        const result = await agent.process(subtask.description, {
          context: {
            plan,
            previousResults: results
          }
        });
        
        // Add the result
        results.push({
          agent: subtask.agent,
          description: subtask.description,
          result,
          success: true
        });
        
        console.log(`Subtask completed: ${subtask.description}`);
      } catch (error) {
        console.error(`Error executing subtask: ${subtask.description}`, error);
        
        // Add the error
        results.push({
          agent: subtask.agent,
          description: subtask.description,
          error: error.message,
          success: false
        });
      }
    }
    
    // Save execution results to memory
    await this.saveToMemory({
      type: 'plan_execution',
      data: {
        plan,
        results,
        timestamp: new Date().toISOString()
      }
    });
    
    return {
      plan,
      results,
      success: results.every(r => r.success)
    };
  }
}