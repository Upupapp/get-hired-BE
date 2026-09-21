-- Schema only, captured 2026-09-21. No production rows.
CREATE SCHEMA gethired;
--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_roles; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.access_roles (
    id integer NOT NULL,
    role_name character varying NOT NULL,
    role_description character varying
);


--
-- Name: job_category_category_id_seq; Type: SEQUENCE; Schema: gethired; Owner: -
--

CREATE SEQUENCE gethired.job_category_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: category; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.category (
    job_category_id integer DEFAULT nextval('gethired.job_category_category_id_seq'::regclass) NOT NULL,
    job_category_name character varying NOT NULL
);


--
-- Name: companies; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.companies (
    company_id character varying NOT NULL,
    company_logo character varying,
    company_name character varying NOT NULL,
    company_details character varying,
    industry_id integer DEFAULT 1 NOT NULL,
    work_setup_id integer,
    number_of_employee integer,
    company_email character varying,
    company_city character varying,
    company_contact_number character varying,
    company_country character varying,
    company_address character varying,
    created_at timestamp without time zone NOT NULL,
    created_by character varying NOT NULL,
    company_banner character varying,
    is_featured boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    shown_publicly boolean DEFAULT false,
    company_state text,
    company_mapurl text,
    company_suburb text,
    company_zip text,
    company_address_one text,
    company_slug character varying(255),
    is_duplicate boolean DEFAULT false NOT NULL
);


--
-- Name: companies_subscription; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.companies_subscription (
    id integer NOT NULL,
    company_id character varying(50),
    subscription_id integer,
    created_at timestamp without time zone DEFAULT now(),
    is_paid boolean DEFAULT true,
    payment_date timestamp without time zone DEFAULT now(),
    billing_cycle character varying(20) DEFAULT 'monthly'::character varying,
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    amount_paid numeric(12,2),
    plan_slug character varying(50),
    provider_reference character varying(255),
    sub_status character varying(50) DEFAULT 'active'::character varying
);


--
-- Name: companies_subscription_id_seq; Type: SEQUENCE; Schema: gethired; Owner: -
--

CREATE SEQUENCE gethired.companies_subscription_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: companies_subscription_id_seq; Type: SEQUENCE OWNED BY; Schema: gethired; Owner: -
--

ALTER SEQUENCE gethired.companies_subscription_id_seq OWNED BY gethired.companies_subscription.id;


--
-- Name: company_employees; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.company_employees (
    employee_id character varying NOT NULL,
    company_id character varying NOT NULL,
    employee_uuid character varying NOT NULL,
    assigned_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    position_id integer,
    assigned_by character varying NOT NULL,
    team_role_id uuid,
    access_scope character varying(20) DEFAULT 'all_jobs'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    CONSTRAINT company_employees_access_scope_check CHECK (((access_scope)::text = ANY ((ARRAY['all_jobs'::character varying, 'assigned_jobs'::character varying, 'no_job_access'::character varying])::text[]))),
    CONSTRAINT company_employees_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying])::text[])))
);


--
-- Name: industry; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.industry (
    industry_id integer NOT NULL,
    industry_name character varying NOT NULL
);


--
-- Name: invoice_events; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.invoice_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    company_id character varying(50),
    actor_uid character varying(255),
    event_type character varying(100) NOT NULL,
    event_source character varying(100),
    metadata_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoice_number_seq; Type: SEQUENCE; Schema: gethired; Owner: -
--

CREATE SEQUENCE gethired.invoice_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying(50) NOT NULL,
    subscription_id integer,
    cart_id character varying(30),
    transaction_id character varying(255),
    invoice_number character varying(50),
    invoice_sequence bigint,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    currency character varying(10) DEFAULT 'PHP'::character varying NOT NULL,
    subtotal_amount numeric(12,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    amount_paid numeric(12,2) DEFAULT 0 NOT NULL,
    amount_due numeric(12,2) DEFAULT 0 NOT NULL,
    plan_slug character varying(100),
    plan_name character varying(255),
    billing_cycle character varying(50),
    billing_period_start timestamp with time zone,
    billing_period_end timestamp with time zone,
    issued_at timestamp with time zone,
    due_at timestamp with time zone,
    paid_at timestamp with time zone,
    voided_at timestamp with time zone,
    customer_name character varying(255),
    customer_email character varying(255),
    customer_address text,
    line_items_json jsonb,
    payment_reference character varying(255),
    payment_method_label character varying(100),
    hosted_invoice_token character varying(128),
    hosted_invoice_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: job_level; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.job_level (
    job_level_id integer NOT NULL,
    job_level_name character varying
);


--
-- Name: job_role; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.job_role (
    job_role_id integer NOT NULL,
    job_role_name character varying NOT NULL
);


--
-- Name: job_status; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.job_status (
    job_status_id integer NOT NULL,
    job_status_name character varying NOT NULL
);


--
-- Name: job_type; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.job_type (
    job_type_id integer NOT NULL,
    job_type_name character varying NOT NULL
);


--
-- Name: jobs; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.jobs (
    job_id character varying NOT NULL,
    job_banner character varying,
    job_title character varying NOT NULL,
    company_id character varying,
    industry_id integer,
    job_role_id integer,
    job_type_id integer,
    job_level_id integer,
    job_description character varying,
    job_duties character varying,
    work_setup_id integer,
    salary_minimum numeric(12,2),
    salary_maximum numeric(12,2),
    rate character varying,
    job_address character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now(),
    expiration_date date,
    job_status_id integer,
    job_city character varying,
    job_category_id integer,
    job_country character varying,
    is_featured boolean DEFAULT false,
    salary_currency character varying
);


--
-- Name: notifications; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.notifications (
    id character varying NOT NULL,
    recipient_uid character varying NOT NULL,
    type character varying NOT NULL,
    title character varying NOT NULL,
    body character varying NOT NULL,
    link_route character varying,
    link_query jsonb,
    related_application_id character varying,
    related_job_id character varying,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    event_key character varying
);


--
-- Name: payment_webhook_events; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.payment_webhook_events (
    id integer NOT NULL,
    provider character varying(50) DEFAULT 'paymongo'::character varying NOT NULL,
    event_id character varying(255) NOT NULL,
    event_type character varying(255),
    provider_object_id character varying(255),
    provider_object_type character varying(100),
    provider_payment_id character varying(255),
    status character varying(50) DEFAULT 'received'::character varying NOT NULL,
    received_at timestamp without time zone DEFAULT now() NOT NULL,
    processing_started_at timestamp without time zone,
    processed_at timestamp without time zone,
    last_error_code character varying(50),
    last_error_message character varying(500),
    internal_attempt_count integer DEFAULT 0 NOT NULL,
    duplicate_count integer DEFAULT 0 NOT NULL,
    local_transaction_id character varying(255),
    local_subscription_id character varying(255),
    local_company_id character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_webhook_events_id_seq; Type: SEQUENCE; Schema: gethired; Owner: -
--

CREATE SEQUENCE gethired.payment_webhook_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_webhook_events_id_seq; Type: SEQUENCE OWNED BY; Schema: gethired; Owner: -
--

ALTER SEQUENCE gethired.payment_webhook_events_id_seq OWNED BY gethired.payment_webhook_events.id;


--
-- Name: subscription; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.subscription (
    subscription_id integer NOT NULL,
    subscription_name character varying(100),
    job_post integer DEFAULT 5,
    admin integer DEFAULT 1,
    video_response boolean DEFAULT true,
    with_customer_care boolean DEFAULT false,
    price numeric(10,2) DEFAULT 0,
    price_currency character varying(10) DEFAULT 'PHP'::character varying,
    payment_occurence character varying(50) DEFAULT 'monthly'::character varying,
    canonical_slug character varying(50),
    annual_price numeric(12,2)
);


--
-- Name: subscription_subscription_id_seq; Type: SEQUENCE; Schema: gethired; Owner: -
--

CREATE SEQUENCE gethired.subscription_subscription_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_subscription_id_seq; Type: SEQUENCE OWNED BY; Schema: gethired; Owner: -
--

ALTER SEQUENCE gethired.subscription_subscription_id_seq OWNED BY gethired.subscription.subscription_id;


--
-- Name: team_roles; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.team_roles (
    team_role_id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying(50),
    role_key character varying(50),
    role_name character varying(100) NOT NULL,
    role_description character varying(255),
    role_type character varying(20) DEFAULT 'system'::character varying NOT NULL,
    is_owner_role boolean DEFAULT false NOT NULL,
    created_by character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    CONSTRAINT team_roles_role_type_check CHECK (((role_type)::text = ANY ((ARRAY['system'::character varying, 'custom'::character varying])::text[])))
);


--
-- Name: user_credentials; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.user_credentials (
    uid character varying NOT NULL,
    email character varying NOT NULL,
    password character varying NOT NULL,
    role integer,
    created_date timestamp without time zone,
    is_archive boolean DEFAULT false NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.users (
    uid character varying NOT NULL,
    firstname character varying,
    middlename character varying,
    lastname character varying,
    address character varying,
    city character varying,
    zip character varying,
    phone_number character varying,
    cell_number character varying,
    photo_url character varying,
    date_of_birth date,
    is_profile_updated boolean,
    updated_at timestamp without time zone,
    gender character varying,
    civil_status character varying,
    state character varying,
    country character varying,
    email character varying,
    role_title character varying(100),
    department character varying(100),
    short_bio text,
    linkedin_url character varying(255),
    public_profile_enabled boolean DEFAULT false NOT NULL,
    show_photo_publicly boolean DEFAULT false NOT NULL,
    show_title_publicly boolean DEFAULT false NOT NULL,
    show_bio_publicly boolean DEFAULT false NOT NULL,
    show_linkedin_publicly boolean DEFAULT false NOT NULL,
    show_email_publicly boolean DEFAULT false NOT NULL,
    show_phone_publicly boolean DEFAULT false NOT NULL
);


--
-- Name: work_setup; Type: TABLE; Schema: gethired; Owner: -
--

CREATE TABLE gethired.work_setup (
    work_setup_id integer NOT NULL,
    work_setup_name character varying NOT NULL
);


--
-- Name: companies_subscription id; Type: DEFAULT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.companies_subscription ALTER COLUMN id SET DEFAULT nextval('gethired.companies_subscription_id_seq'::regclass);


--
-- Name: payment_webhook_events id; Type: DEFAULT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.payment_webhook_events ALTER COLUMN id SET DEFAULT nextval('gethired.payment_webhook_events_id_seq'::regclass);


--
-- Name: subscription subscription_id; Type: DEFAULT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.subscription ALTER COLUMN subscription_id SET DEFAULT nextval('gethired.subscription_subscription_id_seq'::regclass);


--
-- Name: companies companies_pk; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.companies
    ADD CONSTRAINT companies_pk PRIMARY KEY (company_id);


--
-- Name: companies_subscription companies_subscription_pkey; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.companies_subscription
    ADD CONSTRAINT companies_subscription_pkey PRIMARY KEY (id);


--
-- Name: company_employees company_employees_pk; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.company_employees
    ADD CONSTRAINT company_employees_pk PRIMARY KEY (employee_id);


--
-- Name: industry industry_pk; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.industry
    ADD CONSTRAINT industry_pk PRIMARY KEY (industry_id);


--
-- Name: invoice_events invoice_events_pkey; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.invoice_events
    ADD CONSTRAINT invoice_events_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_hosted_token_uq; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.invoices
    ADD CONSTRAINT invoices_hosted_token_uq UNIQUE (hosted_invoice_token);


--
-- Name: invoices invoices_invoice_number_uq; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.invoices
    ADD CONSTRAINT invoices_invoice_number_uq UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: category job_category_pk; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.category
    ADD CONSTRAINT job_category_pk PRIMARY KEY (job_category_id);


--
-- Name: job_role job_role_pk; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.job_role
    ADD CONSTRAINT job_role_pk PRIMARY KEY (job_role_id);


--
-- Name: job_status job_status_pk; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.job_status
    ADD CONSTRAINT job_status_pk PRIMARY KEY (job_status_id);


--
-- Name: job_type job_type_pk; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.job_type
    ADD CONSTRAINT job_type_pk PRIMARY KEY (job_type_id);


--
-- Name: jobs jobs_pk; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.jobs
    ADD CONSTRAINT jobs_pk PRIMARY KEY (job_id);


--
-- Name: job_level levels_pk; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.job_level
    ADD CONSTRAINT levels_pk PRIMARY KEY (job_level_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payment_webhook_events payment_webhook_events_pkey; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.payment_webhook_events
    ADD CONSTRAINT payment_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: access_roles roles_pk; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.access_roles
    ADD CONSTRAINT roles_pk PRIMARY KEY (id);


--
-- Name: subscription subscription_pkey; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.subscription
    ADD CONSTRAINT subscription_pkey PRIMARY KEY (subscription_id);


--
-- Name: team_roles team_roles_pkey; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.team_roles
    ADD CONSTRAINT team_roles_pkey PRIMARY KEY (team_role_id);


--
-- Name: user_credentials user_credentials_pk; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.user_credentials
    ADD CONSTRAINT user_credentials_pk PRIMARY KEY (uid);


--
-- Name: users users_pk; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.users
    ADD CONSTRAINT users_pk PRIMARY KEY (uid);


--
-- Name: work_setup work_setup_pk; Type: CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.work_setup
    ADD CONSTRAINT work_setup_pk PRIMARY KEY (work_setup_id);


--
-- Name: companies_subscription_company_sub_uidx; Type: INDEX; Schema: gethired; Owner: -
--

CREATE UNIQUE INDEX companies_subscription_company_sub_uidx ON gethired.companies_subscription USING btree (company_id, subscription_id);


--
-- Name: idx_companies_is_duplicate; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_companies_is_duplicate ON gethired.companies USING btree (is_duplicate) WHERE (is_duplicate = true);


--
-- Name: idx_companies_name_fts; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_companies_name_fts ON gethired.companies USING gin (to_tsvector('english'::regconfig, (COALESCE(company_name, ''::character varying))::text));


--
-- Name: idx_companies_name_lower; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_companies_name_lower ON gethired.companies USING btree (lower((company_name)::text));


--
-- Name: idx_companies_slug; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_companies_slug ON gethired.companies USING btree (company_slug);


--
-- Name: idx_invoice_events_company_id; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_invoice_events_company_id ON gethired.invoice_events USING btree (company_id, created_at DESC);


--
-- Name: idx_invoice_events_invoice_id; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_invoice_events_invoice_id ON gethired.invoice_events USING btree (invoice_id);


--
-- Name: idx_invoices_company_id; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_invoices_company_id ON gethired.invoices USING btree (company_id);


--
-- Name: idx_invoices_created_at; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_invoices_created_at ON gethired.invoices USING btree (created_at DESC);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_invoices_status ON gethired.invoices USING btree (status);


--
-- Name: idx_invoices_transaction_id; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_invoices_transaction_id ON gethired.invoices USING btree (transaction_id);


--
-- Name: idx_jobs_city_lower; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_jobs_city_lower ON gethired.jobs USING btree (lower((job_city)::text));


--
-- Name: idx_jobs_company_status; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_jobs_company_status ON gethired.jobs USING btree (company_id, job_status_id);


--
-- Name: idx_jobs_status; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_jobs_status ON gethired.jobs USING btree (job_status_id);


--
-- Name: idx_jobs_title_fts; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_jobs_title_fts ON gethired.jobs USING gin (to_tsvector('english'::regconfig, (COALESCE(job_title, ''::character varying))::text));


--
-- Name: idx_jobs_title_lower; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_jobs_title_lower ON gethired.jobs USING btree (lower((job_title)::text));


--
-- Name: idx_jobs_updated_at; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_jobs_updated_at ON gethired.jobs USING btree (updated_at DESC);


--
-- Name: idx_notifications_event_key; Type: INDEX; Schema: gethired; Owner: -
--

CREATE UNIQUE INDEX idx_notifications_event_key ON gethired.notifications USING btree (event_key) WHERE (event_key IS NOT NULL);


--
-- Name: idx_notifications_recipient_created; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_notifications_recipient_created ON gethired.notifications USING btree (recipient_uid, created_at DESC);


--
-- Name: idx_notifications_recipient_unread; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_notifications_recipient_unread ON gethired.notifications USING btree (recipient_uid) WHERE (is_read = false);


--
-- Name: idx_users_uid; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX idx_users_uid ON gethired.users USING btree (uid);


--
-- Name: payment_webhook_events_created_at_idx; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX payment_webhook_events_created_at_idx ON gethired.payment_webhook_events USING btree (created_at DESC);


--
-- Name: payment_webhook_events_provider_event_id_uidx; Type: INDEX; Schema: gethired; Owner: -
--

CREATE UNIQUE INDEX payment_webhook_events_provider_event_id_uidx ON gethired.payment_webhook_events USING btree (provider, event_id);


--
-- Name: payment_webhook_events_provider_object_idx; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX payment_webhook_events_provider_object_idx ON gethired.payment_webhook_events USING btree (provider, provider_object_id) WHERE (provider_object_id IS NOT NULL);


--
-- Name: payment_webhook_events_status_idx; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX payment_webhook_events_status_idx ON gethired.payment_webhook_events USING btree (status) WHERE ((status)::text = ANY ((ARRAY['failed'::character varying, 'processing'::character varying, 'needs_reconciliation'::character varying])::text[]));


--
-- Name: team_roles_company_active_idx; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX team_roles_company_active_idx ON gethired.team_roles USING btree (company_id, is_archived);


--
-- Name: team_roles_company_id_idx; Type: INDEX; Schema: gethired; Owner: -
--

CREATE INDEX team_roles_company_id_idx ON gethired.team_roles USING btree (company_id);


--
-- Name: team_roles_system_role_key_uq; Type: INDEX; Schema: gethired; Owner: -
--

CREATE UNIQUE INDEX team_roles_system_role_key_uq ON gethired.team_roles USING btree (role_key) WHERE (company_id IS NULL);


--
-- Name: companies companies_createdby_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.companies
    ADD CONSTRAINT companies_createdby_fk FOREIGN KEY (created_by) REFERENCES gethired.users(uid);


--
-- Name: companies companies_industry_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.companies
    ADD CONSTRAINT companies_industry_fk FOREIGN KEY (industry_id) REFERENCES gethired.industry(industry_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: companies companies_worksetup_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.companies
    ADD CONSTRAINT companies_worksetup_fk FOREIGN KEY (work_setup_id) REFERENCES gethired.work_setup(work_setup_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: company_employees company_employees_assignedby_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.company_employees
    ADD CONSTRAINT company_employees_assignedby_fk FOREIGN KEY (assigned_by) REFERENCES gethired.user_credentials(uid) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: company_employees company_employees_company_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.company_employees
    ADD CONSTRAINT company_employees_company_fk FOREIGN KEY (company_id) REFERENCES gethired.companies(company_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_employees company_employees_fk_team_role; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.company_employees
    ADD CONSTRAINT company_employees_fk_team_role FOREIGN KEY (team_role_id) REFERENCES gethired.team_roles(team_role_id) ON DELETE SET NULL;


--
-- Name: company_employees company_employees_uuid_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.company_employees
    ADD CONSTRAINT company_employees_uuid_fk FOREIGN KEY (employee_uuid) REFERENCES gethired.user_credentials(uid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoice_events invoice_events_invoice_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.invoice_events
    ADD CONSTRAINT invoice_events_invoice_fk FOREIGN KEY (invoice_id) REFERENCES gethired.invoices(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_category_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.jobs
    ADD CONSTRAINT jobs_category_fk FOREIGN KEY (job_category_id) REFERENCES gethired.category(job_category_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: jobs jobs_industry_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.jobs
    ADD CONSTRAINT jobs_industry_fk FOREIGN KEY (industry_id) REFERENCES gethired.industry(industry_id) ON UPDATE SET NULL ON DELETE SET NULL;


--
-- Name: jobs jobs_level_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.jobs
    ADD CONSTRAINT jobs_level_fk FOREIGN KEY (job_level_id) REFERENCES gethired.job_level(job_level_id) ON UPDATE SET NULL ON DELETE SET NULL;


--
-- Name: jobs jobs_role_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.jobs
    ADD CONSTRAINT jobs_role_fk FOREIGN KEY (job_role_id) REFERENCES gethired.job_role(job_role_id) ON UPDATE SET NULL ON DELETE SET NULL;


--
-- Name: jobs jobs_setup_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.jobs
    ADD CONSTRAINT jobs_setup_fk FOREIGN KEY (work_setup_id) REFERENCES gethired.work_setup(work_setup_id) ON UPDATE SET NULL ON DELETE SET NULL;


--
-- Name: jobs jobs_status_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.jobs
    ADD CONSTRAINT jobs_status_fk FOREIGN KEY (job_status_id) REFERENCES gethired.job_status(job_status_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: jobs jobs_type_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.jobs
    ADD CONSTRAINT jobs_type_fk FOREIGN KEY (job_type_id) REFERENCES gethired.job_type(job_type_id) ON UPDATE SET NULL ON DELETE SET NULL;


--
-- Name: team_roles team_roles_fk_company; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.team_roles
    ADD CONSTRAINT team_roles_fk_company FOREIGN KEY (company_id) REFERENCES gethired.companies(company_id) ON DELETE CASCADE;


--
-- Name: user_credentials user_credentials_role_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.user_credentials
    ADD CONSTRAINT user_credentials_role_fk FOREIGN KEY (role) REFERENCES gethired.access_roles(id) ON UPDATE SET NULL ON DELETE SET NULL;


--
-- Name: users users_credentials_fk; Type: FK CONSTRAINT; Schema: gethired; Owner: -
--

ALTER TABLE ONLY gethired.users
    ADD CONSTRAINT users_credentials_fk FOREIGN KEY (uid) REFERENCES gethired.user_credentials(uid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--
