type SessionEvent = "signed-out" | "unauthorized";
const listeners = new Set<(event: SessionEvent) => void>();

export const notifySession = (event: SessionEvent) => {
  for (const listener of listeners) listener(event);
};

export const subscribeSession = (listener: (event: SessionEvent) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
