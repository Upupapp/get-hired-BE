CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles
CREATE TABLE gethired.roles (
	id int4 NOT NULL,
	role_name varchar NOT NULL,
	role_description varchar NULL,
	CONSTRAINT roles_pk PRIMARY KEY (id)
);

INSERT INTO gethired.roles (id,role_name,role_description)
	VALUES (0,'super_admin','dev account');
INSERT INTO gethired.roles (id,role_name,role_description)
	VALUES (1,'admin','admin');
INSERT INTO gethired.roles (id,role_name,role_description)
	VALUES (2,'employer','employer');
INSERT INTO gethired.roles (id,role_name,role_description)
	VALUES (3,'candidate','candidate');


-- Login
CREATE TABLE gethired.user_credentials (
	uid varchar NOT NULL,
	email varchar NOT NULL,
	"password" varchar NOT NULL,
	"role" int4 NULL,
	createddate timestamp NULL,
	CONSTRAINT user_credentials_pk PRIMARY KEY (uid),
	CONSTRAINT user_credentials_fk FOREIGN KEY ("role") REFERENCES gethired.roles(id) ON DELETE SET NULL ON UPDATE SET NULL
);

-- Users
CREATE TABLE gethired.users (
	uid varchar NOT NULL,
	email varchar NOT NULL,
	firstname varchar NULL,
	middlename varchar NULL,
	lastname varchar NULL,
	address varchar NULL,
	city varchar NULL,
	zip varchar NULL,
	phone_number varchar NULL,
	cellnumber varchar NULL,
	photourl varchar NULL,
	date_of_birth date NULL,
	age int4 NULL,
	is_profile_updated bool NULL,
	last_update timestamp NULL,
	address_b varchar NULL,
	gender varchar NULL,
	CONSTRAINT users_pk PRIMARY KEY (uid)
);

ALTER TABLE gethired.users ADD CONSTRAINT users_fk FOREIGN KEY (uid) REFERENCES gethired.user_credentials(uid) ON DELETE CASCADE ON UPDATE CASCADE;
