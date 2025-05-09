/**
 * SocialOS ContentAnalyzer
 * 
 * Analyzes content performance, engagement patterns, and audience reactions.
 * Provides insights to help improve content strategy.
 */

const { OpenAIEmbeddings } = require('langchain/embeddings');

class ContentAnalyzer {
  /**
   * Create a new ContentAnalyzer
   * @param {Object} options - Analyzer options
   * @param {String} options.embeddingModel - Model for content embeddings
   * @param {Number} options.minSampleSize - Minimum samples for reliable analysis
   */
  constructor(options = {}) {
    this.embeddingModel = options.embeddingModel || 'text-embedding-3-large';
    this.minSampleSize = options.minSampleSize || 5;
    
    this.embeddings = new OpenAIEmbeddings({
      model: this.embeddingModel
    });
    
    // Performance metrics by content type
    this.performanceByType = {
      question: { count: 0, totalEngagement: 0 },
      statement: { count: 0, totalEngagement: 0 },
      link: { count: 0, totalEngagement: 0 },
      image: { count: 0, totalEngagement: 0 },
      thread: { count: 0, totalEngagement: 0 }
    };
    
    // Performance metrics by topic
    this.performanceByTopic = {};
    
    // Performance metrics by content attributes
    this.performanceByAttributes = {
      hasHashtags: { count: 0, totalEngagement: 0 },
      hasMentions: { count: 0, totalEngagement: 0 },
      hasEmojis: { count: 0, totalEngagement: 0 },
      hasLinks: { count: 0, totalEngagement: 0 },
      hasQuestions: { count: 0, totalEngagement: 0 },
      wordCount: {} // Grouped by word count ranges
    };
  }
  
  /**
   * Analyze content to determine its type and attributes
   * @param {String} content - Content text to analyze
   * @returns {Object} Content attributes
   */
  analyzeContentAttributes(content) {
    if (!content) return {};
    
    // Detect content type
    let type = 'statement';
    if (content.includes('?')) {
      type = 'question';
    } else if (content.includes('http') || content.includes('www.')) {
      type = 'link';
    } else if (content.split('\n').length > 3) {
      type = 'thread';
    }
    
    // Detect attributes
    const hasHashtags = /#[a-zA-Z0-9_]+/.test(content);
    const hasMentions = /@[a-zA-Z0-9_]+/.test(content);
    const hasEmojis = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(content);
    const hasLinks = /https?:\/\/[^\s]+/.test(content);
    const hasQuestions = /\?/.test(content);
    const wordCount = content.split(/\s+/).length;
    
    // Categorize word count
    let wordCountRange = '0-10';
    if (wordCount > 50) {
      wordCountRange = '50+';
    } else if (wordCount > 30) {
      wordCountRange = '30-50';
    } else if (wordCount > 20) {
      wordCountRange = '20-30';
    } else if (wordCount > 10) {
      wordCountRange = '10-20';
    }
    
    return {
      type,
      hasHashtags,
      hasMentions,
      hasEmojis,
      hasLinks,
      hasQuestions,
      wordCount,
      wordCountRange
    };
  }
  
  /**
   * Update performance metrics with new content data
   * @param {Object} content - Content data
   * @param {Number} engagementRate - Content engagement rate
   */
  updateMetrics(content, engagementRate) {
    if (!content || engagementRate === undefined) return;
    
    // Get content attributes
    const attributes = this.analyzeContentAttributes(content.text);
    
    // Update metrics by content type
    if (this.performanceByType[attributes.type]) {
      this.performanceByType[attributes.type].count += 1;
      this.performanceByType[attributes.type].totalEngagement += engagementRate;
    }
    
    // Update metrics by topic
    if (content.topic) {
      this.performanceByTopic[content.topic] = this.performanceByTopic[content.topic] || { count: 0, totalEngagement: 0 };
      this.performanceByTopic[content.topic].count += 1;
      this.performanceByTopic[content.topic].totalEngagement += engagementRate;
    }
    
    // Update metrics by attributes
    if (attributes.hasHashtags) {
      this.performanceByAttributes.hasHashtags.count += 1;
      this.performanceByAttributes.hasHashtags.totalEngagement += engagementRate;
    }
    
    if (attributes.hasMentions) {
      this.performanceByAttributes.hasMentions.count += 1;
      this.performanceByAttributes.hasMentions.totalEngagement += engagementRate;
    }
    
    if (attributes.hasEmojis) {
      this.performanceByAttributes.hasEmojis.count += 1;
      this.performanceByAttributes.hasEmojis.totalEngagement += engagementRate;
    }
    
    if (attributes.hasLinks) {
      this.performanceByAttributes.hasLinks.count += 1;
      this.performanceByAttributes.hasLinks.totalEngagement += engagementRate;
    }
    
    if (attributes.hasQuestions) {
      this.performanceByAttributes.hasQuestions.count += 1;
      this.performanceByAttributes.hasQuestions.totalEngagement += engagementRate;
    }
    
    // Update metrics by word count
    const range = attributes.wordCountRange;
    this.performanceByAttributes.wordCount[range] = this.performanceByAttributes.wordCount[range] || { count: 0, totalEngagement: 0 };
    this.performanceByAttributes.wordCount[range].count += 1;
    this.performanceByAttributes.wordCount[range].totalEngagement += engagementRate;
  }
  
  /**
   * Generate content performance insights
   * @param {Array} contentPerformance - Array of content performance data
   * @returns {Object} Performance insights
   */
  generateInsights(contentPerformance) {
    // Reset metrics
    this.performanceByType = {
      question: { count: 0, totalEngagement: 0 },
      statement: { count: 0, totalEngagement: 0 },
      link: { count: 0, totalEngagement: 0 },
      image: { count: 0, totalEngagement: 0 },
      thread: { count: 0, totalEngagement: 0 }
    };
    
    this.performanceByTopic = {};
    this.performanceByAttributes = {
      hasHashtags: { count: 0, totalEngagement: 0 },
      hasMentions: { count: 0, totalEngagement: 0 },
      hasEmojis: { count: 0, totalEngagement: 0 },
      hasLinks: { count: 0, totalEngagement: 0 },
      hasQuestions: { count: 0, totalEngagement: 0 },
      wordCount: {}
    };
    
    // Process all content
    for (const item of contentPerformance) {
      if (!item.content || item.engagementRate === undefined) continue;
      this.updateMetrics(item.content, item.engagementRate);
    }
    
    // Calculate averages and prepare insights
    const insights = {
      bestContentTypes: this._calculateBestPerformers(this.performanceByType),
      bestTopics: this._calculateBestPerformers(this.performanceByTopic),
      bestAttributes: {
        hasHashtags: this._calculateAverage(this.performanceByAttributes.hasHashtags),
        hasMentions: this._calculateAverage(this.performanceByAttributes.hasMentions),
        hasEmojis: this._calculateAverage(this.performanceByAttributes.hasEmojis),
        hasLinks: this._calculateAverage(this.performanceByAttributes.hasLinks),
        hasQuestions: this._calculateAverage(this.performanceByAttributes.hasQuestions),
        wordCounts: this._calculateBestPerformers(this.performanceByAttributes.wordCount)
      },
      recommendations: []
    };
    
    // Generate recommendations based on insights
    insights.recommendations = this._generateRecommendations(insights);
    
    return insights;
  }
  
  /**
   * Calculate best performers from metrics
   * @param {Object} metricsObject - Metrics object
   * @returns {Array} Sorted best performers
   * @private
   */
  _calculateBestPerformers(metricsObject) {
    const performers = Object.entries(metricsObject)
      .filter(([_, data]) => data.count >= this.minSampleSize)
      .map(([key, data]) => ({
        name: key,
        average: data.totalEngagement / data.count,
        count: data.count
      }))
      .sort((a, b) => b.average - a.average);
    
    return performers;
  }
  
  /**
   * Calculate average from metrics data
   * @param {Object} metricsData - Metrics data
   * @returns {Object} Average and count
   * @private
   */
  _calculateAverage(metricsData) {
    if (!metricsData || metricsData.count === 0) {
      return { average: 0, count: 0 };
    }
    
    return {
      average: metricsData.totalEngagement / metricsData.count,
      count: metricsData.count
    };
  }
  
  /**
   * Generate content recommendations based on insights
   * @param {Object} insights - Performance insights
   * @returns {Array} Recommendations
   * @private
   */
  _generateRecommendations(insights) {
    const recommendations = [];
    
    // Recommend best content types
    if (insights.bestContentTypes.length > 0) {
      const topType = insights.bestContentTypes[0];
      recommendations.push(`Focus on creating more ${topType.name} content, which performs ${Math.round(topType.average * 100) / 100} points better than average.`);
    }
    
    // Recommend best topics
    if (insights.bestTopics.length > 0) {
      const topTopic = insights.bestTopics[0];
      recommendations.push(`Content about "${topTopic.name}" performs well with an engagement rate of ${Math.round(topTopic.average * 100) / 100}.`);
    }
    
    // Recommend based on attributes
    const attributeInsights = [];
    
    if (insights.bestAttributes.hasHashtags.count >= this.minSampleSize) {
      if (insights.bestAttributes.hasHashtags.average > 0) {
        attributeInsights.push('Using hashtags increases engagement.');
      } else {
        attributeInsights.push('Consider using fewer hashtags.');
      }
    }
    
    if (insights.bestAttributes.hasQuestions.count >= this.minSampleSize) {
      if (insights.bestAttributes.hasQuestions.average > 0) {
        attributeInsights.push('Posts with questions perform better.');
      }
    }
    
    if (insights.bestAttributes.wordCounts.length > 0) {
      const bestWordCount = insights.bestAttributes.wordCounts[0];
      attributeInsights.push(`Optimal content length is ${bestWordCount.name} words.`);
    }
    
    if (attributeInsights.length > 0) {
      recommendations.push(attributeInsights.join(' '));
    }
    
    return recommendations;
  }
  
  /**
   * Compare content similarity to find patterns in high-performing content
   * @param {Array} contentItems - Content items to compare
   * @returns {Object} Similarity analysis
   */
  async analyzeSimilarity(contentItems) {
    if (!contentItems || contentItems.length < 2) {
      return {
        status: 'error',
        message: 'Need at least 2 content items to compare'
      };
    }
    
    try {
      // Group content by performance
      const highPerforming = contentItems
        .filter(item => item.engagementRate !== undefined)
        .sort((a, b) => b.engagementRate - a.engagementRate)
        .slice(0, Math.ceil(contentItems.length / 3));
      
      // Generate embeddings for high-performing content
      const texts = highPerforming.map(item => item.content?.text || '');
      const embeddings = await this.embeddings.embedDocuments(texts);
      
      // Find common themes through simple centroid calculation
      const centroid = this._calculateCentroid(embeddings);
      
      // Identify key characteristics of high-performing content
      return {
        status: 'success',
        highPerformingCount: highPerforming.length,
        averageEngagement: highPerforming.reduce((sum, item) => sum + item.engagementRate, 0) / highPerforming.length,
        // In a real implementation, we would extract actual themes from the centroid
        commonThemes: ['Concise messaging', 'Clear calls to action', 'Authentic voice'],
        recommendedApproach: 'Focus on authentic engagement with concise messaging and clear value propositions.'
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Error analyzing similarity: ${error.message}`
      };
    }
  }
  
  /**
   * Calculate centroid of embeddings
   * @param {Array} embeddings - Array of embedding vectors
   * @returns {Array} Centroid vector
   * @private
   */
  _calculateCentroid(embeddings) {
    if (!embeddings || embeddings.length === 0) {
      return [];
    }
    
    const dimensions = embeddings[0].length;
    const centroid = new Array(dimensions).fill(0);
    
    for (const embedding of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += embedding[i];
      }
    }
    
    for (let i = 0; i < dimensions; i++) {
      centroid[i] /= embeddings.length;
    }
    
    return centroid;
  }
}

module.exports = { ContentAnalyzer };
