interface RequestMetric {
  service: string;
  method: string;
  statusCode: number;
  duration: number;
}

interface ServiceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errors: number;
}

export class MetricsService {
  private metrics: Map<string, ServiceMetrics>;
  private requestTimes: Map<string, number[]>;
  
  constructor() {
    this.metrics = new Map();
    this.requestTimes = new Map();
  }
  
  recordRequest(metric: RequestMetric): void {
    const { service, statusCode, duration } = metric;
    
    // Initialize metrics for service if not exists
    if (!this.metrics.has(service)) {
      this.metrics.set(service, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        errors: 0
      });
      this.requestTimes.set(service, []);
    }
    
    const serviceMetrics = this.metrics.get(service)!;
    const times = this.requestTimes.get(service)!;
    
    // Update metrics
    serviceMetrics.totalRequests++;
    
    if (statusCode >= 200 && statusCode < 400) {
      serviceMetrics.successfulRequests++;
    } else {
      serviceMetrics.failedRequests++;
    }
    
    // Track response times (keep last 100)
    times.push(duration);
    if (times.length > 100) {
      times.shift();
    }
    
    // Calculate average response time
    const sum = times.reduce((a, b) => a + b, 0);
    serviceMetrics.averageResponseTime = Math.round(sum / times.length);
  }
  
  recordError(service: string): void {
    if (!this.metrics.has(service)) {
      this.metrics.set(service, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        errors: 0
      });
    }
    
    const serviceMetrics = this.metrics.get(service)!;
    serviceMetrics.errors++;
  }
  
  getMetrics(): Record<string, ServiceMetrics> {
    const result: Record<string, ServiceMetrics> = {};
    
    this.metrics.forEach((metrics, service) => {
      result[service] = { ...metrics };
    });
    
    return result;
  }
  
  reset(): void {
    this.metrics.clear();
    this.requestTimes.clear();
  }
}

