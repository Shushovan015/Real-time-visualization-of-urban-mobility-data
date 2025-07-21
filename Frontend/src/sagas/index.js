import { all } from 'redux-saga/effects';
import homeWatcher from './home';

export default function* rootSaga() {
  yield all([
    homeWatcher(),
  ]);
}
