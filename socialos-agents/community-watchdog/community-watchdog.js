/**
 * SocialOS CommunityWatchdog Agent
 * 
 * Monitors social media for mentions, sentiment, and engagement opportunities.
 * Provides real-time alerts and analysis of community engagement.
 */

const { BaseAgent } = require('../base-agent');
const { OpenAI } = require('langchain/llms');
const { PromptTemplate } = require('langchain/prompts');
const { SentimentAnalyzer } = require('./sentiment-analyzer');
const { MentionTracker } = require('./mention-tracker');
const { CompetitorMonitor } = require('./competitor-monitor');

class CommunityWatchdog extends BaseAgent {
  /**
   * Create a new CommunityWatchdog agent
   * @param {Object} config - Agent configuration
   */
  constructor(config = {}) {
    super({
      name: 'CommunityWatchdog',
      description: 'Monitors social media for mentions, sentiment, and engagement opportunities',
      ...config
    });
    
    // Community monitoring settings
    this.brand = config.brand || '';
    this.keywords = config.keywords || [];
    this.competitors = config.competitors || [];
    this.alertThreshold = config.alertThreshold || 'medium';
    this.sentimentThreshold = config.sentimentThreshold || -0.5; // Negative threshold
    
    // Initialize components
    this.sentimentAnalyzer = new SentimentAnalyzer(config.sentimentOptions || {});
    this.mentionTracker = new MentionTracker(config.mentionOptions || {});
    this.competitorMonitor = new CompetitorMonitor(config.competitorOptions || {});
    
    // Initialize LLM
    this.llm = new OpenAI({
      model: this.model,
      temperature: this.temperature
    });
    
    // Alert system
    this.alerts = [];
    this.alertCallbacks = [];
    
    // Monitoring statistics
    this.stats = {
      ...this.stats,
      mentions: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      alertCount: 0,
      competitorMentions: {}
    };
    
    // Streaming handlers
    this.mentionStreams = {};
  }
  
  /**
   * Start monitoring mentions across all connected platforms
   */
  async startMonitoring() {
    if (!this.active) {
      await this.start();
    }
    
    for (const [platform, connector] of Object.entries(this.connectors)) {
      try {
        if (connector && typeof connector.streamMentions === 'function') {
          // Start monitoring this platform
          this._monitorPlatform(platform, connector);
          console.log(`Started monitoring on ${platform}`);
        }
      } catch (error) {
        console.error(`Error starting monitoring on ${platform}:`, error);
      }
    }
  }
  
  /**
   * Stop monitoring mentions
   */
  async stopMonitoring() {
    // Close all mention streams
    for (const [platform, stream] of Object.entries(this.mentionStreams)) {
      if (stream && typeof stream.stop === 'function') {
        await stream.stop();
        console.log(`Stopped monitoring on ${platform}`);
      }
    }
    
    this.mentionStreams = {};
  }
  
  /**
   * Implementation of the agent's main loop
   * @returns {Object} Run result
   * @protected
   */
  async _runImplementation() {
    // Check for any new mentions that haven't been processed
    const newMentions = await this.mentionTracker.getNewMentions();
    
    if (newMentions.length > 0) {
      // Process new mentions
      for (const mention of newMentions) {
        await this._processMention(mention);
      }
      
      return {
        action: 'process_mentions',
        mentionCount: newMentions.length
      };
    }
    
    // Check competitors if no new mentions
    if (this.competitors.length > 0) {
      const competitorUpdates = await this.competitorMonitor.checkCompetitors(this.competitors);
      
      if (competitorUpdates.length > 0) {
        return {
          action: 'monitor_competitors',
          updates: competitorUpdates.length
        };
      }
    }
    
    // Generate a daily summary if it's time (simplified check for this example)
    const now = new Date();
    if (now.getHours() === 8 && now.getMinutes() < 15) {
      const summary = await this.generateDailySummary();
      
      return {
        action: 'generate_summary',
        summary
      };
    }
    
    // Nothing specific to do
    return {
      action: 'monitoring',
      status: 'active'
    };
  }
  
  /**
   * Monitor a specific platform for mentions
   * @param {String} platform - Platform to monitor
   * @param {Object} connector - Platform connector
   * @private
   */
  async _monitorPlatform(platform, connector) {
    try {
      // Some platforms have streaming APIs
      if (typeof connector.streamMentions === 'function') {
        const mentionStream = connector.streamMentions();
        
        // Process the stream
        (async () => {
          try {
            for await (const mention of mentionStream) {
              await this._handleMention(platform, mention);
            }
          } catch (error) {
            console.error(`Error in mention stream for ${platform}:`, error);
            // Attempt reconnection after delay
            setTimeout(() => this._monitorPlatform(platform, connector), 30000);
          }
        })();
        
        // Store stream for later cleanup
        this.mentionStreams[platform] = mentionStream;
      } else {
        // Fallback to polling for platforms without streaming
        const pollInterval = setInterval(async () => {
          try {
            // Use platform-specific search methods
            const keywords = [this.brand, ...this.keywords].filter(Boolean);
            
            if (keywords.length === 0) return;
            
            for (const keyword of keywords) {
              const results = await connector.search(keyword);
              
              if (results && results.tweets) {
                for (const tweet of results.tweets) {
                  // Check if we've already processed this mention
                  if (!await this.mentionTracker.hasSeen(tweet.id)) {
                    await this._handleMention(platform, tweet);
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Error polling mentions on ${platform}:`, error);
          }
        }, 60000); // Poll every minute
        
        // Store interval for later cleanup
        this.mentionStreams[platform] = {
          stop: () => clearInterval(pollInterval)
        };
      }
    } catch (error) {
      console.error(`Failed to set up monitoring for ${platform}:`, error);
    }
  }
  
  /**
   * Handle a new mention
   * @param {String} platform - Source platform
   * @param {Object} mention - Mention data
   * @private
   */
  async _handleMention(platform, mention) {
    try {
      // Add platform to mention data
      mention.platform = platform;
      
      // Track the mention
      await this.mentionTracker.trackMention(mention);
      
      // Process the mention
      await this._processMention(mention);
      
      // Update stats
      this.stats.mentions++;
    } catch (error) {
      console.error('Error handling mention:', error);
    }
  }
  
  /**
   * Process a mention and determine appropriate actions
   * @param {Object} mention - Mention data
   * @private
   */
  async _processMention(mention) {
    try {
      // Analyze sentiment
      const sentiment = await this.sentimentAnalyzer.analyzeSentiment(mention.text);
      
      // Track sentiment stats
      if (sentiment.score > 0.2) {
        this.stats.positiveCount++;
      } else if (sentiment.score < -0.2) {
        this.stats.negativeCount++;
      } else {
        this.stats.neutralCount++;
      }
      
      // Store the processed mention with sentiment
      await this.memory.store(`mention:${mention.id}`, {
        mention,
        sentiment,
        processed: new Date().toISOString()
      });
      
      // Check if this requires an alert
      if (this._shouldAlert(mention, sentiment)) {
        await this._createAlert(mention, sentiment);
      }
      
      // Check if this is a competitor mention
      for (const competitor of this.competitors) {
        if (mention.text.toLowerCase().includes(competitor.toLowerCase())) {
          // Track competitor mention
          this.stats.competitorMentions[competitor] = 
            (this.stats.competitorMentions[competitor] || 0) + 1;
          
          await this.competitorMonitor.trackCompetitorMention(competitor, mention);
          break;
        }
      }
      
      // Emit event
      this.emit('mention_processed', {
        mention,
        sentiment
      });
      
      return {
        mention,
        sentiment
      };
    } catch (error) {
      console.error('Error processing mention:', error);
      throw error;
    }
  }
  
  /**
   * Determine if an alert should be created for a mention
   * @param {Object} mention - Mention data
   * @param {Object} sentiment - Sentiment analysis
   * @returns {Boolean} True if alert should be created
   * @private
   */
  _shouldAlert(mention, sentiment) {
    // Negative sentiment beyond threshold
    if (sentiment.score < this.sentimentThreshold) {
      return true;
    }
    
    // High profile account (simplified check)
    if (mention.author && mention.author.metrics && 
        mention.author.metrics.followers_count > 10000) {
      return true;
    }
    
    // High engagement post
    if (mention.metrics && 
        (mention.metrics.retweet_count > 50 || mention.metrics.like_count > 100)) {
      return true;
    }
    
    // Contains specific alert keywords
    const alertKeywords = ['urgent', 'problem', 'issue', 'broken', 'disappointed', 'fail'];
    for (const keyword of alertKeywords) {
      if (mention.text.toLowerCase().includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Create an alert for a mention
   * @param {Object} mention - Mention data
   * @param {Object} sentiment - Sentiment analysis
   * @private
   */
  async _createAlert(mention, sentiment) {
    // Create the alert
    const alert = {
      id: `alert_${Date.now()}`,
      mention,
      sentiment,
      created: new Date().toISOString(),
      priority: sentiment.score < -0.7 ? 'high' : 'medium',
      status: 'new'
    };
    
    // Store the alert
    this.alerts.push(alert);
    this.stats.alertCount++;
    
    // Save to memory
    await this.memory.store(`alert:${alert.id}`, alert);
    
    // Notify callbacks
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    }
    
    // Emit event
    this.emit('alert', alert);
    
    return alert;
  }
  
  /**
   * Register an alert callback
   * @param {Function} callback - Callback function
   */
  onAlert(callback) {
    if (typeof callback === 'function') {
      this.alertCallbacks.push(callback);
    }
  }
  
  /**
   * Get active alerts
   * @param {String} status - Filter by status
   * @returns {Array} Alerts
   */
  getAlerts(status = null) {
    if (status) {
      return this.alerts.filter(alert => alert.status === status);
    }
    return [...this.alerts];
  }
  
  /**
   * Update alert status
   * @param {String} alertId - Alert ID
   * @param {String} status - New status
   * @returns {Object} Updated alert
   */
  updateAlertStatus(alertId, status) {
    const alert = this.alerts.find(a => a.id === alertId);
    
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }
    
    alert.status = status;
    alert.updated = new Date().toISOString();
    
    // Update in memory
    this.memory.update(`alert:${alertId}`, alert);
    
    // Emit event
    this.emit('alert_updated', alert);
    
    return alert;
  }
  
  /**
   * Generate a response to a mention
   * @param {Object} mention - Mention to respond to
   * @returns {String} Generated response
   */
  async generateResponse(mention) {
    // Get sentiment to help craft appropriate response
    let sentiment;
    try {
      sentiment = await this.sentimentAnalyzer.analyzeSentiment(mention.text);
    } catch (error) {
      console.error('Error analyzing sentiment for response:', error);
      sentiment = { score: 0, label: 'neutral' };
    }
    
    // Build response generation prompt
    const promptTemplate = new PromptTemplate({
      template: `
        You are a community manager for {brand}. You need to respond to the following mention on {platform}:
        
        "{text}"
        
        The sentiment of this mention is {sentiment} ({score}).
        
        Write a helpful, authentic response that addresses the user's message. 
        If it's a complaint, be apologetic and solution-oriented.
        If it's praise, be grateful.
        If it's a question, provide helpful information.
        
        Keep your response concise and appropriate for {platform}.
        
        Generate only the response text without any explanation.
      `,
      inputVariables: ['brand', 'platform', 'text', 'sentiment', 'score']
    });
    
    // Format the prompt
    const prompt = await promptTemplate.format({
      brand: this.brand,
      platform: mention.platform,
      text: mention.text,
      sentiment: sentiment.label,
      score: sentiment.score.toFixed(2)
    });
    
    // Generate response
    const response = await this.llm.predict(prompt);
    
    return response;
  }
  
  /**
   * Generate a daily summary of monitoring activity
   * @returns {Object} Daily summary
   */
  async generateDailySummary() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get mentions from the last 24 hours
    const recentMentions = await this.mentionTracker.getMentions({
      since: yesterday
    });
    
    // Get alerts from the last 24 hours
    const recentAlerts = this.alerts.filter(alert => {
      const alertDate = new Date(alert.created);
      return alertDate >= yesterday;
    });
    
    // Calculate sentiment breakdown
    let positive = 0, negative = 0, neutral = 0;
    
    for (const mention of recentMentions) {
      const memoryItem = await this.memory.retrieve(`mention:${mention.id}`);
      
      if (memoryItem && memoryItem.sentiment) {
        if (memoryItem.sentiment.score > 0.2) {
          positive++;
        } else if (memoryItem.sentiment.score < -0.2) {
          negative++;
        } else {
          neutral++;
        }
      }
    }
    
    // Build competitor analysis
    const competitorAnalysis = {};
    for (const competitor of this.competitors) {
      const mentions = await this.competitorMonitor.getCompetitorMentions(competitor, {
        since: yesterday
      });
      
      competitorAnalysis[competitor] = {
        mentionCount: mentions.length,
        sentiment: await this.competitorMonitor.getCompetitorSentiment(competitor)
      };
    }
    
    // Create summary
    const summary = {
      date: now.toISOString(),
      period: '24 hours',
      mentions: {
        total: recentMentions.length,
        sentiment: {
          positive,
          negative,
          neutral,
          average: recentMentions.length > 0 ? 
            (positive - negative) / recentMentions.length : 0
        }
      },
      alerts: {
        total: recentAlerts.length,
        high: recentAlerts.filter(a => a.priority === 'high').length,
        medium: recentAlerts.filter(a => a.priority === 'medium').length,
        resolved: recentAlerts.filter(a => a.status === 'resolved').length
      },
      competitors: competitorAnalysis,
      topEngagements: this._getTopEngagements(recentMentions)
    };
    
    // Store summary in memory
    await this.memory.store(`summary:${now.toISOString().split('T')[0]}`, summary);
    
    return summary;
  }
  
  /**
   * Get top engaging mentions
   * @param {Array} mentions - Mentions to evaluate
   * @returns {Array} Top engaging mentions
   * @private
   */
  _getTopEngagements(mentions) {
    // Sort mentions by engagement metrics
    return mentions
      .filter(m => m.metrics)
      .sort((a, b) => {
        const aScore = (a.metrics.like_count || 0) + (a.metrics.retweet_count || 0) * 3;
        const bScore = (b.metrics.like_count || 0) + (b.metrics.retweet_count || 0) * 3;
        return bScore - aScore;
      })
      .slice(0, 5)
      .map(m => ({
        id: m.id,
        text: m.text,
        author: m.author ? m.author.username : 'unknown',
        platform: m.platform,
        engagement: {
          likes: m.metrics.like_count || 0,
          retweets: m.metrics.retweet_count || 0,
          replies: m.metrics.reply_count || 0
        }
      }));
  }
}

module.exports = { CommunityWatchdog };
