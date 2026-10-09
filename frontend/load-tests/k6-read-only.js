import http from 'k6/http';
import { check, sleep } from 'k6';

const base = __ENV.BASE_URL;
const vus = Number(__ENV.USERS || 10);
if (!base || !/^http:\/\/etken-loadtest-app:8080$/.test(base)) {
  throw new Error('Only the isolated Docker app URL is permitted.');
}
if (![10, 25, 50, 100].includes(vus)) {
  throw new Error('USERS must be 10, 25, 50, or 100.');
}

export const options = {
  scenarios: { read_only: { executor: 'constant-vus', vus, duration: '2m' } },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<2000'], checks: ['rate>0.99'] },
};

const paths = ['/', '/products', '/products?q=Synthetic', '/products?category=Office', '/cart', '/checkout', '/api/health'];
export default function () {
  const path = paths[Math.floor(Math.random() * paths.length)];
  const response = http.get(base + path, { redirects: 3, timeout: '15s', tags: { endpoint: path } });
  check(response, { 'HTTP 200': r => r.status === 200 });
  sleep(1);
}
