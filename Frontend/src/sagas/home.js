import { put, delay, takeLatest, call } from "redux-saga/effects";
import homeActions, { Types } from "../actions/home";
import {
  getPublicData,
  getVisitorsData,
  getAreaVisitorsData,
  getDurationsData,
  getAreaDurationsData,
  getParentVisitorsData,
  getParentDurationsData,
  getTrajectoryData,
  getOptinData,
  getTransitionsData,
  getLocations,
  getParents,
} from "../services/home";
import withLoader from "../utils/sagaUtils";

export function* getPublicDataRequest(action) {
  const { id, params } = action;

  while (true) {
    try {
      const response = yield call(getPublicData, id, params);
      yield put(homeActions.getPublicDataSuccess({ data: response.data }));
    } catch (err) {
      console.log(err, "error in saga getPublicDataRequest");
      yield put(homeActions.getPublicDataFailure());
    }

    // Wait for 10 minutes (in ms)
    yield delay(5 * 60 * 1000);
  }
}

function* fetchDataSaga(apiFunc, successAction, failureAction, action) {
  const { id, params } = action;
  try {
    const response = yield call(apiFunc, id, params);
    yield put(successAction({ data: response.data }));
  } catch (err) {
    console.error(err);
    yield put(failureAction());
  }
}

function* incrementCountAsync() {
  yield delay(500);
  yield put(homeActions.incrementCount());
}

export default function* homeWatcher() {
  yield takeLatest(
    Types.GET_PUBLIC_DATA_REQUEST,
    withLoader(getPublicDataRequest)
  );

  yield takeLatest(
    Types.GET_VISITOR_DATA_A_REQUEST,
    withLoader(function* (action) {
      yield* fetchDataSaga(
        getVisitorsData,
        homeActions.getVisitorDataASuccess,
        homeActions.getVisitorDataAFailure,
        action
      );
    })
  );

  yield takeLatest(
    Types.GET_AREA_VISITORS_DATA_REQUEST,
    withLoader(function* (action) {
      yield* fetchDataSaga(
        getAreaVisitorsData,
        homeActions.getAreaVisitorsDataSuccess,
        homeActions.getAreaVisitorsDataFailure,
        action
      );
    })
  );

  yield takeLatest(
    Types.GET_DURATIONS_DATA_REQUEST,
    withLoader(function* (action) {
      yield* fetchDataSaga(
        getDurationsData,
        homeActions.getDurationsDataSuccess,
        homeActions.getDurationsDataFailure,
        action
      );
    })
  );

  yield takeLatest(
    Types.GET_AREA_DURATIONS_DATA_REQUEST,
    withLoader(function* (action) {
      yield* fetchDataSaga(
        getAreaDurationsData,
        homeActions.getAreaDurationsDataSuccess,
        homeActions.getAreaDurationsDataFailure,
        action
      );
    })
  );

  yield takeLatest(
    Types.GET_PARENT_VISITORS_DATA_REQUEST,
    withLoader(function* (action) {
      yield* fetchDataSaga(
        getParentVisitorsData,
        homeActions.getParentVisitorsDataSuccess,
        homeActions.getParentVisitorsDataFailure,
        action
      );
    })
  );

  yield takeLatest(
    Types.GET_PARENT_DURATIONS_DATA_REQUEST,
    withLoader(function* (action) {
      yield* fetchDataSaga(
        getParentDurationsData,
        homeActions.getParentDurationsDataSuccess,
        homeActions.getParentDurationsDataFailure,
        action
      );
    })
  );

  yield takeLatest(
    Types.GET_TRAJECTORY_DATA_REQUEST,
    withLoader(function* (action) {
      yield* fetchDataSaga(
        getTrajectoryData,
        homeActions.getTrajectoryDataSuccess,
        homeActions.getTrajectoryDataFailure,
        action
      );
    })
  );

  yield takeLatest(
    Types.GET_OPTION_DATA_REQUEST,
    withLoader(function* (action) {
      yield* fetchDataSaga(
        getOptinData,
        homeActions.getOptionDataSuccess,
        homeActions.getOptionDataFailure,
        action
      );
    })
  );

  yield takeLatest(
    Types.GET_TRANSITIONS_DATA_REQUEST,
    withLoader(function* (action) {
      yield* fetchDataSaga(
        getTransitionsData,
        homeActions.getTransitionsDataSuccess,
        homeActions.getTransitionsDataFailure,
        action
      );
    })
  );

  yield takeLatest(
    Types.GET_LOCATIONS_REQUEST,
    withLoader(function* (action) {
      yield* fetchDataSaga(
        getLocations,
        homeActions.getLocationsSuccess,
        homeActions.getLocationsFailure,
        action
      );
    })
  );

  yield takeLatest(
    Types.GET_PARENTS_REQUEST,
    withLoader(function* (action) {
      yield* fetchDataSaga(
        getParents,
        homeActions.getParentsSuccess,
        homeActions.getParentsFailure,
        action
      );
    })
  );

  yield takeLatest(Types.INCREMENT_COUNT_ASYNC, incrementCountAsync);
}
