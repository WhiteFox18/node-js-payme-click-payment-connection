import { Request, Response } from "express";
import db from "../db";
import PayMeErrors from "../modules/errors/PayMeErrors";

export const PayMeController = async (req: Request, res: Response) => {
  const { method, params } = req.body;
  try {
    let response;
    switch (method) {
      case "CheckPerformTransaction":
        response = await db.payme.checkPerformTransaction(params);
        break;
      case "CreateTransaction":
        response = await db.payme.createTransaction(params);
        break;
      case "PerformTransaction":
        response = await db.payme.performTransaction(params);
        break;
      case "CheckTransaction":
        response = await db.payme.checkTransaction(params);
        break;
      case "GetStatement":
        response = await db.payme.getStatement(params);
        break;
      case "CancelTransaction":
        res.status(200).json(PayMeErrors.cannotBeCancelled(req.body.id));
        break;
      default:
        res.status(405).send(PayMeErrors.actionNotFound());
        break;
    }

    res.json(response);
  } catch (e) {
    res.status(406).json(PayMeErrors.transactionDoesNotExist(req.body.id));
  }
};

export default PayMeController;
