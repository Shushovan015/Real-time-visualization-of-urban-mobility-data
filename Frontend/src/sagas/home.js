import { put, delay, takeLatest, call } from "redux-saga/effects";
import homeActions, { Types } from "../actions/home";
import {
  getPublicData,
  getHourlyHistoryData,
  getAllHourlyHistoryData,
  getPublicDataPerMinute,
  getPastData,
  getPlacesData,
  getNowNextData,
  // getAreaVisitorsData,
  // getDurationsData,
  // getAreaDurationsData,
  // getParentVisitorsData,
  // getParentDurationsData,
  // getTrajectoryData,
  // getOptinData,
  // getTransitionsData,
  // getLocations,
  // getParents,
} from "../services/home";
import { enrichCrowdData } from "../utils/common";
import withLoader from "../utils/sagaUtils";

export function* getPublicDataRequest(action) {
  const { id, params } = action;
  while (true) {
    try {
      const response = yield call(getPublicData, id, params);
      // const latestData = response.data[response.data.length - 1];
      const enriched = enrichCrowdData(response.data);
      yield put(homeActions.getPublicDataSuccess({ data: enriched }));
    } catch (err) {
      console.log(err, "error in saga pollPublicData");
      yield put(homeActions.getPublicDataFailure());
    }

    yield delay(1 * 60 * 1000);
  }
}

export function* getPastDataRequest(action) {
  const { id, params } = action;
  while (true) {
    try {
      const response = yield call(getPastData, id, params);
      const enriched = enrichCrowdData(response.data);

      // const latestData = response.data[response.data.length - 1];
      yield put(homeActions.getPastDataSuccess({ data: enriched }));
    } catch (err) {
      console.log(err, "error in saga pollPastData");
      yield put(homeActions.getPastDataFailure());
    }

    yield delay(30 * 60 * 1000);
  }
}

export function* getPublicDataPerMinuteRequest(action) {
  const { params } = action;
  try {
    const response = yield call(getPublicDataPerMinute, params);

    const enriched = enrichCrowdData(response.data[0]);

    yield put(homeActions.getPublicDataPerMinuteSuccess({ data: enriched }));
  } catch (err) {
    console.log(err, "error in saga getPublicDataPerMinuteRequest");
    yield put(homeActions.getPublicDataPerMinuteFailure());
  }
}

export function* getPlacesDataRequest(action) {
  const { params } = action;
  try {
    const response = yield call(getPlacesData, params);
    yield put(homeActions.getPlacesDataSuccess({ data: response.data }));
  } catch (err) {
    console.log(err, "error in saga getPlacesDataRequest");
    yield put(homeActions.getPlacesDataFailure());
  }
}

export function* getAllHourlyHistoryDataRequest(action) {
  const { params } = action;
  try {
    const response = yield call(getAllHourlyHistoryData, params);
    yield put(
      homeActions.getAllHourlyHistoryDataSuccess({ data: response.data })
    );
  } catch (err) {
    console.log(err, "error in saga getAllHourlyHistoryDataRequest");
    yield put(homeActions.getAllHourlyHistoryDataFailure());
  }
}

export function* getHourlyHistoryDataRequest(action) {
  const { params } = action;
  try {
    const response = yield call(getHourlyHistoryData, params);
    yield put(homeActions.getHourlyHistoryDataSuccess({ data: response.data }));
  } catch (err) {
    console.log(err, "error in saga getHourlyHistoryDataRequest");
    yield put(homeActions.getHourlyHistoryDataFailure());
  }
}

export function* getNowNextDataRequest(action) {
  const { params } = action;
  try {
    const response = yield call(getNowNextData, params);
    yield put(homeActions.getNowNextDataSuccess({ data: response.data }));
  } catch (err) {
    console.log(err, "error in saga getNowNextDataRequest");
    yield put(homeActions.getNowNextDataFailure());
  }
}

// function* fetchDataSaga(apiFunc, successAction, failureAction, action) {
//   const { id, params } = action;
//   try {
//     const response = yield call(apiFunc, id, params);
//     yield put(successAction({ data: response.data }));
//   } catch (err) {
//     console.error(err);
//     yield put(failureAction());
//   }
// }

// function* incrementCountAsync() {
//   yield delay(500);
//   yield put(homeActions.incrementCount());
// }

export default function* homeWatcher() {
  yield takeLatest(
    Types.GET_PUBLIC_DATA_REQUEST,
    withLoader(getPublicDataRequest)
  );
  yield takeLatest(Types.GET_PAST_DATA_REQUEST, withLoader(getPastDataRequest));
  yield takeLatest(
    Types.GET_PLACES_DATA_REQUEST,
    withLoader(getPlacesDataRequest)
  );
  yield takeLatest(
    Types.GET_PUBLIC_DATA_PER_MINUTE_REQUEST,
    withLoader(getPublicDataPerMinuteRequest)
  );
  yield takeLatest(
    Types.GET_ALL_HOURLY_HISTORY_DATA_REQUEST,
    withLoader(getAllHourlyHistoryDataRequest)
  );
  yield takeLatest(
    Types.GET_NOW_NEXT_DATA_REQUEST,
    withLoader(getNowNextDataRequest)
  );
  yield takeLatest(
    Types.GET_HOURLY_HISTORY_DATA_REQUEST,
    withLoader(getHourlyHistoryDataRequest)
  );

  // yield takeLatest(
  //   Types.GET_AREA_VISITORS_DATA_REQUEST,
  //   withLoader(function* (action) {
  //     yield* fetchDataSaga(
  //       getAreaVisitorsData,
  //       homeActions.getAreaVisitorsDataSuccess,
  //       homeActions.getAreaVisitorsDataFailure,
  //       action
  //     );
  //   })
  // );

  // yield takeLatest(
  //   Types.GET_DURATIONS_DATA_REQUEST,
  //   withLoader(function* (action) {
  //     yield* fetchDataSaga(
  //       getDurationsData,
  //       homeActions.getDurationsDataSuccess,
  //       homeActions.getDurationsDataFailure,
  //       action
  //     );
  //   })
  // );

  // yield takeLatest(
  //   Types.GET_AREA_DURATIONS_DATA_REQUEST,
  //   withLoader(function* (action) {
  //     yield* fetchDataSaga(
  //       getAreaDurationsData,
  //       homeActions.getAreaDurationsDataSuccess,
  //       homeActions.getAreaDurationsDataFailure,
  //       action
  //     );
  //   })
  // );

  // yield takeLatest(
  //   Types.GET_PARENT_VISITORS_DATA_REQUEST,
  //   withLoader(function* (action) {
  //     yield* fetchDataSaga(
  //       getParentVisitorsData,
  //       homeActions.getParentVisitorsDataSuccess,
  //       homeActions.getParentVisitorsDataFailure,
  //       action
  //     );
  //   })
  // );

  // yield takeLatest(
  //   Types.GET_PARENT_DURATIONS_DATA_REQUEST,
  //   withLoader(function* (action) {
  //     yield* fetchDataSaga(
  //       getParentDurationsData,
  //       homeActions.getParentDurationsDataSuccess,
  //       homeActions.getParentDurationsDataFailure,
  //       action
  //     );
  //   })
  // );

  // yield takeLatest(
  //   Types.GET_TRAJECTORY_DATA_REQUEST,
  //   withLoader(function* (action) {
  //     yield* fetchDataSaga(
  //       getTrajectoryData,
  //       homeActions.getTrajectoryDataSuccess,
  //       homeActions.getTrajectoryDataFailure,
  //       action
  //     );
  //   })
  // );

  // yield takeLatest(
  //   Types.GET_OPTION_DATA_REQUEST,
  //   withLoader(function* (action) {
  //     yield* fetchDataSaga(
  //       getOptinData,
  //       homeActions.getOptionDataSuccess,
  //       homeActions.getOptionDataFailure,
  //       action
  //     );
  //   })
  // );

  // yield takeLatest(
  //   Types.GET_TRANSITIONS_DATA_REQUEST,
  //   withLoader(function* (action) {
  //     yield* fetchDataSaga(
  //       getTransitionsData,
  //       homeActions.getTransitionsDataSuccess,
  //       homeActions.getTransitionsDataFailure,
  //       action
  //     );
  //   })
  // );

  // yield takeLatest(
  //   Types.GET_LOCATIONS_REQUEST,
  //   withLoader(function* (action) {
  //     yield* fetchDataSaga(
  //       getLocations,
  //       homeActions.getLocationsSuccess,
  //       homeActions.getLocationsFailure,
  //       action
  //     );
  //   })
  // );

  // yield takeLatest(
  //   Types.GET_PARENTS_REQUEST,
  //   withLoader(function* (action) {
  //     yield* fetchDataSaga(
  //       getParents,
  //       homeActions.getParentsSuccess,
  //       homeActions.getParentsFailure,
  //       action
  //     );
  //   })
  // );

  // yield takeLatest(Types.INCREMENT_COUNT_ASYNC, incrementCountAsync);
}
