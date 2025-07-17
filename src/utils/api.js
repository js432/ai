// API utility for calling the AI API

/**
 * Calls the AI API with a prompt
 * @param {string} prompt - The prompt to send
 * @param {Object} options - API options
 * @returns {Promise<Object>} - API response
 */
export async function callAPI(prompt, options = {}) {
  console.log('Calling API with prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
  
  // Get API settings
  const apiEndpoint = options.apiEndpoint || window.HermesX.settings.apiEndpoint;
  const apiKey = options.apiKey || window.HermesX.settings.apiKey;
  const model = options.model || window.HermesX.settings.model;
  
  // Prepare request body
  const requestBody = {
    model,
    prompt,
    max_tokens: options.max_tokens || window.HermesX.settings.tokenLimit,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
    top_p: options.top_p !== undefined ? options.top_p : 1,
    n: options.n || 1,
    stream: options.stream || false,
    stop: options.stop || null
  };
  
  try {
    // Make API request
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`API request failed: ${response.status} ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
    }
    
    const data = await response.json();
    
    // Process the response
    return {
      text: data.choices[0].text,
      model: data.model,
      usage: data.usage,
      raw: data
    };
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

/**
 * Calls the API with streaming
 * @param {string} prompt - The prompt to send
 * @param {function} onChunk - Callback for each chunk
 * @param {Object} options - API options
 * @returns {Promise<Object>} - API response
 */
export async function streamAPI(prompt, onChunk, options = {}) {
  console.log('Streaming API with prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
  
  // Get API settings
  const apiEndpoint = options.apiEndpoint || window.HermesX.settings.apiEndpoint;
  const apiKey = options.apiKey || window.HermesX.settings.apiKey;
  const model = options.model || window.HermesX.settings.model;
  
  // Prepare request body
  const requestBody = {
    model,
    prompt,
    max_tokens: options.max_tokens || window.HermesX.settings.tokenLimit,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
    top_p: options.top_p !== undefined ? options.top_p : 1,
    n: options.n || 1,
    stream: true,
    stop: options.stop || null
  };
  
  try {
    // Make API request
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`API request failed: ${response.status} ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
    }
    
    // Process the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      // Decode the chunk
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      let lineEnd;
      while ((lineEnd = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, lineEnd);
        buffer = buffer.slice(lineEnd + 1);
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            break;
          }
          
          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices[0].text;
            
            if (text) {
              fullText += text;
              onChunk(text, fullText);
            }
          } catch (error) {
            console.warn('Error parsing stream data:', error);
          }
        }
      }
    }
    
    return {
      text: fullText,
      model,
      streaming: true
    };
  } catch (error) {
    console.error('API streaming error:', error);
    throw error;
  }
}