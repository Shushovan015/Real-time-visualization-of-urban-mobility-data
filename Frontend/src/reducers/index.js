import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { combineReducers } from "redux";
import homeReducer from "./home";
import toastReducer from "./toast";
import loaderReducer from "./loader.reducer";

const persistConfig = {
  key: "root",
  storage,
};

const rootReducer = combineReducers({
  home: homeReducer,
  toast: toastReducer,
  loader: loaderReducer,
});

export default persistReducer(persistConfig, rootReducer);
