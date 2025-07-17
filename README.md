# Hermes-X Core

A self-hosted, browser-based, AI-driven system environment for full-stack development, agent collaboration, and advanced data interaction.

## Features

- **Browser-Based**: Runs entirely in the browser with no server dependencies
- **AI-Powered Agents**: Multiple specialized agents for different tasks
- **Persistent Memory**: Stores all states in IndexedDB with retrieval
- **Code Execution**: In-browser code execution via Pyodide and WASM
- **Modern UI**: Built with TailwindCSS, Monaco Editor, and xterm.js

## Agents

- **PlannerAgent**: Interprets prompts and decomposes them into subtasks
- **CoderAgent**: Writes functional code in Python, JavaScript, and other languages
- **LogicAgent**: Handles recursive reasoning and optimization
- **RuntimeAgent**: Executes code and captures output
- **ExplorationAgent**: Interacts with API endpoints and iframes
- **ExploitMapperAgent**: Discovers attack chains using abstract modeling
- **MemoryAgent**: Manages persistent state and retrieval

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Open your browser at http://localhost:12000

## API Configuration

By default, Hermes-X Core uses the DeepSeek API. You can configure the API endpoint, key, and model in the settings.

## License

MIT
