/**
 * SocialOS Vector Memory Store
 * 
 * Advanced vector-based memory storage for semantic search and retrieval.
 * Enables agents to retrieve contextually relevant information based on semantic similarity.
 */

const { MemoryManager } = require('./memory-manager');
const { OpenAIEmbeddings } = require('langchain/embeddings');
const { HNSWLib } = require('langchain/vectorstores');
const { Document } = require('langchain/document');
const fs = require('fs').promises;
const path = require('path');

class VectorMemory {
  /**
   * Create a new VectorMemory instance
   * @param {Object} config - Configuration options
   * @param {String} config.namespace - Memory namespace
   * @param {String} config.directory - Directory to store vector data
   * @param {String} config.embedding - Embedding model name
   */
  constructor(config = {}) {
    this.namespace = config.namespace || 'socialos-vector';
    this.directory = config.directory || './vector-data';
    this.embeddingModel = config.embedding || 'text-embedding-3-large';
    
    this.memoryManager = new MemoryManager({
      namespace: this.namespace,
      embeddingModel: this.embeddingModel
    });
    
    this.embeddings = new OpenAIEmbeddings({
      model: this.embeddingModel
    });
    
    this.vectorStore = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the vector store
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(this.directory, { recursive: true });
      
      // Try to load existing vector store
      const storePath = path.join(this.directory, `${this.namespace}.index`);
      
      try {
        this.vectorStore = await HNSWLib.load(storePath, this.embeddings);
        console.log(`Loaded existing vector store from ${storePath}`);
      } catch (e) {
        // Create new vector store if loading fails
        this.vectorStore = await HNSWLib.fromTexts(
          ['Vector store initialization'], 
          [{ source: 'initialization' }], 
          this.embeddings
        );
        console.log('Created new vector store');
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing vector store:', error);
      throw error;
    }
  }
  
  /**
   * Save the vector store to disk
   */
  async save() {
    if (!this.initialized) await this.initialize();
    
    const storePath = path.join(this.directory, `${this.namespace}.index`);
    await this.vectorStore.save(storePath);
    console.log(`Vector store saved to ${storePath}`);
  }
  
  /**
   * Store a memory item with vector embedding
   * @param {String} key - Memory key
   * @param {String|Object} data - Memory data
   * @param {Object} metadata - Additional metadata
   */
  async store(key, data, metadata = {}) {
    if (!this.initialized) await this.initialize();
    
    // Store in regular memory manager
    await this.memoryManager.store(key, data, metadata);
    
    // Store in vector database
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    const doc = new Document({
      pageContent: text,
      metadata: {
        key,
        ...metadata,
        timestamp: Date.now()
      }
    });
    
    await this.vectorStore.addDocuments([doc]);
    await this.save();
    
    return { key, data, metadata };
  }
  
  /**
   * Find similar memories based on semantic search
   * @param {String} query - Search query
   * @param {Number} k - Number of results to return
   * @param {Object} filters - Metadata filters
   */
  async similaritySearch(query, k = 5, filters = {}) {
    if (!this.initialized) await this.initialize();
    
    // Create filter function based on metadata filters
    const filterFn = filters && Object.keys(filters).length > 0
      ? (doc) => {
          return Object.entries(filters).every(([key, value]) => {
            return doc.metadata[key] === value;
          });
        }
      : undefined;
    
    const results = await this.vectorStore.similaritySearch(
      query,
      k,
      filterFn
    );
    
    return results.map(doc => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      key: doc.metadata.key
    }));
  }
  
  /**
   * Retrieve a specific memory by key
   * @param {String} key - Memory key
   */
  async retrieve(key) {
    return this.memoryManager.retrieve(key);
  }
  
  /**
   * Update an existing memory
   * @param {String} key - Memory key
   * @param {String|Object} data - New data
   * @param {Object} metadata - New metadata
   */
  async update(key, data, metadata = {}) {
    // Delete the old vector entry (we can't efficiently update it)
    // and create a new one
    await this.delete(key);
    return this.store(key, data, metadata);
  }
  
  /**
   * Delete a memory
   * @param {String} key - Memory key
   */
  async delete(key) {
    await this.memoryManager.delete(key);
    
    // For vector store, we need to rebuild without the deleted document
    // This is inefficient but necessary with some vector stores
    const allMemories = await this.memoryManager.list();
    
    // Recreate vector store without the deleted item
    const texts = [];
    const metadatas = [];
    
    for (const memory of allMemories) {
      if (memory.key !== key) {
        const text = typeof memory.data === 'string' 
          ? memory.data 
          : JSON.stringify(memory.data);
        
        texts.push(text);
        metadatas.push({ key: memory.key, ...memory.metadata });
      }
    }
    
    // Create new vector store
    this.vectorStore = await HNSWLib.fromTexts(
      texts, 
      metadatas, 
      this.embeddings
    );
    
    await this.save();
  }
  
  /**
   * Get context-relevant memories for a specific situation
   * @param {String} situation - Description of the current situation
   * @param {Number} maxResults - Maximum results to return
   * @param {Object} filters - Metadata filters
   */
  async getContextualMemories(situation, maxResults = 5, filters = {}) {
    const results = await this.similaritySearch(situation, maxResults, filters);
    
    // Format results for use in agent context
    return results.map(result => ({
      content: result.content,
      key: result.key,
      relevance: result.metadata._distance || 1.0, // Lower is more relevant
      timestamp: result.metadata.timestamp,
      source: result.metadata.source || 'memory'
    }));
  }
}

module.exports = { VectorMemory };
