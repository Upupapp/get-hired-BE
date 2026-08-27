-- interview_template_question.updated_at is missing from the gethired
-- schema, but is actively required: services/interview.service.js's
-- updateQuestion() SETs updated_at=$4 on every edit
-- (PUT /api/interview/updatejobinterview), and multiple response mappers
-- in the same file read raw.updated_at back (mappedQuestion,
-- mappedQuestionTemplate). The legacy jobhunt-schema snapshot
-- (db/complete_ddl.sql) has always had this column
-- ("updated_at timestamp NULL DEFAULT now()") on the equivalent table;
-- no migration ever carried it into the gethired schema when the earlier
-- 20260819d_interview_template_missing_columns.sql fix added
-- created_at/sequence to the same table.
--
-- Confirmed live via direct reproduction: PUT /api/interview/updatejobinterview
-- fails with 42703 "column updated_at of relation interview_template_question
-- does not exist" without this column.
--
-- Additive, idempotent, safe on a live system.

ALTER TABLE gethired.interview_template_question
	ADD COLUMN IF NOT EXISTS updated_at timestamp NULL DEFAULT now();
