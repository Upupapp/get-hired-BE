CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE jobhunt.users (
	uid varchar NOT NULL,
	firstname varchar NULL,
	middlename varchar NULL,
	lastname varchar NULL,
	address varchar NULL,
	city varchar NULL,
	zip varchar NULL,
	phone_number varchar NULL,
	cell_number varchar NULL,
	photo_url varchar NULL,
	date_of_birth date NULL,
	is_profile_updated bool NULL,
	updated_at timestamp NULL,
	gender varchar NULL,
	civil_status varchar NULL,
	state varchar NULL,
	country varchar NULL,
	email varchar NULL,
	CONSTRAINT users_pk PRIMARY KEY (uid)
);

CREATE TABLE jobhunt.logs (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	activity_name varchar NOT NULL,
	user_id varchar NOT NULL,
	date_of_activity timestamp NOT NULL DEFAULT now(),
	activity_id varchar NULL,
	CONSTRAINT newtable_pk PRIMARY KEY (id)
);
CREATE INDEX newtable_id_idx ON jobhunt.logs USING btree (id);

CREATE TABLE jobhunt.user_credentials (
	uid varchar NOT NULL,
	email varchar NOT NULL,
	"password" varchar NOT NULL,
	"role" int4 NULL,
	created_date timestamp NULL,
	is_archive bool NOT NULL DEFAULT false,
	CONSTRAINT user_credentials_pk PRIMARY KEY (uid)
);

CREATE TABLE jobhunt.access_roles (
	id int4 NOT NULL,
	role_name varchar NOT NULL,
	role_description varchar NULL,
	CONSTRAINT roles_pk PRIMARY KEY (id)
);

CREATE TABLE jobhunt.applicant_certificates (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	cert_title varchar NOT NULL,
	no_expiry bool NULL DEFAULT false,
	start_month varchar NULL,
	start_year int4 NULL,
	end_month varchar NULL,
	end_year int4 NULL,
	details varchar NULL,
	created_at timestamp NOT NULL,
	applicant_id varchar NOT NULL,
	CONSTRAINT applicant_certificates_pk PRIMARY KEY (id)
);

CREATE TABLE jobhunt.applicants_profile (
	user_id varchar NOT NULL,
	photo_url varchar NULL,
	job_title varchar NOT NULL,
	short_bio varchar NULL,
	services_provided varchar NULL,
	job_type_id int4 NOT NULL,
	job_level_id int4 NOT NULL,
	work_setup_id int4 NOT NULL,
	salary_minimum numeric(20, 2) NULL,
	salary_maximum numeric(20, 2) NULL,
	applicant_profile_id varchar NOT NULL,
	video_cv_url varchar NULL,
	applicant_rating int4 NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL DEFAULT now(),
	is_profile_ready bool NULL DEFAULT false,
	salary_currency varchar NULL,
	CONSTRAINT applicants_profile_pk PRIMARY KEY (applicant_profile_id)
);
CREATE TABLE jobhunt.jobs (
	job_id varchar NOT NULL,
	job_banner varchar NULL,
	job_title varchar NOT NULL,
	company_id varchar NULL,
	industry_id int4 NULL,
	job_role_id int4 NULL,
	job_type_id int4 NULL,
	job_level_id int4 NULL,
	job_description varchar NULL,
	job_duties varchar NULL,
	work_setup_id int4 NULL,
	salary_minimum numeric(20, 2) NULL,
	salary_maximum numeric(20, 2) NULL,
	rate varchar NULL,
	job_address varchar NULL,
	created_at timestamp NULL,
	updated_at timestamp NULL DEFAULT now(),
	expiration_date date NULL,
	job_status_id int4 NULL,
	job_city varchar NULL,
	job_category_id int4 NULL,
	job_country varchar NULL,
	is_featured bool NULL DEFAULT false,
	salary_currency varchar NULL,
	CONSTRAINT jobs_pk PRIMARY KEY (job_id)
);

CREATE TABLE jobhunt.work_setup (
	work_setup_id int4 NOT NULL,
	work_setup_name varchar NOT NULL,
	CONSTRAINT work_setup_pk PRIMARY KEY (work_setup_id)
);

CREATE TABLE jobhunt.applicant_educational_background (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	applicant_id varchar NOT NULL,
	created_at timestamp NULL,
	educ_level_name varchar NOT NULL,
	field_of_study varchar NULL,
	school varchar NULL,
	school_address varchar NULL,
	start_month varchar NULL,
	start_year int4 NULL,
	end_month varchar NULL,
	end_year int4 NULL,
	CONSTRAINT applicant_educational_background_pk PRIMARY KEY (id)
);

CREATE TABLE jobhunt.applicant_covered_letter (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	fileurl varchar NOT NULL,
	filename varchar NOT NULL,
	"size" int4 NULL,
	"type" varchar NULL,
	applicant_id varchar NOT NULL,
	job_id varchar NOT NULL,
	created_at timestamp NULL DEFAULT now(),
	CONSTRAINT applicant_covered_letters_pk PRIMARY KEY (id)
);

CREATE TABLE jobhunt.applicant_resume (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	fileurl varchar NOT NULL,
	filename varchar NOT NULL,
	"size" int4 NULL,
	"type" varchar NULL,
	applicant_id varchar NOT NULL,
	job_id varchar NOT NULL,
	created_at timestamp NULL DEFAULT now(),
	CONSTRAINT applicant_resume_pk PRIMARY KEY (id)
);

CREATE TABLE jobhunt.applicant_government_files (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	fileurl varchar NOT NULL,
	filename varchar NOT NULL,
	"size" int4 NULL,
	"type" varchar NULL,
	applicant_id varchar NOT NULL,
	job_id varchar NOT NULL,
	created_at timestamp NULL DEFAULT now(),
	CONSTRAINT applicant_government_files_pk PRIMARY KEY (id)
);

CREATE TABLE jobhunt.applicant_skills (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	skills varchar NOT NULL,
	applicant_id varchar NOT NULL,
	created_at timestamp NULL,
	CONSTRAINT applicant_skills_pk PRIMARY KEY (id)
);

CREATE TABLE jobhunt.applicant_work_experience (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	job_title varchar NOT NULL,
	company_name varchar NOT NULL,
	"location" varchar NULL,
	job_type_id int4 NOT NULL,
	start_month varchar NOT NULL,
	start_year varchar NOT NULL,
	end_month varchar NULL,
	end_year varchar NULL,
	is_current_job bool NULL DEFAULT false,
	details varchar NULL,
	created_at timestamp NOT NULL,
	applicant_id varchar NULL,
	CONSTRAINT applicant_workexperience_pk PRIMARY KEY (id)
);

CREATE TABLE jobhunt.job_tags (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	tags varchar NOT NULL,
	job_id varchar NOT NULL,
	created_at timestamp NULL,
	CONSTRAINT job_tags_pk PRIMARY KEY (id)
);

CREATE TABLE jobhunt.job_type (
	job_type_id int4 NOT NULL,
	job_type_name varchar NOT NULL,
	CONSTRAINT job_type_pk PRIMARY KEY (job_type_id)
);

CREATE TABLE jobhunt.job_level (
	job_level_id int4 NOT NULL,
	job_level_name varchar NULL,
	CONSTRAINT levels_pk PRIMARY KEY (job_level_id)
);

CREATE TABLE jobhunt.badge (
	badge_id int4 NOT NULL,
	badge_name varchar NOT NULL,
	badge_icon varchar NULL,
	CONSTRAINT badge_pk PRIMARY KEY (badge_id)
);

CREATE TABLE jobhunt.companies (
	company_id varchar NOT NULL,
	company_logo varchar NOT NULL,
	company_name varchar NOT NULL,
	company_details varchar NULL,
	industry_id int4 NOT NULL DEFAULT 1,
	work_setup_id int4 NULL,
	number_of_employee int4 NULL,
	company_email varchar NULL,
	company_city varchar NULL,
	company_contact_number varchar NULL,
	company_country varchar NULL,
	company_address varchar NULL,
	created_at timestamp NOT NULL,
	created_by varchar NOT NULL,
	company_banner varchar NULL,
	is_featured bool NULL DEFAULT false,
	updated_at timestamp NOT NULL DEFAULT now(),
	CONSTRAINT companies_pk PRIMARY KEY (company_id)
);

Create sequence candidate_seq;

CREATE TABLE jobhunt.candidates (
	candidate_id varchar NOT NULL DEFAULT (('CA-'::text || to_char(nextval('candidate_seq'::regclass), 'FM0000'::text)) || 'SE22'::text),
	user_id varchar NULL,
	first_name varchar NULL,
	last_name varchar NULL,
	email varchar NOT NULL,
	mobile_number varchar NULL,
	address varchar NULL,
	created_at varchar NULL,
	job_id varchar NULL,
	company_id varchar NULL,
	status varchar NULL
);

CREATE sequence jobhunt.job_category_category_id_seq;

CREATE TABLE jobhunt.category (
	job_category_id int4 NOT NULL DEFAULT nextval('jobhunt.job_category_category_id_seq'::regclass),
	job_category_name varchar NOT NULL,
	CONSTRAINT job_category_pk PRIMARY KEY (job_category_id)
);

CREATE sequence jobhunt.item_seq;


CREATE TABLE jobhunt.contact (
	contact_id varchar NOT NULL DEFAULT (('C0-'::text || to_char(nextval('item_seq'::regclass), 'FM0000'::text)) || 'SE22'::text),
	user_id varchar NOT NULL,
	first_name varchar NULL,
	last_name varchar NULL,
	email varchar NOT NULL,
	mobile_number varchar NOT NULL,
	address varchar NULL,
	created_at timestamp NULL,
	company_id varchar NULL,
	CONSTRAINT contact_pk PRIMARY KEY (contact_id),
	CONSTRAINT contact_un UNIQUE (company_id, email)
);

CREATE TABLE jobhunt.documents (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	fileurl varchar NOT NULL,
	filename varchar NOT NULL,
	"size" int4 NULL,
	"type" varchar NULL,
	applicant_id varchar NOT NULL,
	created_at timestamp NULL DEFAULT now(),
	CONSTRAINT documents_pk PRIMARY KEY (id)
);

CREATE TABLE jobhunt.industry (
	industry_id int4 NOT NULL,
	industry_name varchar NOT NULL,
	CONSTRAINT industry_pk PRIMARY KEY (industry_id)
);

CREATE TABLE jobhunt.interview_answers (
	interview_answer_id varchar NOT NULL DEFAULT uuid_generate_v4(),
	question_id varchar NOT NULL,
	answer_url varchar NOT NULL,
	created_at timestamp NOT NULL,
	job_id varchar NOT NULL,
	applicant_id varchar NOT NULL,
	CONSTRAINT interview_answers_pk PRIMARY KEY (interview_answer_id)
);

CREATE TABLE jobhunt.job_interview_template (
	job_interview_template_id varchar NOT NULL,
	job_interview_template_name varchar NOT NULL,
	created_at timestamp NULL,
	updated_at timestamp NULL DEFAULT now(),
	job_id varchar NULL,
	CONSTRAINT job_interview_template_pk PRIMARY KEY (job_interview_template_id)
);

ALTER TABLE jobhunt.applicant_certificates ADD CONSTRAINT applicant_certificates_fk FOREIGN KEY (applicant_id) REFERENCES jobhunt.applicants_profile(applicant_profile_id);

ALTER TABLE jobhunt.applicant_covered_letter ADD CONSTRAINT applicant_covered_letter_fk FOREIGN KEY (applicant_id) REFERENCES jobhunt.applicants_profile(applicant_profile_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE jobhunt.applicant_covered_letter ADD CONSTRAINT applicant_covered_letter_fk_1 FOREIGN KEY (job_id) REFERENCES jobhunt.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE jobhunt.applicant_educational_background ADD CONSTRAINT applicant_educational_background_fk FOREIGN KEY (applicant_id) REFERENCES jobhunt.applicants_profile(applicant_profile_id);


ALTER TABLE jobhunt.applicant_government_files ADD CONSTRAINT applicant_government_files_fk FOREIGN KEY (applicant_id) REFERENCES jobhunt.applicants_profile(applicant_profile_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE jobhunt.applicant_government_files ADD CONSTRAINT applicant_government_files_fk_1 FOREIGN KEY (job_id) REFERENCES jobhunt.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE jobhunt.applicant_resume ADD CONSTRAINT applicant_resume_fk FOREIGN KEY (applicant_id) REFERENCES jobhunt.applicants_profile(applicant_profile_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE jobhunt.applicant_resume ADD CONSTRAINT applicant_resume_fk_1 FOREIGN KEY (job_id) REFERENCES jobhunt.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE jobhunt.applicant_skills ADD CONSTRAINT applicant_skills_fk FOREIGN KEY (applicant_id) REFERENCES jobhunt.applicants_profile(applicant_profile_id);



ALTER TABLE jobhunt.applicant_work_experience ADD CONSTRAINT applicant_work_experience_fk FOREIGN KEY (job_type_id) REFERENCES jobhunt.job_type(job_type_id);
ALTER TABLE jobhunt.applicant_work_experience ADD CONSTRAINT applicant_work_experience_fk_1 FOREIGN KEY (applicant_id) REFERENCES jobhunt.applicants_profile(applicant_profile_id);

ALTER TABLE jobhunt.applicants_profile ADD CONSTRAINT applicants_fk FOREIGN KEY (job_type_id) REFERENCES jobhunt.job_type(job_type_id);
ALTER TABLE jobhunt.applicants_profile ADD CONSTRAINT applicants_fk_1 FOREIGN KEY (job_level_id) REFERENCES jobhunt.job_level(job_level_id);
ALTER TABLE jobhunt.applicants_profile ADD CONSTRAINT applicants_fk_2 FOREIGN KEY (work_setup_id) REFERENCES jobhunt.work_setup(work_setup_id);
ALTER TABLE jobhunt.applicants_profile ADD CONSTRAINT applicants_profile_fk FOREIGN KEY (user_id) REFERENCES jobhunt.users(uid);


ALTER TABLE jobhunt.companies ADD CONSTRAINT companies_fk FOREIGN KEY (industry_id) REFERENCES jobhunt.industry(industry_id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE jobhunt.companies ADD CONSTRAINT companies_fk_1 FOREIGN KEY (work_setup_id) REFERENCES jobhunt.work_setup(work_setup_id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE jobhunt.companies ADD CONSTRAINT companies_fk_2 FOREIGN KEY (created_by) REFERENCES jobhunt.users(uid);

CREATE TABLE jobhunt.company_employees (
	employee_id varchar NOT NULL,
	company_id varchar NOT NULL,
	employee_uuid varchar NOT NULL,
	assigned_at timestamp NOT NULL,
	updated_at timestamp NOT NULL DEFAULT now(),
	position_id int4 NULL,
	assigned_by varchar NOT NULL,
	CONSTRAINT company_employees_pk PRIMARY KEY (employee_id)
);
ALTER TABLE jobhunt.company_employees ADD CONSTRAINT company_employees_fk FOREIGN KEY (employee_uuid) REFERENCES jobhunt.user_credentials(uid) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE jobhunt.company_employees ADD CONSTRAINT company_employees_fk_1 FOREIGN KEY (assigned_by) REFERENCES jobhunt.user_credentials(uid) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE jobhunt.company_employees ADD CONSTRAINT company_employees_fk_2 FOREIGN KEY (company_id) REFERENCES jobhunt.companies(company_id) ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE jobhunt.documents ADD CONSTRAINT documents_fk FOREIGN KEY (applicant_id) REFERENCES jobhunt.applicants_profile(applicant_profile_id);

Create sequence group_seq;

CREATE TABLE jobhunt."group" (
	group_id varchar NOT NULL DEFAULT (('G0-'::text || to_char(nextval('group_seq'::regclass), 'FM0000'::text)) || 'SE22'::text),
	group_name varchar NULL,
	created_date timestamp NULL,
	company_id varchar NULL,
	CONSTRAINT group_pk PRIMARY KEY (group_id)
);

CREATE TABLE jobhunt.group_list (
	group_id varchar NULL,
	email varchar NULL,
	CONSTRAINT group_list_un UNIQUE (group_id, email)
);
ALTER TABLE jobhunt.group_list ADD CONSTRAINT group_list_fk1 FOREIGN KEY (group_id) REFERENCES jobhunt."group"(group_id) ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE jobhunt.interview_answers ADD CONSTRAINT interview_answers_fk FOREIGN KEY (job_id) REFERENCES jobhunt.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE jobhunt.interview_answers ADD CONSTRAINT interview_answers_fk_1 FOREIGN KEY (applicant_id) REFERENCES jobhunt.applicants_profile(applicant_profile_id);

CREATE TABLE jobhunt.interview_template_question (
	template_question_id varchar NOT NULL,
	template_question varchar NOT NULL,
	template_answer_duration int4 NULL DEFAULT 3,
	template_question_retakes int4 NULL DEFAULT 1,
	job_interview_template_id varchar NOT NULL,
	created_at timestamp NULL,
	updated_at timestamp NULL DEFAULT now(),
	CONSTRAINT interview_template_question_pk PRIMARY KEY (template_question_id)
);
ALTER TABLE jobhunt.interview_template_question ADD CONSTRAINT interview_template_question_fk FOREIGN KEY (job_interview_template_id) REFERENCES jobhunt.job_interview_template(job_interview_template_id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE jobhunt.job_applicant_status (
	job_applicant_status_id int4 NOT NULL,
	job_applicant_status_name varchar NOT NULL,
	CONSTRAINT job_applicant_status_pk PRIMARY KEY (job_applicant_status_id)
);

CREATE TABLE jobhunt.job_applicants (
	job_application_id varchar NOT NULL,
	job_id varchar NOT NULL,
	date_applied timestamp NOT NULL,
	updated_at timestamp NOT NULL DEFAULT now(),
	candidate_id varchar NOT NULL,
	application_status_id int4 NULL,
	is_archived bool NULL DEFAULT false,
	CONSTRAINT job_applicants_pk PRIMARY KEY (job_application_id)
);
ALTER TABLE jobhunt.job_applicants ADD CONSTRAINT job_applicants_fk FOREIGN KEY (candidate_id) REFERENCES jobhunt.user_credentials(uid) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE jobhunt.job_applicants ADD CONSTRAINT job_applicants_fk_1 FOREIGN KEY (job_id) REFERENCES jobhunt.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE jobhunt.job_applicants ADD CONSTRAINT job_applicants_fk_2 FOREIGN KEY (application_status_id) REFERENCES jobhunt.job_applicant_status(job_applicant_status_id);

CREATE TABLE jobhunt.job_badges (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	badge_id int4 NOT NULL,
	job_id varchar NOT NULL,
	created_at timestamp NULL,
	CONSTRAINT job_badges_pk PRIMARY KEY (id)
);
ALTER TABLE jobhunt.job_badges ADD CONSTRAINT job_badges_fk FOREIGN KEY (job_id) REFERENCES jobhunt.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE jobhunt.job_educationalbackground (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	educationalbackground varchar NOT NULL,
	job_id varchar NOT NULL,
	created_at timestamp NULL,
	CONSTRAINT job_educationalbackground_pk PRIMARY KEY (id)
);
ALTER TABLE jobhunt.job_educationalbackground ADD CONSTRAINT job_educationalbackground_fk FOREIGN KEY (job_id) REFERENCES jobhunt.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE jobhunt.job_goodtohave (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	goodtohave varchar NOT NULL,
	job_id varchar NOT NULL,
	created_at timestamp NULL,
	CONSTRAINT job_goodtohave_pk PRIMARY KEY (id)
);
ALTER TABLE jobhunt.job_goodtohave ADD CONSTRAINT job_goodtohave_fk FOREIGN KEY (job_id) REFERENCES jobhunt.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE jobhunt.job_interview_template ADD CONSTRAINT job_interview_template_fk FOREIGN KEY (job_id) REFERENCES jobhunt.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;



CREATE TABLE jobhunt.job_requirement (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	requirement varchar NOT NULL,
	job_id varchar NOT NULL,
	created_at timestamp NULL,
	CONSTRAINT job_requirement_pk PRIMARY KEY (id)
);

ALTER TABLE jobhunt.job_requirement ADD CONSTRAINT job_requirement_fk FOREIGN KEY (job_id) REFERENCES jobhunt.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE jobhunt.job_role (
	job_role_id int4 NOT NULL,
	job_role_name varchar NOT NULL,
	CONSTRAINT job_role_pk PRIMARY KEY (job_role_id)
);

CREATE TABLE jobhunt.job_skills (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	skills varchar NOT NULL,
	job_id varchar NOT NULL,
	created_at timestamp NULL,
	CONSTRAINT job_skills_pk PRIMARY KEY (id)
);
ALTER TABLE jobhunt.job_skills ADD CONSTRAINT job_skills_fk FOREIGN KEY (job_id) REFERENCES jobhunt.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE jobhunt.job_status (
	job_status_id int4 NOT NULL,
	job_status_name varchar NOT NULL,
	CONSTRAINT job_status_pk PRIMARY KEY (job_status_id)
);



ALTER TABLE jobhunt.jobs ADD CONSTRAINT jobs_fk FOREIGN KEY (job_role_id) REFERENCES jobhunt.job_role(job_role_id) ON DELETE SET NULL ON UPDATE SET NULL;
ALTER TABLE jobhunt.jobs ADD CONSTRAINT jobs_fk_1 FOREIGN KEY (job_type_id) REFERENCES jobhunt.job_type(job_type_id) ON DELETE SET NULL ON UPDATE SET NULL;
ALTER TABLE jobhunt.jobs ADD CONSTRAINT jobs_fk_2 FOREIGN KEY (job_level_id) REFERENCES jobhunt.job_level(job_level_id) ON DELETE SET NULL ON UPDATE SET NULL;
ALTER TABLE jobhunt.jobs ADD CONSTRAINT jobs_fk_3 FOREIGN KEY (work_setup_id) REFERENCES jobhunt.work_setup(work_setup_id) ON DELETE SET NULL ON UPDATE SET NULL;
ALTER TABLE jobhunt.jobs ADD CONSTRAINT jobs_fk_4 FOREIGN KEY (industry_id) REFERENCES jobhunt.industry(industry_id) ON DELETE SET NULL ON UPDATE SET NULL;
ALTER TABLE jobhunt.jobs ADD CONSTRAINT jobs_fk_5 FOREIGN KEY (job_status_id) REFERENCES jobhunt.job_status(job_status_id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE jobhunt.jobs ADD CONSTRAINT jobs_fk_6 FOREIGN KEY (job_category_id) REFERENCES jobhunt.category(job_category_id) ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE jobhunt.user_credentials ADD CONSTRAINT user_credentials_fk FOREIGN KEY ("role") REFERENCES jobhunt.access_roles(id) ON DELETE SET NULL ON UPDATE SET NULL;


ALTER TABLE jobhunt.users ADD CONSTRAINT users_fk FOREIGN KEY (uid) REFERENCES jobhunt.user_credentials(uid) ON DELETE CASCADE ON UPDATE CASCADE;


