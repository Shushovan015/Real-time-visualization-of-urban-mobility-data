import { createReducer } from "reduxsauce";
import { Types } from "../actions/home";

const initialState = {
  count: 0,
  publicData: {},
  visitorsData: {},
  areaVisitorsData: {},
  durationsData: {},
  areaDurationsData: {},
  parentVisitorsData: {},
  parentDurationsData: {},
  trajectoryData: {},
  passersbyData: {},
  optinData: {},
  transitionsData: {},
  locations: [],
  locationAreas: {},
  parents: {},
  boundingBoxes: [],
  locationAreaById: {},
  dataAvailability: {},
  transitionsHeatmap: {},
};

const getPublicDataSuccess = (state, action) => {
  const {
    payload: { data },
  } = action;
  const latestData = data[data.length - 1];
  console.log(latestData, "reducer");
  return {
    ...state,
    publicData: latestData,
  };
};

const getDataSuccess = (field) => (state, action) => {
  return {
    ...state,
    [field]: action.payload.data,
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
  [Types.GET_VISITOR_DATA_A_SUCCESS]: getDataSuccess("visitorsData"),
  [Types.GET_AREA_VISITORS_DATA_SUCCESS]: getDataSuccess("areaVisitorsData"),
  [Types.GET_DURATIONS_DATA_SUCCESS]: getDataSuccess("durationsData"),
  [Types.GET_AREA_DURATIONS_DATA_SUCCESS]: getDataSuccess("areaDurationsData"),
  [Types.GET_PARENT_VISITORS_DATA_SUCCESS]:
    getDataSuccess("parentVisitorsData"),
  [Types.GET_PARENT_DURATIONS_DATA_SUCCESS]: getDataSuccess(
    "parentDurationsData"
  ),
  [Types.GET_TRAJECTORY_DATA_SUCCESS]: getDataSuccess("trajectoryData"),
  [Types.GET_OPTION_DATA_SUCCESS]: getDataSuccess("optinData"),
  [Types.GET_TRANSITIONS_DATA_SUCCESS]: getDataSuccess("transitionsData"),
  [Types.INCREMENT_COUNT]: incrementCount,
  [Types.GET_LOCATIONS_SUCCESS]: getDataSuccess("locations"),
  [Types.GET_PARENTS_SUCCESS]: getDataSuccess("parents"),
});

export default homeReducer;
