/**
 * SocialOS MentionTracker
 * 
 * Tracks and manages social media mentions across platforms.
 * Provides tools for storing, retrieving, and filtering mentions.
 */

class MentionTracker {
  /**
   * Create a new MentionTracker
   * @param {Object} options - Tracker options
   * @param {Number} options.maxHistoryDays - Maximum days to retain mention history
   * @param {Boolean} options.deduplicateMentions - Whether to deduplicate similar mentions
   */
  constructor(options = {}) {
    this.maxHistoryDays = options.maxHistoryDays || 30;
    this.deduplicateMentions = options.deduplicateMentions !== false;
    
    this.mentions = [];
    this.seenMentionIds = new Set();
    this.newMentions = [];
    this.lastCleanup = Date.now();
  }
  
  /**
   * Track a new mention
   * @param {Object} mention - Mention data
   * @returns {Boolean} True if this is a new mention
   */
  async trackMention(mention) {
    if (!mention || !mention.id) {
      throw new Error('Invalid mention: missing ID');
    }
    
    // Check if we've already seen this mention
    if (this.seenMentionIds.has(mention.id)) {
      return false;
    }
    
    // Add timestamp if missing
    if (!mention.timestamp) {
      mention.timestamp = Date.now();
    }
    
    // Mark as new and store
    this.mentions.push(mention);
    this.seenMentionIds.add(mention.id);
    this.newMentions.push(mention);
    
    // Periodically clean up old mentions
    if (Date.now() - this.lastCleanup > 24 * 60 * 60 * 1000) {
      this._cleanupOldMentions();
    }
    
    return true;
  }
  
  /**
   * Check if a mention ID has been seen
   * @param {String} mentionId - Mention ID to check
   * @returns {Boolean} True if mention has been seen
   */
  async hasSeen(mentionId) {
    return this.seenMentionIds.has(mentionId);
  }
  
  /**
   * Get new unprocessed mentions
   * @returns {Array} New mentions
   */
  async getNewMentions() {
    const mentions = [...this.newMentions];
    this.newMentions = [];
    return mentions;
  }
  
  /**
   * Get all tracked mentions with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Array} Filtered mentions
   */
  async getMentions(filters = {}) {
    let results = [...this.mentions];
    
    // Apply filters
    if (filters.since) {
      const sinceTime = filters.since instanceof Date ? 
        filters.since.getTime() : new Date(filters.since).getTime();
      
      results = results.filter(m => 
        (m.timestamp instanceof Date ? m.timestamp.getTime() : m.timestamp) >= sinceTime
      );
    }
    
    if (filters.until) {
      const untilTime = filters.until instanceof Date ? 
        filters.until.getTime() : new Date(filters.until).getTime();
      
      results = results.filter(m => 
        (m.timestamp instanceof Date ? m.timestamp.getTime() : m.timestamp) <= untilTime
      );
    }
    
    if (filters.platform) {
      results = results.filter(m => m.platform === filters.platform);
    }
    
    if (filters.text) {
      const searchText = filters.text.toLowerCase();
      results = results.filter(m => 
        m.text && m.text.toLowerCase().includes(searchText)
      );
    }
    
    if (filters.author) {
      results = results.filter(m => 
        m.author && 
        (m.author.id === filters.author || 
         (m.author.username && m.author.username.toLowerCase() === filters.author.toLowerCase()))
      );
    }
    
    // Apply limits and sorting
    if (filters.sortBy === 'recent' || !filters.sortBy) {
      results.sort((a, b) => {
        const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : a.timestamp;
        const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : b.timestamp;
        return bTime - aTime; // Most recent first
      });
    }
    
    if (filters.limit && typeof filters.limit === 'number') {
      results = results.slice(0, filters.limit);
    }
    
    return results;
  }
  
  /**
   * Calculate mention statistics
   * @param {Object} options - Statistics options
   * @returns {Object} Mention statistics
   */
  async getMentionStats(options = {}) {
    const stats = {
      total: this.mentions.length,
      platforms: {},
      timeSeries: {
        hourly: {},
        daily: {}
      },
      topAuthors: [],
      topHashtags: []
    };
    
    // Calculate platform stats
    for (const mention of this.mentions) {
      const platform = mention.platform || 'unknown';
      stats.platforms[platform] = (stats.platforms[platform] || 0) + 1;
      
      // Calculate time series
      const date = new Date(mention.timestamp instanceof Date ? mention.timestamp : new Date(mention.timestamp));
      const day = date.toISOString().split('T')[0];
      const hour = `${day}T${date.getHours().toString().padStart(2, '0')}`;
      
      stats.timeSeries.hourly[hour] = (stats.timeSeries.hourly[hour] || 0) + 1;
      stats.timeSeries.daily[day] = (stats.timeSeries.daily[day] || 0) + 1;
      
      // Track authors
      if (mention.author) {
        const authorKey = mention.author.username || mention.author.id || 'unknown';
        const existingAuthor = stats.topAuthors.find(a => a.key === authorKey);
        
        if (existingAuthor) {
          existingAuthor.count++;
        } else {
          stats.topAuthors.push({
            key: authorKey,
            name: mention.author.username || mention.author.name || 'Unknown',
            count: 1,
            platform
          });
        }
      }
      
      // Track hashtags
      if (mention.text) {
        const hashtags = (mention.text.match(/#[a-zA-Z0-9_]+/g) || []);
        
        for (const hashtag of hashtags) {
          const existingHashtag = stats.topHashtags.find(h => h.tag === hashtag);
          
          if (existingHashtag) {
            existingHashtag.count++;
          } else {
            stats.topHashtags.push({
              tag: hashtag,
              count: 1
            });
          }
        }
      }
    }
    
    // Sort top authors and hashtags
    stats.topAuthors.sort((a, b) => b.count - a.count);
    stats.topHashtags.sort((a, b) => b.count - a.count);
    
    // Limit arrays
    stats.topAuthors = stats.topAuthors.slice(0, options.limit || 10);
    stats.topHashtags = stats.topHashtags.slice(0, options.limit || 10);
    
    return stats;
  }
  
  /**
   * Group mentions by topic or keyword
   * @param {Array} keywords - Keywords to group by
   * @returns {Object} Grouped mentions
   */
  async groupMentionsByTopic(keywords) {
    const groups = {};
    
    for (const keyword of keywords) {
      groups[keyword] = [];
    }
    
    // Categorize mentions
    for (const mention of this.mentions) {
      if (!mention.text) continue;
      
      const text = mention.text.toLowerCase();
      
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          groups[keyword].push(mention);
        }
      }
    }
    
    return groups;
  }
  
  /**
   * Export mentions to a specific format
   * @param {String} format - Export format (json, csv)
   * @returns {String} Exported data
   */
  async exportMentions(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.mentions, null, 2);
    } else if (format === 'csv') {
      // Simple CSV export
      const headers = ['id', 'platform', 'text', 'timestamp', 'author', 'url'];
      let csv = headers.join(',') + '\n';
      
      for (const mention of this.mentions) {
        const row = [
          mention.id,
          mention.platform || '',
          mention.text ? `"${mention.text.replace(/"/g, '""')}"` : '',
          mention.timestamp ? new Date(mention.timestamp).toISOString() : '',
          mention.author ? mention.author.username || mention.author.name || '' : '',
          mention.url || ''
        ];
        
        csv += row.join(',') + '\n';
      }
      
      return csv;
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
  }
  
  /**
   * Clean up old mentions
   * @private
   */
  _cleanupOldMentions() {
    const cutoff = Date.now() - (this.maxHistoryDays * 24 * 60 * 60 * 1000);
    
    this.mentions = this.mentions.filter(mention => {
      const mentionTime = mention.timestamp instanceof Date ? 
        mention.timestamp.getTime() : mention.timestamp;
      
      return mentionTime >= cutoff;
    });
    
    // Also clean up seen IDs for mentions that are no longer tracked
    const activeIds = new Set(this.mentions.map(m => m.id));
    for (const id of this.seenMentionIds) {
      if (!activeIds.has(id)) {
        this.seenMentionIds.delete(id);
      }
    }
    
    this.lastCleanup = Date.now();
  }
  
  /**
   * Import mentions from external source
   * @param {Array} mentionsData - Mentions data to import
   * @returns {Number} Number of new mentions imported
   */
  async importMentions(mentionsData) {
    if (!Array.isArray(mentionsData)) {
      throw new Error('Import data must be an array of mentions');
    }
    
    let newCount = 0;
    
    for (const mention of mentionsData) {
      if (mention && mention.id && !this.seenMentionIds.has(mention.id)) {
        await this.trackMention(mention);
        newCount++;
      }
    }
    
    return newCount;
  }
}

module.exports = { MentionTracker };
