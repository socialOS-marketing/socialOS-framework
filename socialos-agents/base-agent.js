/**
 * SocialOS Base Agent
 * 
 * The foundation class for all SocialOS agents.
 * Provides common functionality and interfaces for agent behavior.
 */

const { EventEmitter } = require('events');
const { MemoryManager } = require('../socialos-core/memory-layer/memory-manager');
const { VectorMemory } = require('../socialos-core/memory-layer/vector-memory');
const { PlatformConnectorFactory } = require('../socialos-core/agent-runtime/platform-connector-factory');

class BaseAgent extends EventEmitter {
  /**
   * Create a new base agent
   * @param {Object} config - Agent configuration
   */
  constructor(config = {}) {
    super();
    this.id = config.id || `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = config.name || 'SocialOS Agent';
    this.description = config.description || 'A SocialOS agent';
    this.platforms = config.platforms || ['x'];
    this.connectors = {};
    this.config = config;
    
    // Initialize memory systems
    this.memory = new MemoryManager({
      namespace: `agent:${this.id}`,
      ...config.memoryOptions
    });
    
    this.vectorMemory = new VectorMemory({
      namespace: `agent:${this.id}:vector`,
      ...config.vectorMemoryOptions
    });
    
    // Agent state
    this.active = false;
    this.status = 'initialized';
    this.stats = {
      posts: 0,
      replies: 0,
      likes: 0,
      follows: 0,
      engagementRate: 0
    };
    
    // Performance tracking
    this.performance = {
      lastRun: null,
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      averageRunTime: 0
    };
    
    // Model configuration
    this.model = config.model || 'gpt-4';
    this.temperature = config.temperature || 0.7;
    
    // Persona settings
    this.tone = config.tone || 'friendly';
    this.style = config.style || 'informative';
    this.personality = config.personality || 'helpful';
    
    // Behavioral settings
    this.postFrequency = config.postFrequency || 3; // posts per day
    this.activeHours = config.activeHours || [0, 23]; // 24/7 by default
    this.responseTimeout = config.responseTimeout || 60; // minutes
    
    // Context settings
    this.memoryDepth = config.memoryDepth || 30; // days
    this.contextWindow = config.contextWindow || 10; // recent posts
  }
  
  /**
   * Connect to platforms
   * @returns {Object} Connection results
   */
  async connect() {
    const results = {};
    
    for (const platform of this.platforms) {
      try {
        // Get platform-specific config
        const platformConfig = this.config[platform] || {};
        
        // Create connector
        const connector = PlatformConnectorFactory.create(platform, platformConfig);
        
        // Connect to the platform
        const result = await connector.connect();
        
        // Store connector
        this.connectors[platform] = connector;
        
        // Store result
        results[platform] = {
          success: true,
          ...result
        };
        
        this.emit('connect', { platform, result });
      } catch (error) {
        results[platform] = {
          success: false,
          error: error.message
        };
        
        this.emit('error', { platform, error });
      }
    }
    
    return results;
  }
  
  /**
   * Start the agent
   * @returns {Object} Start result
   */
  async start() {
    if (this.active) {
      return { status: 'already_active' };
    }
    
    try {
      // Connect to platforms if not already connected
      if (Object.keys(this.connectors).length === 0) {
        await this.connect();
      }
      
      this.active = true;
      this.status = 'active';
      
      this.emit('start', { timestamp: Date.now() });
      
      return {
        status: 'started',
        agent: this.id,
        timestamp: Date.now()
      };
    } catch (error) {
      this.status = 'error';
      
      this.emit('error', { error, context: 'start' });
      
      throw error;
    }
  }
  
  /**
   * Stop the agent
   * @returns {Object} Stop result
   */
  async stop() {
    if (!this.active) {
      return { status: 'already_inactive' };
    }
    
    this.active = false;
    this.status = 'stopped';
    
    this.emit('stop', { timestamp: Date.now() });
    
    return {
      status: 'stopped',
      agent: this.id,
      timestamp: Date.now()
    };
  }
  
  /**
   * Post content to a platform
   * @param {String} platform - Platform to post to
   * @param {Object} content - Content to post
   * @returns {Object} Post result
   */
  async post(platform, content) {
    if (!this.active) {
      throw new Error('Agent is not active');
    }
    
    const connector = this.connectors[platform];
    if (!connector) {
      throw new Error(`Not connected to platform: ${platform}`);
    }
    
    try {
      const result = await connector.post(content);
      
      // Update stats
      this.stats.posts++;
      
      // Store in memory
      await this.memory.store(`post:${result.id}`, {
        platform,
        content,
        result,
        timestamp: Date.now()
      });
      
      this.emit('post', {
        platform,
        content,
        result
      });
      
      return result;
    } catch (error) {
      this.emit('error', {
        error,
        context: 'post',
        platform,
        content
      });
      
      throw error;
    }
  }
  
  /**
   * Generate content using the agent's model and persona
   * @param {Object} options - Content generation options
   * @returns {Object} Generated content
   */
  async generateContent(options = {}) {
    // This method should be implemented by subclasses
    throw new Error('Method not implemented');
  }
  
  /**
   * Process an incoming message or notification
   * @param {Object} message - Message to process
   * @returns {Object} Processing result
   */
  async processMessage(message) {
    // This method should be implemented by subclasses
    throw new Error('Method not implemented');
  }
  
  /**
   * Run the agent's main loop once
   * @returns {Object} Run result
   */
  async runOnce() {
    if (!this.active) {
      throw new Error('Agent is not active');
    }
    
    const startTime = Date.now();
    let success = false;
    
    try {
      // Specific implementation to be provided by subclasses
      const result = await this._runImplementation();
      
      // Update performance tracking
      this.performance.lastRun = Date.now();
      this.performance.runCount++;
      this.performance.successCount++;
      
      // Calculate running average for run time
      const currentRunTime = Date.now() - startTime;
      this.performance.averageRunTime = 
        (this.performance.averageRunTime * (this.performance.runCount - 1) + currentRunTime) / 
        this.performance.runCount;
      
      success = true;
      
      return {
        success: true,
        duration: currentRunTime,
        ...result
      };
    } catch (error) {
      // Update performance tracking
      this.performance.lastRun = Date.now();
      this.performance.runCount++;
      this.performance.failureCount++;
      
      this.emit('error', {
        error,
        context: 'runOnce'
      });
      
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
  
  /**
   * Implementation of the agent's main loop
   * @returns {Object} Run result
   * @protected
   */
  async _runImplementation() {
    // Subclasses must override this method
    throw new Error('_runImplementation must be overridden by subclasses');
  }
  
  /**
   * Get the agent's current state
   * @returns {Object} Agent state
   */
  getState() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      active: this.active,
      platforms: this.platforms,
      connectedPlatforms: Object.keys(this.connectors),
      stats: this.stats,
      performance: this.performance
    };
  }
  
  /**
   * Reset the agent's state
   * @param {Boolean} clearMemory - Whether to clear memory
   * @returns {Object} Reset result
   */
  async reset(clearMemory = false) {
    // Stop the agent if it's active
    if (this.active) {
      await this.stop();
    }
    
    // Reset stats
    this.stats = {
      posts: 0,
      replies: 0,
      likes: 0,
      follows: 0,
      engagementRate: 0
    };
    
    // Reset performance
    this.performance = {
      lastRun: null,
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      averageRunTime: 0
    };
    
    // Clear memory if requested
    if (clearMemory) {
      // For this mock implementation, we don't actually clear memory
      console.log(`Clearing memory for agent ${this.id}`);
    }
    
    this.status = 'reset';
    
    return {
      status: 'reset',
      agent: this.id,
      clearMemory
    };
  }
}

module.exports = { BaseAgent };
