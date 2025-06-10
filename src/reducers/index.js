import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { combineReducers } from "redux";
import homeReducer from "./home";
import toastReducer from "./toast";
// import other reducers...

const persistConfig = {
  key: "root",
  storage,
};

const rootReducer = combineReducers({
  home: homeReducer,
  toast: toastReducer,
  // other reducers...
});

export default persistReducer(persistConfig, rootReducer);
