import { DatabaseClient, ServiceProps } from "../types";
import { ExtendedDatabase } from "../db";
import ClickErrors from "../modules/errors/ClickErrors";
import ClickModel from "./models/ClickModel";

export default class ClickService {
  private db: ExtendedDatabase = null;
  private pgp: DatabaseClient = null;

  constructor(props: ServiceProps) {
    this.db = props.db;
    this.pgp = props.pgp;
  }

  prepare = async (data: any) => {
    try {
      const payment = await this.db.oneOrNone(`
        SELECT id,
               amount,
               payment_status_id,
               (extract(epoch from created_at) * 1000)::bigint              as created_at,
               (extract(epoch from payment_sys_create_time) * 1000)::bigint as payment_sys_create_time,
               performed_at,
               payment_sys_id,
               CASE
                   WHEN created_at + (20 * INTERVAL '1 minute') > CURRENT_TIMESTAMP THEN 'pending'
                   ELSE 'expired' END                                       AS timely_status
        FROM payments
        WHERE payment_service_id = 2
          AND (id = $1::decimal(30, 0) OR payment_sys_id = $2)
      `, [data.merchant_trans_id, data.click_trans_id]);

      if (!payment)
        return ClickErrors.userOrPaymentNotFound();
      else if (payment.payment_status_id == 2)
        return ClickErrors.alreadyPaid();
      else if (payment.timely_status === "expired")
        return ClickErrors.transactionDoesNotExist();
      else if (payment.amount != data.amount)
        return ClickErrors.invalidPaymentAmount();
      else if (payment.payment_sys_id !== "0" && data.click_trans_id != payment.payment_sys_id)
        return ClickErrors.transactionDoesNotExist();


      if (payment.payment_sys_id === "0") {
        await this.db.none(`
          UPDATE payments
          SET payment_sys_id          = $1,
              click_paydoc_id         = $2,
              click_error             = $3,
              click_error_note        = $4,
              payment_sys_create_time = $5
          WHERE id = $6
        `, [
          data.click_trans_id, data.click_paydoc_id, data.error,
          data.error_note, data.sign_time, data.merchant_trans_id,
        ]);

        return ClickModel.prepareSuccessReturn({
          click_trans_id: data.click_trans_id,
          merchant_trans_id: payment.id,
          merchant_prepare_id: payment.id,
        });
      }

      return ClickModel.prepareSuccessReturn({
        click_trans_id: data.click_trans_id,
        merchant_trans_id: payment.id,
        merchant_prepare_id: payment.id,
      });
    } catch (e) {
      throw e;
    }
  };

  complete = async (data: any): Promise<any> => {
    try {
      const payment = await this.db.oneOrNone(`
        SELECT id,
               amount,
               payment_status_id,
               created_at,
               (extract(epoch from performed_at) * 1000)::bigint as perform_time,
               CASE
                   WHEN created_at + (20 * INTERVAL '1 minute') > CURRENT_TIMESTAMP THEN 'pending'
                   ELSE 'expired' END                            AS timely_status
        FROM payments
        WHERE payment_service_id = 2
          AND payment_sys_id = $1
      `, [data.click_trans_id]);

      if (!payment)
        return ClickErrors.userOrPaymentNotFound();
      else if (payment.id != data.merchant_prepare_id)
        return ClickErrors.transactionDoesNotExist();
      else if (payment.payment_status_id == 2)
        return ClickErrors.alreadyPaid();
      else if (payment.payment_status_id == 3)
        return ClickErrors.transactionCancelled();
      else if (payment.timely_status === "expired")
        return ClickErrors.transactionDoesNotExist();
      else if (payment.amount != data.amount)
        return ClickErrors.invalidPaymentAmount();

      if (data.error == "-5017") {
        await this.db.none(`
          UPDATE payments
          SET payment_status_id = 3
          WHERE payment_service_id = 2
            AND payment_sys_id = $1
        `, [data.click_trans_id]);

        return ClickErrors.transactionCancelled();
      } else if (payment.payment_status_id == 1) {
        await this.db.none(`
          UPDATE payments
          SET payment_status_id = 2,
              performed_at      = now()
          WHERE payment_service_id = 2
            AND payment_sys_id = $1
        `, [data.click_trans_id]);

        return ClickModel.completeSuccessReturn({
          click_trans_id: data.click_trans_id,
          merchant_trans_id: payment.id,
          merchant_confirm_id: payment.id,
        });
      }

      return ClickErrors.actionNotFound();
    } catch (e) {
      throw e;
    }
  };
}