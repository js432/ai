// Agent loader for initializing and managing agents

import { PlannerAgent } from './planner_agent.js';
import { CoderAgent } from './coder_agent.js';
import { LogicAgent } from './logic_agent.js';
import { RuntimeAgent } from './runtime_agent.js';
import { ExplorationAgent } from './exploration_agent.js';
import { ExploitMapperAgent } from './exploit_mapper_agent.js';
import { MemoryAgent } from './memory_agent.js';

/**
 * Initializes all agents
 * @returns {Promise<Object>} - Initialized agents
 */
export async function initAgents() {
  console.log('Initializing agents...');
  
  const agents = {
    planner: new PlannerAgent(),
    coder: new CoderAgent(),
    logic: new LogicAgent(),
    runtime: new RuntimeAgent(),
    exploration: new ExplorationAgent(),
    exploit: new ExploitMapperAgent(),
    memory: new MemoryAgent()
  };
  
  // Initialize each agent
  for (const [name, agent] of Object.entries(agents)) {
    console.log(`Initializing ${name} agent...`);
    await agent.init();
    console.log(`${name} agent initialized`);
  }
  
  // Store agents in global state
  window.HermesX.agents = agents;
  
  // Log agent initialization to memory
  await window.HermesX.memory.saveMemory({
    agent: 'system',
    type: 'agent_initialization',
    data: {
      agents: Object.keys(agents),
      timestamp: new Date().toISOString()
    }
  });
  
  console.log('All agents initialized successfully');
  return agents;
}

/**
 * Loads an agent from a JSON configuration
 * @param {Object} config - Agent configuration
 * @returns {Promise<Object>} - Initialized agent
 */
export async function loadAgentFromConfig(config) {
  console.log('Loading agent from config:', config);
  
  if (!config.type || !config.name) {
    throw new Error('Invalid agent configuration: missing type or name');
  }
  
  let AgentClass;
  
  // Determine the agent class based on the type
  switch (config.type.toLowerCase()) {
    case 'planner':
      AgentClass = PlannerAgent;
      break;
    case 'coder':
      AgentClass = CoderAgent;
      break;
    case 'logic':
      AgentClass = LogicAgent;
      break;
    case 'runtime':
      AgentClass = RuntimeAgent;
      break;
    case 'exploration':
      AgentClass = ExplorationAgent;
      break;
    case 'exploit':
    case 'exploitmapper':
      AgentClass = ExploitMapperAgent;
      break;
    case 'memory':
      AgentClass = MemoryAgent;
      break;
    default:
      throw new Error(`Unknown agent type: ${config.type}`);
  }
  
  // Create and initialize the agent
  const agent = new AgentClass(config);
  await agent.init();
  
  // Add to global agents
  const agentId = config.id || config.name.toLowerCase();
  window.HermesX.agents[agentId] = agent;
  
  // Log agent loading to memory
  await window.HermesX.memory.saveMemory({
    agent: 'system',
    type: 'agent_loaded',
    data: {
      id: agentId,
      config,
      timestamp: new Date().toISOString()
    }
  });
  
  return agent;
}