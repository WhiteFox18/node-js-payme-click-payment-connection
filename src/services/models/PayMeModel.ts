import db from "../../db";

interface GetPayment {
  id: number;
  payment_status_id: number;
  payment_service_id: number;
}

interface PerformTransactionReturnObject {
  id: number | string;
  perform_time: bigint;
}

interface CreateTransactionReturnObject {
  id: number | string;
  created_at: Date;
}

interface CancelTransactionReturnObject {
  id: number | string;
  state: number;
  cancel_time: bigint;
}

const PayMeModel = {
  checkPerformTransactionReturnObject: () => ({
    result: {
      allow: true,
    },
  }),
  createTransactionReturnObject: (data: CreateTransactionReturnObject) => ({
    result: {
      state: 1,
      transaction: data.id.toString(),
      create_time: parseInt(data.created_at.toString()),
    },
  }),
  performTransactionReturnObject: (data: PerformTransactionReturnObject) => ({
    result: {
      state: 2,
      transaction: data.id.toString(),
      perform_time: data.perform_time,
    },
  }),
  cancelTransactionReturnObject: (data: CancelTransactionReturnObject) => ({
    result : {
      state : data.state,
      transaction : data.id,
      cancel_time : data.cancel_time,
    }
  }),
  cancelTransaction: async (payment_sys_id: string): Promise<{cancel_time: bigint}> => {
    try {
      return await db.one(`
        UPDATE payments
        SET payment_status_id = 3,
            performed_at = now()
        WHERE payment_sys_id = $1
          AND payment_service_id = 1
        RETURNING (extract(epoch from performed_at) * 1000)::bigint as cancel_time
      `, [payment_sys_id]);
    } catch (e) {
      throw e;
    }
  },
};

export default PayMeModel;