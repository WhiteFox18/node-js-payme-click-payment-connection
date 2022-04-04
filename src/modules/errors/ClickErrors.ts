const ClickErrors = {
  signCheckFailed: () => ({
    error: -1,
    error_note: "SIGN CHECK FAILED!",
  }),
  invalidPaymentAmount: () => ({
    error: -2,
    error_note: "Incorrect parameter amount",
  }),
  actionNotFound: () => ({
    error: -3,
    error_note: "Action not found",
  }),
  alreadyPaid: () => ({
    error: -4,
    error_note: "Already paid",
  }),
  userOrPaymentNotFound: () => ({
    error: -5,
    error_note: "User does not exist",
  }),
  transactionDoesNotExist: () => ({
    error: -6,
    error_note: "Transaction does not exist",
  }),
  badRequest: () => ({
    error: -8,
    error_note: "Error in request from click",
  }),
  transactionCancelled: () => ({
    error: -9,
    error_note: "Transaction cancelled",
  }),
};

export default ClickErrors;