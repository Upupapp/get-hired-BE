import { firebaseAdmin } from "./firebaseApp";

const validateFirebaseIdToken = async (req, res, next) => {
  if (
    (!req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer ")) &&
    !(req.cookies && req.cookies.__session)
  ) {
    res.status(403).send("Unauthorized");
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
    res.status(403).send("Unauthorized");
    return;
  }

  try {
    // idToken = idToken.replace(' Bearer ', '');
    // console.log(idToken);
    const decodedIdToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    req.user = decodedIdToken;
    next();
    return;
  } catch (error) {
    if (error.code === "auth/id-token-expired") {
      res.status(403).send("Token Expired. Login again.");
    }
    res.status(403).send(error);
    return;
  }
};

export default validateFirebaseIdToken;
