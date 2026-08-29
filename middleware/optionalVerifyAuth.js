import { firebaseAdmin } from "./firebaseApp";

// SEC-02 FIX: optional-auth middleware for public endpoints that may also
// serve personalized context to authenticated callers.
//
// Behaviour contract (used by GET /job/details):
//   No Authorization header → req.user = null, proceed (public-only response)
//   Valid Bearer token      → req.user = decodedToken, proceed (personalized response)
//   Invalid / expired token → 401 (do not fall through to query-uid)
//
// This deliberately mirrors the Firebase-token-only identity model in
// verifyAuth.js and intentionally does not fall back to req.query.uid or
// any other caller-supplied identity.
const optionalVerifyAuth = async (req, res, next) => {
  const hasAuthHeader =
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ");
  const hasCookieSession = req.cookies && req.cookies.__session;

  if (!hasAuthHeader && !hasCookieSession) {
    req.user = null;
    return next();
  }

  let idToken;
  if (hasAuthHeader) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    idToken = req.cookies.__session;
  }

  try {
    // Same fix as verifyAuth.js: checkRevoked:true so a signed-out session's
    // still-unexpired token is actually rejected here too, not just treated
    // as valid personalized context.
    const decodedIdToken = await firebaseAdmin.auth().verifyIdToken(idToken, true);
    req.user = decodedIdToken;
    return next();
  } catch (error) {
    if (error.code === "auth/id-token-expired") {
      return res.status(401).json({ message: "Your session has expired. Please sign in again." });
    }
    if (error.code === "auth/id-token-revoked") {
      return res.status(401).json({ message: "Session has been signed out. Please log in again." });
    }
    return res.status(401).json({ message: "Unable to verify your session. Please sign in again." });
  }
};

export default optionalVerifyAuth;
