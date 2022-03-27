import { Database, DatabaseClient, ServiceProps } from "../types";
import PayMeErrors from "../modules/errors/PayMeErrors";
import PayMeModel from "./models/PayMeModel";
import db from "../db";

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

interface CheckTransaction {
  id: string;
}

export default class PayMeService {
  private db: Database = null;
  private pg: DatabaseClient = null;

  constructor(props: ServiceProps) {
    this.db = props.db;
    this.pg = props.pg;
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
      }

      return {
        result: {
          allow: true,
        },
      };
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

      if (payment.payment_status_id == 2 || payment.timely_status === "expired") {
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

      return {
        result: {
          state: 1,
          transaction: payment.id.toString(),
          create_time: parseInt(payment.created_at),
        },
      };
    } catch (e) {
      throw e;
    }
  };

  performTransaction =  async (params: PerformTransaction) => {
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

      if(!payment) {
        return PayMeErrors.transactionDoesNotExist(id)
      }

      if(payment.payment_status_id == 3 || payment.timely_status === "expired") {
        return PayMeErrors.irrelevantTransactionStatus(id)
      }

      if (payment.payment_status_id == 1 && payment.timely_status === "pending") {
        const result = await this.db.one(`
          UPDATE payments
          SET payment_status_id = 2,
              performed_at      = now()
          WHERE payment_service_id = 1
            AND payment_sys_id = $1
          RETURNING (extract(epoch from performed_at) * 1000)::bigint as perform_time
        `, [id]);

        return {
          result: {
            state: 2,
            transaction: payment.id.toString(),
            perform_time: parseInt(result.perform_time),
          },
        };
      } else if (payment.payment_status_id == 2) {
        return {
          result: {
            state: 2,
            transaction: payment.id.toString(),
            perform_time: parseInt(payment.perform_time),
          },
        };
      } else {

      }
    } catch (e) {
      throw e;
    }
  }
}