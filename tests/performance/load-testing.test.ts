/**
 * Load Testing Suite
 * Performance and load tests for HealthFlow APIs
 */

import autocannon from 'autocannon';
import { describe, it, expect } from '@jest/globals';

describe('Load Testing', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:8000';

  it('should handle 100 concurrent users on authentication endpoint', async () => {
    const result = await autocannon({
      url: `${baseUrl}/api/auth/login`,
      connections: 100,
      duration: 30,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@healthflow.eg',
        password: 'TestPassword123!'
      })
    });

    expect(result.errors).toBe(0);
    expect(result.timeouts).toBe(0);
    expect(result.latency.mean).toBeLessThan(500); // Average response time < 500ms
  }, 60000);

  it('should handle 50 concurrent requests to patient list endpoint', async () => {
    const result = await autocannon({
      url: `${baseUrl}/api/patients`,
      connections: 50,
      duration: 30,
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN}`
      }
    });

    expect(result.errors).toBe(0);
    expect(result.latency.p99).toBeLessThan(1000); // 99th percentile < 1s
  }, 60000);

  it('should handle 200 requests per second to dashboard metrics', async () => {
    const result = await autocannon({
      url: `${baseUrl}/api/bi-dashboard/analytics/metrics`,
      connections: 20,
      pipelining: 10,
      duration: 30,
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN}`
      }
    });

    expect(result.requests.average).toBeGreaterThan(200);
    expect(result.latency.mean).toBeLessThan(300);
  }, 60000);

  it('should maintain performance under sustained load', async () => {
    const result = await autocannon({
      url: `${baseUrl}/api/appointments`,
      connections: 100,
      duration: 60, // 1 minute sustained load
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN}`
      }
    });

    expect(result.errors).toBe(0);
    expect(result.latency.p95).toBeLessThan(800);
  }, 90000);
});

describe('Stress Testing', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:8000';

  it('should handle spike in traffic', async () => {
    const result = await autocannon({
      url: `${baseUrl}/api/doctors`,
      connections: 500, // Spike to 500 concurrent users
      duration: 10,
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN}`
      }
    });

    // System should handle spike without crashing
    expect(result.non2xx).toBeLessThan(result.requests.total * 0.05); // < 5% error rate
  }, 30000);

  it('should recover from overload', async () => {
    // First, overload the system
    await autocannon({
      url: `${baseUrl}/api/prescriptions`,
      connections: 1000,
      duration: 5,
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN}`
      }
    });

    // Wait for recovery
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test normal load
    const result = await autocannon({
      url: `${baseUrl}/api/prescriptions`,
      connections: 50,
      duration: 10,
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN}`
      }
    });

    expect(result.latency.mean).toBeLessThan(500);
  }, 60000);
});

describe('Database Performance', () => {
  it('should handle complex queries efficiently', async () => {
    const startTime = Date.now();

    const response = await fetch(`${process.env.API_URL}/api/bi-dashboard/analytics/trends/prescriptions?period=1y`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN}`
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(2000); // Complex query < 2s
  });

  it('should handle pagination efficiently', async () => {
    const startTime = Date.now();

    const response = await fetch(`${process.env.API_URL}/api/patients?limit=100&offset=0`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN}`
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(500); // Pagination < 500ms
  });
});

describe('File Upload Performance', () => {
  it('should handle multiple concurrent file uploads', async () => {
    const uploads = Array.from({ length: 10 }, (_, i) => {
      const formData = new FormData();
      formData.append('file', new Blob(['test content'], { type: 'text/plain' }), `test${i}.txt`);

      return fetch(`${process.env.API_URL}/api/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN}`
        },
        body: formData
      });
    });

    const startTime = Date.now();
    const results = await Promise.all(uploads);
    const endTime = Date.now();

    results.forEach(result => {
      expect(result.status).toBe(200);
    });

    expect(endTime - startTime).toBeLessThan(5000); // 10 uploads < 5s
  });
});

describe('Cache Performance', () => {
  it('should serve cached responses faster', async () => {
    const url = `${process.env.API_URL}/api/bi-dashboard/analytics/metrics`;
    const headers = {
      'Authorization': `Bearer ${process.env.TEST_TOKEN}`
    };

    // First request (cache miss)
    const start1 = Date.now();
    await fetch(url, { headers });
    const duration1 = Date.now() - start1;

    // Second request (cache hit)
    const start2 = Date.now();
    await fetch(url, { headers });
    const duration2 = Date.now() - start2;

    // Cached response should be faster
    expect(duration2).toBeLessThan(duration1);
    expect(duration2).toBeLessThan(100); // Cached response < 100ms
  });
});
