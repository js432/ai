// Core system functionality for Hermes-X

import { callAPI } from '../utils/api.js';

/**
 * Initializes the core system
 */
export async function initCore() {
  console.log('Initializing core system...');
  
  // Register service worker for offline capabilities
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('ServiceWorker registration successful with scope:', registration.scope);
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
    }
  }
  
  // Initialize system state
  await initializeSystemState();
  
  return true;
}

/**
 * Initializes the system state
 */
async function initializeSystemState() {
  const { db } = window.HermesX;
  
  // Check if this is the first run
  const systemState = await db.settings.get('systemState');
  
  if (!systemState) {
    // First run, create initial system state
    await db.settings.put({
      key: 'systemState',
      initialized: true,
      version: '0.1.0',
      lastRun: new Date().toISOString()
    });
    
    // Create initial memory entry
    await window.HermesX.memory.saveMemory({
      agent: 'system',
      type: 'initialization',
      data: {
        message: 'Hermes-X Core initialized',
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('System state initialized');
  } else {
    // Update last run time
    await db.settings.update('systemState', {
      lastRun: new Date().toISOString()
    });
    
    console.log('System state loaded');
  }
}

/**
 * Executes a system command
 * @param {string} command - The command to execute
 * @param {Object} params - Command parameters
 * @returns {Promise<Object>} - Command result
 */
export async function executeCommand(command, params = {}) {
  console.log(`Executing command: ${command}`, params);
  
  // Log command to memory
  await window.HermesX.memory.saveMemory({
    agent: 'system',
    type: 'command',
    data: {
      command,
      params,
      timestamp: new Date().toISOString()
    }
  });
  
  // Execute the command
  let result;
  
  try {
    switch (command) {
      case 'call_api':
        result = await callAPI(params.prompt, params.options);
        break;
        
      case 'save_file':
        result = await saveFile(params.name, params.content);
        break;
        
      case 'load_file':
        result = await loadFile(params.name);
        break;
        
      case 'execute_code':
        result = await window.HermesX.sandbox.executeCode(params.code, params.language);
        break;
        
      default:
        throw new Error(`Unknown command: ${command}`);
    }
    
    // Log result to memory
    await window.HermesX.memory.saveMemory({
      agent: 'system',
      type: 'command_result',
      data: {
        command,
        result,
        timestamp: new Date().toISOString()
      }
    });
    
    return result;
  } catch (error) {
    console.error(`Error executing command ${command}:`, error);
    
    // Log error to memory
    await window.HermesX.memory.saveMemory({
      agent: 'system',
      type: 'command_error',
      data: {
        command,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
    
    throw error;
  }
}

/**
 * Saves a file to the database
 * @param {string} name - File name
 * @param {string} content - File content
 * @returns {Promise<Object>} - File object
 */
async function saveFile(name, content) {
  const { db } = window.HermesX;
  
  // Check if file exists
  const existingFile = await db.files.where('name').equals(name).first();
  
  if (existingFile) {
    // Update existing file
    await db.files.update(existingFile.id, {
      content,
      timestamp: new Date().toISOString()
    });
    
    return {
      id: existingFile.id,
      name,
      updated: true
    };
  } else {
    // Create new file
    const id = await db.files.add({
      name,
      content,
      timestamp: new Date().toISOString()
    });
    
    return {
      id,
      name,
      created: true
    };
  }
}

/**
 * Loads a file from the database
 * @param {string} name - File name
 * @returns {Promise<Object>} - File object
 */
async function loadFile(name) {
  const { db } = window.HermesX;
  
  // Find the file
  const file = await db.files.where('name').equals(name).first();
  
  if (!file) {
    throw new Error(`File not found: ${name}`);
  }
  
  return file;
}