import md5 from "blueimp-md5";
import { NextFunction, Request, Response } from "express";
import { Base64 } from "js-base64";
import ClickErrors from "../errors/ClickErrors";
import PayMeErrors from "../errors/PayMeErrors";
import dotenv from "dotenv";

dotenv.config()

export const paymeProtected = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(req.headers.authorization.split(" ")[0] === "Basic"))
      return res.json(PayMeErrors.notEnoughPrivileges());

    const authorizationBase64 = Base64.decode(req.headers.authorization.split(" ")[1]).split(":");

    if (authorizationBase64[0] != process.env.PAYME_LOGIN || authorizationBase64[1] != process.env.PAYME_PASSWORD)
      return res.json(PayMeErrors.notEnoughPrivileges());

    next();
  } catch (e) {
    res.json(PayMeErrors.serverError());
  }
};

export const clickProtected = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body.service_id != process.env.CLICK_SERVICE_ID)
      return res.json(ClickErrors.badRequest());

    let hash: string = null;

    switch (parseInt(req.body.action)) {
      case 0:
        hash = md5(req.body.click_trans_id + req.body.service_id + process.env.CLICK_SECRET_KEY +
          req.body.merchant_trans_id + req.body.amount + req.body.action + req.body.sign_time);
        break;
      case 1:
        hash = md5(req.body.click_trans_id + req.body.service_id + process.env.CLICK_SECRET_KEY +
          req.body.merchant_trans_id + req.body.merchant_prepare_id + req.body.amount + req.body.action + req.body.sign_time);
        break;
    }

    if (hash != req.body.sign_string) {
      return res.json(ClickErrors.signCheckFailed());
    }

    next();
  } catch (e) {
    res.json(ClickErrors.signCheckFailed());
  }
};
