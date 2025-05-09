/**
 * SocialOS ContentCrafter Agent
 * 
 * An AI agent optimized for creating high-quality, engaging social media content.
 * Adapts to brand voice, generates platform-optimized posts, and tracks performance.
 */

const { BaseAgent } = require('../base-agent');
const { LangChain } = require('langchain');
const { OpenAI } = require('langchain/llms');
const { PromptTemplate } = require('langchain/prompts');
const { ContentScheduler } = require('./content-scheduler');
const { ContentAnalyzer } = require('./content-analyzer');
const { TrendDetector } = require('./trend-detector');

class ContentCrafter extends BaseAgent {
  /**
   * Create a new ContentCrafter agent
   * @param {Object} config - Agent configuration
   */
  constructor(config = {}) {
    super({
      name: 'ContentCrafter',
      description: 'Creates high-quality, engaging social media content',
      ...config
    });
    
    // Content specific settings
    this.brandVoice = config.brandVoice || 'friendly and informative';
    this.topics = config.topics || [];
    this.contentTypes = config.contentTypes || ['text', 'threads', 'images'];
    this.hashtagStrategy = config.hashtagStrategy || 'moderate';
    
    // Initialize components
    this.scheduler = new ContentScheduler(config.schedulerOptions || {});
    this.analyzer = new ContentAnalyzer(config.analyzerOptions || {});
    this.trendDetector = new TrendDetector(config.trendOptions || {});
    
    // Initialize LLM
    this.llm = new OpenAI({
      model: this.model,
      temperature: this.temperature
    });
    
    // Content templates
    this.templates = config.templates || {};
    
    // Content performance tracking
    this.contentPerformance = [];
  }
  
  /**
   * Implementation of the agent's main loop
   * @returns {Object} Run result
   * @protected
   */
  async _runImplementation() {
    // Check if it's time to create new content
    const shouldCreateContent = await this.scheduler.shouldCreateContent();
    
    if (shouldCreateContent) {
      // Generate and post new content
      const result = await this.createAndPostContent();
      
      // Schedule next content
      this.scheduler.scheduleNextContent();
      
      return {
        action: 'create_content',
        result
      };
    } else {
      // Check for engagement opportunities instead
      const engagementOpportunities = await this.findEngagementOpportunities();
      
      if (engagementOpportunities.length > 0) {
        // Engage with the top opportunity
        const result = await this.engageWithOpportunity(engagementOpportunities[0]);
        
        return {
          action: 'engage',
          result
        };
      }
      
      // Nothing to do right now
      return {
        action: 'idle',
        nextScheduledContent: this.scheduler.getNextScheduledTime()
      };
    }
  }
  
  /**
   * Generate content based on topics, trends, and brand voice
   * @param {Object} options - Content generation options
   * @returns {Object} Generated content
   */
  async generateContent(options = {}) {
    const topics = options.topics || this.topics;
    const platform = options.platform || this.platforms[0];
    
    // Detect current trends related to topics
    const trends = await this.trendDetector.detectTrends(topics);
    
    // Get relevant memory context
    const memoryContext = await this.vectorMemory.getContextualMemories(
      `Content about ${topics.join(', ')}`, 
      3
    );
    
    // Build content generation prompt
    const promptTemplate = new PromptTemplate({
      template: `
        You are a social media content creator with the following brand voice: {brandVoice}.
        
        Create an engaging {platform} post about {topic}.
        
        Current trends related to this topic:
        {trends}
        
        Previous content context:
        {context}
        
        Content should be:
        - Engaging and share-worthy
        - Written in the specified brand voice
        - Appropriate for {platform}
        - Include relevant hashtags based on a {hashtagStrategy} strategy
        
        Generate only the post content without any explanation.
      `,
      inputVariables: ['brandVoice', 'platform', 'topic', 'trends', 'context', 'hashtagStrategy']
    });
    
    // Select topic (either from passed options or randomly from available topics)
    const topic = options.topic || topics[Math.floor(Math.random() * topics.length)];
    
    // Format the prompt
    const prompt = await promptTemplate.format({
      brandVoice: this.brandVoice,
      platform,
      topic,
      trends: trends.map(t => `- ${t.name} (${t.volume || 'unknown'} tweets)`).join('\n'),
      context: memoryContext.map(m => `- ${m.content}`).join('\n'),
      hashtagStrategy: this.hashtagStrategy
    });
    
    // Generate content
    const rawContent = await this.llm.predict(prompt);
    
    // Process content based on platform
    const processedContent = this._processContentForPlatform(rawContent, platform);
    
    return {
      text: processedContent.text,
      topic,
      hashtags: processedContent.hashtags,
      media: processedContent.media,
      platform,
      generatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Process raw content for specific platforms
   * @param {String} rawContent - Raw generated content
   * @param {String} platform - Target platform
   * @returns {Object} Processed content
   * @private
   */
  _processContentForPlatform(rawContent, platform) {
    // Extract hashtags
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const hashtags = rawContent.match(hashtagRegex) || [];
    
    // Process based on platform
    switch (platform.toLowerCase()) {
      case 'x':
      case 'twitter':
        // Ensure content is within character limits
        let text = rawContent;
        if (text.length > 280) {
          text = text.substring(0, 277) + '...';
        }
        return { text, hashtags };
        
      case 'linkedin':
        // LinkedIn can have longer posts
        return { text: rawContent, hashtags };
        
      case 'instagram':
        // Instagram posts often have hashtags at the end
        return { 
          text: rawContent,
          hashtags,
          media: [] // In a real implementation, this might generate image prompts
        };
        
      default:
        return { text: rawContent, hashtags };
    }
  }
  
  /**
   * Create and post content across selected platforms
   * @returns {Object} Posting results
   */
  async createAndPostContent() {
    const results = {};
    
    for (const platform of this.platforms) {
      try {
        // Generate platform-specific content
        const content = await this.generateContent({ platform });
        
        // Post to the platform
        const result = await this.post(platform, { text: content.text });
        
        // Track content performance
        this.contentPerformance.push({
          id: result.id,
          platform,
          content,
          posted: new Date().toISOString(),
          initialMetrics: { likes: 0, replies: 0, reposts: 0 }
        });
        
        // Store in memory
        await this.memory.store(`content:${result.id}`, {
          platform,
          content,
          result,
          timestamp: Date.now()
        });
        
        results[platform] = {
          success: true,
          id: result.id,
          content
        };
      } catch (error) {
        results[platform] = {
          success: false,
          error: error.message
        };
      }
    }
    
    return results;
  }
  
  /**
   * Find opportunities to engage with other content
   * @returns {Array} Engagement opportunities
   */
  async findEngagementOpportunities() {
    const opportunities = [];
    
    for (const platform of this.platforms) {
      try {
        const connector = this.connectors[platform];
        if (!connector) continue;
        
        // For each topic, find relevant content to engage with
        for (const topic of this.topics) {
          const searchResults = await connector.search(topic);
          
          if (searchResults && searchResults.tweets) {
            // Add each result as a potential engagement opportunity
            for (const tweet of searchResults.tweets) {
              opportunities.push({
                platform,
                content: tweet,
                relevance: this._calculateRelevance(tweet, topic),
                type: 'reply'
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error finding engagement opportunities for ${platform}:`, error);
      }
    }
    
    // Sort by relevance
    return opportunities.sort((a, b) => b.relevance - a.relevance);
  }
  
  /**
   * Calculate content relevance score
   * @param {Object} content - Content to evaluate
   * @param {String} topic - Topic to compare against
   * @returns {Number} Relevance score (0-1)
   * @private
   */
  _calculateRelevance(content, topic) {
    // Simple relevance calculation
    // In a real implementation, this would use embeddings and semantic similarity
    if (!content.text) return 0;
    
    const text = content.text.toLowerCase();
    const topicTerms = topic.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const term of topicTerms) {
      if (text.includes(term)) {
        matches++;
      }
    }
    
    // Basic relevance score based on term matches
    const relevance = matches / topicTerms.length;
    
    // Boost score based on engagement metrics
    const engagementBoost = content.metrics ? 
      (content.metrics.like_count || 0) * 0.01 + 
      (content.metrics.retweet_count || 0) * 0.05 : 0;
    
    return Math.min(relevance + engagementBoost, 1);
  }
  
  /**
   * Engage with an opportunity (reply, like, etc)
   * @param {Object} opportunity - Engagement opportunity
   * @returns {Object} Engagement result
   */
  async engageWithOpportunity(opportunity) {
    const { platform, content, type } = opportunity;
    
    const connector = this.connectors[platform];
    if (!connector) {
      throw new Error(`Not connected to platform: ${platform}`);
    }
    
    try {
      if (type === 'reply') {
        // Generate reply content
        const replyContent = await this._generateReply(content);
        
        // Post the reply
        const result = await connector.reply(content.id, { text: replyContent });
        
        // Update stats
        this.stats.replies++;
        
        // Store in memory
        await this.memory.store(`reply:${result.id}`, {
          platform,
          originalContent: content,
          reply: replyContent,
          result,
          timestamp: Date.now()
        });
        
        return {
          success: true,
          type: 'reply',
          content: replyContent,
          result
        };
      } else if (type === 'like') {
        // Like the content
        const result = await connector.like(content.id);
        
        // Update stats
        this.stats.likes++;
        
        return {
          success: true,
          type: 'like',
          result
        };
      }
    } catch (error) {
      throw new Error(`Failed to engage with opportunity: ${error.message}`);
    }
  }
  
  /**
   * Generate a reply to content
   * @param {Object} content - Content to reply to
   * @returns {String} Reply text
   * @private
   */
  async _generateReply(content) {
    // Build reply generation prompt
    const promptTemplate = new PromptTemplate({
      template: `
        You are a social media manager with the following brand voice: {brandVoice}.
        
        Create a thoughtful and engaging reply to this post:
        "{originalText}"
        
        Your reply should:
        - Be conversational and authentic
        - Match the specified brand voice
        - Add value to the conversation
        - Be concise and appropriate for {platform}
        
        Generate only the reply text without any explanation.
      `,
      inputVariables: ['brandVoice', 'originalText', 'platform']
    });
    
    // Format the prompt
    const prompt = await promptTemplate.format({
      brandVoice: this.brandVoice,
      originalText: content.text,
      platform: content.platform || this.platforms[0]
    });
    
    // Generate reply
    const reply = await this.llm.predict(prompt);
    
    // Process for platform
    return this._processContentForPlatform(reply, content.platform || this.platforms[0]).text;
  }
  
  /**
   * Track and analyze content performance
   * @returns {Object} Performance analysis
   */
  async analyzePerformance() {
    if (this.contentPerformance.length === 0) {
      return {
        status: 'no_content',
        message: 'No content available for analysis'
      };
    }
    
    try {
      for (const item of this.contentPerformance) {
        // Skip already analyzed recent content
        if (item.analyzed && 
            new Date(item.analyzed) > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
          continue;
        }
        
        // Get current metrics for the content
        const platform = item.platform;
        const connector = this.connectors[platform];
        
        if (connector) {
          try {
            const contentData = await connector.getTweet(item.id);
            
            if (contentData) {
              // Update metrics
              item.currentMetrics = {
                likes: contentData.metrics?.like_count || 0,
                replies: contentData.metrics?.reply_count || 0,
                reposts: contentData.metrics?.retweet_count || 0
              };
              
              // Calculate engagement rate
              const totalEngagement = 
                item.currentMetrics.likes + 
                item.currentMetrics.replies + 
                item.currentMetrics.reposts;
              
              item.engagementRate = totalEngagement;
              item.analyzed = new Date().toISOString();
            }
          } catch (error) {
            console.error(`Error analyzing content ${item.id}:`, error);
          }
        }
      }
      
      // Calculate overall performance
      const totalEngagement = this.contentPerformance.reduce((sum, item) => {
        return sum + (item.engagementRate || 0);
      }, 0);
      
      const averageEngagement = totalEngagement / this.contentPerformance.length;
      
      // Update agent stats
      this.stats.engagementRate = averageEngagement;
      
      return {
        status: 'analyzed',
        contentCount: this.contentPerformance.length,
        averageEngagement,
        topPerforming: this.contentPerformance
          .sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0))
          .slice(0, 3)
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error analyzing performance: ${error.message}`
      };
    }
  }
}

module.exports = { ContentCrafter };
