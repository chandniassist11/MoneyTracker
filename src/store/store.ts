import { configureStore } from '@reduxjs/toolkit';
import financeReducer from './financeSlice';

export const store = configureStore({
  reducer: {
    finance: financeReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // Necessary for SQLite/AsyncStorage data handling
    })
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
