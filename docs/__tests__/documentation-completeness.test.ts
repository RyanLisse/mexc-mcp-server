/**
 * Task #33: Documentation Completeness Test Suite
 * TDD implementation - these tests verify that comprehensive AI integration documentation exists
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DOCS_DIR = join(__dirname, '..');

describe('Task #33: AI Integration Documentation Completeness', () => {
  describe('Documentation Structure', () => {
    it('should have docs directory', () => {
      expect(existsSync(DOCS_DIR)).toBe(true);
    });

    it('should have AI integration guide', () => {
      const aiIntegrationPath = join(DOCS_DIR, 'ai-integration-guide.md');
      expect(existsSync(aiIntegrationPath)).toBe(true);
    });

    it('should have API endpoints documentation', () => {
      const apiDocsPath = join(DOCS_DIR, 'api-endpoints.md');
      expect(existsSync(apiDocsPath)).toBe(true);
    });

    it('should have configuration setup guide', () => {
      const configPath = join(DOCS_DIR, 'configuration-setup.md');
      expect(existsSync(configPath)).toBe(true);
    });

    it('should have usage examples documentation', () => {
      const examplesPath = join(DOCS_DIR, 'usage-examples.md');
      expect(existsSync(examplesPath)).toBe(true);
    });

    it('should have testing documentation', () => {
      const testingPath = join(DOCS_DIR, 'testing-guide.md');
      expect(existsSync(testingPath)).toBe(true);
    });
  });

  describe('AI Integration Guide Content', () => {
    function getAiGuideContent(): string {
      const aiIntegrationPath = join(DOCS_DIR, 'ai-integration-guide.md');
      return existsSync(aiIntegrationPath) ? readFileSync(aiIntegrationPath, 'utf-8') : '';
    }

    it('should include AI capabilities overview', () => {
      const content = getAiGuideContent();
      expect(content).toContain('## AI Capabilities Overview');
    });

    it('should include architecture diagrams section', () => {
      const content = getAiGuideContent();
      expect(content).toContain('## Architecture');
    });

    it('should include integration instructions', () => {
      const content = getAiGuideContent();
      expect(content).toContain('## Integration Instructions');
    });

    it('should include best practices section', () => {
      const content = getAiGuideContent();
      expect(content).toContain('## Best Practices');
    });

    it('should include limitations and considerations', () => {
      const content = getAiGuideContent();
      expect(content).toContain('## Limitations');
    });

    it('should reference Gemini API integration', () => {
      const content = getAiGuideContent();
      expect(content.toLowerCase()).toContain('gemini');
    });

    it('should reference MEXC integration', () => {
      const content = getAiGuideContent();
      expect(content.toLowerCase()).toContain('mexc');
    });
  });

  describe('API Endpoints Documentation Content', () => {
    function getApiDocsContent(): string {
      const apiDocsPath = join(DOCS_DIR, 'api-endpoints.md');
      return existsSync(apiDocsPath) ? readFileSync(apiDocsPath, 'utf-8') : '';
    }

    it('should document /mcp/health endpoint from Task #32', () => {
      const content = getApiDocsContent();
      expect(content).toContain('/mcp/health');
    });

    it('should document /mcp/ai-market-analysis endpoint', () => {
      const content = getApiDocsContent();
      expect(content).toContain('/mcp/ai-market-analysis');
    });

    it('should document /mcp/strategy-optimizer endpoint', () => {
      const content = getApiDocsContent();
      expect(content).toContain('/mcp/strategy-optimizer');
    });

    it('should document /mcp/trading-tools endpoint', () => {
      const content = getApiDocsContent();
      expect(content).toContain('/mcp/trading-tools');
    });

    it('should document /mcp/risk-assessment endpoint', () => {
      const content = getApiDocsContent();
      expect(content).toContain('/mcp/risk-assessment');
    });

    it('should include JSON request examples', () => {
      const content = getApiDocsContent();
      expect(content).toContain('```json');
    });

    it('should include authentication information', () => {
      const content = getApiDocsContent();
      expect(content.toLowerCase()).toContain('authentication');
    });

    it('should include rate limiting information', () => {
      const content = getApiDocsContent();
      expect(content.toLowerCase()).toContain('rate limit');
    });

    it('should include error codes section', () => {
      const content = getApiDocsContent();
      expect(content.toLowerCase()).toContain('error');
    });
  });

  describe('Configuration Setup Guide Content', () => {
    function getConfigContent(): string {
      const configPath = join(DOCS_DIR, 'configuration-setup.md');
      return existsSync(configPath) ? readFileSync(configPath, 'utf-8') : '';
    }

    it('should include Gemini API key setup instructions', () => {
      const content = getConfigContent();
      expect(content.toLowerCase()).toContain('gemini api key');
    });

    it('should include environment variables section', () => {
      const content = getConfigContent();
      expect(content.toLowerCase()).toContain('environment variable');
    });

    it('should include security best practices', () => {
      const content = getConfigContent();
      expect(content.toLowerCase()).toContain('security');
    });

    it('should include different environment configurations', () => {
      const content = getConfigContent();
      expect(content.toLowerCase()).toContain('development');
      expect(content.toLowerCase()).toContain('production');
    });

    it('should include troubleshooting section', () => {
      const content = getConfigContent();
      expect(content.toLowerCase()).toContain('troubleshooting');
    });

    it('should reference MEXC API configuration', () => {
      const content = getConfigContent();
      expect(content.toLowerCase()).toContain('mexc');
    });
  });

  describe('Usage Examples Content', () => {
    function getExamplesContent(): string {
      const examplesPath = join(DOCS_DIR, 'usage-examples.md');
      return existsSync(examplesPath) ? readFileSync(examplesPath, 'utf-8') : '';
    }

    it('should include TypeScript code examples', () => {
      const content = getExamplesContent();
      expect(content).toContain('```typescript');
    });

    it('should include market analysis examples', () => {
      const content = getExamplesContent();
      expect(content.toLowerCase()).toContain('market analysis');
    });

    it('should include trading tools examples', () => {
      const content = getExamplesContent();
      expect(content.toLowerCase()).toContain('trading tools');
    });

    it('should include risk assessment examples', () => {
      const content = getExamplesContent();
      expect(content.toLowerCase()).toContain('risk assessment');
    });

    it('should include strategy optimization examples', () => {
      const content = getExamplesContent();
      expect(content.toLowerCase()).toContain('strategy optim');
    });

    it('should include error handling examples', () => {
      const content = getExamplesContent();
      expect(content.toLowerCase()).toContain('error handling');
    });

    it('should reference MCP service integration from Task #31', () => {
      const content = getExamplesContent();
      expect(content.toLowerCase()).toContain('mcp');
    });
  });

  describe('Testing Documentation Content', () => {
    function getTestingContent(): string {
      const testingPath = join(DOCS_DIR, 'testing-guide.md');
      return existsSync(testingPath) ? readFileSync(testingPath, 'utf-8') : '';
    }

    it('should include AI integration test suite instructions', () => {
      const content = getTestingContent();
      expect(content.toLowerCase()).toContain('test suite');
    });

    it('should include instructions for writing additional tests', () => {
      const content = getTestingContent();
      expect(content.toLowerCase()).toContain('writing additional tests');
    });

    it('should include test coverage expectations', () => {
      const content = getTestingContent();
      expect(content.toLowerCase()).toContain('coverage');
    });

    it('should reference Task #29 AI integration tests', () => {
      const content = getTestingContent();
      expect(content.toLowerCase()).toContain('integration test');
    });

    it('should include Bun test runner information', () => {
      const content = getTestingContent();
      expect(content.toLowerCase()).toContain('bun test');
    });
  });

  describe('Documentation Quality', () => {
    it('should have proper markdown formatting in all files', () => {
      const docFiles = [
        'ai-integration-guide.md',
        'api-endpoints.md',
        'configuration-setup.md',
        'usage-examples.md',
        'testing-guide.md',
      ];

      for (const fileName of docFiles) {
        const filePath = join(DOCS_DIR, fileName);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf-8');
          // Check for basic markdown structure
          expect(content).toMatch(/^#\s+.+/m); // Has at least one main heading
          expect(content).toMatch(/##\s+.+/m); // Has at least one section heading
        }
      }
    });

    it('should have comprehensive content length', () => {
      const docFiles = [
        'ai-integration-guide.md',
        'api-endpoints.md',
        'configuration-setup.md',
        'usage-examples.md',
        'testing-guide.md',
      ];

      for (const fileName of docFiles) {
        const filePath = join(DOCS_DIR, fileName);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf-8');
          // Each doc should be substantial (at least 1000 characters)
          expect(content.length).toBeGreaterThan(1000);
        }
      }
    });
  });
});
