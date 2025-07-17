// Runtime Agent - Executes code and captures output

import { BaseAgent } from './base_agent.js';

export class RuntimeAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: 'RuntimeAgent',
      description: 'Executes code and captures output',
      ...config
    });
    
    this.executionHistory = [];
  }
  
  /**
   * Processes a runtime execution prompt
   * @param {string} prompt - The prompt to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Execution result
   */
  async _processPrompt(prompt, options = {}) {
    console.log('RuntimeAgent processing prompt:', prompt);
    
    try {
      // Extract code and language from the prompt
      const { code, language } = this._extractCodeFromPrompt(prompt, options);
      
      if (!code) {
        throw new Error('No code found in the prompt');
      }
      
      console.log(`Executing ${language} code...`);
      
      // Execute the code
      const result = await this._executeCode(code, language);
      
      // Add to execution history
      this.executionHistory.push({
        code,
        language,
        result,
        timestamp: new Date().toISOString()
      });
      
      // Save execution to memory
      await this.saveToMemory({
        type: 'execution',
        data: {
          code,
          language,
          result,
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        code,
        language,
        output: result.output,
        error: result.error,
        success: !result.error
      };
    } catch (error) {
      console.error('Error in RuntimeAgent:', error);
      
      // Save error to memory
      await this.saveToMemory({
        type: 'execution_error',
        data: {
          prompt,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      });
      
      throw error;
    }
  }
  
  /**
   * Extracts code and language from a prompt
   * @param {string} prompt - The prompt text
   * @param {Object} options - Extraction options
   * @returns {Object} - Extracted code and language
   */
  _extractCodeFromPrompt(prompt, options = {}) {
    // Check if code is directly provided in options
    if (options.code) {
      return {
        code: options.code,
        language: options.language || 'javascript'
      };
    }
    
    // Check for code blocks with language specifier
    const codeBlockRegex = /```(?:([\w-]+)\n)?([\s\S]*?)```/g;
    const matches = [...prompt.matchAll(codeBlockRegex)];
    
    if (matches.length > 0) {
      // Use the first code block
      const [, language, code] = matches[0];
      return {
        code: code.trim(),
        language: language?.trim().toLowerCase() || options.language || 'javascript'
      };
    }
    
    // If no code block is found, treat the entire prompt as code
    return {
      code: prompt.trim(),
      language: options.language || 'javascript'
    };
  }
  
  /**
   * Executes code using the sandbox
   * @param {string} code - The code to execute
   * @param {string} language - The language of the code
   * @returns {Promise<Object>} - Execution result
   */
  async _executeCode(code, language) {
    if (!window.HermesX.sandbox) {
      throw new Error('Sandbox not initialized');
    }
    
    try {
      // Execute the code in the sandbox
      const result = await window.HermesX.sandbox.executeCode(code, language);
      
      return {
        output: result.output,
        type: result.type
      };
    } catch (error) {
      console.error('Error executing code:', error);
      
      return {
        error: error.message || String(error),
        output: null
      };
    }
  }
  
  /**
   * Executes code with specific inputs
   * @param {string} code - The code to execute
   * @param {string} language - The language of the code
   * @param {Array<any>} inputs - Input values for the code
   * @returns {Promise<Object>} - Execution result
   */
  async executeWithInputs(code, language, inputs = []) {
    console.log(`Executing ${language} code with inputs:`, inputs);
    
    // For JavaScript, wrap the code in a function and call it with inputs
    if (language === 'javascript' || language === 'js') {
      const wrappedCode = `
        (function() {
          ${code}
          
          // Call the last defined function with inputs
          const functions = Object.entries(this)
            .filter(([_, value]) => typeof value === 'function')
            .map(([name, _]) => name);
          
          const lastFunction = functions[functions.length - 1];
          if (lastFunction && typeof this[lastFunction] === 'function') {
            return this[lastFunction](...${JSON.stringify(inputs)});
          }
          
          // If no function is found, try to evaluate the code with the inputs
          return eval(\`(function(${inputs.map((_, i) => `input${i}`).join(', ')}) {
            ${code}
          })(${inputs.map((_, i) => `inputs[${i}]`).join(', ')})\`);
        })();
      `;
      
      return this._executeCode(wrappedCode, 'javascript');
    }
    
    // For Python, add input handling
    if (language === 'python' || language === 'py') {
      const inputValues = JSON.stringify(inputs);
      const wrappedCode = `
import json

# Define inputs
inputs = json.loads('${inputValues.replace(/'/g, "\\'")}')

# Original code
${code}

# Try to call the last defined function with inputs
import inspect
functions = [name for name, obj in locals().items() if callable(obj) and not name.startswith('__')]
if functions:
    last_function = functions[-1]
    if callable(locals()[last_function]):
        result = locals()[last_function](*inputs)
        print(f"Result: {result}")
      `;
      
      return this._executeCode(wrappedCode, 'python');
    }
    
    // For other languages, just execute the code as is
    return this._executeCode(code, language);
  }
  
  /**
   * Gets the execution history
   * @returns {Array<Object>} - Execution history
   */
  getExecutionHistory() {
    return this.executionHistory;
  }
  
  /**
   * Clears the execution history
   */
  clearExecutionHistory() {
    this.executionHistory = [];
  }
}