/**
 * SocialOS Workflow Registry
 * 
 * Manages the registration and retrieval of agent workflows.
 */

class WorkflowRegistry {
  constructor() {
    this.workflows = new Map();
  }
  
  /**
   * Register a new workflow
   * @param {String} name - Workflow name
   * @param {Array} steps - Array of workflow steps
   */
  register(name, steps) {
    if (this.workflows.has(name)) {
      throw new Error(`Workflow ${name} is already registered`);
    }
    
    this.workflows.set(name, {
      name,
      steps,
      createdAt: new Date(),
    });
    
    return this;
  }
  
  /**
   * Get a workflow by name
   * @param {String} name - Workflow name
   * @returns {Object} Workflow configuration
   */
  get(name) {
    const workflow = this.workflows.get(name);
    if (!workflow) {
      return null;
    }
    return workflow;
  }
  
  /**
   * List all registered workflows
   * @returns {Array} Array of workflow names
   */
  listWorkflows() {
    return Array.from(this.workflows.keys());
  }
  
  /**
   * Update an existing workflow
   * @param {String} name - Workflow name
   * @param {Array} steps - New workflow steps
   */
  update(name, steps) {
    if (!this.workflows.has(name)) {
      throw new Error(`Workflow ${name} does not exist`);
    }
    
    const workflow = this.workflows.get(name);
    this.workflows.set(name, {
      ...workflow,
      steps,
      updatedAt: new Date(),
    });
    
    return this;
  }
  
  /**
   * Remove a workflow
   * @param {String} name - Workflow name
   */
  remove(name) {
    if (!this.workflows.has(name)) {
      throw new Error(`Workflow ${name} does not exist`);
    }
    
    this.workflows.delete(name);
    return this;
  }
  
  /**
   * Clone a workflow with a new name
   * @param {String} sourceName - Source workflow name
   * @param {String} targetName - Target workflow name
   */
  clone(sourceName, targetName) {
    const source = this.get(sourceName);
    if (!source) {
      throw new Error(`Source workflow ${sourceName} does not exist`);
    }
    
    if (this.workflows.has(targetName)) {
      throw new Error(`Target workflow ${targetName} already exists`);
    }
    
    this.workflows.set(targetName, {
      name: targetName,
      steps: [...source.steps],
      clonedFrom: sourceName,
      createdAt: new Date(),
    });
    
    return this;
  }
  
  /**
   * Create a composite workflow from multiple workflows
   * @param {String} newName - New workflow name
   * @param {Array} workflowNames - Array of workflow names to combine
   */
  compose(newName, workflowNames) {
    const compositeSteps = [];
    
    for (const name of workflowNames) {
      const workflow = this.get(name);
      if (!workflow) {
        throw new Error(`Workflow ${name} does not exist`);
      }
      
      compositeSteps.push(...workflow.steps);
    }
    
    this.register(newName, compositeSteps);
    return this;
  }
}

module.exports = { WorkflowRegistry };
