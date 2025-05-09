/**
 * SocialOS Agent Executor
 * 
 * Runtime environment for executing agent actions on social platforms.
 * Handles platform-specific interactions, rate limiting, and error handling.
 */

const { PlatformConnectorFactory } = require('./platform-connector-factory');
const { RateLimiter } = require('./rate-limiter');
const { EventEmitter } = require('events');

class AgentExecutor extends EventEmitter {
  /**
   * Create a new AgentExecutor
   * @param {Object} agent - The agent to execute
   * @param {Object} connector - Platform connector instance
   */
  constructor(agent, connector) {
    super();
    this.agent = agent;
    this.connector = connector || PlatformConnectorFactory.create(agent.platform);
    this.rateLimiter = new RateLimiter({
      platform: agent.platform,
      limits: agent.rateLimits
    });
    
    this.executionHistory = [];
  }
  
  /**
   * Execute an agent action
   * @param {String} action - Action to execute
   * @param {Object} context - Execution context
   * @returns {Object} Action result
   */
  async execute(action, context = {}) {
    if (typeof this.agent[action] !== 'function') {
      throw new Error(`Action ${action} not implemented by agent ${this.agent.id}`);
    }
    
    // Prepare execution context
    const executionContext = {
      ...context,
      connector: this.connector,
      timestamp: Date.now(),
      executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // Emit pre-execution event
    this.emit('beforeExecution', { 
      agent: this.agent.id, 
      action, 
      context: executionContext 
    });
    
    try {
      // Check rate limits before execution
      await this.rateLimiter.check(action);
      
      // Execute the agent action
      console.log(`Executing ${action} on agent ${this.agent.id}`);
      const result = await this.agent[action](executionContext);
      
      // Record execution
      const execution = {
        agentId: this.agent.id,
        action,
        timestamp: Date.now(),
        duration: Date.now() - executionContext.timestamp,
        success: true,
        result
      };
      
      this.executionHistory.push(execution);
      
      // Emit post-execution event
      this.emit('afterExecution', {
        ...execution,
        context: executionContext
      });
      
      return result;
    } catch (error) {
      // Handle execution error
      const execution = {
        agentId: this.agent.id,
        action,
        timestamp: Date.now(),
        duration: Date.now() - executionContext.timestamp,
        success: false,
        error: error.message
      };
      
      this.executionHistory.push(execution);
      
      // Emit error event
      this.emit('executionError', {
        ...execution,
        context: executionContext,
        error
      });
      
      throw error;
    }
  }
  
  /**
   * Get execution history for the agent
   * @param {Number} limit - Maximum number of history items to return
   * @returns {Array} Execution history
   */
  getExecutionHistory(limit = 10) {
    return this.executionHistory
      .slice(-limit)
      .reverse();
  }
  
  /**
   * Clear execution history
   */
  clearExecutionHistory() {
    this.executionHistory = [];
  }
  
  /**
   * Register a callback for agent events
   * @param {String} event - Event name (beforeExecution, afterExecution, executionError)
   * @param {Function} callback - Event callback function
   */
  on(event, callback) {
    super.on(event, callback);
    return this;
  }
  
  /**
   * Execute multiple actions in sequence
   * @param {Array} actions - Actions to execute
   * @param {Object} initialContext - Initial execution context
   * @returns {Array} Action results
   */
  async executeSequence(actions, initialContext = {}) {
    const results = [];
    let context = { ...initialContext };
    
    for (const action of actions) {
      const result = await this.execute(action, context);
      results.push(result);
      
      // Update context with result of previous action
      context = {
        ...context,
        lastAction: action,
        lastResult: result
      };
    }
    
    return results;
  }
  
  /**
   * Execute the agent's default action
   * @param {Object} context - Execution context
   * @returns {Object} Action result
   */
  async executeDefault(context = {}) {
    const defaultAction = this.agent.defaultAction || 'process';
    return this.execute(defaultAction, context);
  }
}

module.exports = { AgentExecutor };
