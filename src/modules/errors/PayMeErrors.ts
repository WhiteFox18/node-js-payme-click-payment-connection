const PayMeErrors = {
  irrelevantPayment: (payment_id: number | string) => ({
    id: payment_id,
    error: {
      code: -31050,
      message: "Irrelevant payment",
    },
  }),
  invalidPaymentAmount: (payment_id: number | string) => ({
    id: payment_id,
    error: {
      code: -31001,
      message: "Invalid payment amount",
    },
  }),
  transactionDoesNotExist: (payment_id: number | string) => ({
    id: payment_id,
    error: {
      code: -31003,
      message: "Transaction does not exist",
    },
  }),
  irrelevantTransactionStatus: (payment_id: number | string) => ({
    id: payment_id,
    error: {
      code: -31008,
      message: "Irrelevant transaction status",
    },
  }),
};

export default PayMeErrors;