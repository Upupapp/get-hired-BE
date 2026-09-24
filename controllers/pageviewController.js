import dbQuery from "../db/dbQuery";
import env from "../env";
import { parsePageviewRequest } from "../helpers/pageviewIngest";

function schemaName() {
  var name = env.schema;
  if (typeof name !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error("Invalid database schema");
  }
  return name;
}

const postPageview = async (req, res) => {
  const parsed = parsePageviewRequest(req);
  if (parsed.error) {
    return res.status(parsed.status).json({ message: parsed.error });
  }

  var name;
  try {
    name = schemaName();
  } catch (error) {
    console.warn("[pageview] schema unavailable");
    return res.status(204).end();
  }

  try {
    await dbQuery.query(
      "INSERT INTO " + name + ".site_pageviews (path, referrer_host, session_id, is_authenticated) VALUES ($1, $2, $3, $4)",
      [parsed.path, parsed.referrer_host, parsed.session_id, parsed.is_authenticated]
    );
  } catch (error) {
    var code = error && error.code ? error.code : "error";
    console.warn("[pageview] insert skipped:", code);
  }
  return res.status(204).end();
};

export { postPageview };
