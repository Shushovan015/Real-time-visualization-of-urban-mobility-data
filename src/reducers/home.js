import { createReducer } from "reduxsauce";
import { Types } from "../actions/home";

const initialState = {
  count: 0,
  publicData: {},
};

const getPublicDataSuccess = (state, action) => {
  const {
    payload: { data },
  } = action;

  return {
    ...state,
    publicData: data,
  };
};
const incrementCount = (state = initialState) => {
  return {
    ...state,
    count: state.count + 1,
  };
};

const homeReducer = createReducer(initialState, {
  [Types.GET_PUBLIC_DATA_SUCCESS]: getPublicDataSuccess,
  [Types.INCREMENT_COUNT]: incrementCount,
});

export default homeReducer;
