import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const REFRESH_DELAYS_MS = [0, 700, 2000, 4500];

/**
 * Device calendar providers may finish syncing shortly after the app returns
 * to the foreground. Recheck a few times so the UI does not stay one sync
 * behind after the user edits an event in another calendar app.
 */
export function useForegroundRefresh(refresh: () => void): void {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    let previousState: AppStateStatus = AppState.currentState;
    let timers: ReturnType<typeof setTimeout>[] = [];

    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function scheduleRefreshes() {
      clearTimers();
      timers = REFRESH_DELAYS_MS.map(delay => setTimeout(() => {
        if (AppState.currentState === 'active') {
          refreshRef.current();
        }
      }, delay));
    }

    const subscription = AppState.addEventListener('change', nextState => {
      const returnedToForeground =
        nextState === 'active' &&
        (previousState === 'background' || previousState === 'inactive');

      if (returnedToForeground) {
        scheduleRefreshes();
      } else if (nextState !== 'active') {
        clearTimers();
      }
      previousState = nextState;
    });

    return () => {
      clearTimers();
      subscription.remove();
    };
  }, []);
}
