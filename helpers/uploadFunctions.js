import dbQuery from "../db/dbQuery";
import uploadInStorage from "../helpers/uploader";
import env from "../env";

const dbSchema = env.schema;

const uploadAndSaveAttachment = async (
  attachment,
  dbDetails,
  folderName,
  index = 0
) => {
  const { dbId, dbTable, dbIdColumnName } = dbDetails;
  let rawUrl = "";
  let generalQuery = "";
  let dbResponse = {};

  const { attachmentId, file, attachmentUrl, size, type } = attachment;
  const fileName = `${dbId}-${index}`;

  try {
    if (file && file != "") {
      rawUrl = await uploadInStorage(folderName, fileName, file);
    }

    if (attachmentId && file) {
      generalQuery = `UPDATE ${dbSchema}.${dbTable}
          SET attachment_url=$1, "size"=$2, attachment_type=$3, file_name=$4
          WHERE attachment_id=$5 returning *;`;

      const { rows } = await dbQuery.query(generalQuery, [
        rawUrl,
        size,
        type,
        fileName,
        attachmentId,
      ]);

      dbResponse = rows[0];
    } else if (file && !attachmentId) {
      generalQuery = `INSERT INTO ${dbSchema}.${dbTable}
          (attachment_url, ${dbIdColumnName}, "size", attachment_type, file_name)
          VALUES($1, $2, $3, $4, $5) returning *;`;

      const { rows } = await dbQuery.query(generalQuery, [
        rawUrl,
        dbId,
        size,
        type,
        fileName,
      ]);

      dbResponse = rows[0];
    } else {
      dbResponse = attachment;
    }

    if (!dbResponse) {
      throw "Failed to save Url in DB";
    }

    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const getAttachments = async (dbId, dbIdColumnName, dbTable) => {
  const searchQuery = `SELECT 
        attachment_id, attachment_url, ${dbIdColumnName}, uploaded_at, "size", attachment_type
      FROM ${dbSchema}.${dbTable} where ${dbIdColumnName}=$1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [dbId]);

    const dbResponse = rows.map((row) => {
      return {
        filename: row.filename,
        size: row.size,
        type: row.attachment_type,
        file: null,
        attachmentUrl: row.attachment_url,
        attachmentId: row.attachment_id,
        uploadedAt: row.uploaded_at,
      };
    });
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const deleteAttachmentInDB = async (attachmentId, dbTable) => {
    const deleteQuery = `DELETE FROM ${dbSchema}.${dbTable}
    WHERE attachment_id=$1;`;
  
    try {
      const { rows } = await dbQuery.query(deleteQuery, [attachmentId]);
  
      return true;
    } catch (error) {
      throw error;
    }
  };

const removeAttachmentFromItem = async (attachments, dbId) => {
  try {
    const saveAttachment = await getAttachments(dbId); // save in DB
    // id to save
    attachments = attachments
      .filter((attachment) => attachment.attachmentId)
      .map((attachment) => attachment.attachmentId);

    // id to remove
    const attachmentToRemove = saveAttachment.filter(
      (item) => !attachments.includes(item.attachmentId)
    );

    const deleteInDb = await Promise.all(
      attachmentToRemove.map(
        async (item) => await deleteAttachmentInDB(item.attachmentId)
      )
    );

    if (!deleteInDb) {
      throw "Error deleting in DB";
    }

    return attachmentToRemove;
  } catch (error) {
    throw error;
  }
};

export { uploadAndSaveAttachment, getAttachments, removeAttachmentFromItem, deleteAttachmentInDB };
