import { put } from "redux-saga/effects";
import loaderActions from "../actions/loader.actions";

/**
 *
 * Wrapper function for reducing loader action boilerplate in saga.
 *
 * @param {function} fn - worker saga function
 *
 * @returns {function} function that handles loader action start and stop.
 *
 * @example
 * function loginWatcher() {
 *   yield takeLatest(Types.LOGIN_REQUEST, withLoader(loginRequest));
 * }
 */
export default function withLoader(func) {
  return function* loaderActionWrappper(action) {
    try {
      yield put(
        loaderActions.startAction({
          action: {
            name: action.type,
            params: action.params || action.payload || "",
          },
        })
      );
      yield func(action);
    } catch (err) {
      console.log(err);
    } finally {
      yield put(
        loaderActions.stopAction({
          name: action.type,
        })
      );
    }
  };
}
