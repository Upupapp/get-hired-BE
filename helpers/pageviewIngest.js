/**
 * Public pageview ingest validation.
 * Stores a pathname, an optional referrer host, an optional opaque session
 * UUID, and an authenticated boolean. Never accepts IP, user agent, uid,
 * email, or query strings.
 *
 * ESM-safe: no optional chaining and no nullish coalescing.
 */

var MAX_PATH_LENGTH = 512;
var MAX_RAW_LENGTH = 2048;
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

var ALLOWED_ORIGINS = {
  "https://gethiredonline.app": true,
  "https://www.gethiredonline.app": true,
  "http://127.0.0.1:4200": true,
  "http://localhost:4200": true,
};

function header(req, name) {
  var headers = req && req.headers;
  if (!headers) return "";
  var value = headers[name];
  if (value === undefined || value === null || value === "") value = headers[String(name).toLowerCase()];
  if (Array.isArray(value)) value = value[0];
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function originFromUrl(value) {
  if (!value) return "";
  try {
    var url = new URL(String(value));
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.protocol + "//" + url.host.toLowerCase();
  } catch (error) {
    return "";
  }
}

function isAllowedPageviewOrigin(origin) {
  var normalized = originFromUrl(origin);
  return !!(normalized && ALLOWED_ORIGINS[normalized]);
}

function requestOriginAllowed(req) {
  var origin = header(req, "origin");
  if (origin && isAllowedPageviewOrigin(origin)) return true;
  var referer = header(req, "referer");
  if (!referer) referer = header(req, "referrer");
  if (referer && isAllowedPageviewOrigin(referer)) return true;
  return false;
}

function normalizePath(raw) {
  if (typeof raw !== "string") return { error: "path is required." };
  var text = raw.trim();
  if (!text) return { error: "path is required." };
  if (text.length > MAX_RAW_LENGTH) return { error: "path is too long." };
  var path = text;
  if (text.indexOf("://") !== -1) {
    var extracted = originFromUrl(text);
    if (!extracted) return { error: "path is invalid." };
    try {
      path = new URL(text).pathname || "/";
    } catch (error) {
      return { error: "path is invalid." };
    }
  } else if (text.charAt(0) !== "/") {
    return { error: "path must start with /." };
  }
  var queryAt = path.indexOf("?");
  if (queryAt !== -1) path = path.slice(0, queryAt);
  var hashAt = path.indexOf("#");
  if (hashAt !== -1) path = path.slice(0, hashAt);
  if (!path || path.charAt(0) !== "/") return { error: "path must start with /." };
  if (path.indexOf("//") === 0) return { error: "path must start with /." };
  if (path.indexOf("\0") !== -1) return { error: "path is invalid." };
  if (path.length > MAX_PATH_LENGTH) return { error: "path is too long." };
  return { path: path };
}

function referrerHost(raw) {
  if (raw === undefined || raw === null) return null;
  var text = String(raw).trim();
  if (!text || text.length > MAX_RAW_LENGTH) return null;
  var withScheme = text.indexOf("://") === -1 ? "https://" + text : text;
  try {
    var host = new URL(withScheme).hostname.toLowerCase();
    if (!host || host.length > 255) return null;
    return host;
  } catch (error) {
    return null;
  }
}

function parseSessionId(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === "") return { value: null };
  var text = String(raw).trim();
  if (!UUID_RE.test(text)) return { error: "session_id must be a UUID." };
  return { value: text.toLowerCase() };
}

function parseAuthenticated(raw) {
  if (raw === undefined || raw === null || raw === "") return { value: false };
  if (raw === true) return { value: true };
  if (raw === false) return { value: false };
  return { error: "is_authenticated must be a boolean." };
}

function requestBody(req) {
  var body = req && req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (error) {
      return null;
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body;
}

function parsePageviewRequest(req) {
  if (!requestOriginAllowed(req)) {
    return { error: "Origin not allowed.", status: 403 };
  }
  var body = requestBody(req);
  if (!body) return { error: "A JSON body with path is required.", status: 400 };
  var path = normalizePath(body.path);
  if (path.error) return { error: path.error, status: 400 };
  var session = parseSessionId(body.session_id);
  if (session.error) return { error: session.error, status: 400 };
  var authed = parseAuthenticated(body.is_authenticated);
  if (authed.error) return { error: authed.error, status: 400 };
  return {
    path: path.path,
    referrer_host: referrerHost(body.referrer),
    session_id: session.value,
    is_authenticated: authed.value,
  };
}

export {
  ALLOWED_ORIGINS,
  isAllowedPageviewOrigin,
  requestOriginAllowed,
  normalizePath,
  referrerHost,
  parsePageviewRequest,
};
