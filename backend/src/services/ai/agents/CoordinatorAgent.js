/**
 * Coordinator Agent
 * Orchestrates multiple specialist agents for complex tasks
 */

const OpenRouterService = require('../OpenRouterService');
const PantryAgent = require('./PantryAgent');
const RecipeAgent = require('./RecipeAgent');
const MealPlanAgent = require('./MealPlanAgent');
const NutritionAgent = require('./NutritionAgent');

class CoordinatorAgent {
  constructor(tools) {
    this.openRouter = OpenRouterService;
    this.tools = tools;
    this.specialists = {
      pantry: new PantryAgent(tools),
      recipe: new RecipeAgent(tools),
      meal: new MealPlanAgent(tools),
      nutrition: new NutritionAgent(tools),
    };
  }

  async execute(userRequest, context = {}) {
    try {
      // Create execution plan
      const plan = await this.createPlan(userRequest, context);
      
      // Execute plan with specialists
      const results = await this.executePlan(plan, context);
      
      // Synthesize results into user-friendly response
      const finalResponse = await this.synthesizeResults(results, userRequest, context);
      
      return finalResponse;
    } catch (error) {
      console.error('CoordinatorAgent execution error:', error);
      return {
        success: false,
        message: 'I encountered an error processing your request. Please try again.',
        error: error.message,
      };
    }
  }

  async createPlan(userRequest, context) {
    const planningPrompt = `
You are a task planning agent. Break down the following user request into a sequence of steps.
Each step should specify which specialist agent to use and what information is needed.

Available agents:
- pantry: Check inventory, add/remove items, check expiration, find what's available
- recipe: Find recipes, analyze recipes, suggest substitutions, get cooking help
- meal: Create meal plans, optimize for nutrition/budget, schedule meals
- nutrition: Analyze nutritional content, check dietary compliance, calculate nutrition

User Request: "${userRequest}"

Context Available:
- User ID: ${context.userId || 'unknown'}
- Has pantry data: ${!!context.pantryItems}
- Has dietary restrictions: ${!!context.dietaryRestrictions}

Return a JSON array of steps. Each step should have:
{
  "agent": "agent_name",
  "action": "specific_action",
  "params": { /* parameters for the action */ },
  "reasoning": "why this step is needed"
}

If the request is simple and doesn't need multiple agents, return a single step.
If the request is complex, break it into logical sequential steps.

Example for "Plan my meals for the week":
[
  { "agent": "pantry", "action": "check_inventory", "params": {}, "reasoning": "Need to know what ingredients are available" },
  { "agent": "recipe", "action": "find_recipes", "params": { "count": 21 }, "reasoning": "Need recipes for 3 meals × 7 days" },
  { "agent": "meal", "action": "create_plan", "params": { "duration": 7 }, "reasoning": "Organize recipes into meal plan" }
]

Return ONLY the JSON array, no other text.
`;

    try {
      const response = await this.openRouter.chat([
        { role: 'system', content: 'You are a task planning specialist. Always return valid JSON arrays.' },
        { role: 'user', content: planningPrompt },
      ], { tier: 'medium', temperature: 0.3 });

      const content = response.choices[0].message.content.trim();
      
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('No JSON array found in response:', content);
        // Fallback to single-step plan
        return [{ 
          agent: 'recipe', 
          action: 'general_help', 
          params: { query: userRequest },
          reasoning: 'General assistance needed'
        }];
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error creating plan:', error);
      // Fallback plan
      return [{ 
        agent: 'recipe', 
        action: 'general_help', 
        params: { query: userRequest },
        reasoning: 'Fallback to general help'
      }];
    }
  }

  async executePlan(plan, context) {
    const results = [];
    let enrichedContext = { ...context };
    
    for (const step of plan) {
      try {
        const agent = this.specialists[step.agent];
        if (!agent) {
          console.error(`Unknown agent: ${step.agent}`);
          results.push({ 
            step, 
            result: { error: `Unknown agent: ${step.agent}` } 
          });
          continue;
        }

        console.log(`Executing step: ${step.agent}.${step.action}`);
        
        const result = await agent.execute(step.action, step.params, enrichedContext);
        results.push({ step, result });
        
        // Enrich context with results for next steps
        enrichedContext = {
          ...enrichedContext,
          [`${step.agent}_result`]: result,
          lastStepResult: result,
        };
      } catch (error) {
        console.error(`Error executing step ${step.agent}.${step.action}:`, error);
        results.push({ 
          step, 
          result: { error: error.message } 
        });
      }
    }

    return results;
  }

  async synthesizeResults(results, originalRequest, context) {
    // If single step with direct result, return it
    if (results.length === 1 && results[0].result.message) {
      return {
        success: true,
        message: results[0].result.message,
        data: results[0].result.data,
        steps: results,
        processingTime: results[0].result.processingTime,
      };
    }

    const synthesisPrompt = `
Synthesize the following agent execution results into a coherent, user-friendly response.

Original Request: "${originalRequest}"

Agent Results:
${JSON.stringify(results.map(r => ({ 
  agent: r.step.agent, 
  action: r.step.action, 
  result: r.result 
})), null, 2)}

Provide a natural, helpful response that:
1. Directly addresses the user's request
2. Summarizes what was accomplished
3. Highlights key findings or recommendations
4. Is conversational and friendly
5. Includes specific data/numbers where relevant

Keep the response concise but informative. Use bullet points or lists if it helps clarity.
`;

    try {
      const response = await this.openRouter.chat([
        { role: 'system', content: 'You are a response synthesis specialist. Create clear, helpful responses for users.' },
        { role: 'user', content: synthesisPrompt },
      ], { tier: 'small', temperature: 0.7 });

      const message = response.choices[0].message.content;

      // Extract structured data from results
      const data = {};
      for (const result of results) {
        if (result.result.data) {
          data[result.step.agent] = result.result.data;
        }
      }

      return {
        success: true,
        message,
        data,
        steps: results.map(r => ({
          agent: r.step.agent,
          action: r.step.action,
          reasoning: r.step.reasoning,
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error synthesizing results:', error);
      
      // Fallback: just concatenate results
      const messages = results
        .filter(r => r.result.message)
        .map(r => r.result.message)
        .join('\n\n');

      return {
        success: true,
        message: messages || 'Task completed successfully.',
        steps: results,
      };
    }
  }

  getAvailableAgents() {
    return Object.keys(this.specialists);
  }

  getAgentCapabilities(agentName) {
    const agent = this.specialists[agentName];
    return agent ? agent.getCapabilities() : null;
  }
}

module.exports = CoordinatorAgent;
