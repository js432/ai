// Exploration Agent - Interacts with API endpoints and iframes

import { BaseAgent } from './base_agent.js';

export class ExplorationAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: 'ExplorationAgent',
      description: 'Interacts with API endpoints and iframes',
      ...config
    });
    
    this.explorationHistory = [];
  }
  
  /**
   * Processes an exploration prompt
   * @param {string} prompt - The prompt to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Exploration result
   */
  async _processPrompt(prompt, options = {}) {
    console.log('ExplorationAgent processing prompt:', prompt);
    
    try {
      // Determine the exploration type
      const explorationType = this._determineExplorationType(prompt);
      
      let result;
      
      switch (explorationType) {
        case 'api':
          result = await this._exploreAPI(prompt, options);
          break;
          
        case 'iframe':
          result = await this._exploreIframe(prompt, options);
          break;
          
        case 'websocket':
          result = await this._exploreWebSocket(prompt, options);
          break;
          
        default:
          throw new Error(`Unknown exploration type: ${explorationType}`);
      }
      
      // Add to exploration history
      this.explorationHistory.push({
        prompt,
        type: explorationType,
        result,
        timestamp: new Date().toISOString()
      });
      
      // Save exploration to memory
      await this.saveToMemory({
        type: 'exploration',
        data: {
          prompt,
          explorationType,
          result,
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        type: explorationType,
        ...result
      };
    } catch (error) {
      console.error('Error in ExplorationAgent:', error);
      
      // Save error to memory
      await this.saveToMemory({
        type: 'exploration_error',
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
   * Determines the type of exploration from the prompt
   * @param {string} prompt - The prompt text
   * @returns {string} - Exploration type
   */
  _determineExplorationType(prompt) {
    const prompt_lower = prompt.toLowerCase();
    
    if (prompt_lower.includes('api') || prompt_lower.includes('endpoint') || prompt_lower.includes('fetch') || prompt_lower.includes('http')) {
      return 'api';
    } else if (prompt_lower.includes('iframe') || prompt_lower.includes('page') || prompt_lower.includes('website') || prompt_lower.includes('browser')) {
      return 'iframe';
    } else if (prompt_lower.includes('websocket') || prompt_lower.includes('socket') || prompt_lower.includes('real-time')) {
      return 'websocket';
    }
    
    // Default to API exploration
    return 'api';
  }
  
  /**
   * Explores an API endpoint
   * @param {string} prompt - The prompt text
   * @param {Object} options - Exploration options
   * @returns {Promise<Object>} - API exploration result
   */
  async _exploreAPI(prompt, options = {}) {
    console.log('Exploring API:', prompt);
    
    // Extract API details from the prompt
    const apiDetails = this._extractAPIDetails(prompt, options);
    
    if (!apiDetails.url) {
      throw new Error('No API URL found in the prompt');
    }
    
    try {
      // Make the API request
      const response = await this._makeAPIRequest(apiDetails);
      
      return {
        url: apiDetails.url,
        method: apiDetails.method,
        headers: apiDetails.headers,
        data: apiDetails.data,
        response: response.data,
        status: response.status,
        success: true
      };
    } catch (error) {
      console.error('API exploration error:', error);
      
      return {
        url: apiDetails.url,
        method: apiDetails.method,
        headers: apiDetails.headers,
        data: apiDetails.data,
        error: error.message,
        success: false
      };
    }
  }
  
  /**
   * Extracts API details from a prompt
   * @param {string} prompt - The prompt text
   * @param {Object} options - Extraction options
   * @returns {Object} - API details
   */
  _extractAPIDetails(prompt, options = {}) {
    // Check if details are directly provided in options
    if (options.url) {
      return {
        url: options.url,
        method: options.method || 'GET',
        headers: options.headers || {},
        data: options.data || null
      };
    }
    
    // Extract URL from the prompt
    const urlMatch = prompt.match(/https?:\/\/[^\s"']+/);
    const url = urlMatch ? urlMatch[0] : '';
    
    // Extract method from the prompt
    const methodMatch = prompt.match(/\b(GET|POST|PUT|DELETE|PATCH)\b/i);
    const method = methodMatch ? methodMatch[0].toUpperCase() : 'GET';
    
    // Extract headers from the prompt
    const headers = {};
    const headerMatches = prompt.matchAll(/([A-Za-z-]+):\s*([^\n]+)/g);
    
    for (const match of headerMatches) {
      const [, key, value] = match;
      headers[key.trim()] = value.trim();
    }
    
    // Extract data from the prompt
    let data = null;
    const jsonMatch = prompt.match(/\{[\s\S]*?\}/);
    
    if (jsonMatch) {
      try {
        data = JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.warn('Failed to parse JSON data from prompt');
      }
    }
    
    return {
      url,
      method,
      headers,
      data
    };
  }
  
  /**
   * Makes an API request
   * @param {Object} apiDetails - API request details
   * @returns {Promise<Object>} - API response
   */
  async _makeAPIRequest(apiDetails) {
    const { url, method, headers, data } = apiDetails;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    let responseData;
    
    try {
      responseData = await response.json();
    } catch (error) {
      responseData = await response.text();
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData
    };
  }
  
  /**
   * Explores a website using an iframe
   * @param {string} prompt - The prompt text
   * @param {Object} options - Exploration options
   * @returns {Promise<Object>} - Iframe exploration result
   */
  async _exploreIframe(prompt, options = {}) {
    console.log('Exploring iframe:', prompt);
    
    // Extract URL from the prompt
    const urlMatch = prompt.match(/https?:\/\/[^\s"']+/);
    const url = options.url || (urlMatch ? urlMatch[0] : '');
    
    if (!url) {
      throw new Error('No URL found in the prompt');
    }
    
    try {
      // Create an iframe for exploration
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Load the URL in the iframe
      const loadPromise = new Promise((resolve, reject) => {
        iframe.onload = () => resolve();
        iframe.onerror = (error) => reject(new Error(`Failed to load iframe: ${error.message}`));
        iframe.src = url;
      });
      
      // Wait for the iframe to load
      await loadPromise;
      
      // Extract information from the iframe
      const result = await this._extractIframeInfo(iframe);
      
      // Clean up
      document.body.removeChild(iframe);
      
      return {
        url,
        ...result,
        success: true
      };
    } catch (error) {
      console.error('Iframe exploration error:', error);
      
      return {
        url,
        error: error.message,
        success: false
      };
    }
  }
  
  /**
   * Extracts information from an iframe
   * @param {HTMLIFrameElement} iframe - The iframe element
   * @returns {Promise<Object>} - Extracted information
   */
  async _extractIframeInfo(iframe) {
    try {
      const iframeWindow = iframe.contentWindow;
      const iframeDocument = iframe.contentDocument || iframeWindow.document;
      
      // Extract title
      const title = iframeDocument.title;
      
      // Extract meta tags
      const metaTags = Array.from(iframeDocument.querySelectorAll('meta')).map(meta => ({
        name: meta.getAttribute('name') || meta.getAttribute('property'),
        content: meta.getAttribute('content')
      }));
      
      // Extract links
      const links = Array.from(iframeDocument.querySelectorAll('a')).map(a => ({
        text: a.textContent.trim(),
        href: a.href
      }));
      
      // Extract text content
      const textContent = iframeDocument.body.textContent.trim();
      
      return {
        title,
        metaTags,
        links: links.slice(0, 20), // Limit to 20 links
        textContent: textContent.substring(0, 1000) // Limit text content
      };
    } catch (error) {
      console.error('Error extracting iframe info:', error);
      throw error;
    }
  }
  
  /**
   * Explores a WebSocket connection
   * @param {string} prompt - The prompt text
   * @param {Object} options - Exploration options
   * @returns {Promise<Object>} - WebSocket exploration result
   */
  async _exploreWebSocket(prompt, options = {}) {
    console.log('Exploring WebSocket:', prompt);
    
    // Extract WebSocket URL from the prompt
    const urlMatch = prompt.match(/wss?:\/\/[^\s"']+/);
    const url = options.url || (urlMatch ? urlMatch[0] : '');
    
    if (!url) {
      throw new Error('No WebSocket URL found in the prompt');
    }
    
    return new Promise((resolve, reject) => {
      try {
        // Create a WebSocket connection
        const socket = new WebSocket(url);
        const messages = [];
        let timeoutId;
        
        // Set a timeout for the exploration
        const timeout = options.timeout || 5000;
        timeoutId = setTimeout(() => {
          socket.close();
          resolve({
            url,
            messages,
            status: 'timeout',
            success: true
          });
        }, timeout);
        
        // Handle WebSocket events
        socket.onopen = () => {
          console.log('WebSocket connection opened');
          
          // Send a message if specified
          if (options.message) {
            socket.send(typeof options.message === 'string' ? options.message : JSON.stringify(options.message));
          }
        };
        
        socket.onmessage = (event) => {
          console.log('WebSocket message received:', event.data);
          
          // Parse the message if possible
          let parsedData;
          try {
            parsedData = JSON.parse(event.data);
          } catch (error) {
            parsedData = event.data;
          }
          
          // Add to messages
          messages.push({
            data: parsedData,
            timestamp: new Date().toISOString()
          });
        };
        
        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          clearTimeout(timeoutId);
          reject(new Error(`WebSocket error: ${error.message || 'Unknown error'}`));
        };
        
        socket.onclose = () => {
          console.log('WebSocket connection closed');
          clearTimeout(timeoutId);
          resolve({
            url,
            messages,
            status: 'closed',
            success: true
          });
        };
      } catch (error) {
        console.error('WebSocket exploration error:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Gets the exploration history
   * @returns {Array<Object>} - Exploration history
   */
  getExplorationHistory() {
    return this.explorationHistory;
  }
  
  /**
   * Clears the exploration history
   */
  clearExplorationHistory() {
    this.explorationHistory = [];
  }
}