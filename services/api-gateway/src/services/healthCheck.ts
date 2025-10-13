import axios from 'axios';
import { logger } from '../utils/logger';

interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}

interface OverallHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: Record<string, ServiceHealth>;
}

export class HealthCheckService {
  private services: Record<string, string>;
  
  constructor() {
    this.services = {
      auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4003',
      provider: process.env.PROVIDER_SERVICE_URL || 'http://localhost:5000',
      regulatory: process.env.REGULATORY_SERVICE_URL || 'http://localhost:4000',
      pharmacy: process.env.PHARMACY_SERVICE_URL || 'http://localhost:4001'
    };
  }
  
  async checkService(name: string, url: string): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${url}/health`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.status === 200) {
        return {
          status: 'healthy',
          responseTime
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          error: `Service returned status ${response.status}`
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      logger.warn(`Health check failed for ${name}`, {
        service: name,
        error: error.message
      });
      
      return {
        status: 'unhealthy',
        responseTime,
        error: error.message
      };
    }
  }
  
  async checkAll(): Promise<OverallHealth> {
    const checks = await Promise.all(
      Object.entries(this.services).map(async ([name, url]) => {
        const health = await this.checkService(name, url);
        return [name, health];
      })
    );
    
    const services: Record<string, ServiceHealth> = Object.fromEntries(checks);
    
    // Determine overall status
    const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;
    const totalCount = Object.keys(services).length;
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    
    if (healthyCount === totalCount) {
      overallStatus = 'healthy';
    } else if (healthyCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services
    };
  }
}

