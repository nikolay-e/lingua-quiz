/*
 * LinguaQuiz - Copyright © 2025 Nikolay Eremeev
 *
 * Dual-licensed:
 *  - Non-Commercial Source-Available v2  →  see LICENSE-NONCOMMERCIAL.md
 *  - Commercial License v2               →  see LICENSE-COMMERCIAL.md
 *
 * Contact: lingua-quiz@nikolay-eremeev.com
 * Repository: https://github.com/nikolay-e/lingua-quiz
 * File: packages/backend/src/services/health.js
 */

import { checkConnection } from '../db/index.js';
import { ServiceUnavailableError } from '../utils/errors.js';

async function checkHealth() {
  try {
    // Check database connection
    const dbHealth = await checkConnection();

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    // For Docker environments, be more lenient with memory checks
    // In containerized environments, memory metrics can be different
    const memoryHealthy = process.env.DOCKER_ENVIRONMENT === 'true' || 
                          memoryUsage.heapUsed < 0.9 * memoryUsage.heapTotal; // Less than 90% of heap used

    // Overall system status
    const isSystemHealthy = dbHealth && memoryHealthy;

    if (!isSystemHealthy) {
      const errorMessage = dbHealth ? 'Service Degraded: System resources low' : 'Service Unavailable: Cannot reach database';

      throw new ServiceUnavailableError(errorMessage);
    }

    return {
      components: {
        api: {
          message: 'API server running',
          status: 'ok',
        },
        database: {
          message: dbHealth ? 'Database connection successful' : 'Cannot reach database',
          status: dbHealth ? 'ok' : 'error',
        },
        system: {
          message: memoryHealthy ? 'System resources normal' : 'System resources under pressure',
          metrics: {
            memory: {
              heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
              heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
              rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
              usagePercent: `${Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)}%`,
            },
          },
          status: memoryHealthy ? 'ok' : 'warning',
        },
      },
      message: isSystemHealthy ? 'All systems operational' : 'Service degraded',
      status: isSystemHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: `${Math.round(process.uptime())}s`,
      version: process.env.npm_package_version || 'unknown',
    };
  } catch (error) {
    if (error instanceof ServiceUnavailableError) {
      throw error;
    }
    throw new ServiceUnavailableError('Service health check failed', error);
  }
}
export default checkHealth;
