/**
 * Loan + me routes (A-08, A-09 partial). All require auth; customerId comes from the token via
 * requireAuth and is passed to the service (per-customer scoping, PRD A3).
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, getCustomerId } from '../auth/authMiddleware.js';
import { LoansService } from './loans.service.js';
import type { LoanRepository } from '../../repositories/LoanRepository.js';

const loanParams = z.object({ loanId: z.string().min(1) });
const txnQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export function loansRouter(repo: LoanRepository, asOfOverride?: string): Router {
  const router = Router();
  const service = new LoansService(repo, asOfOverride);

  // requireAuth is attached per-route (not router-wide) so unknown paths still fall through
  // to the 404 handler instead of being challenged for auth.

  router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.getMe(getCustomerId(req)));
    } catch (err) {
      next(err);
    }
  });

  router.get('/loans', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.listLoans(getCustomerId(req)));
    } catch (err) {
      next(err);
    }
  });

  router.get('/loans/:loanId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { loanId } = loanParams.parse(req.params);
      res.json(await service.getLoanDetail(getCustomerId(req), loanId));
    } catch (err) {
      next(err);
    }
  });

  router.get('/loans/:loanId/schedule', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { loanId } = loanParams.parse(req.params);
      res.json(await service.getSchedule(getCustomerId(req), loanId));
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/loans/:loanId/transactions',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { loanId } = loanParams.parse(req.params);
        const { cursor, limit } = txnQuery.parse(req.query);
        res.json(
          await service.getTransactions(getCustomerId(req), loanId, { cursor, limit }),
        );
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
