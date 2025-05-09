/**
 * SocialOS Platform Connector Factory
 * 
 * Creates platform-specific connectors for social media platforms.
 * Supports X/Twitter, LinkedIn, Discord, and others.
 */

const { XConnector } = require('./connectors/x-connector');
const { LinkedInConnector } = require('./connectors/linkedin-connector');
const { DiscordConnector } = require('./connectors/discord-connector');
const { GenericConnector } = require('./connectors/generic-connector');

class PlatformConnectorFactory {
  /**
   * Create a platform connector based on platform type
   * @param {String} platform - Platform identifier (x, linkedin, discord, etc)
   * @param {Object} config - Platform-specific configuration
   * @returns {Object} Platform connector instance
   */
  static create(platform, config = {}) {
    switch (platform.toLowerCase()) {
      case 'x':
      case 'twitter':
        return new XConnector(config);
        
      case 'linkedin':
        return new LinkedInConnector(config);
        
      case 'discord':
        return new DiscordConnector(config);
        
      default:
        console.warn(`Unknown platform: ${platform}, using generic connector`);
        return new GenericConnector(config);
    }
  }
  
  /**
   * Register a custom connector for a platform
   * @param {String} platform - Platform identifier
   * @param {Class} ConnectorClass - Connector class
   */
  static registerConnector(platform, ConnectorClass) {
    if (!platform || typeof platform !== 'string') {
      throw new Error('Platform must be a valid string');
    }
    
    if (!ConnectorClass || typeof ConnectorClass !== 'function') {
      throw new Error('ConnectorClass must be a valid constructor');
    }
    
    // Store the custom connector in the registry
    PlatformConnectorFactory.connectorRegistry[platform.toLowerCase()] = ConnectorClass;
  }
  
  /**
   * Create a multi-platform connector for interacting with multiple platforms
   * @param {Object} platforms - Map of platform configurations
   * @returns {Object} Multi-platform connector
   */
  static createMultiPlatform(platforms) {
    const connectors = {};
    
    for (const [platform, config] of Object.entries(platforms)) {
      connectors[platform] = this.create(platform, config);
    }
    
    return {
      /**
       * Execute an action across multiple platforms
       * @param {String} action - Action name
       * @param {Object} params - Action parameters
       * @param {Array} targetPlatforms - Specific platforms to target (optional)
       */
      async executeAction(action, params, targetPlatforms) {
        const results = {};
        const platforms = targetPlatforms || Object.keys(connectors);
        
        for (const platform of platforms) {
          const connector = connectors[platform];
          if (!connector) continue;
          
          if (typeof connector[action] !== 'function') {
            results[platform] = { error: `Action ${action} not supported on ${platform}` };
            continue;
          }
          
          try {
            results[platform] = await connector[action](params);
          } catch (error) {
            results[platform] = { error: error.message };
          }
        }
        
        return results;
      },
      
      /**
       * Get a specific platform connector
       * @param {String} platform - Platform name
       * @returns {Object} Platform connector
       */
      getConnector(platform) {
        return connectors[platform];
      },
      
      /**
       * Get all available platform connectors
       * @returns {Object} Map of platform connectors
       */
      getAllConnectors() {
        return { ...connectors };
      }
    };
  }
}

// Initialize connector registry
PlatformConnectorFactory.connectorRegistry = {};

module.exports = { PlatformConnectorFactory };
