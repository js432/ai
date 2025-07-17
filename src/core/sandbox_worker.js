// Web Worker for isolated code execution

// Store for loaded modules
const modules = new Map();

// Flag to track initialization status
let initialized = false;
let pyodide = null;
let pythonAvailable = false;

// Override console methods to relay them to the main thread
const originalConsole = { ...console };
for (const method of ['log', 'info', 'warn', 'error', 'debug']) {
  console[method] = (...args) => {
    // Call the original method
    originalConsole[method](...args);
    
    // Send to main thread
    self.postMessage({
      type: 'console',
      data: {
        method,
        args: args.map(arg => {
          if (arg instanceof Error) {
            return arg.stack || arg.message;
          }
          return String(arg);
        })
      }
    });
  };
}

// Handle messages from the main thread
self.addEventListener('message', async (event) => {
  const { id, type, data } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'init':
        result = await initialize(data.type);
        break;
        
      case 'execute':
        result = await executeCode(data.code, data.language);
        break;
        
      case 'load_module':
        result = await loadModule(data.name, data.url, data.type);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    // Send the result back to the main thread
    self.postMessage({
      id,
      type: 'result',
      data: { result }
    });
  } catch (error) {
    console.error(`Error handling message ${type}:`, error);
    
    // Send the error back to the main thread
    self.postMessage({
      id,
      type: 'result',
      data: { error: error.message || String(error) }
    });
  }
});

/**
 * Initializes the sandbox environment
 * @param {string} type - Environment type (js, python)
 * @returns {Promise<boolean>} - Success status
 */
async function initialize(type) {
  if (initialized) {
    return true;
  }
  
  if (type === 'python') {
    // Temporarily disable Python support to avoid initialization issues
    console.warn('Python support temporarily disabled to avoid initialization issues');
    pythonAvailable = false;
    pyodide = null;
    
    /* 
    // TODO: Re-enable when Pyodide loading issues are resolved
    try {
      // Load Pyodide with timeout and retry logic
      if (typeof loadPyodide === 'undefined') {
        console.log('Loading Pyodide script...');
        importScripts('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');
      }
      
      console.log('Initializing Pyodide...');
      pyodide = await Promise.race([
        loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
          stdout: (text) => console.log('Python stdout:', text),
          stderr: (text) => console.error('Python stderr:', text)
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Pyodide initialization timeout')), 30000)
        )
      ]);
      
      // Set up Python environment
      await pyodide.runPythonAsync(`
        import sys
        print("Python", sys.version)
        print("Pyodide initialized successfully")
      `);
      
      console.log('Pyodide initialized successfully');
      pythonAvailable = true;
    } catch (error) {
      console.error('Failed to initialize Pyodide:', error);
      console.warn('Python support disabled due to initialization error');
      pythonAvailable = false;
      pyodide = null;
    }
    */
  }
  
  initialized = true;
  return true;
}

/**
 * Executes code in the sandbox
 * @param {string} code - The code to execute
 * @param {string} language - The language of the code (js, python)
 * @returns {Promise<any>} - Execution result
 */
async function executeCode(code, language) {
  if (!initialized) {
    throw new Error('Sandbox not initialized');
  }
  
  if (language === 'python' || language === 'py') {
    if (!pythonAvailable || !pyodide) {
      return {
        output: 'Python environment not available. Pyodide failed to initialize. Check console for details.',
        type: 'error'
      };
    }
    
    try {
      // Execute Python code
      const result = await pyodide.runPythonAsync(code);
      return {
        output: String(result),
        type: typeof result
      };
    } catch (error) {
      console.error('Python execution error:', error);
      return {
        output: `Python execution error: ${error.message}`,
        type: 'error'
      };
    }
  } else {
    // Execute JavaScript code
    try {
      // Create a function from the code and execute it
      const func = new Function('modules', `
        "use strict";
        ${code}
      `);
      
      const result = func(modules);
      return {
        output: result,
        type: typeof result
      };
    } catch (error) {
      console.error('JavaScript execution error:', error);
      return {
        output: `JavaScript execution error: ${error.message}`,
        type: 'error'
      };
    }
  }
}

/**
 * Loads a module into the sandbox
 * @param {string} name - Module name
 * @param {string} url - Module URL or code
 * @param {string} type - Module type (js, python, wasm)
 * @returns {Promise<boolean>} - Success status
 */
async function loadModule(name, url, type) {
  if (modules.has(name)) {
    console.log(`Module ${name} already loaded`);
    return true;
  }
  
  try {
    let module;
    
    if (type === 'js') {
      // Load JavaScript module
      if (url.startsWith('http')) {
        // Load from URL
        const response = await fetch(url);
        const code = await response.text();
        module = { exports: {} };
        
        // Execute the module code
        const func = new Function('module', 'exports', code);
        func(module, module.exports);
      } else {
        // Treat as code
        module = { exports: {} };
        const func = new Function('module', 'exports', url);
        func(module, module.exports);
      }
    } else if (type === 'python' || type === 'py') {
      if (!pyodide) {
        console.warn('Python environment not available for module loading');
        return false;
      }
      
      if (url.startsWith('http')) {
        // Load from URL
        const response = await fetch(url);
        const code = await response.text();
        
        // Create a Python module
        await pyodide.runPythonAsync(`
          import sys
          from pyodide.ffi import to_js
          
          # Create module
          module_name = "${name}"
          module_code = """${code.replace(/"/g, '\\"')}"""
          
          # Add to sys.modules
          module = type(sys)(module_name)
          sys.modules[module_name] = module
          
          # Execute module code
          exec(module_code, module.__dict__)
        `);
        
        module = {
          type: 'python',
          name
        };
      } else {
        // Treat as code
        await pyodide.runPythonAsync(`
          import sys
          from pyodide.ffi import to_js
          
          # Create module
          module_name = "${name}"
          module_code = """${url.replace(/"/g, '\\"')}"""
          
          # Add to sys.modules
          module = type(sys)(module_name)
          sys.modules[module_name] = module
          
          # Execute module code
          exec(module_code, module.__dict__)
        `);
        
        module = {
          type: 'python',
          name
        };
      }
    } else {
      throw new Error(`Unsupported module type: ${type}`);
    }
    
    // Store the module
    modules.set(name, module);
    console.log(`Module ${name} loaded successfully`);
    
    return true;
  } catch (error) {
    console.error(`Error loading module ${name}:`, error);
    throw error;
  }
}