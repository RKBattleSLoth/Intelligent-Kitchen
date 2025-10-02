#!/usr/bin/env node

/**
 * AI E2E Test Runner
 * Comprehensive test suite for AI functionality
 */

require('dotenv').config({ path: '../backend/.env' });

const BasicChatTests = require('./test-basic-chat');
const ToolExecutionTests = require('./test-tool-execution');
const MultiAgentTests = require('./test-multi-agent');
const EndpointTests = require('./test-endpoints');
const ErrorHandlingTests = require('./test-error-handling');
const PerformanceTests = require('./test-performance');

class TestRunner {
  constructor() {
    this.testSuites = [
      new BasicChatTests(),
      new ToolExecutionTests(),
      new MultiAgentTests(),
      new EndpointTests(),
      new ErrorHandlingTests(),
      new PerformanceTests(),
    ];
    this.results = [];
    this.startTime = null;
  }

  async runAll() {
    console.log('🚀 Starting AI E2E Test Suite');
    console.log('=' .repeat(60));
    console.log(`Node.js: ${process.version}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Backend URL: ${process.env.TEST_API_URL || 'http://localhost:3001'}`);
    console.log(`OpenRouter API Key: ${process.env.OPENROUTER_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
    console.log('=' .repeat(60));

    this.startTime = Date.now();

    try {
      // Pre-flight checks
      await this.preFlightChecks();

      // Run each test suite
      for (const suite of this.testSuites) {
        await this.runTestSuite(suite);
      }

      // Generate final report
      await this.generateFinalReport();

    } catch (error) {
      console.error('\n💥 Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async runTestSuite(suite) {
    console.log(`\n📋 Running ${suite.constructor.name}`);
    console.log('-'.repeat(40));

    const suiteStartTime = Date.now();

    try {
      await suite.runAll();
      
      const suiteDuration = Date.now() - suiteStartTime;
      const suiteResults = suite.utils.results || [];
      
      this.results.push(...suiteResults);
      
      console.log(`✓ ${suite.constructor.name} completed in ${suiteDuration}ms`);
      console.log(`  Tests: ${suiteResults.length}`);
      console.log(`  Passed: ${suiteResults.filter(r => r.success).length}`);
      console.log(`  Failed: ${suiteResults.filter(r => !r.success).length}`);

    } catch (error) {
      console.error(`❌ ${suite.constructor.name} failed:`, error.message);
      
      this.results.push({
        suite: suite.constructor.name,
        success: false,
        error: error.message,
        duration: Date.now() - suiteStartTime,
      });
    }
  }

  async preFlightChecks() {
    console.log('\n🔍 Pre-flight Checks');

    try {
      // Check if backend is running
      const axios = require('axios');
      const response = await axios.get(`${process.env.TEST_API_URL || 'http://localhost:3001'}/api/health`, {
        timeout: 5000,
      });

      console.log('✓ Backend is running');

      // Check OpenRouter configuration
      if (!process.env.OPENROUTER_API_KEY) {
        console.warn('⚠️  OPENROUTER_API_KEY not configured');
        console.log('  Set OPENROUTER_API_KEY in backend/.env');
        process.exit(1);
      }
      console.log('✓ OpenRouter API key configured');

      // Check test user setup
      const testUtils = require('./test-utils');
      const utils = new testUtils();
      await utils.setupAuth();
      console.log('✓ Test user authentication ready');

      // Check AI service status
      const status = await utils.checkAIStatus();
      if (status.configured) {
        console.log('✓ AI service configured');
        console.log(`  Models: ${JSON.stringify(status.models)}`);
      } else {
        console.error('✗ AI service not configured');
        process.exit(1);
      }

    } catch (error) {
      console.error('✗ Pre-flight check failed:', error.message);
      console.log('\nTroubleshooting:');
      console.log('1. Make sure backend is running: cd backend && npm run dev');
      console.log('2. Check backend/.env has OPENROUTER_API_KEY');
      console.log('3. Verify database is running and migrated');
      process.exit(1);
    }
  }

  async generateFinalReport() {
    const totalDuration = Date.now() - this.startTime;
    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = totalTests - passed;
    const successRate = (passed / totalTests * 100).toFixed(1);

    console.log('\n' + '=' .repeat(60));
    console.log('📊 FINAL TEST RESULTS');
    console.log('=' .repeat(60));
    
    console.log(`\n📈 Summary:`);
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${passed} (${successRate}%)`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Duration: ${(totalDuration / 1000).toFixed(2)}s`);

    // Performance summary
    const performanceResults = this.results.filter(r => r.type === 'performance' && r.success);
    if (performanceResults.length > 0) {
      const avgResponseTime = performanceResults.reduce((sum, r) => sum + (r.duration || 0), 0) / performanceResults.length;
      console.log(`  Avg Response Time: ${Math.round(avgResponseTime)}ms`);
    }

    // Test suite breakdown
    console.log(`\n📋 Test Suite Breakdown:`);
    const suiteBreakdown = {};
    this.results.forEach(result => {
      const suite = result.type || 'unknown';
      if (!suiteBreakdown[suite]) {
        suiteBreakdown[suite] = { total: 0, passed: 0 };
      }
      suiteBreakdown[suite].total++;
      if (result.success) {
        suiteBreakdown[suite].passed++;
      }
    });

    Object.entries(suiteBreakdown).forEach(([suite, stats]) => {
      const rate = (stats.passed / stats.total * 100).toFixed(1);
      console.log(`  ${suite}: ${stats.passed}/${stats.total} (${rate}%)`);
    });

    // Failed tests
    if (failed > 0) {
      console.log(`\n❌ Failed Tests (${failed}):`);
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`  • ${result.name}: ${result.error || 'Test failed'}`);
      });
    }

    // Slow tests
    const slowTests = this.results.filter(r => r.duration > 8000).sort((a, b) => b.duration - a.duration);
    if (slowTests.length > 0) {
      console.log(`\n⏱️ Slow Tests (>8s):`);
      slowTests.slice(0, 5).forEach(result => {
        console.log(`  • ${result.name}: ${result.duration}ms`);
      });
    }

    // Warnings
    const warnings = this.generateWarnings();
    if (warnings.length > 0) {
      console.log(`\n⚠️ Warnings:`);
      warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    // Recommendations
    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      recommendations.forEach(rec => console.log(`  • ${rec}`));
    }

    // Overall status
    const overallSuccess = successRate >= 95; // 95% success rate required
    console.log(`\n${overallSuccess ? '✅' : '❌'} Overall Status: ${overallSuccess ? 'PASS' : 'FAIL'}`);

    if (overallSuccess) {
      console.log('\n🎉 All AI functionality is working correctly!');
      console.log('🚀 System is ready for production deployment.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the issues above.');
    }

    console.log(`\n📄 Detailed logs saved to: tests/ai/test-results-${Date.now()}.json`);
    
    // Save detailed results
    await this.saveResults();

    // Exit with appropriate code
    process.exit(overallSuccess ? 0 : 1);
  }

  generateWarnings() {
    const warnings = [];

    // Check for high failure rates in specific categories
    const categoryStats = {};
    this.results.forEach(result => {
      const category = result.type || 'unknown';
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, failed: 0 };
      }
      categoryStats[category].total++;
      if (!result.success) {
        categoryStats[category].failed++;
      }
    });

    Object.entries(categoryStats).forEach(([category, stats]) => {
      const failureRate = stats.failed / stats.total;
      if (failureRate > 0.2) {
        warnings.push(`${category} tests have ${(failureRate * 100).toFixed(1)}% failure rate`);
      }
    });

    // Check for slow average response times
    const avgResponseTime = this.results.reduce((sum, r) => sum + (r.duration || 0), 0) / this.results.length;
    if (avgResponseTime > 5000) {
      warnings.push(`Average response time is high: ${Math.round(avgResponseTime)}ms`);
    }

    return warnings;
  }

  generateRecommendations() {
    const recommendations = [];

    // Performance recommendations
    const slowTests = this.results.filter(r => r.duration > 10000);
    if (slowTests.length > 0) {
      recommendations.push('Consider optimizing slow queries or increasing timeouts');
    }

    // Tool execution recommendations
    const toolTests = this.results.filter(r => r.category === 'tool-execution' && !r.success);
    if (toolTests.length > 0) {
      recommendations.push('Check database connectivity and tool configurations');
    }

    // Multi-agent recommendations
    const agentTests = this.results.filter(r => r.type === 'multi-agent' && !r.success);
    if (agentTests.length > 0) {
      recommendations.push('Review agent configurations and tool availability');
    }

    // General recommendations
    const failedTests = this.results.filter(r => !r.success);
    if (failedTests.length > 0) {
      recommendations.push('Review failed tests and fix underlying issues');
    }

    return recommendations;
  }

  async saveResults() {
    const fs = require('fs');
    const resultsData = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        successRate: (this.results.filter(r => r.success).length / this.results.length * 100).toFixed(1),
      },
      results: this.results,
      warnings: this.generateWarnings(),
      recommendations: this.generateRecommendations(),
    };

    const filename = `tests/ai/test-results-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(resultsData, null, 2));
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

const runner = new TestRunner();

switch (command) {
  case 'basic':
    console.log('🤖 Running Basic Chat Tests Only');
    const basicTests = new BasicChatTests();
    basicTests.utils = new (require('./test-utils'))();
    basicTests.runAll()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Basic tests failed:', err);
        process.exit(1);
      });
    break;

  case 'tools':
    console.log('🔧 Running Tool Tests Only');
    const toolTests = new ToolExecutionTests();
    toolTests.utils = new (require('./test-utils'))();
    toolTests.runAll()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Tool tests failed:', err);
        process.exit(1);
      });
    break;

  case 'agents':
    console.log('🤖 Running Multi-Agent Tests Only');
    const agentTests = new MultiAgentTests();
    agentTests.utils = new (require('./test-utils'))();
    agentTests.runAll()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Agent tests failed:', err);
        process.exit(1);
      });
    break;

  case 'endpoints':
    console.log('🎯 Running Endpoint Tests Only');
    const endpointTests = new EndpointTests();
    endpointTests.utils = new (require('./test-utils'))();
    endpointTests.runAll()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Endpoint tests failed:', err);
        process.exit(1);
      });
    break;

  case 'performance':
    console.log('⚡ Running Performance Tests Only');
    const perfTests = new PerformanceTests();
    perfTests.utils = new (require('./test-utils'))();
    perfTests.runAll()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Performance tests failed:', err);
        process.exit(1);
      });
    break;

  case 'error':
    console.log('⚠️ Running Error Handling Tests Only');
    const errorTests = new ErrorHandlingTests();
    errorTests.utils = new (require('./test-utils'))();
    errorTests.runAll()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Error tests failed:', err);
        process.exit(1);
      });
    break;

  case 'help':
    console.log(`
🤖 AI E2E Test Runner

Usage: node run-tests.js [command]

Commands:
  (no args)    Run all test suites
  basic       Run basic chat tests only
  tools       Run tool execution tests only
  agents      Run multi-agent tests only
  endpoints   Run endpoint tests only
  performance Run performance tests only
  error       Run error handling tests only
  help        Show this help message

Examples:
  node run-tests.js
  node run-tests.js basic
  node run-tests.js agents
    `);
    break;

  default:
    // Run all tests
    runner.runAll();
    break;
}
