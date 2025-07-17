// Logic Agent - Handles recursive reasoning and optimization

import { BaseAgent } from './base_agent.js';

export class LogicAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: 'LogicAgent',
      description: 'Handles recursive reasoning and optimization',
      ...config
    });
  }
  
  /**
   * Processes a logic prompt
   * @param {string} prompt - The prompt to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Reasoning result
   */
  async _processPrompt(prompt, options = {}) {
    console.log('LogicAgent processing prompt:', prompt);
    
    // Create a system prompt for the logic agent
    const systemPrompt = `
You are the LogicAgent in the Hermes-X Core system.
Your role is to handle complex reasoning, optimization problems, and logical analysis.

TASK: ${prompt}

Please approach this problem systematically:
1. Break down the problem into its core components
2. Identify the key variables and constraints
3. Apply appropriate reasoning techniques (deductive, inductive, abductive)
4. Consider multiple approaches and evaluate their trade-offs
5. Provide a clear, step-by-step solution with justification for each step
6. If applicable, suggest optimizations or improvements

Your response should be structured, logical, and thorough.
`;

    try {
      // Call the API for reasoning
      const response = await this.callAPI(systemPrompt, {
        temperature: 0.4,
        max_tokens: 2000,
        ...options
      });
      
      // Parse the response to extract structured reasoning
      const reasoning = this._parseReasoningFromResponse(response.text);
      
      // Save the reasoning to memory
      await this.saveToMemory({
        type: 'reasoning',
        data: {
          prompt,
          reasoning,
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        reasoning,
        raw: response.text
      };
    } catch (error) {
      console.error('Error in LogicAgent:', error);
      throw error;
    }
  }
  
  /**
   * Parses structured reasoning from the API response
   * @param {string} response - API response text
   * @returns {Object} - Structured reasoning
   */
  _parseReasoningFromResponse(response) {
    // Split the response into sections
    const sections = response.split(/\n#{1,3} /);
    
    // Extract components
    const problemSection = sections.find(s => s.toLowerCase().includes('problem') || s.toLowerCase().includes('breakdown'));
    const approachSection = sections.find(s => s.toLowerCase().includes('approach') || s.toLowerCase().includes('methodology'));
    const solutionSection = sections.find(s => s.toLowerCase().includes('solution'));
    const optimizationSection = sections.find(s => s.toLowerCase().includes('optimization') || s.toLowerCase().includes('improvements'));
    
    return {
      problem: this._cleanSection(problemSection),
      approach: this._cleanSection(approachSection),
      solution: this._cleanSection(solutionSection),
      optimization: this._cleanSection(optimizationSection),
      steps: this._extractSteps(response)
    };
  }
  
  /**
   * Cleans a section of text
   * @param {string} section - Section text
   * @returns {string} - Cleaned section
   */
  _cleanSection(section) {
    if (!section) return '';
    
    // Remove section header
    return section.replace(/^[^:]*:\s*/i, '').trim();
  }
  
  /**
   * Extracts reasoning steps from text
   * @param {string} text - Text containing steps
   * @returns {Array<Object>} - Extracted steps
   */
  _extractSteps(text) {
    const steps = [];
    const stepRegex = /(?:^|\n)(?:Step\s*(\d+)|(\d+)\.)\s*(.+?)(?=\n(?:Step\s*\d+|\d+\.)|$)/gs;
    
    let match;
    while ((match = stepRegex.exec(text)) !== null) {
      const stepNumber = match[1] || match[2];
      const stepContent = match[3].trim();
      
      // Extract the step title and description
      const titleMatch = stepContent.match(/^([^:]+):(.*)/s);
      
      if (titleMatch) {
        steps.push({
          number: parseInt(stepNumber, 10),
          title: titleMatch[1].trim(),
          description: titleMatch[2].trim()
        });
      } else {
        steps.push({
          number: parseInt(stepNumber, 10),
          description: stepContent
        });
      }
    }
    
    return steps;
  }
  
  /**
   * Performs recursive reasoning on a problem
   * @param {string} problem - Problem description
   * @param {number} depth - Maximum recursion depth
   * @returns {Promise<Object>} - Reasoning result
   */
  async recursiveReasoning(problem, depth = 3) {
    console.log(`Starting recursive reasoning on problem: ${problem} (depth: ${depth})`);
    
    if (depth <= 0) {
      return {
        problem,
        conclusion: 'Maximum recursion depth reached',
        steps: []
      };
    }
    
    try {
      // First level of reasoning
      const result = await this.process(problem);
      
      // Check if further reasoning is needed
      const subproblems = this._identifySubproblems(result.reasoning);
      
      if (subproblems.length === 0) {
        return result;
      }
      
      // Process each subproblem recursively
      const subresults = [];
      
      for (const subproblem of subproblems) {
        const subresult = await this.recursiveReasoning(subproblem, depth - 1);
        subresults.push(subresult);
      }
      
      // Integrate subresults
      const integrated = await this._integrateResults(result, subresults);
      
      // Save the recursive reasoning to memory
      await this.saveToMemory({
        type: 'recursive_reasoning',
        data: {
          problem,
          depth,
          result: integrated,
          timestamp: new Date().toISOString()
        }
      });
      
      return integrated;
    } catch (error) {
      console.error('Error in recursive reasoning:', error);
      throw error;
    }
  }
  
  /**
   * Identifies subproblems from reasoning
   * @param {Object} reasoning - Reasoning object
   * @returns {Array<string>} - Identified subproblems
   */
  _identifySubproblems(reasoning) {
    const subproblems = [];
    
    // Check for explicit subproblems in the solution
    if (reasoning.solution) {
      const subproblemMatches = reasoning.solution.match(/subproblem\s*\d+:\s*(.+?)(?=\n|$)/gi);
      
      if (subproblemMatches) {
        for (const match of subproblemMatches) {
          const subproblem = match.replace(/subproblem\s*\d+:\s*/i, '').trim();
          subproblems.push(subproblem);
        }
      }
    }
    
    // Check for questions or unresolved issues
    const questionMatches = reasoning.solution?.match(/(?:question|unresolved|further analysis):\s*(.+?)(?=\n|$)/gi);
    
    if (questionMatches) {
      for (const match of questionMatches) {
        const question = match.replace(/(?:question|unresolved|further analysis):\s*/i, '').trim();
        subproblems.push(question);
      }
    }
    
    return subproblems;
  }
  
  /**
   * Integrates results from recursive reasoning
   * @param {Object} mainResult - Main reasoning result
   * @param {Array<Object>} subresults - Subproblem results
   * @returns {Promise<Object>} - Integrated result
   */
  async _integrateResults(mainResult, subresults) {
    // Create a prompt for integration
    const integrationPrompt = `
I need to integrate the following reasoning results:

MAIN PROBLEM:
${mainResult.reasoning.problem}

MAIN SOLUTION:
${mainResult.reasoning.solution}

SUBPROBLEM RESULTS:
${subresults.map((sr, i) => `Subproblem ${i + 1}: ${sr.reasoning.problem}\nSolution: ${sr.reasoning.solution}`).join('\n\n')}

Please provide an integrated solution that combines the main solution with the insights from the subproblems.
`;

    // Process the integration prompt
    const integrationResult = await this.process(integrationPrompt);
    
    // Combine the results
    return {
      problem: mainResult.reasoning.problem,
      approach: mainResult.reasoning.approach,
      solution: integrationResult.reasoning.solution,
      optimization: integrationResult.reasoning.optimization || mainResult.reasoning.optimization,
      steps: [...mainResult.reasoning.steps, ...this._flattenSteps(subresults)],
      subresults
    };
  }
  
  /**
   * Flattens steps from subresults
   * @param {Array<Object>} subresults - Subproblem results
   * @returns {Array<Object>} - Flattened steps
   */
  _flattenSteps(subresults) {
    const steps = [];
    
    for (let i = 0; i < subresults.length; i++) {
      const subresult = subresults[i];
      
      for (const step of subresult.reasoning.steps) {
        steps.push({
          ...step,
          subproblem: i + 1
        });
      }
    }
    
    return steps;
  }
}