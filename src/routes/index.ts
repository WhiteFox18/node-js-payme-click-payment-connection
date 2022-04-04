import { Router } from "express";
import ClickController from "../controllers/ClickController";
import PayMeController from "../controllers/PayMeController";
import { clickProtected, paymeProtected } from "../modules/middlewares";

const router = Router();

router
  .post("/payme", paymeProtected, PayMeController)
  .post("/click", clickProtected, ClickController);

export default router;