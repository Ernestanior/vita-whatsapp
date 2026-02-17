import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/**
 * Run ALL tests and generate comprehensive report
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.info({
      type: 'comprehensive_test_started',
    });

    // Run basic tests
    const basicResponse = await fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-suite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const basicResults = await basicResponse.json();

    // Run advanced tests
    const advancedResponse = await fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-advanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const advancedResults = await advancedResponse.json();

    const duration = Date.now() - startTime;

    // Combine results
    const totalTests = basicResults.summary.totalTests + advancedResults.summary.totalTests;
    const totalPassed = basicResults.summary.passed + advancedResults.summary.passed;
    const totalFailed = basicResults.summary.failed + advancedResults.summary.failed;

    const report = {
      success: totalFailed === 0,
      timestamp: new Date().toISOString(),
      duration,
      summary: {
        totalTests,
        passed: totalPassed,
        failed: totalFailed,
        passRate: ((totalPassed / totalTests) * 100).toFixed(2) + '%',
      },
      basicTests: basicResults.summary,
      advancedTests: advancedResults.summary,
      status: totalFailed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED',
    };

    logger.info({
      type: 'comprehensive_test_completed',
      report,
    });

    // Generate markdown report
    const markdown = generateMarkdownReport(report);

    return NextResponse.json({
      ...report,
      markdown,
    });
  } catch (error) {
    logger.error({
      type: 'comprehensive_test_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function generateMarkdownReport(report: any): string {
  return `# 🧪 Vita WhatsApp Bot - Test Report

**Generated**: ${report.timestamp}  
**Duration**: ${(report.duration / 1000).toFixed(2)}s  
**Status**: ${report.status}

## 📊 Summary

- **Total Tests**: ${report.summary.totalTests}
- **Passed**: ${report.summary.passed} ✅
- **Failed**: ${report.summary.failed} ${report.summary.failed > 0 ? '❌' : ''}
- **Pass Rate**: ${report.summary.passRate}

## 🔧 Basic Tests (${report.basicTests.totalTests} tests)

- Passed: ${report.basicTests.passed}
- Failed: ${report.basicTests.failed}
- Duration: ${(report.basicTests.duration / 1000).toFixed(2)}s

### Results:
${report.basicTests.results.map((r: any) => 
  `- ${r.status === 'pass' ? '✅' : '❌'} **${r.name}** (${r.duration}ms)${r.error ? ` - ${r.error}` : ''}`
).join('\n')}

## 🚀 Advanced Tests (${report.advancedTests.totalTests} tests)

- Passed: ${report.advancedTests.passed}
- Failed: ${report.advancedTests.failed}
- Duration: ${(report.advancedTests.duration / 1000).toFixed(2)}s

### Results:
${report.advancedTests.results.map((r: any) => 
  `- ${r.status === 'pass' ? '✅' : '❌'} **${r.name}** (${r.duration}ms)${r.error ? ` - ${r.error}` : ''}`
).join('\n')}

---

${report.success ? '🎉 All systems operational!' : '⚠️ Some tests failed - please investigate'}
`;
}

export async function GET() {
  return NextResponse.json({
    message: 'Comprehensive Test Suite - Runs all tests and generates report',
    usage: {
      method: 'POST',
      endpoint: '/api/test-all',
    },
  });
}
