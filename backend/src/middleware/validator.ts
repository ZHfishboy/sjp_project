import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { fail } from '../utils/response';

/**
 * Middleware factory: runs express-validator checks and returns 422 on failure.
 * Usage: router.post('/login', validate([check('email').isEmail()]), handler);
 */
export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const validation of validations) {
      await validation.run(req);
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const firstError = errors.array()[0];
    return fail(res, firstError.msg, 422, errors.array());
  };
}

// Common reusable validation chains
export { body, param, query, header, check } from 'express-validator';
