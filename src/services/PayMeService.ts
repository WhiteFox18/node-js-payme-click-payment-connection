import { DatabaseClient, ServiceProps } from "../types";
import PayMeErrors from "../modules/errors/PayMeErrors";
import PayMeModel from "./models/PayMeModel";
import db, { ExtendedDatabase } from "../db";
import { PaymentServices, PaymentStatuses } from "./types";

interface Account {
  service: any;
}

interface CheckPerformTransaction {
  account: Account;
  amount: number;
}

interface CreateTransaction {
  id: string;
  time: Date;
  amount: number;
  account: Account;
}

interface PerformTransaction {
  id: string;
}

interface CancelTransaction {
  id: string;
  reason: string;
}

interface CheckTransaction {
  id: string;
}

interface GetStatement {
  from: bigint;
  to: bigint;
}

export default class PayMeService {
  private db: ExtendedDatabase = null;
  private pgp: DatabaseClient = null;

  constructor(props: ServiceProps) {
    this.db = props.db;
    this.pgp = props.pgp;
  }

  checkPerformTransaction = async (params: CheckPerformTransaction) => {
    try {
      const { amount, account: { service } } = params;

      const payment = await db.oneOrNone(`
        SELECT count(id) OVER ()::int as count,
               amount * 100           as amount
        FROM payments
        WHERE id = $1
          AND payment_status_id = 1
          AND payment_service_id = 1
          AND created_at + (20 * INTERVAL '1 minute') > CURRENT_TIMESTAMP
      `, [service]);

      if (!payment) {
        return PayMeErrors.irrelevantPayment(service);
      }

      if (payment.amount != amount) {
        return PayMeErrors.invalidPaymentAmount(service);
      } else if(payment.amount != amount) {
        return PayMeModel.checkPerformTransactionReturnObject();
      } else {
        return PayMeErrors.transactionDoesNotExist(service);
      }
    } catch (e) {
      throw e;
    }
  };

  createTransaction = async (params: CreateTransaction) => {
    try {
      const { id, time, amount, account: { service } } = params;

      const payment = await this.db.oneOrNone(`
        SELECT count(id) OVER ()::int                                       as count,
               id,
               amount * 100                                                 as amount,
               payment_status_id,
               (extract(epoch from created_at) * 1000)::bigint              as created_at,
               (extract(epoch from payment_sys_create_time) * 1000)::bigint as payment_sys_create_time,
               performed_at,
               payment_sys_id,
               CASE
                   WHEN created_at + (20 * INTERVAL '1 minute') > CURRENT_TIMESTAMP THEN 'pending'
                   ELSE 'expired' END                                       AS timely_status
        FROM payments
        WHERE payment_service_id = 1
          AND (id = $1 OR payment_sys_id = $2)
      `, [service, id]);

      if (!payment || payment.payment_status_id == PaymentStatuses.performed || payment.timely_status === "expired") {
        return PayMeErrors.irrelevantPayment(id);
      }

      if (payment.amount != amount) {
        return PayMeErrors.invalidPaymentAmount(service);
      }

      if (payment.payment_sys_id === "0") {
        await this.db.none(`
          UPDATE payments
          SET payment_sys_id          = $1,
              payment_sys_create_time = to_timestamp($2::bigint / 1000)
          WHERE payment_service_id = 1
            AND id = $3
        `, [id, time, service]);
      }

      return PayMeModel.createTransactionReturnObject({
        id: id,
        created_at: payment.created_at,
      });
    } catch (e) {
      throw e;
    }
  };

  performTransaction = async (params: PerformTransaction) => {
    try {
      const { id } = params;

      const payment = await this.db.oneOrNone(`
        SELECT count(id) OVER ()::int                            as count,
               id,
               amount * 100                                      as amount,
               payment_status_id,
               created_at,
               (extract(epoch from performed_at) * 1000)::bigint as perform_time,
               CASE
                   WHEN created_at + (20 * INTERVAL '1 minute') > CURRENT_TIMESTAMP THEN 'pending'
                   ELSE 'expired' END                            AS timely_status
        FROM payments
        WHERE payment_service_id = 1
          AND payment_sys_id = $1
      `, [id]);

      if (!payment) {
        return PayMeErrors.transactionDoesNotExist(id);
      }

      if (payment.payment_status_id == PaymentStatuses.created && payment.timely_status === "pending") {
        const result = await this.db.one(`
          UPDATE payments
          SET payment_status_id = 2,
              performed_at      = now()
          WHERE payment_service_id = 1
            AND payment_sys_id = $1
          RETURNING (extract(epoch from performed_at) * 1000)::bigint as perform_time
        `, [id]);

        return PayMeModel.performTransactionReturnObject({
          id: id,
          perform_time: result.perform_time,
        });
      } else if (payment.payment_status_id == PaymentStatuses.performed) {
        return PayMeModel.performTransactionReturnObject({
          id: id,
          perform_time: payment.perform_time,
        });
      } else {
        if (payment.payment_status_id != PaymentStatuses.canceled) {
          const result = await PayMeModel.cancelTransaction(id);

          return PayMeModel.cancelTransactionReturnObject({
            state: -1,
            id: id,
            cancel_time: result.cancel_time,
          });
        }

        return PayMeErrors.irrelevantTransactionStatus(id);
      }
    } catch (e) {
      throw e;
    }
  };

  cancelTransaction = async (params: CancelTransaction) => {
    try {
      const { id, reason } = params;

      const payment = await this.db.oneOrNone(`
        SELECT count(id) OVER ()::int                            as count,
               id,
               amount * 100                                      as amount,
               payment_status_id,
               created_at,
               (extract(epoch from performed_at) * 1000)::bigint as perform_time,
               CASE
                   WHEN created_at + (20 * INTERVAL '1 minute') > CURRENT_TIMESTAMP THEN 'pending'
                   ELSE 'expired' END                            AS timely_status
        FROM payments
        WHERE payment_service_id = 1
          AND payment_sys_id = $1
      `, [id]);

      if (!payment) {
        return PayMeErrors.transactionDoesNotExist(id);
      }

      if (payment.payment_status_id == 1) {
        const result = await PayMeModel.cancelTransaction(id);

        return PayMeModel.cancelTransactionReturnObject({
          id: id,
          state: -1,
          cancel_time: result.cancel_time,
        });
      } else if (payment.payment_status_id != 2) {
        return PayMeModel.cancelTransactionReturnObject({
          id: id,
          state: -1,
          cancel_time: payment.perform_time,
        });
      }

      return PayMeErrors.cannotBeCancelled(id);
    } catch (e) {
      throw e;
    }
  };

  checkTransaction = async (params: CheckTransaction): Promise<any> => {
    try {
      const { id } = params;

      const payment = await this.db.oneOrNone(`
        SELECT count(id) OVER ()::int                            as count,
               id,
               payment_status_id,
               (extract(epoch from created_at) * 1000)::bigint   as created_at,
               (extract(epoch from performed_at) * 1000)::bigint as performed_at,
               CASE
                   WHEN created_at + (20 * INTERVAL '1 minute') > CURRENT_TIMESTAMP THEN 'pending'
                   ELSE 'expired' END                            AS timely_status
        FROM payments
        WHERE payment_service_id = 1
          AND payment_sys_id = $1
      `, [id]);

      if(!payment) {
        return PayMeErrors.transactionDoesNotExist(id)
      }

      if (payment.payment_status_id == PaymentStatuses.performed) {
        return {
          result: {
            create_time: parseInt(payment.created_at),
            perform_time: parseInt(payment.performed_at),
            cancel_time: 0,
            transaction: payment.id.toString(),
            state: 2,
            reason: null,
          },
        };
      } else if (payment.timely_status === "pending" && payment.payment_status_id == PaymentStatuses.created) {
        return {
          result: {
            create_time: parseInt(payment.created_at),
            perform_time: 0,
            cancel_time: 0,
            transaction: payment.id.toString(),
            state: 1,
            reason: null,
          },
        };
      } else {
        return PayMeErrors.transactionDoesNotExist(id);
      }
    } catch (e) {
      throw e;
    }
  };

  getStatement = async (params: GetStatement) => {
    try {
      const { from, to } = params;

      const payments = await this.db.manyOrNone(`
        SELECT payment_sys_id                                    AS id,
               payment_sys_create_time                           AS time,
               amount * 100                                      as amount,
               id                                                AS payment_id,
               json_build_object('payment_id', id)               AS account,
               (extract(epoch from created_at) * 1000)::bigint   as create_time,
               (extract(epoch from performed_at) * 1000)::bigint as perform_time,
               0                                                 AS cancel_time,
               id                                                AS transaction,
               2                                                 AS state,
               NULL                                              AS reason
        FROM payments
        WHERE payment_service_id = 1
          AND payment_status_id = 2
          AND payment_sys_create_time BETWEEN $1 AND $2
      `, [from, to]);

      return {
        results: {
          transactions: payments,
        },
      };
    } catch (e) {
      throw e;
    }
  };
}