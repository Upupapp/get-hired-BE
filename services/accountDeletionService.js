import dbQuery from "../db/dbQuery";
import env from "../env";
import { deleteUserAccountInFirebaseById } from "../helpers/firebaseFunctions";
import { buildAccountDeletionService } from "./accountDeletionPlan";
import { deleteFromStorageByUrl } from "../helpers/uploader";

export { buildAccountDeletionService } from "./accountDeletionPlan";

export const deleteAccount = buildAccountDeletionService({
  db: dbQuery,
  dbSchema: env.schema,
  deleteFirebaseUser: deleteUserAccountInFirebaseById,
  deleteStorageUrl: deleteFromStorageByUrl,
});
