import * as monaco from 'monaco-editor';
import { Terminal } from 'xterm';
import Dexie from 'dexie';
import { initCore, executeCommand } from './core/core.js';
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
  agents: {},
  core: { executeCommand }
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
  
  // Add basic terminal command handling
  let currentLine = '';
  window.HermesX.terminal.onData((data) => {
    if (data === '\r') {
      // Enter key pressed
      window.HermesX.terminal.writeln('');
      handleTerminalCommand(currentLine.trim());
      currentLine = '';
      window.HermesX.terminal.write('$ ');
    } else if (data === '\u007f') {
      // Backspace
      if (currentLine.length > 0) {
        currentLine = currentLine.slice(0, -1);
        window.HermesX.terminal.write('\b \b');
      }
    } else {
      // Regular character
      currentLine += data;
      window.HermesX.terminal.write(data);
    }
  });
  
  // Show initial prompt
  window.HermesX.terminal.write('$ ');
  
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

// Terminal command handler
function handleTerminalCommand(command) {
  const terminal = window.HermesX.terminal;
  
  if (!command) {
    return;
  }
  
  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);
  
  switch (cmd) {
    case 'help':
      terminal.writeln('Available commands:');
      terminal.writeln('  help - Show this help message');
      terminal.writeln('  clear - Clear the terminal');
      terminal.writeln('  status - Show system status');
      terminal.writeln('  agents - List all agents');
      terminal.writeln('  memory - Show memory statistics');
      terminal.writeln('  version - Show version information');
      break;
      
    case 'clear':
      terminal.clear();
      terminal.writeln('Hermes-X Core Terminal v0.1.0');
      break;
      
    case 'status':
      terminal.writeln('System Status:');
      terminal.writeln(`  Active Agent: ${window.HermesX.activeAgent}`);
      terminal.writeln(`  Agents Loaded: ${Object.keys(window.HermesX.agents).length}`);
      terminal.writeln(`  Memory Initialized: ${window.HermesX.memory ? 'Yes' : 'No'}`);
      terminal.writeln(`  Sandbox Initialized: ${window.HermesX.sandbox ? 'Yes' : 'No'}`);
      break;
      
    case 'agents':
      terminal.writeln('Available Agents:');
      for (const [id, agent] of Object.entries(window.HermesX.agents)) {
        terminal.writeln(`  ${id}: ${agent.description}`);
      }
      break;
      
    case 'memory':
      if (window.HermesX.memory) {
        window.HermesX.memory.getMemoryStats().then(stats => {
          terminal.writeln('Memory Statistics:');
          terminal.writeln(`  Total Entries: ${stats.totalCount}`);
          terminal.writeln('  By Agent:');
          for (const [agent, count] of Object.entries(stats.agentCounts)) {
            terminal.writeln(`    ${agent}: ${count}`);
          }
        });
      } else {
        terminal.writeln('Memory not initialized');
      }
      break;
      
    case 'version':
      terminal.writeln('Hermes-X Core v0.1.0');
      terminal.writeln('Built with Vite, TailwindCSS, Monaco Editor, and xterm.js');
      break;
      
    default:
      terminal.writeln(`Unknown command: ${cmd}`);
      terminal.writeln('Type "help" for a list of available commands');
      break;
  }
}

// Start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Handle errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  if (window.HermesX && window.HermesX.terminal) {
    const errorMessage = event.error?.message || event.message || 'Unknown error';
    window.HermesX.terminal.writeln(`\x1b[31mError: ${errorMessage}\x1b[0m`);
  }
});