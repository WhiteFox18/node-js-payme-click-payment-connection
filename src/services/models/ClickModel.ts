interface PrepareSuccessReturn {
  click_trans_id: bigint;
  merchant_trans_id: bigint;
  merchant_prepare_id: bigint;
}

interface CompleteSuccessReturn {
  click_trans_id: bigint;
  merchant_trans_id: bigint;
  merchant_confirm_id: bigint;
}

const ClickModel = {
  prepareSuccessReturn: (data: PrepareSuccessReturn) => ({
    ...data,
    error: 0,
    error_note: "Success",
  }),
  completeSuccessReturn: (data: CompleteSuccessReturn) => ({
    ...data,
    error: 0,
    error_note: "Success",
  }),
};

export default ClickModel;