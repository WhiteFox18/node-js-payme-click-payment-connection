const PayMeErrors = {
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
  cannotBeCancelled: (payment_id: number | string) => ({
    id: payment_id,
    error: {
      code: -31007,
      message: "The order has been completed. It is not possible to cancel the transaction.",
    },
  }),
  irrelevantTransactionStatus: (payment_id: number | string) => ({
    id: payment_id,
    error: {
      code: -31008,
      message: "Irrelevant transaction status",
    },
  }),
  irrelevantPayment: (payment_id: number | string) => ({
    id: payment_id,
    error: {
      code: -31050,
      message: "Irrelevant payment",
    },
  }),
  serverError: () => ({
    error: {
      code: -32400,
      message: "Server error.",
    },
  }),
  notEnoughPrivileges: () => ({
    error: {
      code: -32504,
      message: "Not enough privileges to execute the method.",
    },
  }),
  actionNotFound: () => ({
    error: {
      code: -32601,
      message: "Action not found.",
    },
  }),
};

export default PayMeErrors;
