CREATE TABLE gethired.companies (
	company_id varchar NOT NULL,
	company_logo varchar NOT NULL,
	company_name varchar NOT NULL,
	company_details varchar NULL,
	industry_id int4 NULL,
	work_setup_id int4 NULL,
	number_of_employee int4 NULL,
	company_email varchar NULL,
	company_city varchar NULL,
	company_contact_number varchar NULL,
	company_country varchar NULL,
	company_adress varchar NULL,
	CONSTRAINT companies_pk PRIMARY KEY (company_id),
	CONSTRAINT companies_fk FOREIGN KEY (industry_id) REFERENCES gethired.industry(industry_id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT companies_fk_1 FOREIGN KEY (work_setup_id) REFERENCES gethired.work_setup(work_setup_id) ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE gethired.companies ADD created_date timestamp NOT NULL;
ALTER TABLE gethired.companies ADD created_by varchar NOT NULL;
ALTER TABLE gethired.companies ADD CONSTRAINT companies_fk_2 FOREIGN KEY (created_by) REFERENCES gethired.users(uid);

CREATE TABLE gethired.company_employees (
	employee_id varchar NOT NULL,
	company_id varchar NOT NULL,
	employee_uuid varchar NOT NULL,
	assigned_at timestamp NOT NULL,
	updated_at timestamp NOT NULL DEFAULT now(),
	position_id int4 NULL,
	assigned_by varchar NOT NULL,
	CONSTRAINT company_employees_pk PRIMARY KEY (employee_id),
	CONSTRAINT company_employees_fk FOREIGN KEY (employee_uuid) REFERENCES gethired.user_credentials(uid) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT company_employees_fk_1 FOREIGN KEY (assigned_by) REFERENCES gethired.user_credentials(uid) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT company_employees_fk_2 FOREIGN KEY (company_id) REFERENCES gethired.companies(company_id) ON DELETE CASCADE ON UPDATE CASCADE
);

