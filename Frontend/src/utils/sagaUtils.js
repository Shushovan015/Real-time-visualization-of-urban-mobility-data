import { put } from "redux-saga/effects";
import loaderActions from "../actions/loader.actions";


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
