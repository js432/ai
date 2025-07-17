import * as monaco from 'monaco-editor';
import { Terminal } from 'xterm';
import Dexie from 'dexie';
import { initCore } from './core/core.js';
import { initAgents } from './agents/agent_loader.js';
import { setupUI } from './ui/ui_manager.js';
import { initSandbox } from './core/sandbox_runtime.js';
import { MemoryManager } from './utils/memory_manager.js';

// Initialize the database
const db = new Dexie('HermesXCore');
db.version(1).stores({
  memory: '++id, agent, timestamp, type, data',
  files: '++id, name, content, timestamp',
  settings: 'key'
});

// Global state
window.HermesX = {
  db,
  activeAgent: 'planner',
  editor: null,
  terminal: null,
  settings: {
    apiEndpoint: 'https://api.deepseek.com/v1/completions',
    apiKey: 'sk-10c48402c68848518e97ac560f0d786c',
    model: 'deepseek',
    tokenLimit: 4096
  },
  memory: null,
  sandbox: null,
  agents: {}
};

// Initialize the application
async function init() {
  console.log('Initializing Hermes-X Core...');
  
  // Load settings from database
  const storedSettings = await db.settings.get('userSettings');
  if (storedSettings) {
    window.HermesX.settings = { ...window.HermesX.settings, ...storedSettings };
  }
  
  // Initialize the editor
  window.HermesX.editor = monaco.editor.create(document.getElementById('editor'), {
    value: '// Welcome to Hermes-X Core\n// Select an agent to begin',
    language: 'javascript',
    theme: 'vs-dark',
    automaticLayout: true
  });
  
  // Initialize the terminal
  window.HermesX.terminal = new Terminal({
    cursorBlink: true,
    theme: {
      background: '#0f172a',
      foreground: '#e2e8f0'
    }
  });
  window.HermesX.terminal.open(document.getElementById('terminal'));
  window.HermesX.terminal.writeln('Hermes-X Core Terminal v0.1.0');
  window.HermesX.terminal.writeln('Type "help" for a list of commands');
  
  // Initialize the memory manager
  window.HermesX.memory = new MemoryManager(db);
  
  // Initialize the sandbox runtime
  window.HermesX.sandbox = await initSandbox();
  
  // Initialize the core system
  await initCore();
  
  // Initialize the agents
  await initAgents();
  
  // Setup UI event handlers
  setupUI();
  
  console.log('Hermes-X Core initialized successfully');
}

// Start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Handle errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  window.HermesX.terminal.writeln(`\x1b[31mError: ${event.error.message}\x1b[0m`);
});