import { JwtPayload } from "../lib/jwt";

// Augment Express's Request type so req.user is available after requireAuth runs.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
