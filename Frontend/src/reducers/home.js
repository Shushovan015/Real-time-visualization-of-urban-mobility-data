import { createReducer } from "reduxsauce";
import { Types } from "../actions/home";

const initialState = {
  publicData: {},
  allHourlyHistoryData: {},
  hourlyHistoryData: {},
  getPerMinuteData: {},
  pastData: {},
  placesData: {},
  historyByPlace: {},
  preferences: { likesLively: false },
  userLocation: null,
  nowNextData:{},
};

const MAX_POINTS = 12; 

const getPublicDataSuccess = (state, action) => {
  const data = action?.payload?.data || null;
  const now = Date.now();

  const next = {
    ...state,
    publicData: data,
    historyByPlace: { ...(state.historyByPlace || {}) }, 
  };

  const rows = Array.isArray(data?.data) ? data.data : [];
  for (const r of rows) {
    const key = String(r.location || r.placeId || r.name || "").toLowerCase();
    const arr = next.historyByPlace[key] ? [...next.historyByPlace[key]] : [];
    arr.push({ t: now, visitors: Number(r.visitors) || 0 });
    if (arr.length > MAX_POINTS) arr.shift();
    next.historyByPlace[key] = arr;
  }

  return next;
};

const getPastDataSuccess = (state, action) => {
  const {
    payload: { data },
  } = action;
  return {
    ...state,
    pastData: data,
  };
};

const getPlacesDataSuccess = (state, action) => {
  const {
    payload: { data },
  } = action;

  return {
    ...state,
    placesData: data,
  };
};

const getPublicDataPerMinuteSuccess = (state, action) => {
  const {
    payload: { data },
  } = action;
  return {
    ...state,
    publicDataPerMinute: data,
  };
};

const getAllHourlyHistoryDataSuccess = (state, action) => {
  const {
    payload: { data },
  } = action;
  return {
    ...state,
    allHourlyHistoryData: data,
  };
};

const getNowNextDataSuccess = (state, action) => {
  const {
    payload: { data },
  } = action;
  return {
    ...state,
    nowNextData: data,
  };
};

const storeUserLocation = (state, action) => {
  const { payload } = action;
  return {
    ...state,
    userLocation: payload,
  };
};

const getDataSuccess = (field) => (state, action) => {
  const rawData = action.payload.data;

  const grouped = {};
  rawData.forEach((entry) => {
    const { year, month, day, hour } = entry._id;
    const dateStr = `${year}-${month}-${day}`;
    if (!grouped[dateStr]) grouped[dateStr] = [];
    grouped[dateStr].push({ hour, visitors: entry.visitors });
  });

  return {
    ...state,
    [field]: Object.entries(grouped), 
  };
};

const homeReducer = createReducer(initialState, {
  [Types.GET_PUBLIC_DATA_SUCCESS]: getPublicDataSuccess,
  [Types.GET_PAST_DATA_SUCCESS]: getPastDataSuccess,
  [Types.GET_PLACES_DATA_SUCCESS]: getPlacesDataSuccess,
  [Types.GET_NOW_NEXT_DATA_SUCCESS]: getNowNextDataSuccess,
  [Types.GET_HOURLY_HISTORY_DATA_SUCCESS]: getDataSuccess("hourlyHistoryData"),
  [Types.GET_ALL_HOURLY_HISTORY_DATA_SUCCESS]: getAllHourlyHistoryDataSuccess,
  [Types.GET_PUBLIC_DATA_PER_MINUTE_SUCCESS]: getPublicDataPerMinuteSuccess,
  [Types.STORE_USER_LOCATION]: storeUserLocation,
});

export default homeReducer;
