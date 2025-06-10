import { createSelector } from 'reselect';

const loaderSelector = (state) => state.loader;

export const loadingSelector = (actions) => {
  return createSelector(loaderSelector, (loader) =>
    loader?.loader.actions.some((action) => actions.includes(action.name)),
  );
};
export const checkIfRefreshing = (store, actionToCheck) =>
  store?.loader.loader.refreshing.some((action) => action === actionToCheck);
