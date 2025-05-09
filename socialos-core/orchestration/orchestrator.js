/**
 * SocialOS Orchestrator
 * 
 * The central orchestration engine for SocialOS agents, powered by LangChain.
 * Handles agent execution, scheduling, and coordination.
 */

const { LangChain } = require('langchain');
const { BaseOrchestrator } = require('./base-orchestrator');
const { MemoryManager } = require('../memory-layer/memory-manager');
const { AgentExecutor } = require('../agent-runtime/agent-executor');
const { WorkflowRegistry } = require('./workflow-registry');

class Orchestrator extends BaseOrchestrator {
  /**
   * Creates a new Orchestrator instance
   * @param {Object} config - Orchestrator configuration
   * @param {Array} config.agents - Array of agents to orchestrate
   * @param {Object} config.memory - Memory manager instance
   * @param {Object} config.connector - Platform connector
   */
  constructor(config) {
    super();
    this.agents = config.agents || [];
    this.memory = config.memory || new MemoryManager();
    this.connector = config.connector;
    this.workflows = new WorkflowRegistry();
    this.executionQueue = [];
    
    // Initialize LangChain for orchestration
    this.langchain = new LangChain({
      modelName: config.model || 'gpt-4',
      temperature: config.temperature || 0.7
    });
  }
  
  /**
   * Registers an agent with the orchestrator
   * @param {Agent} agent - Agent to register
   */
  registerAgent(agent) {
    this.agents.push(agent);
    console.log(`Agent registered: ${agent.name}`);
    return this;
  }
  
  /**
   * Registers a workflow with the orchestrator
   * @param {String} name - Workflow name
   * @param {Array} steps - Workflow steps
   */
  registerWorkflow(name, steps) {
    this.workflows.register(name, steps);
    console.log(`Workflow registered: ${name}`);
    return this;
  }
  
  /**
   * Executes a workflow
   * @param {String} workflowName - Name of the workflow to execute
   * @param {Object} context - Initial context
   */
  async executeWorkflow(workflowName, context = {}) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }
    
    console.log(`Executing workflow: ${workflowName}`);
    const workflowContext = { ...context };
    
    for (const step of workflow.steps) {
      const agent = this.agents.find(a => a.id === step.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${step.agentId}`);
      }
      
      // Execute the agent with the current context
      const executor = new AgentExecutor(agent, this.connector);
      const result = await executor.execute(step.action, workflowContext);
      
      // Update the context with the result
      workflowContext.results = workflowContext.results || {};
      workflowContext.results[step.id] = result;
      
      // Check if we should continue or abort the workflow
      if (step.condition && !step.condition(result, workflowContext)) {
        console.log(`Workflow ${workflowName} aborted at step ${step.id}`);
        break;
      }
      
      // Store in memory if specified
      if (step.memorize) {
        await this.memory.store(
          `workflow:${workflowName}:${step.id}`,
          result,
          { workflow: workflowName, step: step.id }
        );
      }
    }
    
    console.log(`Workflow ${workflowName} completed`);
    return workflowContext;
  }
  
  /**
   * Schedule a workflow for future execution
   * @param {String} workflowName - Name of the workflow to execute
   * @param {Object} context - Initial context
   * @param {Date} scheduledTime - When to execute the workflow
   */
  scheduleWorkflow(workflowName, context = {}, scheduledTime) {
    const now = new Date();
    const executeAt = scheduledTime || now;
    const delay = executeAt - now;
    
    if (delay <= 0) {
      return this.executeWorkflow(workflowName, context);
    }
    
    console.log(`Scheduling workflow ${workflowName} for ${executeAt}`);
    const timeoutId = setTimeout(() => {
      this.executeWorkflow(workflowName, context);
    }, delay);
    
    return {
      workflowName,
      scheduledTime: executeAt,
      cancel: () => clearTimeout(timeoutId)
    };
  }
  
  /**
   * Creates a chain of agents where output of one feeds into the next
   * @param {Array} agentIds - Array of agent IDs to chain
   * @returns {Object} - Chainable workflow
   */
  chainAgents(agentIds) {
    const workflowName = `chain_${Date.now()}`;
    const steps = agentIds.map((agentId, index) => ({
      id: `step_${index}`,
      agentId,
      action: 'process',
      memorize: true,
    }));
    
    this.registerWorkflow(workflowName, steps);
    return {
      execute: (context) => this.executeWorkflow(workflowName, context),
      schedule: (context, time) => this.scheduleWorkflow(workflowName, context, time)
    };
  }
}

module.exports = { Orchestrator };
