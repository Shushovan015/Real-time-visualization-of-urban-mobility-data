import { applyMiddleware, compose, legacy_createStore as createStore } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { persistStore } from 'redux-persist';
import reducers from './reducers';
import rootSaga from './sagas';

const initialState = {};

const sagaMiddleware = createSagaMiddleware();

const ENV = import.meta.env.NODE_ENV;
let composeEnhancers = compose;

if (ENV !== 'production' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
  composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
}

const store = createStore(
  reducers,
  initialState,
  composeEnhancers(applyMiddleware(sagaMiddleware))
);

sagaMiddleware.run(rootSaga);

if (import.meta.hot) {
  import.meta.hot.accept('./reducers', (mod) => {
    if (mod?.default) {
      store.replaceReducer(mod.default);
    }
  });
}


const persistor = persistStore(store);

export { store, persistor };
