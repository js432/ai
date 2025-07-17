// UI Manager for handling UI events and interactions

/**
 * Sets up UI event handlers
 */
export function setupUI() {
  console.log('Setting up UI event handlers...');
  
  // Tab switching
  setupTabs();
  
  // Editor and terminal
  setupEditor();
  setupTerminal();
  
  // Prompt console
  setupPromptConsole();
  
  // Settings modal
  setupSettingsModal();
  
  // Memory viewer modal
  setupMemoryModal();
  
  // File management
  setupFileManagement();
  
  console.log('UI event handlers set up successfully');
}

/**
 * Sets up agent tabs
 */
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('tab-active'));
      
      // Add active class to clicked tab
      tab.classList.add('tab-active');
      
      // Set active agent
      const agent = tab.getAttribute('data-agent');
      window.HermesX.activeAgent = agent;
      
      // Update UI for the selected agent
      updateUIForAgent(agent);
    });
  });
}

/**
 * Updates the UI for the selected agent
 * @param {string} agent - Agent ID
 */
function updateUIForAgent(agent) {
  console.log(`Updating UI for agent: ${agent}`);
  
  // Get the agent instance
  const agentInstance = window.HermesX.agents[agent];
  
  if (!agentInstance) {
    console.error(`Agent not found: ${agent}`);
    return;
  }
  
  // Update console output with agent description
  const consoleOutput = document.getElementById('console-output');
  consoleOutput.innerHTML = `
    <div class="p-2 bg-slate-800 mb-2 rounded">
      <h3 class="font-bold">${agentInstance.name}</h3>
      <p>${agentInstance.description}</p>
    </div>
  `;
  
  // Load recent memory entries for this agent
  loadAgentMemory(agent);
}

/**
 * Loads memory entries for an agent
 * @param {string} agent - Agent ID
 */
async function loadAgentMemory(agent) {
  const consoleOutput = document.getElementById('console-output');
  
  try {
    // Get memory entries for the agent
    const memories = await window.HermesX.memory.getMemoryByAgent(agent, 5);
    
    if (memories.length === 0) {
      consoleOutput.innerHTML += `<div class="text-gray-400 italic">No memory entries found for ${agent}</div>`;
      return;
    }
    
    // Display memory entries
    consoleOutput.innerHTML += `<div class="mt-2 mb-1 font-bold">Recent Activity:</div>`;
    
    for (const memory of memories) {
      const timestamp = new Date(memory.timestamp || memory.data?.timestamp || Date.now()).toLocaleString();
      
      consoleOutput.innerHTML += `
        <div class="p-2 bg-slate-800 mb-2 rounded text-xs">
          <div class="flex justify-between">
            <span class="font-bold">${memory.type}</span>
            <span class="text-gray-400">${timestamp}</span>
          </div>
          <div class="mt-1 overflow-hidden" style="max-height: 100px;">
            ${formatMemoryData(memory.data)}
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error(`Error loading memory for agent ${agent}:`, error);
    consoleOutput.innerHTML += `<div class="text-red-400">Error loading memory: ${error.message}</div>`;
  }
}

/**
 * Formats memory data for display
 * @param {Object} data - Memory data
 * @returns {string} - Formatted HTML
 */
function formatMemoryData(data) {
  if (!data) return '<span class="italic text-gray-400">No data</span>';
  
  if (typeof data === 'string') {
    return `<pre class="whitespace-pre-wrap">${escapeHtml(data)}</pre>`;
  }
  
  if (data.prompt) {
    return `<div><strong>Prompt:</strong> ${escapeHtml(data.prompt)}</div>`;
  }
  
  if (data.code) {
    return `<div><strong>Code:</strong> <pre class="bg-slate-900 p-1 mt-1 overflow-x-auto">${escapeHtml(data.code.substring(0, 200))}${data.code.length > 200 ? '...' : ''}</pre></div>`;
  }
  
  if (data.key && data.value) {
    return `<div><strong>${escapeHtml(data.key)}:</strong> ${escapeHtml(String(data.value).substring(0, 100))}${String(data.value).length > 100 ? '...' : ''}</div>`;
  }
  
  // For other types of data, show a preview
  const json = JSON.stringify(data, null, 2);
  return `<pre class="bg-slate-900 p-1 overflow-x-auto">${escapeHtml(json.substring(0, 200))}${json.length > 200 ? '...' : ''}</pre>`;
}

/**
 * Escapes HTML special characters
 * @param {string} html - HTML string
 * @returns {string} - Escaped HTML
 */
function escapeHtml(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Sets up the editor
 */
function setupEditor() {
  // Editor is already initialized in main.js
  
  // Set up save button
  const saveBtn = document.getElementById('save-btn');
  saveBtn.addEventListener('click', async () => {
    const editor = window.HermesX.editor;
    const fileSelector = document.getElementById('file-selector');
    const selectedFile = fileSelector.value;
    
    if (!selectedFile) {
      alert('Please select or create a file first');
      return;
    }
    
    const content = editor.getValue();
    
    try {
      // Save the file
      await window.HermesX.core.executeCommand('save_file', {
        name: selectedFile,
        content
      });
      
      console.log(`File saved: ${selectedFile}`);
      window.HermesX.terminal.writeln(`File saved: ${selectedFile}`);
    } catch (error) {
      console.error('Error saving file:', error);
      alert(`Error saving file: ${error.message}`);
    }
  });
  
  // Set up new file button
  const newFileBtn = document.getElementById('new-file-btn');
  newFileBtn.addEventListener('click', () => {
    const fileName = prompt('Enter file name:');
    
    if (!fileName) return;
    
    // Add to file selector
    const fileSelector = document.getElementById('file-selector');
    const option = document.createElement('option');
    option.value = fileName;
    option.textContent = fileName;
    fileSelector.appendChild(option);
    
    // Select the new file
    fileSelector.value = fileName;
    
    // Clear the editor
    window.HermesX.editor.setValue('');
    
    console.log(`New file created: ${fileName}`);
    window.HermesX.terminal.writeln(`New file created: ${fileName}`);
  });
  
  // Set up file selector
  const fileSelector = document.getElementById('file-selector');
  fileSelector.addEventListener('change', async () => {
    const selectedFile = fileSelector.value;
    
    if (!selectedFile) {
      window.HermesX.editor.setValue('');
      return;
    }
    
    try {
      // Load the file
      const file = await window.HermesX.core.executeCommand('load_file', {
        name: selectedFile
      });
      
      // Set editor content
      window.HermesX.editor.setValue(file.content);
      
      console.log(`File loaded: ${selectedFile}`);
    } catch (error) {
      console.error('Error loading file:', error);
      window.HermesX.editor.setValue(`// Error loading file: ${error.message}`);
    }
  });
  
  // Load files into selector
  loadFiles();
}

/**
 * Loads files into the file selector
 */
async function loadFiles() {
  try {
    const { db } = window.HermesX;
    const files = await db.files.toArray();
    
    const fileSelector = document.getElementById('file-selector');
    
    // Clear existing options (except the default)
    while (fileSelector.options.length > 1) {
      fileSelector.remove(1);
    }
    
    // Add files to selector
    for (const file of files) {
      const option = document.createElement('option');
      option.value = file.name;
      option.textContent = file.name;
      fileSelector.appendChild(option);
    }
  } catch (error) {
    console.error('Error loading files:', error);
  }
}

/**
 * Sets up the terminal
 */
function setupTerminal() {
  // Terminal is already initialized in main.js
  
  // Set up clear button
  const clearTerminalBtn = document.getElementById('clear-terminal-btn');
  clearTerminalBtn.addEventListener('click', () => {
    window.HermesX.terminal.clear();
  });
}

/**
 * Sets up the prompt console
 */
function setupPromptConsole() {
  const promptInput = document.getElementById('prompt-input');
  const runBtn = document.getElementById('run-btn');
  const clearConsoleBtn = document.getElementById('clear-console-btn');
  const consoleOutput = document.getElementById('console-output');
  
  // Set up run button
  runBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();
    
    if (!prompt) return;
    
    // Disable input while processing
    promptInput.disabled = true;
    runBtn.disabled = true;
    
    // Add prompt to console
    consoleOutput.innerHTML += `
      <div class="p-2 bg-slate-700 mb-2 rounded">
        <div class="font-bold">Prompt:</div>
        <div>${escapeHtml(prompt)}</div>
      </div>
    `;
    
    try {
      // Get the active agent
      const agent = window.HermesX.agents[window.HermesX.activeAgent];
      
      if (!agent) {
        throw new Error(`Agent not found: ${window.HermesX.activeAgent}`);
      }
      
      // Process the prompt
      const result = await agent.process(prompt);
      
      // Add result to console
      consoleOutput.innerHTML += `
        <div class="p-2 bg-slate-800 mb-2 rounded">
          <div class="font-bold">Result:</div>
          <div>${formatResult(result)}</div>
        </div>
      `;
      
      // Scroll to bottom
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    } catch (error) {
      console.error('Error processing prompt:', error);
      
      // Add error to console
      consoleOutput.innerHTML += `
        <div class="p-2 bg-red-900 mb-2 rounded">
          <div class="font-bold">Error:</div>
          <div>${escapeHtml(error.message)}</div>
        </div>
      `;
    } finally {
      // Re-enable input
      promptInput.disabled = false;
      runBtn.disabled = false;
      
      // Clear input
      promptInput.value = '';
      promptInput.focus();
    }
  });
  
  // Set up clear button
  clearConsoleBtn.addEventListener('click', () => {
    consoleOutput.innerHTML = '';
    
    // Update UI for the active agent
    updateUIForAgent(window.HermesX.activeAgent);
  });
  
  // Set up keyboard shortcut (Ctrl+Enter) to run prompt
  promptInput.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
      runBtn.click();
    }
  });
}

/**
 * Formats a result for display
 * @param {Object} result - Result object
 * @returns {string} - Formatted HTML
 */
function formatResult(result) {
  if (!result) return '<span class="italic text-gray-400">No result</span>';
  
  if (typeof result === 'string') {
    return `<pre class="whitespace-pre-wrap">${escapeHtml(result)}</pre>`;
  }
  
  if (result.code) {
    return `<div><strong>Code:</strong> <pre class="bg-slate-900 p-2 mt-1 overflow-x-auto">${escapeHtml(result.code)}</pre></div>`;
  }
  
  if (result.reasoning) {
    let html = '<div class="space-y-2">';
    
    if (result.reasoning.problem) {
      html += `<div><strong>Problem:</strong> ${escapeHtml(result.reasoning.problem)}</div>`;
    }
    
    if (result.reasoning.solution) {
      html += `<div><strong>Solution:</strong> ${escapeHtml(result.reasoning.solution)}</div>`;
    }
    
    if (result.reasoning.steps && result.reasoning.steps.length > 0) {
      html += '<div><strong>Steps:</strong><ol class="list-decimal pl-5 mt-1">';
      for (const step of result.reasoning.steps) {
        html += `<li>${step.title ? `<strong>${escapeHtml(step.title)}:</strong> ` : ''}${escapeHtml(step.description)}</li>`;
      }
      html += '</ol></div>';
    }
    
    html += '</div>';
    return html;
  }
  
  if (result.analysis) {
    let html = '<div class="space-y-2">';
    
    if (result.analysis.vulnerabilities && result.analysis.vulnerabilities.length > 0) {
      html += '<div><strong>Vulnerabilities:</strong><ul class="list-disc pl-5 mt-1">';
      for (const vuln of result.analysis.vulnerabilities) {
        html += `<li><strong>${escapeHtml(vuln.name)}</strong> (${escapeHtml(vuln.category)}): ${escapeHtml(vuln.details.substring(0, 100))}${vuln.details.length > 100 ? '...' : ''}</li>`;
      }
      html += '</ul></div>';
    }
    
    if (result.analysis.mitigations && result.analysis.mitigations.length > 0) {
      html += '<div><strong>Mitigations:</strong><ul class="list-disc pl-5 mt-1">';
      for (const mitigation of result.analysis.mitigations) {
        html += `<li><strong>${escapeHtml(mitigation.name)}</strong>: ${escapeHtml(mitigation.details.substring(0, 100))}${mitigation.details.length > 100 ? '...' : ''}</li>`;
      }
      html += '</ul></div>';
    }
    
    html += '</div>';
    return html;
  }
  
  if (result.plan) {
    let html = '<div class="space-y-2">';
    
    if (result.plan.analysis) {
      html += `<div><strong>Analysis:</strong> ${escapeHtml(result.plan.analysis)}</div>`;
    }
    
    if (result.plan.subtasks && result.plan.subtasks.length > 0) {
      html += '<div><strong>Subtasks:</strong><ol class="list-decimal pl-5 mt-1">';
      for (const task of result.plan.subtasks) {
        html += `<li><strong>${escapeHtml(task.agent)}:</strong> ${escapeHtml(task.description)}</li>`;
      }
      html += '</ol></div>';
    }
    
    html += '</div>';
    return html;
  }
  
  // For other types of results, show as JSON
  const json = JSON.stringify(result, null, 2);
  return `<pre class="bg-slate-900 p-2 overflow-x-auto">${escapeHtml(json)}</pre>`;
}

/**
 * Sets up the settings modal
 */
function setupSettingsModal() {
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettings = document.getElementById('close-settings');
  const saveSettings = document.getElementById('save-settings');
  
  // Load current settings
  const apiEndpoint = document.getElementById('api-endpoint');
  const apiKey = document.getElementById('api-key');
  const modelSelector = document.getElementById('model-selector');
  const tokenLimit = document.getElementById('token-limit');
  
  apiEndpoint.value = window.HermesX.settings.apiEndpoint;
  apiKey.value = window.HermesX.settings.apiKey;
  modelSelector.value = window.HermesX.settings.model;
  tokenLimit.value = window.HermesX.settings.tokenLimit;
  
  // Open settings modal
  settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });
  
  // Close settings modal
  closeSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });
  
  // Save settings
  saveSettings.addEventListener('click', async () => {
    const newSettings = {
      apiEndpoint: apiEndpoint.value,
      apiKey: apiKey.value,
      model: modelSelector.value,
      tokenLimit: parseInt(tokenLimit.value, 10)
    };
    
    // Update settings
    window.HermesX.settings = newSettings;
    
    // Save to database
    try {
      await window.HermesX.db.settings.put({
        key: 'userSettings',
        ...newSettings
      });
      
      console.log('Settings saved');
      window.HermesX.terminal.writeln('Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(`Error saving settings: ${error.message}`);
    }
    
    // Close modal
    settingsModal.classList.add('hidden');
  });
  
  // Close modal when clicking outside
  settingsModal.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
      settingsModal.classList.add('hidden');
    }
  });
}

/**
 * Sets up the memory modal
 */
function setupMemoryModal() {
  const memoryBtn = document.getElementById('memory-btn');
  const memoryModal = document.getElementById('memory-modal');
  const closeMemory = document.getElementById('close-memory');
  
  // Open memory modal
  memoryBtn.addEventListener('click', () => {
    memoryModal.classList.remove('hidden');
    loadMemoryChains();
  });
  
  // Close memory modal
  closeMemory.addEventListener('click', () => {
    memoryModal.classList.add('hidden');
  });
  
  // Close modal when clicking outside
  memoryModal.addEventListener('click', (event) => {
    if (event.target === memoryModal) {
      memoryModal.classList.add('hidden');
    }
  });
}

/**
 * Loads memory chains into the memory viewer
 */
async function loadMemoryChains() {
  const memoryChains = document.getElementById('memory-chains');
  const memoryDetails = document.getElementById('memory-details');
  
  try {
    // Get all memory entries
    const { db } = window.HermesX;
    const memories = await db.memory.toArray();
    
    // Group by agent and type
    const chains = {};
    
    for (const memory of memories) {
      const agent = memory.agent || 'unknown';
      const type = memory.type || 'unknown';
      
      if (!chains[agent]) {
        chains[agent] = {};
      }
      
      if (!chains[agent][type]) {
        chains[agent][type] = [];
      }
      
      chains[agent][type].push(memory);
    }
    
    // Clear existing chains
    memoryChains.innerHTML = '';
    
    // Add chains to the viewer
    for (const [agent, agentChains] of Object.entries(chains)) {
      const agentDiv = document.createElement('div');
      agentDiv.className = 'mb-4';
      
      const agentHeader = document.createElement('div');
      agentHeader.className = 'font-bold text-blue-400 cursor-pointer flex items-center';
      agentHeader.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 transform transition-transform" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
        ${agent}
      `;
      
      const agentContent = document.createElement('div');
      agentContent.className = 'pl-4 mt-1 hidden';
      
      // Add types
      for (const [type, typeMemories] of Object.entries(agentChains)) {
        const typeDiv = document.createElement('div');
        typeDiv.className = 'mb-2';
        
        const typeHeader = document.createElement('div');
        typeHeader.className = 'font-medium cursor-pointer flex items-center';
        typeHeader.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1 transform transition-transform" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          ${type} (${typeMemories.length})
        `;
        
        const typeContent = document.createElement('div');
        typeContent.className = 'pl-3 mt-1 hidden';
        
        // Add memories
        for (const memory of typeMemories) {
          const memoryDiv = document.createElement('div');
          memoryDiv.className = 'text-sm py-1 cursor-pointer hover:bg-slate-700 rounded px-1';
          
          const timestamp = new Date(memory.timestamp || memory.data?.timestamp || Date.now()).toLocaleTimeString();
          
          let label = timestamp;
          if (memory.data?.key) {
            label = `${memory.data.key} (${timestamp})`;
          } else if (memory.data?.prompt) {
            const shortPrompt = memory.data.prompt.substring(0, 20) + (memory.data.prompt.length > 20 ? '...' : '');
            label = `${shortPrompt} (${timestamp})`;
          }
          
          memoryDiv.textContent = label;
          
          // Show memory details when clicked
          memoryDiv.addEventListener('click', () => {
            memoryDetails.textContent = JSON.stringify(memory, null, 2);
            
            // Highlight the selected memory
            document.querySelectorAll('#memory-chains .bg-blue-900').forEach(el => {
              el.classList.remove('bg-blue-900');
            });
            memoryDiv.classList.add('bg-blue-900');
          });
          
          typeContent.appendChild(memoryDiv);
        }
        
        typeDiv.appendChild(typeHeader);
        typeDiv.appendChild(typeContent);
        agentContent.appendChild(typeDiv);
        
        // Toggle type content
        typeHeader.addEventListener('click', () => {
          typeContent.classList.toggle('hidden');
          typeHeader.querySelector('svg').classList.toggle('rotate-90');
        });
      }
      
      agentDiv.appendChild(agentHeader);
      agentDiv.appendChild(agentContent);
      memoryChains.appendChild(agentDiv);
      
      // Toggle agent content
      agentHeader.addEventListener('click', () => {
        agentContent.classList.toggle('hidden');
        agentHeader.querySelector('svg').classList.toggle('rotate-90');
      });
    }
    
    // Show summary in details pane
    memoryDetails.textContent = JSON.stringify({
      totalMemories: memories.length,
      agents: Object.keys(chains),
      timestamp: new Date().toISOString()
    }, null, 2);
  } catch (error) {
    console.error('Error loading memory chains:', error);
    memoryChains.innerHTML = `<div class="text-red-400">Error loading memory: ${error.message}</div>`;
  }
}

/**
 * Sets up file management
 */
function setupFileManagement() {
  // File management is handled in the editor setup
}