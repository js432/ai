// Sandbox runtime for executing code safely in the browser

/**
 * Initializes the sandbox runtime environment
 * @returns {Promise<Object>} - Sandbox interface
 */
export async function initSandbox() {
  console.log('Initializing sandbox runtime...');
  
  // Create a worker for isolated code execution
  const worker = new Worker(new URL('./sandbox_worker.js', import.meta.url), { type: 'module' });
  
  // Set up message handling
  const messageHandlers = new Map();
  let messageId = 0;
  
  worker.addEventListener('message', (event) => {
    const { id, type, data } = event.data;
    
    if (type === 'result' && messageHandlers.has(id)) {
      const { resolve, reject } = messageHandlers.get(id);
      messageHandlers.delete(id);
      
      if (data.error) {
        reject(new Error(data.error));
      } else {
        resolve(data.result);
      }
    } else if (type === 'console') {
      // Handle console output from the sandbox
      const { method, args } = data;
      console[method](...args);
      
      // Also output to the terminal
      if (window.HermesX && window.HermesX.terminal) {
        const output = args.join(' ');
        if (method === 'error') {
          window.HermesX.terminal.writeln(`\x1b[31m${output}\x1b[0m`);
        } else if (method === 'warn') {
          window.HermesX.terminal.writeln(`\x1b[33m${output}\x1b[0m`);
        } else {
          window.HermesX.terminal.writeln(output);
        }
      }
    }
  });
  
  // Function to send messages to the worker and wait for a response
  function sendMessage(type, data) {
    return new Promise((resolve, reject) => {
      const id = messageId++;
      messageHandlers.set(id, { resolve, reject });
      worker.postMessage({ id, type, data });
    });
  }
  
  // Initialize the Python environment (Pyodide)
  await sendMessage('init', { type: 'python' });
  console.log('Python environment initialized');
  
  // Return the sandbox interface
  return {
    /**
     * Executes code in the sandbox
     * @param {string} code - The code to execute
     * @param {string} language - The language of the code (js, python)
     * @returns {Promise<Object>} - Execution result
     */
    executeCode: async (code, language = 'js') => {
      try {
        const result = await sendMessage('execute', { code, language });
        return result;
      } catch (error) {
        console.error('Error executing code in sandbox:', error);
        throw error;
      }
    },
    
    /**
     * Loads a module into the sandbox
     * @param {string} name - Module name
     * @param {string} url - Module URL or code
     * @param {string} type - Module type (js, python, wasm)
     * @returns {Promise<boolean>} - Success status
     */
    loadModule: async (name, url, type = 'js') => {
      try {
        const result = await sendMessage('load_module', { name, url, type });
        return result;
      } catch (error) {
        console.error(`Error loading module ${name} in sandbox:`, error);
        throw error;
      }
    },
    
    /**
     * Terminates the sandbox
     */
    terminate: () => {
      worker.terminate();
    }
  };
}