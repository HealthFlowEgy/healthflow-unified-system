import { logger } from '../utils/logger';

class MetricsService {
  async getMetrics() {
    logger.info('Getting Prometheus metrics');
    return {
      requests_total: 1000,
      errors_total: 10,
      response_time_avg: 150
    };
  }

  async trackError(error: Error) {
    logger.error('Tracking error:', error);
    // In production, send to Sentry
  }
}

export const metricsService = new MetricsService();
