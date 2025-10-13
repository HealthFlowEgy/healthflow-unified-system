/**
 * Autocomplete Service
 * Provide search suggestions and autocomplete
 */

import { logger } from '../utils/logger';

interface AutocompleteResult {
  text: string;
  type: string;
  score: number;
  metadata?: any;
}

class AutocompleteService {
  private commonMedicalTerms = [
    'headache', 'fever', 'cough', 'diabetes', 'hypertension',
    'asthma', 'allergy', 'infection', 'pain', 'nausea'
  ];

  private commonSpecializations = [
    'Cardiology', 'Pediatrics', 'Dermatology', 'Neurology',
    'Orthopedics', 'Psychiatry', 'Radiology', 'Surgery'
  ];

  async getSuggestions(query: string, type?: string, limit: number = 10): Promise<AutocompleteResult[]> {
    try {
      const lowerQuery = query.toLowerCase();
      const suggestions: AutocompleteResult[] = [];

      // Medical terms
      if (!type || type === 'medical') {
        this.commonMedicalTerms
          .filter(term => term.toLowerCase().includes(lowerQuery))
          .forEach(term => {
            suggestions.push({
              text: term,
              type: 'medical_term',
              score: this.calculateScore(term, query)
            });
          });
      }

      // Specializations
      if (!type || type === 'specialization') {
        this.commonSpecializations
          .filter(spec => spec.toLowerCase().includes(lowerQuery))
          .forEach(spec => {
            suggestions.push({
              text: spec,
              type: 'specialization',
              score: this.calculateScore(spec, query)
            });
          });
      }

      // Sort by score and limit
      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      logger.error('Autocomplete failed:', error);
      return [];
    }
  }

  private calculateScore(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // Exact match
    if (lowerText === lowerQuery) return 100;

    // Starts with query
    if (lowerText.startsWith(lowerQuery)) return 80;

    // Contains query
    if (lowerText.includes(lowerQuery)) return 60;

    // Fuzzy match (simple implementation)
    const distance = this.levenshteinDistance(lowerText, lowerQuery);
    return Math.max(0, 40 - distance * 5);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  async getPopularSearches(limit: number = 10): Promise<string[]> {
    try {
      // Mock implementation - in production, fetch from database
      return [
        'diabetes treatment',
        'cardiology consultation',
        'pediatric care',
        'blood pressure medication',
        'allergy testing'
      ].slice(0, limit);
    } catch (error) {
      logger.error('Failed to get popular searches:', error);
      return [];
    }
  }

  async recordSearch(query: string, userId?: string): Promise<void> {
    try {
      // Mock implementation - in production, save to database
      logger.info(`Recorded search: "${query}" by user ${userId || 'anonymous'}`);
    } catch (error) {
      logger.error('Failed to record search:', error);
    }
  }
}

export const autocompleteService = new AutocompleteService();
