import { createReducer } from "reduxsauce";
import { Types } from "../actions/loader.actions";

const initialState = {
  loader: {
    actions: [],
    refreshing: [],
  },
};

const startAction = (state, { payload }) => ({
  ...state,
  loader: {
    ...state.loader,
    actions: [...state.loader.actions, payload.action],
  },
});
const stopAction = (state, { payload }) => ({
  ...state,
  loader: {
    ...state.loader,
    actions: state.loader.actions.filter(
      (action) => action.name !== payload.name
    ),
  },
});
const refreshActionStart = (state, { payload }) => ({
  ...state,
  loader: {
    ...state.loader,
    refreshing: [...state.loader.refreshing, payload.refreshAction],
  },
});
const refreshActionStop = (state, { payload }) => ({
  ...state,
  loader: {
    ...state.loader,
    refreshing: state.loader.refreshing.filter(
      (refresh) => refresh !== payload.refreshAction
    ),
  },
});

const loaderReducer = createReducer(initialState, {
  [Types.START_ACTION]: startAction,
  [Types.STOP_ACTION]: stopAction,
  [Types.REFRESH_ACTION_START]: refreshActionStart,
  [Types.REFRESH_ACTION_STOP]: refreshActionStop,
});
export default loaderReducer;
