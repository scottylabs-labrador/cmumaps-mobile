export const sessionScreen = ({
  hasSession,
  pending,
  failed,
  forcedSignedOut,
}: {
  hasSession: boolean;
  pending: boolean;
  failed: boolean;
  forcedSignedOut: boolean;
}) => {
  if (forcedSignedOut) return "welcome";
  if (hasSession) return "map";
  if (pending) return "loading";
  if (failed) return "retry";
  return "welcome";
};

export const signInReturnPath = (
  pathname: string,
  params: Record<string, string | string[] | undefined>,
) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "path" || value === undefined) continue;
    for (const entry of Array.isArray(value) ? value : [value]) query.append(key, entry);
  }
  return `${pathname}${query.size ? `?${query}` : ""}`;
};
