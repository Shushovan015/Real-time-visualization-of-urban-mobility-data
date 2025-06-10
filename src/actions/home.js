import { createActions } from "reduxsauce";

export const { Types, Creators } = createActions({
  getPublicDataRequest: ["id", "params"],
  getPublicDataSuccess: ["payload"],
  getPublicDataFailure: null,

  incrementCount: null, // your increment action
  incrementCountAsync: null, // the async action your saga listens for
});

export default Creators;
