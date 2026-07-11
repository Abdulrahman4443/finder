import { useEffect, useState } from "react";

export function useIsClient() {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  return ok;
}
