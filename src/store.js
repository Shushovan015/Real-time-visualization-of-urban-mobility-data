import { applyMiddleware, compose, legacy_createStore as createStore } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { persistStore } from 'redux-persist';
import reducers from './reducers';
import rootSaga from './sagas';

// Initial state (empty)
const initialState = {};

// Create saga middleware
const sagaMiddleware = createSagaMiddleware();

// Setup Redux DevTools if available in development
const ENV = import.meta.env.NODE_ENV;
let composeEnhancers = compose;

if (ENV !== 'production' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
  composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
}

// Create the Redux store with middleware
const store = createStore(
  reducers,
  initialState,
  composeEnhancers(applyMiddleware(sagaMiddleware))
);

// Run root saga
sagaMiddleware.run(rootSaga);

// Enable hot reloading of reducers
if (import.meta.hot) {
  import.meta.hot.accept('./reducers', (mod) => {
    if (mod?.default) {
      store.replaceReducer(mod.default);
    }
  });
}


// Setup persistence
const persistor = persistStore(store);

// Export both
export { store, persistor };
