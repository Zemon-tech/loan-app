/**
 * LoanRepository factory — the single place the data source is chosen (BACKEND_SPEC §5.2).
 * Driven by env.DATA_SOURCE. Nothing above this line knows which implementation is active, so
 * flipping from demo (mock) to the client's live API later is a one-line/one-env change.
 */

import type { Env } from '../config/env.js';
import type { Logger } from '../lib/logger.js';
import type { LoanRepository } from './LoanRepository.js';
import { MockLoanRepository } from './mock/MockLoanRepository.js';

export function createLoanRepository(env: Env, _logger: Logger): LoanRepository {
  switch (env.DATA_SOURCE) {
    case 'client_api':
      // TODO(LIVE): return new ClientApiLoanRepository(env, { logger }); — the anti-corruption
      // layer over the client's API. Built when the client delivers their API (BACKEND_SPEC §7.3).
      throw new Error('DATA_SOURCE=client_api not implemented yet (live phase).');
    case 'mysql':
      // TODO: return new MysqlLoanRepository(...) — only if the client gives direct DB access.
      throw new Error('DATA_SOURCE=mysql not implemented yet.');
    case 'mock':
    default:
      return new MockLoanRepository();
  }
}

export type { LoanRepository } from './LoanRepository.js';
