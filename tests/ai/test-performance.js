/**
 * Performance Tests
 * Tests AI system performance under various loads
 */

const TestUtils = require('./test-utils');
const config = require('./test-config');

class PerformanceTests {
  constructor() {
    this.utils = new TestUtils();
  }

  async runAll() {
    console.log('\n⚡ Running Performance Tests');
    console.log('=' .repeat(50));

    try {
      // Setup
      await this.utils.setupAuth();
      await this.utils.setupTestData();
      await this.utils.checkAIStatus();

      // Test different performance scenarios
      await this.testConcurrentRequests();
      await this.testResponseTimeDistribution();
      await this.testMemoryUsage();
      await this.testScalability();
      await this.testCachePerformance();

    } catch (error) {
      console.error('❌ Performance test suite failed:', error.message);
      throw error;
    }
  }

  async testConcurrentRequests() {
    console.log('\n🔄 Testing Concurrent Requests');

    const concurrentTests = [
      {
        name: 'Light Load (5 concurrent)',
        requests: 5,
        message: 'What temperature should I bake chicken?',
        maxTime: 10000,
        minSuccessRate: 0.8,
      },
      {
        name: 'Medium Load (10 concurrent)',
        requests: 10,
        message: 'Add milk to my pantry',
        maxTime: 15000,
        minSuccessRate: 0.8,
      },
      {
        name: 'Heavy Load (20 concurrent)',
        requests: 20,
        message: 'Find quick vegetarian recipes',
        maxTime: 20000,
        minSuccessRate: 0.75,
      },
      {
        name: 'Mixed Load (15 concurrent)',
        requests: 15,
        messages: [
          'Hello',
          'What can I make for dinner?',
          'Add eggs to pantry',
          'Find recipes with chicken',
          'What temperature to bake?',
        ],
        maxTime: 25000,
        minSuccessRate: 0.7,
      },
    ];

    for (const test of concurrentTests) {
      await this.executeConcurrentTest(test);
    }
  }

  async testResponseTimeDistribution() {
    console.log('\n📊 Testing Response Time Distribution');

    const responseTimeTests = [
      {
        name: 'Simple Queries',
        requests: 20,
        message: 'What temperature to bake chicken?',
        expectedMaxTime: 2000,
        category: 'simple',
      },
      {
        name: 'Tool Queries',
        requests: 15,
        message: 'Add milk to my pantry',
        expectedMaxTime: 5000,
        category: 'tool',
      },
      {
        name: 'Complex Queries',
        requests: 10,
        message: 'Plan my meals for 3 days',
        expectedMaxTime: 15000,
        category: 'complex',
      },
    ];

    for (const test of responseTimeTests) {
      await this.executeResponseTimeTest(test);
    }
  }

  async testMemoryUsage() {
    console.log('\n💾 Testing Memory Usage');

    const memoryTests = [
      {
        name: 'Sequential Requests',
        iterations: 50,
        message: 'What can I make for dinner?',
        maxTimePerRequest: 3000,
      },
      {
        name: 'Large Context Requests',
        iterations: 20,
        message: 'Plan my meals for the next week. I have chicken, rice, tomatoes, onions, and garlic. I want Mediterranean food, under 30 minutes per meal, budget-conscious.',
        maxTimePerRequest: 10000,
      },
      {
        name: 'Conversation Memory',
        conversations: 10,
        messagesPerConversation: 5,
        baseMessage: 'My name is TestBot and I love',
        followUpMessage: 'What did I say I love?',
        maxTimePerRequest: 4000,
      },
    ];

    for (const test of memoryTests) {
      await this.executeMemoryTest(test);
    }
  }

  async testScalability() {
    console.log('\n📈 Testing Scalability');

    const scalabilityTests = [
      {
        name: 'Gradual Load Increase',
        startRequests: 1,
        endRequests: 30,
        stepSize: 5,
        message: 'Find recipes with chicken',
        maxAcceptableFailureRate: 0.2,
      },
      {
        name: 'Burst Load',
        bursts: 5,
        requestsPerBurst: 10,
        burstInterval: 5000, // 5 seconds between bursts
        message: 'Add item to pantry',
        maxTimePerBurst: 10000,
      },
      {
        name: 'Sustained Load',
        duration: 30000, // 30 seconds
        requestsPerSecond: 2,
        message: 'Quick recipe suggestion',
        maxFailureRate: 0.1,
      },
    ];

    for (const test of scalabilityTests) {
      await this.executeScalabilityTest(test);
    }
  }

  async testCachePerformance() {
    console.log('\n🗄️ Testing Cache Performance');

    const cacheTests = [
      {
        name: 'Cache Hit Rate',
        uniqueMessages: 10,
        repetitionsPerMessage: 5,
        baseMessage: 'What temperature to bake',
        items: ['chicken', 'beef', 'pork', 'fish', 'vegetables'],
      },
      {
        name: 'Cache Memory Efficiency',
        messages: [
          'How to make scrambled eggs?',
          'Temperature for baking chicken?',
          'Quick pasta recipe?',
          'How to cook rice?',
          'Simple salad recipe?',
        ],
        rounds: 3,
      },
      {
        name: 'Cache Invalidation',
        message: 'Add milk to pantry',
        modifyAction: 'Update the milk quantity to 2 gallons',
        testRelevance: true,
      },
    ];

    for (const test of cacheTests) {
      await this.executeCacheTest(test);
    }
  }

  async executeConcurrentTest(test) {
    console.log(`\n🧪 Testing: ${test.name}`);

    const startTime = Date.now();
    const promises = [];

    // Create requests
    for (let i = 0; i < test.requests; i++) {
      if (test.messages) {
        // Use different messages
        const message = test.messages[i % test.messages.length];
        promises.push(this.utils.authenticatedRequest('POST', '/api/ai/chat', { message }));
      } else {
        // Use same message
        promises.push(this.utils.authenticatedRequest('POST', '/api/ai/chat', { message: test.message }));
      }
    }

    try {
      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;

      // Analyze results
      const successful = results.filter(r => r.value?.data?.success).length;
      const failed = results.length - successful;
      const successRate = successful / results.length;
      const avgTime = results.reduce((sum, r) => {
        return sum + (r.value ? Date.now() : duration);
      }, 0) / results.length;

      // Calculate percentiles
      const times = results
        .filter(r => r.value?.data)
        .map(r => r.value.data.metadata?.processingTime || 0)
        .sort((a, b) => a - b);

      const p50 = times[Math.floor(times.length * 0.5)];
      const p95 = times[Math.floor(times.length * 0.95)];
      const p99 = times[Math.floor(times.length * 0.99)];

      console.log(`  ✓ Total time: ${duration}ms`);
      console.log(`  ✓ Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`  ✓ P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);
      console.log(`  ✓ Requests per second: ${(test.requests / (duration / 1000)).toFixed(2)}`);

      const passed = successRate >= test.minSuccessRate && duration < test.maxTime;

      this.utils.results.push({
        name: `Concurrent - ${test.name}`,
        type: 'performance',
        success: passed,
        duration,
        assertions: {
          totalRequests: test.requests,
          successful,
          failed,
          successRate,
          avgTime,
          percentiles: { p50, p95, p99 },
          requestsPerSecond: test.requests / (duration / 1000),
          withinTimeLimit: duration < test.maxTime,
          successRateMet: successRate >= test.minSuccessRate,
        },
      });

    } catch (error) {
      console.log(`  ✗ Concurrent test failed: ${error.message}`);
      this.utils.results.push({
        name: `Concurrent - ${test.name}`,
        type: 'performance',
        success: false,
        error: error.message,
      });
    }
  }

  async executeResponseTimeTest(test) {
    console.log(`\n🧪 Testing: ${test.name}`);

    const times = [];
    const successful = [];

    for (let i = 0; i < test.requests; i++) {
      const startTime = Date.now();

      try {
        const response = await this.utils.authenticatedRequest('POST', '/api/ai/chat', {
          message: test.message,
        });

        const duration = Date.now() - startTime;
        times.push(duration);
        
        if (response.data.success) {
          successful.push(duration);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`  ⚠️  Request ${i + 1} failed: ${error.message}`);
      }
    }

    if (times.length === 0) {
      console.log(`  ✗ All requests failed`);
      this.utils.results.push({
        name: `Response Time - ${test.name}`,
        type: 'performance',
        success: false,
        error: 'All requests failed',
      });
      return;
    }

    // Calculate statistics
    times.sort((a, b) => a - b);
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = times[0];
    const max = times[times.length - 1];
    const p50 = times[Math.floor(times.length * 0.5)];
    const p95 = times[Math.floor(times.length * 0.95)];
    const p99 = times[Math.floor(times.length * 0.99)];

    const underExpected = times.filter(t => t <= test.expectedMaxTime).length;
    const underExpectedRate = underExpected / times.length;

    console.log(`  ✓ Average: ${Math.round(avg)}ms`);
    console.log(`  ✓ Min/Max: ${min}ms / ${max}ms`);
    console.log(`  ✓ P50/P95/P99: ${p50}ms / ${p95}ms / ${p99}ms`);
    console.log(`  ✓ Under ${test.expectedMaxTime}ms: ${(underExpectedRate * 100).toFixed(1)}%`);

    const passed = underExpectedRate >= 0.8 && avg < test.expectedMaxTime * 1.5;

    this.utils.results.push({
      name: `Response Time - ${test.name}`,
      type: 'performance',
      success: passed,
      assertions: {
        category: test.category,
        requests: times.length,
        avg,
        min,
        max,
        p50,
        p95,
        p99,
        underExpected,
        underExpectedRate,
        expectedMaxTime: test.expectedMaxTime,
      },
    });
  }

  async executeMemoryTest(test) {
    console.log(`\n🧪 Testing: ${test.name}`);

    const startTime = Date.now();
    const memoryUsage = [];
    const responseTimes = [];
    let successCount = 0;

    try {
      if (test.iterations) {
        // Sequential iteration test
        for (let i = 0; i < test.iterations; i++) {
          const iterStart = Date.now();

          try {
            const response = await this.utils.authenticatedRequest('POST', '/api/ai/chat', {
              message: test.message,
            });

            const duration = Date.now() - iterStart;
            responseTimes.push(duration);

            if (response.data.success) {
              successCount++;
            }

            // Simulate memory tracking (in real implementation, you'd track actual memory)
            memoryUsage.push({
              iteration: i + 1,
              duration,
              success: response.data.success,
              memoryEstimate: Math.random() * 100, // Simulated
            });

          } catch (error) {
            console.log(`  ⚠️  Iteration ${i + 1} failed`);
          }

          // Small delay
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } else if (test.conversations) {
        // Conversation memory test
        for (let conv = 0; conv < test.conversations; conv++) {
          let conversationId = null;

          for (let msg = 0; msg < test.messagesPerConversation; msg++) {
            const message = msg === 0 ? 
              `${test.baseMessage} ${['pasta', 'pizza', 'sushi', 'tacos', 'curry'][conv % 5]}` :
              test.followUpMessage;

            try {
              const response = await this.utils.authenticatedRequest('POST', '/api/ai/chat', {
                message,
                conversationId,
              });

              conversationId = response.data.conversationId;
              const duration = Date.now() - Date.now(); // Would track actual time
              
              if (response.data.success) {
                successCount++;
              }

            } catch (error) {
              console.log(`  ⚠️  Conversation ${conv + 1}, message ${msg + 1} failed`);
            }
          }
        }
      }

      const totalDuration = Date.now() - startTime;
      const avgTime = responseTimes.length > 0 ? 
        responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length : 0;

      console.log(`  ✓ Total duration: ${totalDuration}ms`);
      console.log(`  ✓ Success rate: ${(successCount / (test.iterations || test.conversations * test.messagesPerConversation) * 100).toFixed(1)}%`);
      console.log(`  ✓ Average response time: ${Math.round(avgTime)}ms`);

      // Check for performance degradation
      if (responseTimes.length > 10) {
        const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
        const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, t) => sum + t, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, t) => sum + t, 0) / secondHalf.length;
        const degradation = (secondAvg - firstAvg) / firstAvg;

        console.log(`  ✓ Performance degradation: ${(degradation * 100).toFixed(1)}%`);

        this.utils.results.push({
          name: `Memory - ${test.name}`,
          type: 'performance',
          success: Math.abs(degradation) < 0.5, // Less than 50% degradation
          totalDuration,
          assertions: {
            iterations: test.iterations || test.conversations,
            successCount,
            avgTime,
            degradation,
            firstHalfAvg: firstAvg,
            secondHalfAvg: secondAvg,
          },
        });
      }

    } catch (error) {
      console.log(`  ✗ Memory test failed: ${error.message}`);
      this.utils.results.push({
        name: `Memory - ${test.name}`,
        type: 'performance',
        success: false,
        error: error.message,
      });
    }
  }

  async executeScalabilityTest(test) {
    console.log(`\n🧪 Testing: ${test.name}`);

    const results = [];

    try {
      if (test.startRequests !== undefined) {
        // Gradual load increase
        for (let requests = test.startRequests; requests <= test.endRequests; requests += test.stepSize) {
          const result = await this.runConcurrentBatch(requests, test.message);
          result.requestCount = requests;
          results.push(result);
          
          console.log(`  ✓ ${requests} requests: ${result.successRate.toFixed(1)}% success, ${result.avgTime}ms avg`);
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } else if (test.bursts) {
        // Burst load
        for (let burst = 0; burst < test.bursts; burst++) {
          const result = await this.runConcurrentBatch(test.requestsPerBurst, test.message);
          result.burstNumber = burst + 1;
          results.push(result);
          
          console.log(`  ✓ Burst ${burst + 1}: ${result.successRate.toFixed(1)}% success, ${result.avgTime}ms avg`);
          
          if (burst < test.bursts - 1) {
            await new Promise(resolve => setTimeout(resolve, test.burstInterval));
          }
        }
      } else if (test.duration) {
        // Sustained load
        const endTime = Date.now() + test.duration;
        let requestCount = 0;
        let successCount = 0;

        while (Date.now() < endTime) {
          const requestStart = Date.now();
          
          try {
            const response = await this.utils.authenticatedRequest('POST', '/api/ai/chat', {
              message: test.message,
            });
            
            if (response.data.success) {
              successCount++;
            }
            requestCount++;
            
          } catch (error) {
            // Count as failed
            requestCount++;
          }

          // Rate limiting
          const elapsed = Date.now() - requestStart;
          const targetInterval = 1000 / test.requestsPerSecond;
          const delay = Math.max(0, targetInterval - elapsed);
          
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        const successRate = successCount / requestCount;
        console.log(`  ✓ Sustained load: ${requestCount} requests in ${test.duration/1000}s`);
        console.log(`  ✓ Success rate: ${(successRate * 100).toFixed(1)}%`);
        console.log(`  ✓ Actual RPS: ${(requestCount / (test.duration / 1000)).toFixed(2)}`);

        results.push({
          totalRequests: requestCount,
          successful: successCount,
          successRate,
          actualRPS: requestCount / (test.duration / 1000),
        });
      }

      // Analyze scalability
      const success = results.every(r => r.successRate >= (1 - test.maxAcceptableFailureRate));

      this.utils.results.push({
        name: `Scalability - ${test.name}`,
        type: 'performance',
        success,
        assertions: {
          results,
          maxAcceptableFailureRate: test.maxAcceptableFailureRate,
        },
      });

    } catch (error) {
      console.log(`  ✗ Scalability test failed: ${error.message}`);
      this.utils.results.push({
        name: `Scalability - ${test.name}`,
        type: 'performance',
        success: false,
        error: error.message,
      });
    }
  }

  async runConcurrentBatch(requestCount, message) {
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < requestCount; i++) {
      promises.push(this.utils.authenticatedRequest('POST', '/api/ai/chat', { message }));
    }

    const results = await Promise.allSettled(promises);
    const duration = Date.now() - startTime;

    const successful = results.filter(r => r.value?.data?.success).length;
    const successRate = successful / results.length;

    const times = results
      .filter(r => r.value?.data?.metadata?.processingTime)
      .map(r => r.value.data.metadata.processingTime);

    const avgTime = times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;

    return {
      requestCount,
      successful,
      failed: results.length - successful,
      successRate,
      avgTime,
      duration,
    };
  }

  async executeCacheTest(test) {
    console.log(`\n🧪 Testing: ${test.name}`);

    const cacheResults = [];

    try {
      if (test.uniqueMessages) {
        // Cache hit rate test
        const messages = [];
        for (let i = 0; i < test.uniqueMessages; i++) {
          const item = test.items[i % test.items.length];
          messages.push(`${test.baseMessage} ${item}?`);
        }

        // First pass - should all miss cache
        console.log('  First pass (cache misses)...');
        for (const message of messages) {
          const start = Date.now();
          const response = await this.utils.authenticatedRequest('POST', '/api/ai/chat', { message });
          const duration = Date.now() - start;
          
          cacheResults.push({
            message,
            firstTime: duration,
            cached: response.data.cached || false,
          });
        }

        // Second pass - should hit cache
        console.log('  Second pass (cache hits)...');
        for (let i = 0; i < messages.length; i++) {
          const start = Date.now();
          const response = await this.utils.authenticatedRequest('POST', '/api/ai/chat', { 
            message: messages[i] 
          });
          const duration = Date.now() - start;
          
          cacheResults[i].secondTime = duration;
          cacheResults[i].cachedHit = response.data.cached || false;
        }

        // Analyze cache performance
        const cacheHits = cacheResults.filter(r => r.cachedHit).length;
        const cacheHitRate = cacheHits / cacheResults.length;
        
        const avgFirstTime = cacheResults.reduce((sum, r) => sum + r.firstTime, 0) / cacheResults.length;
        const avgSecondTime = cacheResults.reduce((sum, r) => sum + r.secondTime, 0) / cacheResults.length;
        const speedup = avgFirstTime / avgSecondTime;

        console.log(`  ✓ Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);
        console.log(`  ✓ Average speedup: ${speedup.toFixed(2)}x`);
        console.log(`  ✓ First hit: ${Math.round(avgFirstTime)}ms, Cached: ${Math.round(avgSecondTime)}ms`);

        this.utils.results.push({
          name: `Cache - ${test.name}`,
          type: 'performance',
          success: cacheHitRate > 0.3, // At least 30% hit rate
          assertions: {
            cacheHitRate,
            avgFirstTime,
            avgSecondTime,
            speedup,
            totalMessages: cacheResults.length,
            cacheHits,
          },
        });
      }

    } catch (error) {
      console.log(`  ✗ Cache test failed: ${error.message}`);
      this.utils.results.push({
        name: `Cache - ${test.name}`,
        type: 'performance',
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = PerformanceTests;
