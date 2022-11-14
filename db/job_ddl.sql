CREATE TABLE gethired.badge (
	badge_id int4 NOT NULL,
	badge_name varchar NULL,
	CONSTRAINT badge_pk PRIMARY KEY (badge_id)
);

ALTER TABLE gethired.badge ADD badge_icon varchar NULL;
ALTER TABLE gethired.badge ALTER COLUMN badge_name SET NOT NULL;

CREATE TABLE gethired.industry (
	industry_id int4 NOT NULL,
	industry_name varchar NOT NULL,
	CONSTRAINT industry_pk PRIMARY KEY (industry_id)
);

CREATE TABLE gethired.levels (
	level_id int4 NOT NULL,
	level_name varchar NULL,
	CONSTRAINT levels_pk PRIMARY KEY (level_id)
);

CREATE TABLE gethired.job_setup (
	job_setup_id int4 NOT NULL,
	job_setup_name varchar NOT NULL,
	CONSTRAINT job_setup_pk PRIMARY KEY (job_setup_id)
);

CREATE TABLE gethired.job_role (
	job_role_id int4 NOT NULL,
	job_role_name varchar NOT NULL,
	CONSTRAINT job_role_pk PRIMARY KEY (job_role_id)
);

CREATE TABLE gethired.job_type (
	job_type_id int4 NOT NULL,
	job_type_name varchar NOT NULL,
	CONSTRAINT job_type_pk PRIMARY KEY (job_type_id)
);

INSERT INTO gethired.badge (badge_id,badge_name,badge_icon) VALUES
	 (1,'Career Growth',NULL),
	 (2,'Performance Incentive',NULL),
	 (3,'Benefit Package',NULL),
	 (4,'Gender Equality',NULL),
	 (5,'Work-life Balance',NULL),
	 (6,'Friendly Environment',NULL),
	 (7,'Flexitime',NULL);

INSERT INTO gethired.job_setup (job_setup_id,job_setup_name)
	VALUES (1,'Onsite');
INSERT INTO gethired.job_setup (job_setup_id,job_setup_name)
	VALUES (2,'Remote');
INSERT INTO gethired.job_setup (job_setup_id,job_setup_name)
	VALUES (3,'Hybrid');

INSERT INTO gethired.job_type (job_type_id,job_type_name)
	VALUES (1,'Full time');
INSERT INTO gethired.job_type (job_type_id,job_type_name)
	VALUES (2,'Part time');
INSERT INTO gethired.job_type (job_type_id,job_type_name)
	VALUES (3,'Contractor');

INSERT INTO gethired.levels (level_id,level_name)
	VALUES (1,'Intern / Student');
INSERT INTO gethired.levels (level_id,level_name)
	VALUES (2,'Fresher / Entry Level');
INSERT INTO gethired.levels (level_id,level_name)
	VALUES (3,'Intermediate: 2-3 years of Experience');
INSERT INTO gethired.levels (level_id,level_name)
	VALUES (4,'Advance: 5+ years of Experience');
INSERT INTO gethired.levels (level_id,level_name)
	VALUES (5,'C-Level');


CREATE TABLE gethired.jobs (
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
	salary_minimum numeric(6, 2) NULL,
	salary_maximum numeric(6, 2) NULL,
	rate varchar NULL,
	job_address varchar NULL,
	created_at timestamp NULL,
	updated_at timestamp NULL,
	expiration_date date NULL,
	job_status_id int4 NULL,
	CONSTRAINT jobs_pk PRIMARY KEY (job_id),
	CONSTRAINT jobs_fk FOREIGN KEY (job_role_id) REFERENCES gethired.job_role(job_role_id) ON DELETE SET NULL ON UPDATE SET NULL,
	CONSTRAINT jobs_fk_1 FOREIGN KEY (job_type_id) REFERENCES gethired.job_type(job_type_id) ON DELETE SET NULL ON UPDATE SET NULL,
	CONSTRAINT jobs_fk_2 FOREIGN KEY (job_level_id) REFERENCES gethired.job_level(job_level_id) ON DELETE SET NULL ON UPDATE SET NULL,
	CONSTRAINT jobs_fk_3 FOREIGN KEY (work_setup_id) REFERENCES gethired.work_setup(work_setup_id) ON DELETE SET NULL ON UPDATE SET NULL,
	CONSTRAINT jobs_fk_4 FOREIGN KEY (industry_id) REFERENCES gethired.industry(industry_id) ON DELETE SET NULL ON UPDATE SET NULL
);

CREATE TABLE gethired.job_status (
	job_status_id int4 NOT NULL,
	job_status_name varchar NOT NULL,
	CONSTRAINT job_status_pk PRIMARY KEY (job_status_id)
);

ALTER TABLE gethired.jobs ADD CONSTRAINT jobs_fk_5 FOREIGN KEY (job_status_id) REFERENCES gethired.job_status(job_status_id) ON DELETE SET NULL ON UPDATE CASCADE;

