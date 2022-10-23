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

