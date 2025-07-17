// Coder Agent - Writes functional code in various languages

import { BaseAgent } from './base_agent.js';

export class CoderAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: 'CoderAgent',
      description: 'Writes functional code in Python, JavaScript, and other languages',
      ...config
    });
    
    // Language-specific templates
    this.templates = {
      javascript: {
        function: `/**
 * $description
 * $params
 * @returns $returns
 */
function $name($parameters) {
  $body
}`,
        class: `/**
 * $description
 */
class $name {
  /**
   * Creates a new $name
   * $params
   */
  constructor($parameters) {
    $body
  }
  
  $methods
}`
      },
      python: {
        function: `def $name($parameters):
    """
    $description
    
    $params
    
    Returns:
        $returns
    """
    $body`,
        class: `class $name:
    """
    $description
    """
    
    def __init__(self, $parameters):
        """
        Initialize a new $name instance
        
        $params
        """
        $body
    
    $methods`
      }
    };
  }
  
  /**
   * Processes a coding prompt
   * @param {string} prompt - The prompt to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Generated code
   */
  async _processPrompt(prompt, options = {}) {
    console.log('CoderAgent processing prompt:', prompt);
    
    // Determine the language from the prompt or options
    const language = this._inferLanguage(prompt, options.language);
    console.log(`Inferred language: ${language}`);
    
    // Create a system prompt for the coder
    const systemPrompt = `
You are the CoderAgent in the Hermes-X Core system.
Your role is to write clean, efficient, and functional code based on the given requirements.

LANGUAGE: ${language}
REQUIREMENTS: ${prompt}

Please write code that:
1. Is well-structured and follows best practices for ${language}
2. Includes appropriate error handling
3. Is optimized for performance and readability
4. Can be executed in a browser environment (if applicable)
5. Includes brief comments explaining complex logic (but avoid redundant comments)

Return ONLY the code without any additional explanation or markdown formatting.
`;

    try {
      // Call the API to generate code
      const response = await this.callAPI(systemPrompt, {
        temperature: 0.3, // Lower temperature for more deterministic code generation
        max_tokens: 2000,
        ...options
      });
      
      // Extract the code from the response
      const code = this._extractCodeFromResponse(response.text, language);
      
      // Save the code to memory
      await this.saveToMemory({
        type: 'code',
        data: {
          prompt,
          language,
          code,
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        code,
        language,
        raw: response.text
      };
    } catch (error) {
      console.error('Error in CoderAgent:', error);
      throw error;
    }
  }
  
  /**
   * Infers the programming language from the prompt
   * @param {string} prompt - The prompt text
   * @param {string} defaultLanguage - Default language if not inferred
   * @returns {string} - Inferred language
   */
  _inferLanguage(prompt, defaultLanguage = 'javascript') {
    const prompt_lower = prompt.toLowerCase();
    
    // Check for explicit language mentions
    if (prompt_lower.includes('javascript') || prompt_lower.includes('js') || prompt_lower.includes('node')) {
      return 'javascript';
    } else if (prompt_lower.includes('python') || prompt_lower.includes('py')) {
      return 'python';
    } else if (prompt_lower.includes('html') || prompt_lower.includes('css')) {
      return 'html';
    } else if (prompt_lower.includes('go') || prompt_lower.includes('golang')) {
      return 'go';
    } else if (prompt_lower.includes('rust')) {
      return 'rust';
    }
    
    // Check for language-specific syntax patterns
    if (prompt_lower.includes('def ') || prompt_lower.includes('import ') || prompt_lower.includes('class ') && prompt_lower.includes(':')) {
      return 'python';
    } else if (prompt_lower.includes('function') || prompt_lower.includes('const ') || prompt_lower.includes('let ')) {
      return 'javascript';
    }
    
    return defaultLanguage;
  }
  
  /**
   * Extracts code from the API response
   * @param {string} response - API response text
   * @param {string} language - Programming language
   * @returns {string} - Extracted code
   */
  _extractCodeFromResponse(response, language) {
    // Check for code blocks with language specifier
    const codeBlockRegex = new RegExp(`\`\`\`(?:${language})?(.*?)\`\`\``, 'gs');
    const match = response.match(codeBlockRegex);
    
    if (match) {
      // Extract code from the first code block
      return match[0]
        .replace(new RegExp(`\`\`\`(?:${language})?`, 'g'), '')
        .replace(/```$/g, '')
        .trim();
    }
    
    // If no code block is found, return the entire response
    return response.trim();
  }
  
  /**
   * Generates a function based on a template
   * @param {Object} params - Function parameters
   * @param {string} language - Programming language
   * @returns {string} - Generated function code
   */
  generateFunction(params, language = 'javascript') {
    const template = this.templates[language]?.function;
    
    if (!template) {
      throw new Error(`Template not found for language: ${language}`);
    }
    
    // Replace template placeholders
    return template
      .replace('$name', params.name || 'myFunction')
      .replace('$description', params.description || '')
      .replace('$parameters', params.parameters || '')
      .replace('$body', params.body || '')
      .replace('$params', params.paramDocs || '')
      .replace('$returns', params.returns || '');
  }
  
  /**
   * Generates a class based on a template
   * @param {Object} params - Class parameters
   * @param {string} language - Programming language
   * @returns {string} - Generated class code
   */
  generateClass(params, language = 'javascript') {
    const template = this.templates[language]?.class;
    
    if (!template) {
      throw new Error(`Template not found for language: ${language}`);
    }
    
    // Replace template placeholders
    return template
      .replace('$name', params.name || 'MyClass')
      .replace('$description', params.description || '')
      .replace('$parameters', params.parameters || '')
      .replace('$body', params.body || '')
      .replace('$params', params.paramDocs || '')
      .replace('$methods', params.methods || '');
  }
}