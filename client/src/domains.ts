function getLocation() {
  if (typeof window !== "undefined" && window.location) {
    return {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
    };
  }
  return { protocol: "http:", hostname: "localhost", port: "5173" };
}

/**
 * Detects if the given hostname is an app domain (e.g. app.todora.xyz or app.localhost).
 */
export function isAppDomain(hostname = getLocation().hostname): boolean {
  return hostname.startsWith("app.");
}

/**
 * Detects if the given hostname is the production landing domain (e.g. todora.xyz or www.todora.xyz).
 */
export function isProdLandingDomain(hostname = getLocation().hostname): boolean {
  return (
    hostname === "todora.xyz" ||
    hostname === "www.todora.xyz" ||
    (hostname.endsWith(".todora.xyz") && !hostname.startsWith("app."))
  );
}

/**
 * Detects if the given hostname is localhost or local loopback IP (development environment).
 */
export function isLocalhost(hostname = getLocation().hostname): boolean {
  return hostname.includes("localhost") || hostname.includes("127.0.0.1");
}

/**
 * Returns the absolute URL for a path on the application domain (app.todora.xyz in prod, app.localhost in dev).
 */
export function getAppUrl(path = "/"): string {
  const { protocol, hostname, port } = getLocation();
  if (isProdLandingDomain(hostname) || hostname.endsWith("todora.xyz")) {
    return `${protocol}//app.todora.xyz${path}`;
  }
  if (isLocalhost(hostname)) {
    const p = port ? `:${port}` : "";
    const baseHost = hostname.replace(/^app\./, "");
    return `${protocol}//app.${baseHost}${p}${path}`;
  }
  return path;
}

/**
 * Returns the absolute URL for a path on the landing/home domain (todora.xyz in prod, localhost in dev).
 */
export function getLandingUrl(path = "/"): string {
  const { protocol, hostname, port } = getLocation();
  if (hostname.endsWith("todora.xyz")) {
    return `${protocol}//todora.xyz${path}`;
  }
  if (isLocalhost(hostname)) {
    const p = port ? `:${port}` : "";
    const baseHost = hostname.replace(/^app\./, "");
    return `${protocol}//${baseHost}${p}${path}`;
  }
  return path;
}
