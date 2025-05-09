/**
 * SocialOS Base Connector
 * 
 * Base class for all platform connectors.
 * Defines the common interface and shared functionality.
 */

class BaseConnector {
  /**
   * Create a new base connector
   * @param {String} platform - Platform identifier
   */
  constructor(platform) {
    this.platform = platform;
    this.connected = false;
    this.lastConnection = null;
  }
  
  /**
   * Connect to the platform (to be implemented by subclasses)
   */
  async connect() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Disconnect from the platform
   */
  async disconnect() {
    this.connected = false;
    this.lastConnection = null;
    return { disconnected: true };
  }
  
  /**
   * Check connection status
   * @returns {Object} Connection status
   */
  getConnectionStatus() {
    return {
      platform: this.platform,
      connected: this.connected,
      lastConnection: this.lastConnection
    };
  }
  
  /**
   * Post content to the platform (to be implemented by subclasses)
   * @param {Object} content - Content to post
   * @param {Object} options - Post options
   */
  async post(content, options = {}) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Generic method to handle platform API calls
   * @param {Function} apiCall - API call function
   * @param {String} errorMessage - Error message if call fails
   */
  async _handleApiCall(apiCall, errorMessage) {
    try {
      return await apiCall();
    } catch (error) {
      // Format and rethrow the error with platform context
      const formattedError = new Error(`${this.platform} connector error - ${errorMessage}: ${error.message}`);
      formattedError.originalError = error;
      formattedError.platform = this.platform;
      throw formattedError;
    }
  }
  
  /**
   * Log activity to platform-specific analytics
   * @param {String} action - Action performed
   * @param {Object} details - Action details
   */
  logActivity(action, details = {}) {
    console.log(`[${this.platform}] ${action}:`, details);
    
    // Can be extended to send analytics to monitoring systems
    // or store in a database for agent performance tracking
  }
}

module.exports = { BaseConnector };
