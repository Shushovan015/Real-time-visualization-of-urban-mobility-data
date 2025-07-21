import { createActions } from "reduxsauce";

export const { Types, Creators } = createActions({
  getPublicDataRequest: ["id", "params"],
  getPublicDataSuccess: ["payload"],
  getPublicDataFailure: null,

  getVisitorDataARequest: ["id", "params"],
  getVisitorDataASuccess: ["payload"],
  getVisitorDataAFailure: null,

  getAreaVisitorsDataRequest: ["id", "params"],
  getAreaVisitorsDataSuccess: ["payload"],
  getAreaVisitorsDataFailure: null,

  getDurationsDataRequest: ["id", "params"],
  getDurationsDataSuccess: ["payload"],
  getDurationsDataFailure: null,

  getAreaDurationsDataRequest: ["id", "params"],
  getAreaDurationsDataSuccess: ["payload"],
  getAreaDurationsDataFailure: null,

  getParentVisitorsDataRequest: ["id", "params"],
  getParentVisitorsDataSuccess: ["payload"],
  getParentVisitorsDataFailure: null,

  getParentDurationsDataRequest: ["id", "params"],
  getParentDurationsDataSuccess: ["payload"],
  getParentDurationsDataFailure: null,

  getTrajectoryDataRequest: ["id", "params"],
  getTrajectoryDataSuccess: ["payload"],
  getTrajectoryDataFailure: null,

  getOptionDataRequest: ["id", "params"],
  getOptionDataSuccess: ["payload"],
  getOptionDataFailure: null,

  getTransitionsDataRequest: ["id", "params"],
  getTransitionsDataSuccess: ["payload"],
  getTransitionsDataFailure: null,

  getLocationsRequest: ["params"],
  getLocationsSuccess: ["payload"],
  getLocationsFailure: null,

  getParentsRequest: ["id", "params"],
  getParentsSuccess: ["payload"],
  getParentsFailure: null,

  incrementCount: null, // your increment action
  incrementCountAsync: null, // the async action your saga listens for
});

export default Creators;
