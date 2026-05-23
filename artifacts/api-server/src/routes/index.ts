import { Router, type IRouter } from "express";
import healthRouter from "./health";
import trendingRouter from "./trending";
import generateRouter from "./generate";
import imagesRouter from "./images";
import videoRouter from "./video";

const router: IRouter = Router();

router.use(healthRouter);
router.use(trendingRouter);
router.use(generateRouter);
router.use(imagesRouter);
router.use(videoRouter);

export default router;
