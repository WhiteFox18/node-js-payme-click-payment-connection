import { Request, Response } from "express";
import db from "../db";
import ClickErrors from "../modules/errors/ClickErrors";

export const ClickController = async (req: Request, res: Response) => {
  try {
    const { action } = req.body;

    let response;

    switch (parseInt(action)) {
      case 0:
        response = await db.click.prepare(req.body);
        break;
      case 1:
        response = await db.click.complete(req.body);
        break;
      default:
        response = ClickErrors.actionNotFound();
        break;
    }

    res.json(response);
  } catch (e) {
    res.json(ClickErrors.transactionDoesNotExist());
  }
};

export default ClickController;