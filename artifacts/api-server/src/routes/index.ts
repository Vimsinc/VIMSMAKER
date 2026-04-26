import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import contentRouter from "./content";
import imagesRouter from "./images";
import metricsRouter from "./metrics";
import publishingRouter from "./publishing";
import videoRouter from "./video";
import marketRouter from "./market";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(contentRouter);
router.use(imagesRouter);
router.use(metricsRouter);
router.use(publishingRouter);
router.use(videoRouter);
router.use(marketRouter);

export default router;
