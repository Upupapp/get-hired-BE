import { firebaseAdmin } from "./firebaseApp";

// SEC-08 FIX: this gate only ever establishes WHO the caller is -- every
// failure path here is an authentication failure (no/invalid/expired
// token), which is 401 by convention, never 403. 403 is reserved for an
// authenticated identity that's denied access to a specific resource/role
// (see verifyRoles.js and the many per-endpoint ownership checks
// throughout controllers/*), which is a distinct case this file never
// evaluates. Previously every branch here returned 403, which collided
// with the "authenticated but not allowed" case at the frontend
// interceptor and made a plain logged-out request indistinguishable from
// a genuine permission denial.
const validateFirebaseIdToken = async (req, res, next) => {
  if (
    (!req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer ")) &&
    !(req.cookies && req.cookies.__session)
  ) {
    res.status(401).send("Unauthorized");
    return;
  }

  let idToken;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else if (req.cookies) {
    idToken = req.cookies.__session;
  } else {
    res.status(401).send("Unauthorized");
    return;
  }

  try {
    // SIGNOUT SESSION-EXPIRY FIX: revokeTokenInFirebase() (called on
    // /auth/logout) has always correctly called
    // firebaseAdmin.auth().revokeRefreshTokens(uid) -- but verifyIdToken()
    // only enforces that revocation if explicitly told to check for it.
    // Without the `true` here, an ID token already in a browser's hands
    // keeps passing verification (valid signature, not yet expired) right
    // through logout, for up to its full ~1hr lifetime, regardless of any
    // frontend fix -- the backend was never actually ending the session.
    // checkRevoked:true makes the SDK compare the token's issued-at time
    // against the user's revocation timestamp on every request.
    const decodedIdToken = await firebaseAdmin.auth().verifyIdToken(idToken, true);
    req.user = decodedIdToken;
    next();
    return;
  } catch (error) {
    if (error.code === "auth/id-token-expired") {
      res.status(401).send("Token Expired. Login again.");
      return;
    }
    if (error.code === "auth/id-token-revoked") {
      res.status(401).send("Session has been signed out. Please log in again.");
      return;
    }
    res.status(401).send('Authentication failed.');
    return;
  }
};

export default validateFirebaseIdToken;
