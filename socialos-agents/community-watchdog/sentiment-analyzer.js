/**
 * SocialOS SentimentAnalyzer
 * 
 * Analyzes text sentiment for social media mentions and content.
 * Provides sentiment scoring, emotion detection, and context analysis.
 */

const { OpenAI } = require('langchain/llms');
const { PromptTemplate } = require('langchain/prompts');

class SentimentAnalyzer {
  /**
   * Create a new SentimentAnalyzer
   * @param {Object} options - Analyzer options
   * @param {String} options.model - LLM model to use
   * @param {Number} options.temperature - LLM temperature
   * @param {Boolean} options.useCache - Whether to cache results
   */
  constructor(options = {}) {
    this.model = options.model || 'gpt-4';
    this.temperature = options.temperature || 0.1; // Low temperature for consistent scoring
    this.useCache = options.useCache !== false;
    
    this.llm = new OpenAI({
      model: this.model,
      temperature: this.temperature
    });
    
    // Sentiment cache
    this.cache = new Map();
    this.cacheExpiry = options.cacheExpiry || 24 * 60 * 60 * 1000; // 24 hours
  }
  
  /**
   * Analyze sentiment of text
   * @param {String} text - Text to analyze
   * @param {Object} context - Additional context
   * @returns {Object} Sentiment analysis
   */
  async analyzeSentiment(text, context = {}) {
    if (!text) {
      return { score: 0, label: 'neutral', confidence: 0 };
    }
    
    // Check cache if enabled
    const cacheKey = this._getCacheKey(text);
    if (this.useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached.timestamp > Date.now() - this.cacheExpiry) {
        return cached.sentiment;
      }
    }
    
    // LLM-based sentiment analysis
    try {
      const sentiment = await this._analyzeSentimentWithLLM(text, context);
      
      // Cache the result
      if (this.useCache) {
        this.cache.set(cacheKey, {
          sentiment,
          timestamp: Date.now()
        });
      }
      
      return sentiment;
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      
      // Fallback to simple rule-based analysis
      return this._simpleRuleBasedSentiment(text);
    }
  }
  
  /**
   * Analyze sentiment using LLM
   * @param {String} text - Text to analyze
   * @param {Object} context - Additional context
   * @returns {Object} Sentiment analysis
   * @private
   */
  async _analyzeSentimentWithLLM(text, context) {
    const promptTemplate = new PromptTemplate({
      template: `
        You are a sentiment analysis expert. Analyze the sentiment of the following text:
        
        "{text}"
        
        Return only a JSON object with the following fields:
        - score: a number from -1.0 (very negative) to 1.0 (very positive)
        - label: one of "positive", "negative", "neutral", "mixed"
        - confidence: a number from 0.0 to 1.0 indicating how confident you are in this assessment
        - emotions: an array of emotions detected in the text (e.g. ["happy", "excited"])
        - keyphrases: an array of key phrases that influenced this sentiment assessment
        
        Return only valid JSON with no additional explanation.
      `,
      inputVariables: ['text']
    });
    
    // Format the prompt with the text
    const prompt = await promptTemplate.format({ text });
    
    // Get sentiment analysis from LLM
    const response = await this.llm.predict(prompt);
    
    // Parse the JSON response
    try {
      const sentimentData = JSON.parse(response);
      return {
        score: sentimentData.score,
        label: sentimentData.label,
        confidence: sentimentData.confidence,
        emotions: sentimentData.emotions || [],
        keyphrases: sentimentData.keyphrases || []
      };
    } catch (error) {
      console.error('Error parsing sentiment response:', error);
      throw new Error('Failed to parse sentiment analysis');
    }
  }
  
  /**
   * Simple rule-based sentiment analysis fallback
   * @param {String} text - Text to analyze
   * @returns {Object} Sentiment analysis
   * @private
   */
  _simpleRuleBasedSentiment(text) {
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'love', 'like', 'happy', 
      'fantastic', 'awesome', 'wonderful', 'best', 'thank', 'thanks',
      'appreciate', 'helpful', 'excited', 'perfect'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'hate', 'dislike', 'disappointed', 'angry',
      'worst', 'useless', 'broken', 'problem', 'issue', 'bug', 'annoying',
      'frustrating', 'horrible', 'poor', 'unhappy', 'sucks'
    ];
    
    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    
    // Count positive words
    for (const word of positiveWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) positiveCount += matches.length;
    }
    
    // Count negative words
    for (const word of negativeWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) negativeCount += matches.length;
    }
    
    // Calculate sentiment score
    let score = 0;
    if (positiveCount > 0 || negativeCount > 0) {
      const total = positiveCount + negativeCount;
      score = (positiveCount - negativeCount) / total;
    }
    
    // Determine label
    let label = 'neutral';
    if (score > 0.3) label = 'positive';
    else if (score < -0.3) label = 'negative';
    else if (positiveCount > 0 && negativeCount > 0) label = 'mixed';
    
    return {
      score,
      label,
      confidence: 0.6, // Lower confidence for rule-based analysis
      emotions: [],
      keyphrases: []
    };
  }
  
  /**
   * Get cache key for text
   * @param {String} text - Text to get cache key for
   * @returns {String} Cache key
   * @private
   */
  _getCacheKey(text) {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `sent_${hash}`;
  }
  
  /**
   * Analyze sentiment and topics in a batch of texts
   * @param {Array} texts - Array of texts to analyze
   * @returns {Array} Sentiment analyses
   */
  async batchAnalyzeSentiment(texts) {
    if (!texts || !texts.length) return [];
    
    const results = [];
    
    // Process in small batches to avoid overloading API
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.analyzeSentiment(text));
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }
  
  /**
   * Analyze sentiment trends over time
   * @param {Array} items - Array of items with text and timestamp
   * @returns {Object} Sentiment trend analysis
   */
  async analyzeSentimentTrend(items) {
    if (!items || !items.length) {
      return { trend: 'stable', average: 0, data: [] };
    }
    
    // Sort items by timestamp
    const sortedItems = [...items].sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
    
    // Analyze sentiment for each item
    const sentiments = [];
    for (const item of sortedItems) {
      const sentiment = await this.analyzeSentiment(item.text);
      sentiments.push({
        timestamp: item.timestamp,
        score: sentiment.score,
        label: sentiment.label
      });
    }
    
    // Calculate overall average
    const average = sentiments.reduce((sum, item) => sum + item.score, 0) / sentiments.length;
    
    // Determine trend (simple linear regression)
    let trend = 'stable';
    if (sentiments.length >= 5) {
      const firstHalf = sentiments.slice(0, Math.floor(sentiments.length / 2));
      const secondHalf = sentiments.slice(Math.floor(sentiments.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, item) => sum + item.score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, item) => sum + item.score, 0) / secondHalf.length;
      
      if (secondAvg - firstAvg > 0.2) {
        trend = 'improving';
      } else if (firstAvg - secondAvg > 0.2) {
        trend = 'deteriorating';
      }
    }
    
    return {
      trend,
      average,
      data: sentiments
    };
  }
}

module.exports = { SentimentAnalyzer };
