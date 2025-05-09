/**
 * SocialOS ContentScheduler
 * 
 * Manages content scheduling and optimal posting times for ContentCrafter agent.
 * Uses platform analytics and audience insights to determine the best times to post.
 */

class ContentScheduler {
  /**
   * Create a new ContentScheduler
   * @param {Object} options - Scheduler options
   * @param {Number} options.postsPerDay - Number of posts per day (default: 3)
   * @param {Array} options.activeHours - Hours when posting is allowed [start, end] (default: [8, 22])
   * @param {String} options.timezone - Timezone for scheduling (default: 'UTC')
   * @param {Object} options.platformTimes - Platform-specific optimal posting times
   */
  constructor(options = {}) {
    this.postsPerDay = options.postsPerDay || 3;
    this.activeHours = options.activeHours || [8, 22]; // 8am to 10pm
    this.timezone = options.timezone || 'UTC';
    
    // Platform-specific optimal posting times (hours in the day)
    this.platformTimes = options.platformTimes || {
      x: [8, 12, 17, 20], // Best times for X/Twitter
      linkedin: [9, 12, 15, 17], // Best times for LinkedIn
      instagram: [11, 13, 19, 21] // Best times for Instagram
    };
    
    // Schedule
    this.nextScheduledTime = null;
    this.schedule = [];
    
    // Performance tracking
    this.performanceByTime = {};
    
    // Initialize schedule
    this._initializeSchedule();
  }
  
  /**
   * Initialize the content schedule
   * @private
   */
  _initializeSchedule() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    // Create schedule for next 24 hours
    this.schedule = this._generateSchedule(now, tomorrow);
    
    // Set next scheduled time
    this.nextScheduledTime = this._getNextTimeFromSchedule(now);
  }
  
  /**
   * Generate a posting schedule
   * @param {Date} startTime - Schedule start time
   * @param {Date} endTime - Schedule end time
   * @returns {Array} Scheduling times
   * @private
   */
  _generateSchedule(startTime, endTime) {
    const schedule = [];
    const platforms = Object.keys(this.platformTimes);
    
    // Generate schedule for each platform
    for (const platform of platforms) {
      const optimalTimes = this.platformTimes[platform];
      
      for (const hour of optimalTimes) {
        // Skip if hour is outside active hours
        if (hour < this.activeHours[0] || hour > this.activeHours[1]) continue;
        
        // Create posting time
        const postTime = new Date(startTime);
        postTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
        
        // Skip if time is in the past or beyond end time
        if (postTime < startTime || postTime > endTime) continue;
        
        schedule.push({
          time: postTime,
          platform
        });
      }
    }
    
    // Sort schedule by time
    return schedule.sort((a, b) => a.time - b.time);
  }
  
  /**
   * Get the next posting time from schedule
   * @param {Date} now - Current time
   * @returns {Object|null} Next scheduled item or null if no upcoming items
   * @private
   */
  _getNextTimeFromSchedule(now) {
    for (const item of this.schedule) {
      if (item.time > now) {
        return item;
      }
    }
    
    // If no upcoming items, re-initialize schedule
    this._initializeSchedule();
    return this._getNextTimeFromSchedule(now);
  }
  
  /**
   * Check if it's time to create content
   * @returns {Boolean} True if it's time to create content
   */
  async shouldCreateContent() {
    if (!this.nextScheduledTime) {
      this._initializeSchedule();
    }
    
    const now = new Date();
    
    // Check if we've reached or passed the next scheduled time
    return now >= this.nextScheduledTime.time;
  }
  
  /**
   * Schedule the next content creation
   * @returns {Object} Next scheduled time
   */
  scheduleNextContent() {
    const now = new Date();
    
    // Update the next scheduled time
    this.nextScheduledTime = this._getNextTimeFromSchedule(now);
    
    return this.nextScheduledTime;
  }
  
  /**
   * Get the next scheduled time
   * @returns {Object|null} Next scheduled time or null if not scheduled
   */
  getNextScheduledTime() {
    return this.nextScheduledTime;
  }
  
  /**
   * Calculate optimal posting times based on performance data
   * @param {Array} contentPerformance - Array of content performance data
   * @returns {Object} Updated optimal times
   */
  optimizePostingTimes(contentPerformance) {
    if (!contentPerformance || contentPerformance.length === 0) {
      return this.platformTimes;
    }
    
    // Group content by platform and hour
    const performanceByHour = {};
    
    for (const item of contentPerformance) {
      if (!item.platform || !item.posted || !item.engagementRate) continue;
      
      const platform = item.platform;
      const postedDate = new Date(item.posted);
      const hour = postedDate.getHours();
      
      // Initialize platform and hour if needed
      performanceByHour[platform] = performanceByHour[platform] || {};
      performanceByHour[platform][hour] = performanceByHour[platform][hour] || {
        totalEngagement: 0,
        count: 0
      };
      
      // Add to totals
      performanceByHour[platform][hour].totalEngagement += item.engagementRate;
      performanceByHour[platform][hour].count += 1;
    }
    
    // Calculate average engagement by hour and find optimal hours
    const optimalTimes = {};
    
    for (const [platform, hours] of Object.entries(performanceByHour)) {
      // Calculate average engagement for each hour
      const hourlyAverage = Object.entries(hours).map(([hour, data]) => ({
        hour: parseInt(hour),
        average: data.totalEngagement / data.count
      }));
      
      // Sort by average engagement
      hourlyAverage.sort((a, b) => b.average - a.average);
      
      // Get top hours (within active hours)
      const topHours = hourlyAverage
        .filter(h => h.hour >= this.activeHours[0] && h.hour <= this.activeHours[1])
        .slice(0, 4)
        .map(h => h.hour);
      
      // Use existing times if we don't have enough data
      optimalTimes[platform] = topHours.length >= 3 ? 
        topHours : 
        this.platformTimes[platform];
    }
    
    // Update platform times with optimized times
    this.platformTimes = {
      ...this.platformTimes,
      ...optimalTimes
    };
    
    return this.platformTimes;
  }
}

module.exports = { ContentScheduler };
