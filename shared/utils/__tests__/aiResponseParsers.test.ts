/**
 * AI Response Parsers Test Suite
 * Task #30: Comprehensive tests for parsing structured AI responses
 * Following TDD methodology - tests written first
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { RiskAssessment, OptimizationResult } from '../../types/ai-types';
import { AIAnalysisError } from '../../errors';
import {
  parseRiskAssessmentResponse,
  parseOptimizationResponse,
  parseAIResponse,
  validateAIResponseStructure,
  isValidRiskAssessment,
  isValidOptimizationResult
} from '../aiResponseParsers';
import * as mockData from './mockData';

describe('AI Response Parsers - Task #30', () => {
  
  // =============================================================================
  // parseRiskAssessmentResponse Tests
  // =============================================================================
  
  describe('parseRiskAssessmentResponse', () => {
    it('should parse valid risk assessment response correctly', () => {
      const result = parseRiskAssessmentResponse(mockData.validRiskAssessmentResponse);
      
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.85);
      expect(result.data.riskLevel).toBe('medium');
      expect(result.data.recommendations).toHaveLength(3);
      expect(result.data.riskFactors?.volatilityRisk).toBe(0.65);
      expect(result.data.lossScenarios).toHaveLength(2);
    });
    
    it('should handle partial risk assessment response with defaults', () => {
      const result = parseRiskAssessmentResponse(mockData.partialRiskAssessmentResponse);
      
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.72);
      expect(result.data.riskLevel).toBe('high');
      expect(result.data.recommendations).toHaveLength(1);
      expect(result.data.riskFactors).toBeUndefined();
      expect(result.data.lossScenarios).toBeUndefined();
    });
    
    it('should apply fallback values for malformed risk assessment response', () => {
      const result = parseRiskAssessmentResponse(mockData.malformedRiskAssessmentResponse);
      
      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high']).toContain(result.data.riskLevel);
      expect(Array.isArray(result.data.recommendations)).toBe(true);
    });
    
    it('should throw AIAnalysisError for completely invalid input', () => {
      expect(() => {
        parseRiskAssessmentResponse(mockData.invalidRiskAssessmentResponse);
      }).toThrow(AIAnalysisError);
    });
    
    it('should handle null and undefined inputs', () => {
      expect(() => {
        parseRiskAssessmentResponse(null);
      }).toThrow(AIAnalysisError);
      
      expect(() => {
        parseRiskAssessmentResponse(undefined);
      }).toThrow(AIAnalysisError);
    });
    
    it('should handle non-object inputs', () => {
      expect(() => {
        parseRiskAssessmentResponse('string');
      }).toThrow(AIAnalysisError);
      
      expect(() => {
        parseRiskAssessmentResponse(123);
      }).toThrow(AIAnalysisError);
      
      expect(() => {
        parseRiskAssessmentResponse(['array']);
      }).toThrow(AIAnalysisError);
    });
    
    it('should validate confidence range and apply bounds', () => {
      const responseWithInvalidConfidence = {
        ...mockData.validRiskAssessmentResponse,
        confidence: 1.5, // Out of range
        data: {
          ...mockData.validRiskAssessmentResponse.data,
          confidence: -0.2 // Out of range
        }
      };
      
      const result = parseRiskAssessmentResponse(responseWithInvalidConfidence);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.data.confidence).toBeGreaterThanOrEqual(0);
      expect(result.data.confidence).toBeLessThanOrEqual(1);
    });
  });
  
  // =============================================================================
  // parseOptimizationResponse Tests
  // =============================================================================
  
  describe('parseOptimizationResponse', () => {
    it('should parse valid optimization response correctly', () => {
      const result = parseOptimizationResponse(mockData.validOptimizationResponse);
      
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.88);
      expect(result.data.optimizationType).toBe('portfolio');
      expect(result.data.recommendations).toHaveLength(3);
      expect(result.data.allocations).toHaveLength(3);
      expect(result.data.backtestResults?.totalReturn).toBe(0.28);
    });
    
    it('should handle partial optimization response with defaults', () => {
      const result = parseOptimizationResponse(mockData.partialOptimizationResponse);
      
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.75);
      expect(result.data.optimizationType).toBe('risk');
      expect(result.data.recommendations).toHaveLength(1);
      expect(result.data.allocations).toBeUndefined();
      expect(result.data.backtestResults).toBeUndefined();
    });
    
    it('should apply fallback values for malformed optimization response', () => {
      const result = parseOptimizationResponse(mockData.malformedOptimizationResponse);
      
      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(['portfolio', 'risk', 'return', 'sharpe']).toContain(result.data.optimizationType);
      expect(Array.isArray(result.data.recommendations)).toBe(true);
    });
    
    it('should throw AIAnalysisError for completely invalid input', () => {
      expect(() => {
        parseOptimizationResponse(mockData.invalidOptimizationResponse);
      }).toThrow(AIAnalysisError);
    });
    
    it('should validate allocation weights are within bounds', () => {
      const responseWithInvalidAllocations = {
        ...mockData.validOptimizationResponse,
        data: {
          ...mockData.validOptimizationResponse.data,
          allocations: [
            {
              symbol: 'BTC',
              currentWeight: 1.5, // Out of range
              optimizedWeight: -0.1, // Out of range
              adjustment: 0.05
            }
          ]
        }
      };
      
      const result = parseOptimizationResponse(responseWithInvalidAllocations);
      const allocation = result.data.allocations![0];
      expect(allocation.currentWeight).toBeGreaterThanOrEqual(0);
      expect(allocation.currentWeight).toBeLessThanOrEqual(1);
      expect(allocation.optimizedWeight).toBeGreaterThanOrEqual(0);
      expect(allocation.optimizedWeight).toBeLessThanOrEqual(1);
    });
  });
  
  // =============================================================================
  // parseAIResponse Generic Function Tests
  // =============================================================================
  
  describe('parseAIResponse', () => {
    it('should parse response with custom validator successfully', () => {
      const validator = (data: unknown): data is RiskAssessment => {
        return isValidRiskAssessment(data);
      };
      
      const result = parseAIResponse(
        mockData.validRiskAssessmentResponse,
        validator,
        'risk'
      );
      
      expect(result.success).toBe(true);
      expect(result.data.riskLevel).toBe('medium');
    });
    
    it('should apply fallback function when validation fails', () => {
      const validator = () => false; // Always fail validation
      const fallback = (): RiskAssessment => ({
        success: true,
        confidence: 0.5,
        data: {
          riskLevel: 'medium',
          confidence: 0.5,
          recommendations: ['Default recommendation']
        }
      });
      
      const result = parseAIResponse(
        mockData.invalidRiskAssessmentResponse,
        validator,
        'risk',
        fallback
      );
      
      expect(result.success).toBe(true);
      expect(result.data.riskLevel).toBe('medium');
      expect(result.data.recommendations).toContain('Default recommendation');
    });
    
    it('should throw AIAnalysisError when no fallback provided and validation fails', () => {
      const validator = () => false;
      
      expect(() => {
        parseAIResponse(
          mockData.invalidRiskAssessmentResponse,
          validator,
          'risk'
        );
      }).toThrow(AIAnalysisError);
    });
  });
  
  // =============================================================================
  // Validation Helper Tests
  // =============================================================================
  
  describe('validateAIResponseStructure', () => {
    it('should validate correct AI response structure', () => {
      expect(validateAIResponseStructure(mockData.validRiskAssessmentResponse)).toBe(true);
      expect(validateAIResponseStructure(mockData.validOptimizationResponse)).toBe(true);
    });
    
    it('should reject invalid AI response structures', () => {
      expect(validateAIResponseStructure(mockData.responseWithoutSuccess)).toBe(false);
      expect(validateAIResponseStructure(mockData.responseWithInvalidSuccess)).toBe(false);
      expect(validateAIResponseStructure(mockData.nullResponse)).toBe(false);
      expect(validateAIResponseStructure(mockData.stringResponse)).toBe(false);
    });
    
    it('should handle edge cases gracefully', () => {
      expect(validateAIResponseStructure(mockData.emptyResponse)).toBe(false);
      expect(validateAIResponseStructure(mockData.arrayResponse)).toBe(false);
    });
  });
  
  describe('isValidRiskAssessment', () => {
    it('should validate correct risk assessment structure', () => {
      expect(isValidRiskAssessment(mockData.validRiskAssessmentResponse)).toBe(true);
    });
    
    it('should accept partial risk assessments with required fields', () => {
      expect(isValidRiskAssessment(mockData.partialRiskAssessmentResponse)).toBe(true);
    });
    
    it('should reject malformed risk assessments', () => {
      expect(isValidRiskAssessment(mockData.malformedRiskAssessmentResponse)).toBe(false);
      expect(isValidRiskAssessment(mockData.invalidRiskAssessmentResponse)).toBe(false);
    });
  });
  
  describe('isValidOptimizationResult', () => {
    it('should validate correct optimization result structure', () => {
      expect(isValidOptimizationResult(mockData.validOptimizationResponse)).toBe(true);
    });
    
    it('should accept partial optimization results with required fields', () => {
      expect(isValidOptimizationResult(mockData.partialOptimizationResponse)).toBe(true);
    });
    
    it('should reject malformed optimization results', () => {
      expect(isValidOptimizationResult(mockData.malformedOptimizationResponse)).toBe(false);
      expect(isValidOptimizationResult(mockData.invalidOptimizationResponse)).toBe(false);
    });
  });
  
  // =============================================================================
  // Error Handling Integration Tests
  // =============================================================================
  
  describe('Error Handling Integration', () => {
    it('should create AIAnalysisError with proper context for risk assessment', () => {
      try {
        parseRiskAssessmentResponse(mockData.invalidRiskAssessmentResponse);
        expect.unreachable('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIAnalysisError);
        expect((error as AIAnalysisError).analysisType).toBe('risk');
        expect((error as AIAnalysisError).message).toContain('Failed to parse');
      }
    });
    
    it('should create AIAnalysisError with proper context for optimization', () => {
      try {
        parseOptimizationResponse(mockData.invalidOptimizationResponse);
        expect.unreachable('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIAnalysisError);
        expect((error as AIAnalysisError).analysisType).toBe('optimization');
        expect((error as AIAnalysisError).message).toContain('Failed to parse');
      }
    });
    
    it('should include original input in error context', () => {
      try {
        parseRiskAssessmentResponse({ invalid: 'input' });
        expect.unreachable('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AIAnalysisError);
        const analysisError = error as AIAnalysisError;
        expect(analysisError.details).toBeDefined();
        expect(analysisError.details?.originalInput).toBeDefined();
      }
    });
  });
  
  // =============================================================================
  // Performance and Edge Case Tests
  // =============================================================================
  
  describe('Performance and Edge Cases', () => {
    it('should handle large responses efficiently', () => {
      const startTime = Date.now();
      const result = parseRiskAssessmentResponse(mockData.hugeResponse);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(result.success).toBe(true);
    });
    
    it('should handle circular reference gracefully', () => {
      // Should not throw error but may not parse perfectly
      expect(() => {
        parseRiskAssessmentResponse(mockData.responseWithCircularReference);
      }).not.toThrow();
    });
    
    it('should handle nested null values', () => {
      const result = parseRiskAssessmentResponse(mockData.responseWithNestedNulls);
      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.data.recommendations)).toBe(true);
    });
    
    it('should sanitize recommendations array', () => {
      const result = parseRiskAssessmentResponse(mockData.responseWithNestedNulls);
      const recommendations = result.data.recommendations;
      
      // Should filter out null, undefined, and empty values
      recommendations.forEach(rec => {
        expect(rec).toBeTruthy();
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });
  });
  
  // =============================================================================
  // Documentation and JSDoc Tests
  // =============================================================================
  
  describe('Documentation Verification', () => {
    it('should have all functions properly exported', () => {
      expect(typeof parseRiskAssessmentResponse).toBe('function');
      expect(typeof parseOptimizationResponse).toBe('function');
      expect(typeof parseAIResponse).toBe('function');
      expect(typeof validateAIResponseStructure).toBe('function');
      expect(typeof isValidRiskAssessment).toBe('function');
      expect(typeof isValidOptimizationResult).toBe('function');
    });
    
    it('should validate function signatures match documentation', () => {
      // Test that functions accept correct parameter types
      expect(() => parseRiskAssessmentResponse({})).not.toThrow(TypeError);
      expect(() => parseOptimizationResponse({})).not.toThrow(TypeError);
      expect(() => validateAIResponseStructure({})).not.toThrow(TypeError);
    });
  });
});