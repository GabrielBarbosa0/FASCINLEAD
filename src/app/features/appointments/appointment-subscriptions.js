function startLiveSubscription({ subscribe, args, onData, onError }) {
  let active = true;
  let unsubscribe = null;
  try {
    unsubscribe = subscribe(...args, (result) => { if (active) onData(result); }, (error) => { if (active) onError(error); });
  } catch (error) {
    onError(error);
  }
  return () => { active = false; unsubscribe?.(); };
}

export function startAppointmentsLiveSubscription(options) {
  return startLiveSubscription({ subscribe: options.subscribe, args: [options.profile, options.month, options.storeId], onData: options.onData, onError: options.onError });
}

export function startConfirmationsLiveSubscription(options) {
  return startLiveSubscription({ subscribe: options.subscribe, args: [options.profile, options.startDate, options.endDate], onData: options.onData, onError: options.onError });
}
