import { put, delay, takeLatest, call } from "redux-saga/effects";
import homeActions, { Types } from "../actions/home";
import { getPublicData } from "../services/home";
import withLoader from "../utils/sagaUtils";

export function* getPublicDataRequest(action) {
  const { id, params } = action;
  try {
    const response = yield call(getPublicData, id, params);
    yield put(homeActions.getPublicDataSuccess({ data: response.data }));
  } catch (err) {
    console.log(err, "error in saga getPublicDataRequest");
    yield put(homeActions.getPublicDataFailure());
  }
}

function* incrementCountAsync() {
  // Simulate delay (like a fake API call)
  yield delay(500);
  yield put(homeActions.incrementCount());
}

export default function* homeWatcher() {
  yield takeLatest(
    Types.GET_PUBLIC_DATA_REQUEST,
    withLoader(getPublicDataRequest)
  );
  yield takeLatest(Types.INCREMENT_COUNT_ASYNC, incrementCountAsync);
}
