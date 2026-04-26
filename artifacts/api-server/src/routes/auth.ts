import { Router, type IRouter } from "express";
import { GetSessionResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/auth/session", (_req, res): void => {
  res.json(
    GetSessionResponse.parse({
      authenticated: false,
      user: null,
    }),
  );
});

export default router;
