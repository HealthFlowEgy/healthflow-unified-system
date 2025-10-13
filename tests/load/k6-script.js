/**
 * K6 Load Testing Script
 * Alternative to Artillery
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '10m', target: 50 },  // Stay at 50 users
    { duration: '5m', target: 100 },  // Ramp up to 100 users
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '5m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = 'https://api.healthflow.eg';

export default function () {
  // Login
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: `user${Math.floor(Math.random() * 1000)}@test.com`,
    password: 'Test123!@#'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'has token': (r) => r.json('token') !== undefined,
  }) || errorRate.add(1);

  const authToken = loginRes.json('token');

  sleep(1);

  // Get patients
  const patientsRes = http.get(`${BASE_URL}/api/patients?limit=20`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  check(patientsRes, {
    'patients retrieved': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Get appointments
  const appointmentsRes = http.get(`${BASE_URL}/api/appointments?status=upcoming`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  check(appointmentsRes, {
    'appointments retrieved': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);
}
