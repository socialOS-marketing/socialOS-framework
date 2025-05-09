/**
 * SocialOS Memory Manager
 * 
 * Persistent memory system for agents using vector embeddings and Redis.
 * Allows agents to maintain context over time.
 */

const { Redis } = require('redis');
const { OpenAIEmbeddings } = require('langchain/embeddings');

class MemoryManager {
  /**
   * Create a new MemoryManager instance
   * @param {Object} config - Memory configuration
   * @param {String} config.namespace - Memory namespace
   * @param {String} config.redisUrl - Redis connection URL
   * @param {String} config.embeddingModel - Embedding model to use
   */
  constructor(config = {}) {
    this.namespace = config.namespace || 'socialos';
    this.redisUrl = config.redisUrl || 'redis://localhost:6379';
    this.embeddingModel = config.embeddingModel || 'text-embedding-3-large';
    
    // Initialize Redis client
    this.client = null;
    this.embeddings = new OpenAIEmbeddings({
      model: this.embeddingModel
    });
    
    this._initRedis();
  }
  
  /**
   * Initialize Redis connection
   * @private
   */
  async _initRedis() {
    try {
      this.client = Redis.createClient({
        url: this.redisUrl
      });
      
      await this.client.connect();
      console.log('Memory manager connected to Redis');
    } catch (error) {
      console.error('Error connecting to Redis:', error);
      // Fall back to in-memory storage if Redis is unavailable
      this.client = new Map();
      console.log('Using fallback in-memory storage');
    }
  }
  
  /**
   * Generate a memory key
   * @param {String} key - Base key
   * @returns {String} Namespaced key
   * @private
   */
  _getKey(key) {
    return `${this.namespace}:${key}`;
  }
  
  /**
   * Store data in memory
   * @param {String} key - Memory key
   * @param {Object} data - Data to store
   * @param {Object} metadata - Additional metadata
   */
  async store(key, data, metadata = {}) {
    const fullKey = this._getKey(key);
    const timestamp = Date.now();
    
    const memoryItem = {
      key,
      data,
      metadata,
      timestamp,
      version: 1
    };
    
    // Generate embeddings for text data
    if (typeof data === 'string') {
      const embedding = await this.embeddings.embedQuery(data);
      memoryItem.embedding = embedding;
    }
    
    if (this.client instanceof Map) {
      // In-memory fallback
      this.client.set(fullKey, JSON.stringify(memoryItem));
    } else {
      // Redis storage
      await this.client.set(fullKey, JSON.stringify(memoryItem));
      
      // If it has an embedding, store in vector index
      if (memoryItem.embedding) {
        await this.client.sendCommand([
          'FT.CREATE', `${this.namespace}:idx`, 'ON', 'HASH', 
          'PREFIX', '1', `${this.namespace}:`,
          'SCHEMA', 'embedding', 'VECTOR', 'HNSW', '10', 'TYPE', 'FLOAT32', 'DIM', '1536', 'DISTANCE_METRIC', 'COSINE'
        ]).catch(err => {
          // Index may already exist
          if (!err.message.includes('Index already exists')) {
            console.error('Error creating vector index:', err);
          }
        });
      }
    }
    
    return memoryItem;
  }
  
  /**
   * Retrieve data from memory
   * @param {String} key - Memory key
   * @returns {Object} Retrieved data
   */
  async retrieve(key) {
    const fullKey = this._getKey(key);
    
    let result;
    if (this.client instanceof Map) {
      // In-memory fallback
      result = this.client.get(fullKey);
      return result ? JSON.parse(result) : null;
    } else {
      // Redis storage
      result = await this.client.get(fullKey);
      return result ? JSON.parse(result) : null;
    }
  }
  
  /**
   * Find memories similar to a query
   * @param {String} query - Query text
   * @param {Number} limit - Maximum results to return
   * @returns {Array} Similar memories
   */
  async retrieveSimilar(query, limit = 5) {
    if (this.client instanceof Map) {
      // Similarity search not available in fallback mode
      console.warn('Vector similarity search not available in fallback mode');
      return [];
    }
    
    const embedding = await this.embeddings.embedQuery(query);
    
    // Use Redis vector search
    const results = await this.client.sendCommand([
      'FT.SEARCH', `${this.namespace}:idx`, '*=>[KNN $K @embedding $BLOB AS score]',
      'PARAMS', '2', 'K', limit, 'BLOB', Buffer.from(new Float32Array(embedding).buffer).toString('base64'),
      'SORTBY', 'score', 'RETURN', '2', 'data', 'metadata'
    ]);
    
    // Process results
    const memories = [];
    for (let i = 1; i < results.length; i += 2) {
      const [_, fields] = results[i];
      const dataIndex = fields.indexOf('data');
      const metadataIndex = fields.indexOf('metadata');
      
      if (dataIndex >= 0 && dataIndex + 1 < fields.length) {
        const data = JSON.parse(fields[dataIndex + 1]);
        const metadata = metadataIndex >= 0 && metadataIndex + 1 < fields.length 
          ? JSON.parse(fields[metadataIndex + 1])
          : {};
        
        memories.push({ data, metadata, score: results[i].score });
      }
    }
    
    return memories;
  }
  
  /**
   * Update existing memory
   * @param {String} key - Memory key
   * @param {Object} data - New data
   * @param {Object} metadata - New metadata
   */
  async update(key, data, metadata = {}) {
    const existing = await this.retrieve(key);
    if (!existing) {
      return this.store(key, data, metadata);
    }
    
    return this.store(key, data, {
      ...existing.metadata,
      ...metadata,
      version: (existing.metadata.version || 1) + 1
    });
  }
  
  /**
   * Delete a memory
   * @param {String} key - Memory key
   */
  async delete(key) {
    const fullKey = this._getKey(key);
    
    if (this.client instanceof Map) {
      this.client.delete(fullKey);
    } else {
      await this.client.del(fullKey);
    }
  }
  
  /**
   * List all memories with optional filtering
   * @param {String} prefix - Key prefix filter
   * @param {Number} limit - Maximum results
   */
  async list(prefix = '', limit = 100) {
    const fullPrefix = this._getKey(prefix);
    
    if (this.client instanceof Map) {
      // In-memory fallback
      const results = [];
      for (const [key, value] of this.client.entries()) {
        if (key.startsWith(fullPrefix) && results.length < limit) {
          results.push(JSON.parse(value));
        }
      }
      return results;
    } else {
      // Redis storage
      const keys = await this.client.keys(`${fullPrefix}*`);
      const limitedKeys = keys.slice(0, limit);
      
      if (limitedKeys.length === 0) {
        return [];
      }
      
      const values = await this.client.mGet(limitedKeys);
      return values.map(v => v ? JSON.parse(v) : null).filter(Boolean);
    }
  }
}

module.exports = { MemoryManager };
