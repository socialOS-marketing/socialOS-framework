/**
 * SocialOS TrendDetector
 * 
 * Identifies current trends and topics relevant to the agent's focus areas.
 * Helps the ContentCrafter agent create timely and relevant content.
 */

class TrendDetector {
  /**
   * Create a new TrendDetector
   * @param {Object} options - Detector options
   * @param {Number} options.trendRelevanceThreshold - Relevance threshold for trends (0-1)
   * @param {Number} options.trendCacheTTL - Trend cache TTL in minutes
   * @param {Array} options.excludedTopics - Topics to exclude from trends
   */
  constructor(options = {}) {
    this.trendRelevanceThreshold = options.trendRelevanceThreshold || 0.3;
    this.trendCacheTTL = options.trendCacheTTL || 60; // 60 minutes
    this.excludedTopics = options.excludedTopics || [];
    
    // Trend cache
    this.trendCache = {
      global: {
        trends: [],
        lastUpdated: null
      },
      topics: {} // Cache by topic
    };
    
    // Platform connectors (to be set externally)
    this.connectors = {};
  }
  
  /**
   * Set platform connectors
   * @param {Object} connectors - Platform connectors
   */
  setConnectors(connectors) {
    this.connectors = connectors;
  }
  
  /**
   * Check if trend cache is still valid
   * @param {Object} cacheEntry - Cache entry to check
   * @returns {Boolean} True if cache is valid
   * @private
   */
  _isCacheValid(cacheEntry) {
    if (!cacheEntry || !cacheEntry.lastUpdated) return false;
    
    const now = Date.now();
    const cacheAge = now - cacheEntry.lastUpdated;
    
    // Check if cache is still within TTL
    return cacheAge < this.trendCacheTTL * 60 * 1000;
  }
  
  /**
   * Fetch global trends from all connected platforms
   * @returns {Array} Global trends
   */
  async fetchGlobalTrends() {
    // Check cache first
    if (this._isCacheValid(this.trendCache.global)) {
      return this.trendCache.global.trends;
    }
    
    const trends = [];
    
    // Fetch trends from each connected platform
    for (const [platform, connector] of Object.entries(this.connectors)) {
      try {
        if (connector && typeof connector.getTrends === 'function') {
          const platformTrends = await connector.getTrends();
          
          // Add platform indicator to each trend
          platformTrends.forEach(trend => {
            trends.push({
              ...trend,
              platform
            });
          });
        }
      } catch (error) {
        console.error(`Error fetching trends from ${platform}:`, error);
      }
    }
    
    // Remove excluded topics
    const filteredTrends = trends.filter(trend => {
      const name = trend.name.toLowerCase();
      return !this.excludedTopics.some(topic => name.includes(topic.toLowerCase()));
    });
    
    // Update cache
    this.trendCache.global = {
      trends: filteredTrends,
      lastUpdated: Date.now()
    };
    
    return filteredTrends;
  }
  
  /**
   * Calculate relevance score between trend and topic
   * @param {Object} trend - Trend to evaluate
   * @param {String} topic - Topic to compare against
   * @returns {Number} Relevance score (0-1)
   * @private
   */
  _calculateTrendRelevance(trend, topic) {
    // In a real implementation, this would use semantic similarity
    // Here we use simple keyword matching
    const trendName = trend.name.toLowerCase();
    const topicTerms = topic.toLowerCase().split(/\s+/);
    
    // Check if trend name directly contains topic terms
    for (const term of topicTerms) {
      if (term.length > 3 && trendName.includes(term)) {
        return 1.0;
      }
    }
    
    // Check for partial matches
    let matchScore = 0;
    for (const term of topicTerms) {
      if (term.length > 3) {
        // Check if term is at least partially in the trend
        const regex = new RegExp(term.substring(0, Math.min(term.length, 5)), 'i');
        if (regex.test(trendName)) {
          matchScore += 0.5;
        }
      }
    }
    
    return Math.min(matchScore, 1.0);
  }
  
  /**
   * Detect trends relevant to specific topics
   * @param {Array|String} topics - Topics to find trends for
   * @returns {Array} Relevant trends
   */
  async detectTrends(topics) {
    // Normalize topics to array
    const topicsArray = Array.isArray(topics) ? topics : [topics];
    
    // If no topics provided, return global trends
    if (!topicsArray.length) {
      return this.fetchGlobalTrends();
    }
    
    const allRelevantTrends = [];
    
    // Get global trends if we don't have them yet
    let globalTrends = this.trendCache.global.trends;
    if (!this._isCacheValid(this.trendCache.global)) {
      globalTrends = await this.fetchGlobalTrends();
    }
    
    // Process each topic
    for (const topic of topicsArray) {
      // Check topic cache first
      if (this._isCacheValid(this.trendCache.topics[topic])) {
        allRelevantTrends.push(...this.trendCache.topics[topic].trends);
        continue;
      }
      
      // Find trends relevant to this topic
      const relevantTrends = globalTrends
        .map(trend => ({
          ...trend,
          relevance: this._calculateTrendRelevance(trend, topic)
        }))
        .filter(trend => trend.relevance >= this.trendRelevanceThreshold);
      
      // Update topic cache
      this.trendCache.topics[topic] = {
        trends: relevantTrends,
        lastUpdated: Date.now()
      };
      
      allRelevantTrends.push(...relevantTrends);
    }
    
    // Remove duplicates and sort by relevance
    const uniqueTrends = this._removeDuplicateTrends(allRelevantTrends);
    uniqueTrends.sort((a, b) => b.relevance - a.relevance);
    
    return uniqueTrends;
  }
  
  /**
   * Remove duplicate trends from array
   * @param {Array} trends - Array of trends
   * @returns {Array} Deduplicated trends
   * @private
   */
  _removeDuplicateTrends(trends) {
    const seen = new Set();
    
    return trends.filter(trend => {
      const key = `${trend.name.toLowerCase()}:${trend.platform}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  /**
   * Search for content related to a trend
   * @param {Object} trend - Trend to search for
   * @param {Number} limit - Maximum results to return
   * @returns {Array} Related content
   */
  async findTrendContent(trend, limit = 5) {
    const results = [];
    const trendName = trend.name.replace(/^[#@]/, ''); // Remove # or @ prefix
    
    // Search on each platform
    for (const [platform, connector] of Object.entries(this.connectors)) {
      try {
        if (connector && typeof connector.search === 'function') {
          const searchResults = await connector.search(trendName, { max_results: limit });
          
          if (searchResults && searchResults.tweets) {
            // Add platform to each result
            searchResults.tweets.forEach(tweet => {
              results.push({
                ...tweet,
                platform
              });
            });
          }
        }
      } catch (error) {
        console.error(`Error searching trend on ${platform}:`, error);
      }
    }
    
    // Sort by engagement metrics and limit results
    return results
      .sort((a, b) => {
        const aEngagement = (a.metrics?.like_count || 0) + (a.metrics?.retweet_count || 0) * 3;
        const bEngagement = (b.metrics?.like_count || 0) + (b.metrics?.retweet_count || 0) * 3;
        return bEngagement - aEngagement;
      })
      .slice(0, limit);
  }
  
  /**
   * Find trending hashtags related to topics
   * @param {Array|String} topics - Topics to find hashtags for
   * @param {Number} limit - Maximum hashtags to return
   * @returns {Array} Related hashtags
   */
  async findRelatedHashtags(topics, limit = 5) {
    const relevantTrends = await this.detectTrends(topics);
    
    // Filter for hashtags only
    const hashtags = relevantTrends
      .filter(trend => trend.name.startsWith('#'))
      .map(trend => ({
        hashtag: trend.name,
        volume: trend.tweet_volume || 0,
        relevance: trend.relevance || 0,
        platform: trend.platform
      }));
    
    return hashtags.slice(0, limit);
  }
  
  /**
   * Monitor for emerging trends in specific topics
   * @param {Array|String} topics - Topics to monitor
   * @param {Function} callback - Callback function for new trends
   * @returns {Object} Monitor control object
   */
  monitorTrends(topics, callback) {
    // Store current trends to detect new ones
    let knownTrends = new Set();
    
    // Initial trend detection
    this.detectTrends(topics).then(trends => {
      trends.forEach(trend => {
        knownTrends.add(`${trend.name}:${trend.platform}`);
      });
    });
    
    // Set up periodic monitoring
    const intervalId = setInterval(async () => {
      try {
        // Get current trends
        const currentTrends = await this.detectTrends(topics);
        
        // Detect new trends
        const newTrends = currentTrends.filter(trend => {
          const key = `${trend.name}:${trend.platform}`;
          if (knownTrends.has(key)) return false;
          knownTrends.add(key);
          return true;
        });
        
        // Invoke callback with new trends
        if (newTrends.length > 0 && typeof callback === 'function') {
          callback(newTrends);
        }
      } catch (error) {
        console.error('Error monitoring trends:', error);
      }
    }, 15 * 60 * 1000); // Check every 15 minutes
    
    // Return control object
    return {
      stop: () => clearInterval(intervalId)
    };
  }
}

module.exports = { TrendDetector };
