--
-- PostgreSQL database dump
--

\restrict kMzWP0At2ElHUT2qPxnfDhfANQoecuK5qVrzdsKFtoenVlj0XEOPDGBvaM9Sl37

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

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

--
-- Name: cleanup_expired_otp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_otp() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM pic_otp 
    WHERE expires_at < NOW() OR is_used = true;
END;
$$;


ALTER FUNCTION public.cleanup_expired_otp() OWNER TO postgres;

--
-- Name: remove_numeric_prefix(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.remove_numeric_prefix(input_text text) RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN REGEXP_REPLACE(input_text, '^[0-9]+', '');
END;
$$;


ALTER FUNCTION public.remove_numeric_prefix(input_text text) OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: procedure_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.procedure_files (
    id integer NOT NULL,
    nomor_dokumen character varying(100) NOT NULL,
    file_name character varying(500) NOT NULL,
    file_path character varying(1000) NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100) DEFAULT 'application/pdf'::character varying,
    version integer DEFAULT 1,
    is_active boolean DEFAULT true,
    uploaded_by character varying(100),
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.procedure_files OWNER TO postgres;

--
-- Name: active_procedure_files; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.active_procedure_files AS
 SELECT DISTINCT ON (nomor_dokumen) id,
    nomor_dokumen,
    file_name,
    file_path,
    file_size,
    mime_type,
    version,
    uploaded_by,
    uploaded_at
   FROM public.procedure_files
  WHERE (is_active = true)
  ORDER BY nomor_dokumen, version DESC, uploaded_at DESC;


ALTER VIEW public.active_procedure_files OWNER TO postgres;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer,
    username character varying(100),
    activity_type character varying(50) NOT NULL,
    activity_description text NOT NULL,
    target_type character varying(50),
    target_id character varying(100),
    ip_address character varying(50),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: arsip_prosedur; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.arsip_prosedur (
    id integer NOT NULL,
    nama_dokumen character varying(500) NOT NULL,
    nomor_dokumen character varying(100) NOT NULL,
    level_dokumen character varying(50) NOT NULL,
    tanggal_selesai_approval character varying(50) NOT NULL,
    revisi character varying(20) NOT NULL,
    owner character varying(200) NOT NULL,
    pic character varying(500) NOT NULL,
    status character varying(20) DEFAULT '-'::character varying,
    is_custom boolean DEFAULT false,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    email character varying(500)
);


ALTER TABLE public.arsip_prosedur OWNER TO postgres;

--
-- Name: arsip_prosedur_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.arsip_prosedur_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.arsip_prosedur_id_seq OWNER TO postgres;

--
-- Name: arsip_prosedur_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.arsip_prosedur_id_seq OWNED BY public.arsip_prosedur.id;


--
-- Name: backup_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.backup_schedules (
    id integer NOT NULL,
    nomor_dokumen character varying(100) NOT NULL,
    scheduled_email_at timestamp without time zone NOT NULL,
    email_status character varying(20) DEFAULT 'pending'::character varying,
    last_sent_at timestamp without time zone,
    retry_count integer DEFAULT 0,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.backup_schedules OWNER TO postgres;

--
-- Name: backup_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.backup_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.backup_schedules_id_seq OWNER TO postgres;

--
-- Name: backup_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.backup_schedules_id_seq OWNED BY public.backup_schedules.id;


--
-- Name: document_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_reviews (
    id integer NOT NULL,
    nomor_dokumen character varying(100) NOT NULL,
    status character varying(20) NOT NULL,
    revisi character varying(20) NOT NULL,
    last_reviewed_month integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_reviews OWNER TO postgres;

--
-- Name: document_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_reviews_id_seq OWNER TO postgres;

--
-- Name: document_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_reviews_id_seq OWNED BY public.document_reviews.id;


--
-- Name: email_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_schedules (
    id integer NOT NULL,
    nomor_dokumen character varying(100) NOT NULL,
    scheduled_email_at timestamp without time zone NOT NULL,
    email_status character varying(20) DEFAULT 'pending'::character varying,
    last_sent_at timestamp without time zone,
    retry_count integer DEFAULT 0,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.email_schedules OWNER TO postgres;

--
-- Name: email_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_schedules_id_seq OWNER TO postgres;

--
-- Name: email_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_schedules_id_seq OWNED BY public.email_schedules.id;


--
-- Name: pic_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pic_activities (
    id integer NOT NULL,
    pic_id integer NOT NULL,
    activity_type character varying(50) NOT NULL,
    description character varying(500),
    ip_address character varying(50),
    user_agent text,
    target_type character varying(50),
    target_id character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pic_activities OWNER TO postgres;

--
-- Name: pic_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pic_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pic_activities_id_seq OWNER TO postgres;

--
-- Name: pic_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pic_activities_id_seq OWNED BY public.pic_activities.id;


--
-- Name: pic_document_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pic_document_requests (
    id integer NOT NULL,
    pic_id integer NOT NULL,
    document_number character varying(100) NOT NULL,
    title character varying(500) NOT NULL,
    description text,
    reason text,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp without time zone,
    read_by character varying(100)
);


ALTER TABLE public.pic_document_requests OWNER TO postgres;

--
-- Name: pic_document_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pic_document_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pic_document_requests_id_seq OWNER TO postgres;

--
-- Name: pic_document_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pic_document_requests_id_seq OWNED BY public.pic_document_requests.id;


--
-- Name: pic_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pic_documents (
    id integer NOT NULL,
    pic_id integer NOT NULL,
    document_number character varying(100) NOT NULL,
    title character varying(500) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pic_documents OWNER TO postgres;

--
-- Name: pic_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pic_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pic_documents_id_seq OWNER TO postgres;

--
-- Name: pic_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pic_documents_id_seq OWNED BY public.pic_documents.id;


--
-- Name: pic_otp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pic_otp (
    id integer NOT NULL,
    pic character varying(100) NOT NULL,
    otp_code character varying(6) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pic_otp OWNER TO postgres;

--
-- Name: pic_otp_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pic_otp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pic_otp_id_seq OWNER TO postgres;

--
-- Name: pic_otp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pic_otp_id_seq OWNED BY public.pic_otp.id;


--
-- Name: pic_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pic_requests (
    id integer NOT NULL,
    pic_id integer NOT NULL,
    document_id integer NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pic_requests OWNER TO postgres;

--
-- Name: pic_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pic_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pic_requests_id_seq OWNER TO postgres;

--
-- Name: pic_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pic_requests_id_seq OWNED BY public.pic_requests.id;


--
-- Name: pic_review_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pic_review_requests (
    id integer NOT NULL,
    pic_id integer NOT NULL,
    nomor_dokumen character varying(100) NOT NULL,
    nama_dokumen character varying(500) NOT NULL,
    notes text,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp without time zone,
    read_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pic_review_requests OWNER TO postgres;

--
-- Name: pic_review_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pic_review_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pic_review_requests_id_seq OWNER TO postgres;

--
-- Name: pic_review_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pic_review_requests_id_seq OWNED BY public.pic_review_requests.id;


--
-- Name: pic_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pic_users (
    id integer NOT NULL,
    email character varying(200) NOT NULL,
    password character varying(255) NOT NULL,
    full_name character varying(200) NOT NULL,
    department character varying(200),
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pic_users OWNER TO postgres;

--
-- Name: pic_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pic_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pic_users_id_seq OWNER TO postgres;

--
-- Name: pic_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pic_users_id_seq OWNED BY public.pic_users.id;


--
-- Name: procedure_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.procedure_documents (
    id integer NOT NULL,
    nama_dokumen character varying(500) NOT NULL,
    nomor_dokumen character varying(100) NOT NULL,
    level_dokumen character varying(50) NOT NULL,
    tanggal_selesai_approval date NOT NULL,
    revisi character varying(20) NOT NULL,
    owner character varying(200) NOT NULL,
    pic character varying(500) NOT NULL,
    status character varying(20) DEFAULT '-'::character varying,
    is_custom boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    email character varying(500)
);


ALTER TABLE public.procedure_documents OWNER TO postgres;

--
-- Name: procedure_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.procedure_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.procedure_documents_id_seq OWNER TO postgres;

--
-- Name: procedure_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.procedure_documents_id_seq OWNED BY public.procedure_documents.id;


--
-- Name: procedure_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.procedure_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.procedure_files_id_seq OWNER TO postgres;

--
-- Name: procedure_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.procedure_files_id_seq OWNED BY public.procedure_files.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    full_name character varying(200) NOT NULL,
    email character varying(200),
    role character varying(50) DEFAULT 'admin'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: arsip_prosedur id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.arsip_prosedur ALTER COLUMN id SET DEFAULT nextval('public.arsip_prosedur_id_seq'::regclass);


--
-- Name: backup_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backup_schedules ALTER COLUMN id SET DEFAULT nextval('public.backup_schedules_id_seq'::regclass);


--
-- Name: document_reviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_reviews ALTER COLUMN id SET DEFAULT nextval('public.document_reviews_id_seq'::regclass);


--
-- Name: email_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_schedules ALTER COLUMN id SET DEFAULT nextval('public.email_schedules_id_seq'::regclass);


--
-- Name: pic_activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_activities ALTER COLUMN id SET DEFAULT nextval('public.pic_activities_id_seq'::regclass);


--
-- Name: pic_document_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_document_requests ALTER COLUMN id SET DEFAULT nextval('public.pic_document_requests_id_seq'::regclass);


--
-- Name: pic_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_documents ALTER COLUMN id SET DEFAULT nextval('public.pic_documents_id_seq'::regclass);


--
-- Name: pic_otp id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_otp ALTER COLUMN id SET DEFAULT nextval('public.pic_otp_id_seq'::regclass);


--
-- Name: pic_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_requests ALTER COLUMN id SET DEFAULT nextval('public.pic_requests_id_seq'::regclass);


--
-- Name: pic_review_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_review_requests ALTER COLUMN id SET DEFAULT nextval('public.pic_review_requests_id_seq'::regclass);


--
-- Name: pic_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_users ALTER COLUMN id SET DEFAULT nextval('public.pic_users_id_seq'::regclass);


--
-- Name: procedure_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.procedure_documents ALTER COLUMN id SET DEFAULT nextval('public.procedure_documents_id_seq'::regclass);


--
-- Name: procedure_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.procedure_files ALTER COLUMN id SET DEFAULT nextval('public.procedure_files_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.activity_logs VALUES (1, NULL, 'user', 'review', 'Batch review Relevan untuk DA-39', 'review', 'DA-39', '::ffff:192.168.1.22', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36', '2026-02-21 09:20:00.395256');
INSERT INTO public.activity_logs VALUES (2, NULL, 'admin', 'create', 'Tambah prosedur baru WR-01-01', 'procedure', 'WR-01-01', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 09:29:11.752382');
INSERT INTO public.activity_logs VALUES (3, NULL, 'user', 'review', 'Batch review Revisi untuk Weekly Report - W1', 'review', 'WR-01-01', '::ffff:192.168.1.22', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36', '2026-02-21 09:30:01.228399');
INSERT INTO public.activity_logs VALUES (4, NULL, 'admin', 'create', 'Tambah prosedur baru test_puasa_d4', 'procedure', 'RMD-02-22', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 10:02:30.813906');
INSERT INTO public.activity_logs VALUES (5, NULL, 'admin', 'archive', 'Archive prosedur RMD-02-22', 'procedure', 'RMD-02-22', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 10:02:47.547012');
INSERT INTO public.activity_logs VALUES (6, NULL, 'admin', 'restore', 'Restore prosedur test_puasa_d4', 'procedure', 'RMD-02-22', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 10:03:14.952831');
INSERT INTO public.activity_logs VALUES (7, NULL, 'admin', 'archive', 'Archive prosedur RMD-02-22', 'procedure', 'RMD-02-22', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 10:03:25.795522');
INSERT INTO public.activity_logs VALUES (8, NULL, 'admin', 'delete', 'Hapus permanen prosedur test_puasa_d4', 'procedure', 'RMD-02-22', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 10:03:34.659431');
INSERT INTO public.activity_logs VALUES (9, NULL, 'admin', 'archive', 'Archive prosedur Weekly Report - W1', 'procedure', 'WR-01-01', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 10:07:58.479619');
INSERT INTO public.activity_logs VALUES (10, NULL, 'admin', 'restore', 'Restore prosedur Weekly Report - W1', 'procedure', 'WR-01-01', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 10:08:21.649043');
INSERT INTO public.activity_logs VALUES (11, NULL, 'admin', 'review', 'Batch review Relevan untuk Weekly Report - W1', 'review', 'WR-01-01', '::ffff:192.168.1.22', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36', '2026-02-21 10:44:50.611196');
INSERT INTO public.activity_logs VALUES (12, NULL, 'DP', 'review', 'Batch review Revisi untuk Weekly Report - W1', 'review', 'WR-01-01', '::ffff:192.168.1.22', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36', '2026-02-21 10:51:52.781771');
INSERT INTO public.activity_logs VALUES (13, NULL, 'admin', 'upload', 'Upload file v1_WR-01-01_Daniar-Priambodo-week-1-4-report---Sheet1_20260221.pdf untuk WR-01-01', 'file', 'WR-01-01', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 10:53:56.056493');
INSERT INTO public.activity_logs VALUES (14, NULL, 'admin', 'upload', 'Upload file Daniar Priambodo_week 1-4 report - Sheet1.pdf untuk WR-01-01', 'file', 'WR-01-01', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 11:08:51.067253');
INSERT INTO public.activity_logs VALUES (15, NULL, 'admin', 'upload', 'Upload file Daniar Priambodo_week 1-4 report - Sheet1.pdf untuk Weekly Report - W1', 'file', 'WR-01-01', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 11:13:41.500134');
INSERT INTO public.activity_logs VALUES (16, 1, 'admin', 'login', 'User admin login', 'user', '1', '::ffff:192.168.1.17', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36', '2026-02-21 15:58:48.213484');
INSERT INTO public.activity_logs VALUES (17, NULL, 'admin', 'create', 'Tambah prosedur baru testing', 'procedure', '09', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 16:00:43.832405');
INSERT INTO public.activity_logs VALUES (18, NULL, 'admin', 'upload', 'Upload file JAM KERJA 2026_(14Jan26).pdf untuk testing', 'file', '09', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 16:03:43.039191');
INSERT INTO public.activity_logs VALUES (19, NULL, 'admin', 'create', 'Tambah prosedur baru Testing', 'procedure', '0', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 16:05:34.666432');
INSERT INTO public.activity_logs VALUES (20, NULL, 'admin', 'create', 'Tambah prosedur baru test', 'procedure', '03', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 16:07:07.707957');
INSERT INTO public.activity_logs VALUES (21, NULL, 'admin', 'create', 'Tambah prosedur baru test00', 'procedure', '89', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 16:09:21.32506');
INSERT INTO public.activity_logs VALUES (22, NULL, 'admin', 'create', 'Tambah prosedur baru Jadwal Jai', 'procedure', '090', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 16:10:30.270591');
INSERT INTO public.activity_logs VALUES (23, NULL, 'DPA', 'review', 'Batch review Relevan untuk Jadwal Jai', 'review', '090', '::ffff:192.168.1.17', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36', '2026-02-21 16:12:35.379657');
INSERT INTO public.activity_logs VALUES (24, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-25 10:34:39.262236');
INSERT INTO public.activity_logs VALUES (25, NULL, 'admin', 'create', 'Tambah prosedur baru daniar_jai', 'procedure', '00009', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-25 11:14:29.187914');
INSERT INTO public.activity_logs VALUES (26, NULL, 'admin', 'upload', 'Upload file JAM KERJA 2026_(14Jan26).pdf untuk Jadwal Jai', 'file', '090', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-25 11:19:50.528963');
INSERT INTO public.activity_logs VALUES (27, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-27 09:05:33.276232');
INSERT INTO public.activity_logs VALUES (28, NULL, 'admin', 'archive', 'Archive prosedur Jadwal Jai', 'procedure', '090', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-27 09:43:05.707965');
INSERT INTO public.activity_logs VALUES (29, NULL, 'admin', 'archive', 'Archive prosedur Testing', 'procedure', '0', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-27 09:43:14.867243');
INSERT INTO public.activity_logs VALUES (30, NULL, 'admin', 'archive', 'Archive prosedur testing', 'procedure', '09', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-27 09:43:20.19051');
INSERT INTO public.activity_logs VALUES (31, NULL, 'admin', 'delete', 'Hapus permanen prosedur testing', 'procedure', '09', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-27 09:54:24.20435');
INSERT INTO public.activity_logs VALUES (32, NULL, 'admin', 'delete', 'Hapus permanen prosedur Testing', 'procedure', '0', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-27 09:54:29.186081');
INSERT INTO public.activity_logs VALUES (33, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-27 11:34:14.678427');
INSERT INTO public.activity_logs VALUES (34, NULL, 'admin', 'create', 'Tambah prosedur baru Proposal Magang JAI', 'procedure', 'PRP-0909', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-27 12:40:16.76706');
INSERT INTO public.activity_logs VALUES (35, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-02 07:28:13.762898');
INSERT INTO public.activity_logs VALUES (36, NULL, 'admin', 'create', 'Tambah prosedur baru TEST_1', 'procedure', '010101', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-04 09:45:02.415888');
INSERT INTO public.activity_logs VALUES (37, NULL, 'admin', 'create', 'Tambah prosedur baru TEST_2', 'procedure', '020202', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-04 09:45:47.060579');
INSERT INTO public.activity_logs VALUES (38, NULL, 'admin', 'upload', 'Upload file Proposal KP (PT JAI).pdf untuk Proposal Magang JAI', 'file', 'PRP-0909', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-04 12:19:47.951262');
INSERT INTO public.activity_logs VALUES (39, NULL, 'admin', 'upload', 'Upload file Push Gauge.pdf untuk TEST_1', 'file', '010101', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 08:39:59.605863');
INSERT INTO public.activity_logs VALUES (40, NULL, 'DP', 'review', 'PIC DP membaca dokumen TEST_1', 'procedure', '010101', '::ffff:192.168.1.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 08:56:03.944552');
INSERT INTO public.activity_logs VALUES (41, NULL, 'admin', 'upload', 'Upload file Proposal KP (PT JAI).pdf untuk Proposal Magang JAI', 'file', 'PRP-0909', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 09:11:58.331093');
INSERT INTO public.activity_logs VALUES (42, NULL, 'DP', 'review', 'Batch review Relevan untuk TEST_1', 'review', '010101', '::ffff:192.168.1.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 09:16:29.493032');
INSERT INTO public.activity_logs VALUES (43, NULL, 'admin', 'archive', 'Archive prosedur test', 'procedure', '03', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 11:26:14.15595');
INSERT INTO public.activity_logs VALUES (44, NULL, 'admin', 'archive', 'Archive prosedur daniar_jai', 'procedure', '00009', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 11:28:52.318182');
INSERT INTO public.activity_logs VALUES (45, NULL, 'admin', 'archive', 'Archive prosedur test00', 'procedure', '89', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 11:28:58.245329');
INSERT INTO public.activity_logs VALUES (46, NULL, 'admin', 'archive', 'Archive prosedur TEST_2', 'procedure', '020202', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 11:29:05.36888');
INSERT INTO public.activity_logs VALUES (47, NULL, 'admin', 'delete', 'Hapus permanen prosedur test', 'procedure', '03', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 11:37:34.830918');
INSERT INTO public.activity_logs VALUES (48, NULL, 'admin', 'delete', 'Hapus permanen prosedur TEST_2', 'procedure', '020202', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 11:37:38.289138');
INSERT INTO public.activity_logs VALUES (49, NULL, 'admin', 'delete', 'Hapus permanen prosedur test00', 'procedure', '89', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 11:37:41.239929');
INSERT INTO public.activity_logs VALUES (50, NULL, 'admin', 'delete', 'Hapus permanen prosedur daniar_jai', 'procedure', '00009', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 11:37:44.516281');
INSERT INTO public.activity_logs VALUES (51, NULL, 'admin', 'create', 'Tambah prosedur baru QR_QA', 'procedure', 'T-0909', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 11:42:30.7864');
INSERT INTO public.activity_logs VALUES (52, NULL, 'admin', 'create', 'Tambah prosedur baru QR_GA', 'procedure', 'T-0900', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 11:43:21.706744');
INSERT INTO public.activity_logs VALUES (53, NULL, 'DP', 'review', 'PIC DP membaca dokumen QR_GA', 'procedure', 'T-0900', '::ffff:192.168.1.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 11:59:33.311711');
INSERT INTO public.activity_logs VALUES (54, NULL, 'admin', 'upload', 'Upload file Daniar Priambodo_week 1-4 report - Sheet1.pdf untuk QR_QA', 'file', 'T-0909', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 12:00:26.361393');
INSERT INTO public.activity_logs VALUES (55, NULL, 'admin', 'upload', 'Upload file pppp.pdf untuk QR_GA', 'file', 'T-0900', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 12:00:37.876978');
INSERT INTO public.activity_logs VALUES (56, NULL, 'DP', 'review', 'PIC DP membaca dokumen QR_QA', 'procedure', 'T-0909', '::ffff:192.168.1.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 12:01:01.025964');
INSERT INTO public.activity_logs VALUES (57, NULL, 'admin', 'create', 'Tambah prosedur baru MINE', 'procedure', 'TRX-090', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 13:10:44.349296');
INSERT INTO public.activity_logs VALUES (58, NULL, 'DP', 'review', 'PIC DP membaca dokumen Proposal Magang JAI', 'procedure', 'PRP-0909', '::ffff:192.168.1.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 15:06:32.434718');
INSERT INTO public.activity_logs VALUES (59, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-11 09:56:17.797493');
INSERT INTO public.activity_logs VALUES (60, NULL, 'admin', 'create', 'Tambah prosedur baru Test Hari Ini', 'procedure', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 10:03:43.998014');
INSERT INTO public.activity_logs VALUES (61, NULL, 'admin', 'create', 'Tambah prosedur baru test hari ini 2', 'procedure', '09092', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 10:05:37.506239');
INSERT INTO public.activity_logs VALUES (62, NULL, 'admin', 'create', 'Tambah prosedur baru 123', 'procedure', '13215', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 10:07:10.412966');
INSERT INTO public.activity_logs VALUES (63, NULL, 'DP', 'review', 'PIC DP membaca dokumen test hari ini 2', 'procedure', '09092', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 11:54:34.822243');
INSERT INTO public.activity_logs VALUES (64, NULL, 'DP', 'review', 'PIC DP membaca dokumen Test Hari Ini', 'procedure', '1', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 12:00:39.020524');
INSERT INTO public.activity_logs VALUES (65, NULL, 'admin', 'upload', 'Upload file pppp.pdf untuk 123', 'file', '13215', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 12:02:03.667327');
INSERT INTO public.activity_logs VALUES (66, NULL, 'DP', 'review', 'PIC DP membaca dokumen 123', 'procedure', '13215', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 12:26:26.177904');
INSERT INTO public.activity_logs VALUES (67, NULL, 'DP', 'review', 'Batch review Relevan untuk 123', 'review', '13215', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 12:27:06.298243');
INSERT INTO public.activity_logs VALUES (68, NULL, 'FS', 'review', 'PIC FS membaca dokumen MINE', 'procedure', 'TRX-090', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 12:32:45.300994');
INSERT INTO public.activity_logs VALUES (69, NULL, 'DP', 'review', 'Batch review Relevan untuk Proposal Magang JAI', 'review', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 12:33:34.307196');
INSERT INTO public.activity_logs VALUES (171, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-21 08:50:36.292321');
INSERT INTO public.activity_logs VALUES (70, NULL, 'DP', 'review', 'Batch review Relevan untuk Weekly Report - W1', 'review', 'WR-01-01', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 12:33:34.321804');
INSERT INTO public.activity_logs VALUES (71, NULL, 'DP', 'review', 'PIC DP membaca dokumen test hari ini 2', 'procedure', '09092', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 13:17:38.806799');
INSERT INTO public.activity_logs VALUES (72, NULL, 'DP', 'review', 'PIC DP membaca dokumen QR_GA', 'procedure', 'T-0900', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 13:17:46.097805');
INSERT INTO public.activity_logs VALUES (73, NULL, 'DP', 'review', 'PIC DP membaca dokumen test hari ini 2', 'procedure', '09092', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 13:20:58.293688');
INSERT INTO public.activity_logs VALUES (74, NULL, 'DP', 'review', 'PIC DP membaca dokumen Proposal Magang JAI', 'procedure', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 13:21:20.268188');
INSERT INTO public.activity_logs VALUES (75, NULL, 'DP', 'review', 'PIC DP membaca dokumen Proposal Magang JAI', 'procedure', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 13:28:57.930955');
INSERT INTO public.activity_logs VALUES (76, NULL, 'DP', 'review', 'Batch review Relevan untuk Proposal Magang JAI', 'review', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 13:29:04.031377');
INSERT INTO public.activity_logs VALUES (77, NULL, 'DP', 'review', 'PIC DP membaca dokumen Proposal Magang JAI', 'procedure', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 13:49:09.892112');
INSERT INTO public.activity_logs VALUES (78, NULL, 'DP', 'review', 'PIC DP membaca dokumen Proposal Magang JAI', 'procedure', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 13:49:33.0108');
INSERT INTO public.activity_logs VALUES (79, NULL, 'DP', 'review', 'Batch review Relevan untuk Proposal Magang JAI', 'review', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:12:55.523934');
INSERT INTO public.activity_logs VALUES (80, NULL, 'admin', 'archive', 'Archive prosedur Weekly Report - W1', 'procedure', 'WR-01-01', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:19:13.801112');
INSERT INTO public.activity_logs VALUES (81, NULL, 'admin', 'archive', 'Archive prosedur test_puasa_d3', 'procedure', 'RMD-02-21', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:19:20.573107');
INSERT INTO public.activity_logs VALUES (82, NULL, 'admin', 'archive', 'Archive prosedur test_procedure', 'procedure', 'DA-39', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:19:28.289264');
INSERT INTO public.activity_logs VALUES (83, NULL, 'DP', 'review', 'PIC DP membaca dokumen Proposal Magang JAI', 'procedure', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:33:07.809714');
INSERT INTO public.activity_logs VALUES (84, NULL, 'DP', 'review', 'Batch review Relevan untuk Proposal Magang JAI', 'review', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:36:44.025983');
INSERT INTO public.activity_logs VALUES (85, NULL, 'DP', 'review', 'PIC DP membaca dokumen Proposal Magang JAI', 'procedure', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:42:54.637865');
INSERT INTO public.activity_logs VALUES (86, NULL, 'DP', 'review', 'Batch review Relevan untuk Proposal Magang JAI', 'review', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:43:05.396447');
INSERT INTO public.activity_logs VALUES (87, NULL, 'DP', 'review', 'PIC DP membaca dokumen Proposal Magang JAI', 'procedure', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:48:52.368947');
INSERT INTO public.activity_logs VALUES (88, NULL, 'DP', 'review', 'Batch review Relevan untuk Proposal Magang JAI', 'review', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:49:02.436996');
INSERT INTO public.activity_logs VALUES (89, NULL, 'DP', 'review', 'Batch review Relevan untuk Test Hari Ini', 'review', '1', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:49:32.79642');
INSERT INTO public.activity_logs VALUES (90, NULL, 'DP', 'review', 'Batch review Relevan untuk test hari ini 2', 'review', '09092', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:49:32.818138');
INSERT INTO public.activity_logs VALUES (91, NULL, 'DP', 'review', 'Batch review Relevan untuk QR_GA', 'review', 'T-0900', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:49:32.830347');
INSERT INTO public.activity_logs VALUES (92, NULL, 'DP', 'review', 'Batch review Relevan untuk QR_QA', 'review', 'T-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:49:32.843146');
INSERT INTO public.activity_logs VALUES (93, NULL, 'DP', 'review', 'Batch review Relevan untuk TEST_1', 'review', '010101', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:49:32.854328');
INSERT INTO public.activity_logs VALUES (94, NULL, 'FS', 'review', 'Batch review Relevan untuk MINE', 'review', 'TRX-090', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:49:54.560038');
INSERT INTO public.activity_logs VALUES (95, NULL, 'DP', 'review', 'PIC DP membaca dokumen test hari ini 2', 'procedure', '09092', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:52:48.950932');
INSERT INTO public.activity_logs VALUES (96, NULL, 'DP', 'review', 'Batch review Relevan untuk test hari ini 2', 'review', '09092', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 14:52:57.022399');
INSERT INTO public.activity_logs VALUES (97, NULL, 'DP', 'review', 'Batch review Relevan untuk Test Hari Ini', 'review', '1', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 15:02:40.441294');
INSERT INTO public.activity_logs VALUES (98, NULL, 'DP', 'review', 'PIC DP membaca dokumen Proposal Magang JAI', 'procedure', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 15:04:52.053743');
INSERT INTO public.activity_logs VALUES (99, NULL, 'DP', 'review', 'Batch review Revisi untuk Proposal Magang JAI', 'review', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 15:05:05.051124');
INSERT INTO public.activity_logs VALUES (100, NULL, 'DP', 'review', 'Batch review Relevan untuk Proposal Magang JAI', 'review', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 15:10:02.127863');
INSERT INTO public.activity_logs VALUES (101, NULL, 'DP', 'review', 'PIC DP membaca dokumen Proposal Magang JAI', 'procedure', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 15:12:38.387377');
INSERT INTO public.activity_logs VALUES (102, NULL, 'DP', 'review', 'Batch review Revisi untuk Proposal Magang JAI', 'review', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 15:12:48.054162');
INSERT INTO public.activity_logs VALUES (103, NULL, 'DP', 'review', 'PIC DP membaca dokumen Proposal Magang JAI', 'procedure', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 15:14:44.997624');
INSERT INTO public.activity_logs VALUES (104, NULL, 'DP', 'review', 'Batch review Relevan untuk Proposal Magang JAI', 'review', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 15:14:58.603355');
INSERT INTO public.activity_logs VALUES (105, NULL, 'ISR', 'review', 'PIC ISR membaca dokumen Risk Analysis', 'procedure', 'BPR-W-01', '::ffff:192.168.1.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0', '2026-03-12 16:06:26.134712');
INSERT INTO public.activity_logs VALUES (106, NULL, 'ISR', 'review', 'Batch review Relevan untuk Risk Analysis', 'review', 'BPR-W-01', '::ffff:192.168.1.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0', '2026-03-12 16:08:05.788115');
INSERT INTO public.activity_logs VALUES (107, NULL, 'ISR', 'review', 'Batch review Obsolete untuk Pemeliharaan & Pengembangan Kompetensi Auditor', 'review', 'IAU-W-07', '::ffff:192.168.1.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0', '2026-03-12 16:08:05.800911');
INSERT INTO public.activity_logs VALUES (108, NULL, 'ISR', 'review', 'Batch review Revisi untuk Second Party Audit', 'review', 'IAU-W-09', '::ffff:192.168.1.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0', '2026-03-12 16:08:05.80987');
INSERT INTO public.activity_logs VALUES (109, NULL, 'ISR', 'review', 'Batch review Relevan untuk Customer Satisfaction', 'review', 'BOS-W-02', '::ffff:192.168.1.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0', '2026-03-12 16:08:05.818144');
INSERT INTO public.activity_logs VALUES (110, NULL, 'ISR', 'review', 'Batch review Revisi untuk Quality Management System Audit', 'review', 'IAU-W-01', '::ffff:192.168.1.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0', '2026-03-12 16:08:05.826479');
INSERT INTO public.activity_logs VALUES (111, NULL, 'ISR', 'review', 'Batch review Obsolete untuk Pengisian Form Corrective Action Request (CAR)', 'review', 'IAU-W-02', '::ffff:192.168.1.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0', '2026-03-12 16:08:05.835394');
INSERT INTO public.activity_logs VALUES (112, NULL, 'DP', 'review', 'PIC DP membaca dokumen Proposal Magang JAI', 'procedure', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-13 10:17:55.340315');
INSERT INTO public.activity_logs VALUES (113, NULL, 'DP', 'review', 'Batch review Revisi untuk Proposal Magang JAI', 'review', 'PRP-0909', '::ffff:192.168.1.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-13 10:30:13.773185');
INSERT INTO public.activity_logs VALUES (114, NULL, 'DP', 'review', 'PIC DP membaca dokumen 123', 'procedure', '13215', '::ffff:192.168.1.24', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-27 08:21:34.627877');
INSERT INTO public.activity_logs VALUES (115, NULL, 'DP', 'review', 'Batch review Relevan untuk 123', 'review', '13215', '::ffff:192.168.1.24', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-27 08:22:33.116574');
INSERT INTO public.activity_logs VALUES (116, NULL, 'admin', 'create', 'Tambah prosedur baru dokumen-januari', 'procedure', '0091J', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-27 08:34:51.623024');
INSERT INTO public.activity_logs VALUES (117, NULL, 'admin', 'upload', 'Upload file projek_web_peminjaman.pdf untuk dokumen-januari', 'file', '0091J', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-27 08:35:07.857372');
INSERT INTO public.activity_logs VALUES (118, NULL, 'DP', 'review', 'PIC DP membaca dokumen dokumen-januari', 'procedure', '0091J', '::ffff:192.168.1.24', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-27 08:36:53.283196');
INSERT INTO public.activity_logs VALUES (119, NULL, 'admin', 'create', 'Tambah prosedur baru dokumen-mei', 'procedure', '01928Q', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-27 10:00:09.605975');
INSERT INTO public.activity_logs VALUES (120, NULL, 'DP', 'review', 'Batch review Relevan untuk dokumen-januari', 'review', '0091J', '::ffff:192.168.1.24', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-27 10:29:15.726274');
INSERT INTO public.activity_logs VALUES (121, NULL, 'DP', 'review', 'Batch review Relevan untuk Proposal Magang JAI', 'review', 'PRP-0909', '::ffff:192.168.1.24', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-27 10:29:15.747341');
INSERT INTO public.activity_logs VALUES (122, NULL, 'admin', 'archive', 'Archive prosedur dokumen-mei', 'procedure', '01928Q', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-28 09:47:10.644725');
INSERT INTO public.activity_logs VALUES (123, NULL, 'admin', 'create', 'Tambah prosedur baru review-mei', 'procedure', '0182JJ', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-28 09:52:12.650315');
INSERT INTO public.activity_logs VALUES (124, NULL, 'admin', 'archive', 'Archive prosedur review-mei', 'procedure', '0182JJ', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-28 09:52:46.631765');
INSERT INTO public.activity_logs VALUES (125, NULL, 'admin', 'create', 'Tambah prosedur baru review-mei', 'procedure', '01293QQ', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-28 09:53:28.044362');
INSERT INTO public.activity_logs VALUES (126, NULL, 'admin', 'create', 'Tambah prosedur baru daniar', 'procedure', '091J', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-28 09:55:53.132309');
INSERT INTO public.activity_logs VALUES (127, NULL, 'admin', 'archive', 'Archive prosedur daniar', 'procedure', '091J', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-28 10:31:09.364074');
INSERT INTO public.activity_logs VALUES (128, NULL, 'admin', 'archive', 'Archive prosedur review-mei', 'procedure', '01293QQ', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-28 10:31:14.240938');
INSERT INTO public.activity_logs VALUES (129, NULL, 'admin', 'create', 'Tambah prosedur baru test-prosedur', 'procedure', '0108-JJ', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-28 10:32:21.065666');
INSERT INTO public.activity_logs VALUES (130, NULL, 'DP', 'review', 'PIC DP membaca dokumen test-prosedur', 'procedure', '0108-JJ', '::ffff:192.168.1.24', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-28 10:36:24.478658');
INSERT INTO public.activity_logs VALUES (131, NULL, 'admin', 'create', 'Tambah prosedur baru test-test', 'procedure', '09-QQ', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 03:40:29.663586');
INSERT INTO public.activity_logs VALUES (132, NULL, 'admin', 'archive', 'Archive prosedur test-test', 'procedure', '09-QQ', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 03:40:47.905198');
INSERT INTO public.activity_logs VALUES (133, NULL, 'admin', 'create', 'Tambah prosedur baru test-test', 'procedure', 'QQ-0909', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 03:41:55.251209');
INSERT INTO public.activity_logs VALUES (134, NULL, 'admin', 'create', 'Tambah prosedur baru LK-19', 'procedure', '0I8', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 03:43:14.828735');
INSERT INTO public.activity_logs VALUES (135, NULL, 'admin', 'create', 'Tambah prosedur baru PO', 'procedure', 'UU-9', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 03:43:57.780218');
INSERT INTO public.activity_logs VALUES (136, NULL, 'admin', 'create', 'Tambah prosedur baru KKI', 'procedure', 'KJ-89', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 03:48:35.240103');
INSERT INTO public.activity_logs VALUES (137, NULL, 'admin', 'create', 'Tambah prosedur baru DP', 'procedure', 'DI099', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 03:49:33.972534');
INSERT INTO public.activity_logs VALUES (138, NULL, 'admin', 'archive', 'Archive prosedur DP', 'procedure', 'DI099', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 04:14:12.023774');
INSERT INTO public.activity_logs VALUES (139, NULL, 'admin', 'archive', 'Archive prosedur KKI', 'procedure', 'KJ-89', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 04:14:18.135717');
INSERT INTO public.activity_logs VALUES (140, NULL, 'admin', 'archive', 'Archive prosedur PO', 'procedure', 'UU-9', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 04:14:24.31741');
INSERT INTO public.activity_logs VALUES (141, NULL, 'admin', 'archive', 'Archive prosedur LK-19', 'procedure', '0I8', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 04:14:30.199872');
INSERT INTO public.activity_logs VALUES (142, NULL, 'admin', 'create', 'Tambah prosedur baru DK-98', 'procedure', '09-LL', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 04:15:32.359061');
INSERT INTO public.activity_logs VALUES (143, NULL, 'admin', 'create', 'Tambah prosedur baru TEST-02', 'procedure', '3AQ', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 04:16:15.033666');
INSERT INTO public.activity_logs VALUES (144, NULL, 'admin', 'create', 'Tambah prosedur baru TEST-03', 'procedure', 'PP-09', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 04:16:54.165153');
INSERT INTO public.activity_logs VALUES (145, NULL, 'admin', 'archive', 'Archive prosedur TEST-03', 'procedure', 'PP-09', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 04:36:22.217306');
INSERT INTO public.activity_logs VALUES (146, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-31 16:10:55.924859');
INSERT INTO public.activity_logs VALUES (147, NULL, 'admin', 'create', 'Tambah prosedur baru Test_April', 'procedure', 'KJL-01', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-01 00:51:09.406708');
INSERT INTO public.activity_logs VALUES (148, NULL, 'DP', 'review', 'Batch review Relevan untuk Test_April', 'review', 'KJL-01', '::ffff:192.168.1.8', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-01 01:01:29.187906');
INSERT INTO public.activity_logs VALUES (149, NULL, 'DP', 'review', 'Batch review Relevan untuk test-prosedur', 'review', '0108-JJ', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-01 08:07:56.367973');
INSERT INTO public.activity_logs VALUES (150, 1, 'admin', 'login', 'User admin login', 'user', '1', '114.79.19.224', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-01 15:59:36.738199');
INSERT INTO public.activity_logs VALUES (151, NULL, 'admin', 'create', 'Tambah prosedur baru Test_April', 'procedure', '0909-DP', '114.79.19.224', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-01 16:00:34.38308');
INSERT INTO public.activity_logs VALUES (152, NULL, 'DP', 'review', 'Batch review Relevan untuk Test_April', 'review', '0909-DP', '114.79.19.224', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36', '2026-04-01 16:04:37.778196');
INSERT INTO public.activity_logs VALUES (153, NULL, 'admin', 'upload', 'Upload file Kode Qr Checksheet QA.pdf untuk Test_April', 'file', '0909-DP', '114.79.19.224', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-01 16:06:57.797889');
INSERT INTO public.activity_logs VALUES (154, 1, 'admin', 'login', 'User admin login', 'user', '1', '114.79.19.224', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-01 16:11:32.489583');
INSERT INTO public.activity_logs VALUES (155, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-08 08:52:33.094384');
INSERT INTO public.activity_logs VALUES (156, 1, 'admin', 'login', 'User admin login', 'user', '1', '::ffff:192.168.1.29', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-08 08:54:11.908225');
INSERT INTO public.activity_logs VALUES (157, 1, 'admin', 'login', 'User admin login', 'user', '1', '::ffff:192.168.1.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 03:41:37.393171');
INSERT INTO public.activity_logs VALUES (158, NULL, 'admin', 'update', 'Update prosedur Test Hari Ini 123 (1)', 'procedure', '1', '::ffff:192.168.1.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 03:49:20.166845');
INSERT INTO public.activity_logs VALUES (159, NULL, 'admin', 'update', 'Update prosedur TESTING APRIL_123 (123AAS)', 'procedure', '123AAS', '::ffff:192.168.1.29', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 10:48:38.131998');
INSERT INTO public.activity_logs VALUES (160, NULL, 'admin', 'update', 'Update prosedur TESTING APRIL 456 (123AAS)', 'procedure', '123AAS', '::ffff:192.168.1.29', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 10:49:19.747797');
INSERT INTO public.activity_logs VALUES (161, NULL, 'admin', 'update', 'Update prosedur TESTING APRIL 456 (123AAS)', 'procedure', '123', '::ffff:192.168.1.29', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 10:49:47.25282');
INSERT INTO public.activity_logs VALUES (162, NULL, 'admin', 'update', 'Update prosedur TESTING APRIL 456 (123)', 'procedure', 'TES-123', '::ffff:192.168.1.29', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 10:50:06.21922');
INSERT INTO public.activity_logs VALUES (163, NULL, 'admin', 'update', 'Update prosedur TESTING APRIL 123 (TES-123)', 'procedure', 'TES-123', '::ffff:192.168.1.29', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 10:57:18.786195');
INSERT INTO public.activity_logs VALUES (164, NULL, 'admin', 'archive', 'Archive prosedur TESTING APRIL 123', 'procedure', 'TES-123', '::ffff:192.168.1.29', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-09 13:55:49.181875');
INSERT INTO public.activity_logs VALUES (165, NULL, 'admin', 'update', 'Update prosedur Test_April_123 (0909-DP)', 'procedure', '0909-DP', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-10 13:44:55.91478');
INSERT INTO public.activity_logs VALUES (166, NULL, 'admin', 'update', 'Update prosedur Test_April_123_09 (0909-DP)', 'procedure', '0909-DP', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-10 13:45:42.625131');
INSERT INTO public.activity_logs VALUES (167, NULL, 'admin', 'update', 'Update prosedur Test April 00 (0909-DP)', 'procedure', '0909-DP', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-14 16:06:11.281481');
INSERT INTO public.activity_logs VALUES (168, NULL, 'admin', 'update', 'Update prosedur Test April 00 Update (0909-DP)', 'procedure', '0909-DP', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-15 03:10:14.162311');
INSERT INTO public.activity_logs VALUES (169, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-21 08:45:10.89439');
INSERT INTO public.activity_logs VALUES (170, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-21 08:46:29.661201');
INSERT INTO public.activity_logs VALUES (172, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-21 09:08:00.893984');
INSERT INTO public.activity_logs VALUES (173, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-21 09:20:53.324017');
INSERT INTO public.activity_logs VALUES (174, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-21 13:43:10.831722');
INSERT INTO public.activity_logs VALUES (175, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-21 15:45:02.790826');
INSERT INTO public.activity_logs VALUES (176, NULL, 'admin', 'create', 'Tambah prosedur baru TESTING_PROSEDUR_APRIL', 'procedure', 'AI_0912', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-21 15:46:36.449353');
INSERT INTO public.activity_logs VALUES (177, NULL, 'admin', 'create', 'Tambah prosedur baru TESTING_PROSEDUR_JULI', 'procedure', 'AI-0917', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-21 15:48:04.77965');
INSERT INTO public.activity_logs VALUES (178, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-22 07:28:26.833582');
INSERT INTO public.activity_logs VALUES (179, 1, 'admin', 'login', 'User admin login', 'user', '1', '::ffff:192.168.1.25', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-22 07:40:30.021497');
INSERT INTO public.activity_logs VALUES (180, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-24 07:27:11.377046');
INSERT INTO public.activity_logs VALUES (181, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-24 07:29:19.829771');
INSERT INTO public.activity_logs VALUES (182, NULL, 'DP', 'review', 'PIC DP membaca dokumen TESTING_PROSEDUR_JULI', 'procedure', 'AI-0917', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-24 07:30:47.200815');
INSERT INTO public.activity_logs VALUES (183, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-24 07:36:40.711339');
INSERT INTO public.activity_logs VALUES (184, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-24 09:45:45.259228');
INSERT INTO public.activity_logs VALUES (185, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-24 11:39:24.24148');
INSERT INTO public.activity_logs VALUES (186, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-24 14:52:26.086857');
INSERT INTO public.activity_logs VALUES (187, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-26 16:04:45.42005');
INSERT INTO public.activity_logs VALUES (188, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-26 21:16:09.327757');
INSERT INTO public.activity_logs VALUES (189, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-26 21:51:17.246842');
INSERT INTO public.activity_logs VALUES (190, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-27 07:32:10.592417');
INSERT INTO public.activity_logs VALUES (191, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-27 08:09:50.352531');
INSERT INTO public.activity_logs VALUES (192, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-28 07:31:00.975021');
INSERT INTO public.activity_logs VALUES (193, 1, 'admin', 'login', 'User admin login', 'user', '1', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-28 07:31:55.899794');


--
-- Data for Name: arsip_prosedur; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.arsip_prosedur VALUES (9, 'Jadwal Jai', '090', '1', '2026-02-21', '0', 'DPA', 'DPA', 'Relevan', true, '2026-02-21 16:10:30.184', '2026-02-21 16:12:34.943', '2026-02-27 09:43:05.578149', 'jikasmaniz86@gmail.com');
INSERT INTO public.arsip_prosedur VALUES (16, 'Weekly Report - W1', 'WR-01-01', '01', '2026-02-21T00:00:00.000+07:00', '2', 'DNR', 'DP', 'Relevan', true, '2026-02-21 09:29:11.68', '2026-03-12 12:33:34.252', '2026-03-12 14:19:13.710287', '123untuksemua0309@gmail.com');
INSERT INTO public.arsip_prosedur VALUES (17, 'test_puasa_d3', 'RMD-02-21', '3', '2026-02-21T00:00:00.000+07:00', '0', 'DNR', 'DP', 'Relevan', true, '2026-02-21 07:52:44.737', '2026-03-04 08:43:50.016', '2026-03-12 14:19:20.551005', '123untuksemua0309@gmail.com');
INSERT INTO public.arsip_prosedur VALUES (18, 'test_procedure', 'DA-39', '3', '2026-02-18T00:00:00.000+07:00', '1', 'PR', 'DP, US', 'Relevan', true, '2026-02-18 09:21:12.001', '2026-03-04 08:43:50.016', '2026-03-12 14:19:28.272025', '123daniarpriambodo11@gmail.com, untuksemua0309@gmail.com');
INSERT INTO public.arsip_prosedur VALUES (19, 'dokumen-mei', '01928Q', '1', '2026-05-28T00:00:00.000+07:00', '0', 'DP', 'DP', 'Relevan', true, '2026-03-27 10:00:09.517', '2026-03-27 10:00:09.517', '2026-03-28 09:47:10.557943', 'daniarpriambodo11@gmail.co,');
INSERT INTO public.arsip_prosedur VALUES (20, 'review-mei', '0182JJ', '1', '2026-05-28T00:00:00.000+07:00', '0', 'DP', 'DP', 'Belum dikirim', true, '2026-03-28 09:52:12.551', '2026-03-28 09:52:12.551', '2026-03-28 09:52:46.588503', 'daniarpriambodo11@gmail.com');
INSERT INTO public.arsip_prosedur VALUES (21, 'daniar', '091J', '1', '2026-05-28T00:00:00.000+07:00', '0', 'DP', 'DP', 'Belum dikirim', true, '2026-03-28 09:55:53.065', '2026-03-28 09:55:53.065', '2026-03-28 10:31:09.310834', 'daniarpriambodo11@gmail.com');
INSERT INTO public.arsip_prosedur VALUES (22, 'review-mei', '01293QQ', '1', '2026-05-29T00:00:00.000+07:00', '0', 'DP', 'DP', 'Belum dikirim', true, '2026-03-28 09:53:27.983', '2026-03-28 09:53:27.983', '2026-03-28 10:31:14.224411', 'daniarpriambodo11@gmail.com');
INSERT INTO public.arsip_prosedur VALUES (23, 'test-test', '09-QQ', '3', '2026-03-31T00:00:00.000+07:00', '0', 'DP', 'DP', 'Belum dikirim', true, '2026-03-31 03:40:29.576', '2026-03-31 03:40:29.576', '2026-03-31 03:40:47.87879', 'daniarpriambodo11@gmail.com');
INSERT INTO public.arsip_prosedur VALUES (24, 'DP', 'DI099', '3', '2026-02-27T00:00:00.000+07:00', '0', 'DP', 'DP', 'Belum dikirim', true, '2026-03-31 03:49:33.898', '2026-03-31 03:49:33.898', '2026-03-31 04:14:11.953925', 'daniarpriamabodo11@gmail.com');
INSERT INTO public.arsip_prosedur VALUES (25, 'KKI', 'KJ-89', '3', '2026-03-06T00:00:00.000+07:00', '0', 'DP', 'DP', 'Belum dikirim', true, '2026-03-31 03:48:35.144', '2026-03-31 03:48:35.144', '2026-03-31 04:14:18.121717', 'daniarpriambodo11@gmail.com');
INSERT INTO public.arsip_prosedur VALUES (26, 'PO', 'UU-9', '3', '2026-03-27T00:00:00.000+07:00', '0', 'DP', 'DP', 'Belum dikirim', true, '2026-03-31 03:43:57.756', '2026-03-31 03:43:57.756', '2026-03-31 04:14:24.25812', 'daniarpriambodo11@gmail.com');
INSERT INTO public.arsip_prosedur VALUES (27, 'LK-19', '0I8', '1', '2026-05-31T00:00:00.000+07:00', '0', 'DP', 'DP', 'Belum dikirim', true, '2026-03-31 03:43:14.759', '2026-03-31 03:43:14.759', '2026-03-31 04:14:30.180229', 'daniarpriambodo11@gmail.com');
INSERT INTO public.arsip_prosedur VALUES (28, 'TEST-03', 'PP-09', '3', '2026-03-31T00:00:00.000+07:00', '0', 'DP', 'DP', 'Belum dikirim', true, '2026-03-31 04:16:54.071', '2026-03-31 04:16:54.071', '2026-03-31 04:36:22.116838', 'daniarpriambodo11@gmail.com');
INSERT INTO public.arsip_prosedur VALUES (29, 'TESTING APRIL 123', 'TES-123', '2', '2026-05-30T00:00:00.000+07:00', '0', 'DP', 'DP', 'Relevan', true, '2026-04-04 17:48:55.645', '2026-04-09 10:57:18.729', '2026-04-09 13:55:49.016974', 'daniarpriambodo11@gmail.com');


--
-- Data for Name: backup_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.backup_schedules VALUES (1, 'BPR-P-01', '2025-10-08 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (2, 'BPR-W-01', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (3, 'BOS-P-01', '2025-10-08 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (4, 'BOS-W-02', '2017-07-10 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (5, 'BOS-W-03', '2025-10-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (6, 'MRE-P-01', '2025-08-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (7, 'MRE-W-01', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (8, 'IAU-P-01', '2025-09-10 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (9, 'IAU-W-01', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (10, 'IAU-W-02', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (11, 'IAU-W-03', '2024-12-18 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (12, 'IAU-W-06', '2025-11-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (13, 'IAU-W-07', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (14, 'IAU-W-08', '2025-09-04 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (15, 'IAU-W-09', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (16, 'IAU-W-10', '2025-08-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (17, 'IAU-W-11', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (18, 'IAU-W-13', '2025-08-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (19, 'IMP-W-01', '2025-08-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (20, 'COD-P-01', '2025-09-30 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (21, 'COD-W-02', '2007-08-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (22, 'COD-W-04', '2025-08-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (23, 'HRM-P-01', '2025-08-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (24, 'HRM-W-02', '2025-08-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (25, 'HRM-W-13', '2026-01-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (26, 'HRM-W-06', '2025-08-27 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (27, 'HRM-W-15', '2011-04-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (28, 'HRM-W-14', '2022-11-08 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (29, 'HRM-P-03', '2025-11-14 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (30, 'HRM-W-03', '2025-09-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (31, 'HRM-W-05', '2025-08-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (32, 'HRM-W-08', '2025-09-16 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (33, 'HRM-W-10', '2025-08-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (34, 'HRM-W-11', '2025-10-01 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (35, 'HRM-W-12', '2018-12-18 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (36, 'HRM-W-16', '2025-09-16 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (37, 'HRM-W-17', '2025-09-16 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (38, 'HRM-W-20', '2025-08-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (39, 'HRM-W-21', '2025-08-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (40, 'HRM-W-22', '2025-08-13 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (41, 'HRM-W-23', '2025-09-16 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (42, 'HRM-W-27', '2025-09-16 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (43, 'HRM-W-28', '2025-11-17 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (44, 'HRM-W-29', '2019-10-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (45, 'HRM-W-30', '2025-08-19 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (46, 'HRM-W-32', '2025-08-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (47, 'HRM-W-33', '2025-08-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (48, 'HRM-W-35', '2025-08-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (49, 'HRM-W-36', '2025-08-25 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (50, 'HRM-W-37', '2022-06-13 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (51, 'HRM-W-09', '2018-11-02 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (52, 'PQP-P-01', '2023-09-11 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (53, 'PQP-W-01', '2024-06-03 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (54, 'PQP-W-05', '2010-11-19 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (55, 'PQP-W-06', '2007-10-16 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (56, 'PQP-W-08', '2025-08-14 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (57, 'PQP-W-10', '2025-08-14 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (58, 'PQP-W-11', '2025-08-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (59, 'PQP-W-12', '2024-10-11 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (60, 'PQP-W-13', '2024-10-11 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (61, 'PQP-W-14', '2007-11-06 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (62, 'PQP-W-16', '2025-09-04 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (63, 'PQP-W-17', '2024-06-17 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (64, 'PQP-W-18', '2019-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (65, 'PQP-W-19', '2019-10-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (66, 'PQP-W-20', '2023-12-09 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (67, 'PQP-W-21', '2024-07-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (68, 'CDC-P-01', '2025-08-19 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (69, 'CDC-W-01', '2025-08-14 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (70, 'CDC-W-02', '2025-08-14 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (71, 'CDC-W-03', '2025-08-14 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (72, 'CDC-W-05', '2025-08-15 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (73, 'CDC-W-07', '2008-11-04 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (74, 'CDC-W-10', '2025-10-03 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (75, 'CDC-W-11', '2025-08-15 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (76, 'CDC-W-12', '2025-05-09 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (77, 'CDC-W-13', '2021-11-10 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (78, 'CDC-W-14', '2025-11-19 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (79, 'CDC-W-15', '2023-07-28 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (80, 'CDC-W-22', '2025-08-14 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (81, 'CDC-W-23', '2019-11-01 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (82, 'PAP-P-01', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (83, 'PAP-W-08', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (84, 'PPL-P-01', '2025-08-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (85, 'PPL-W-01', '2025-08-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (86, 'PPL-W-02', '2025-08-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (87, 'PPL-W-03', '2025-08-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (88, 'PPL-W-04', '2025-08-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (89, 'PPL-W-05', '2025-08-13 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (90, 'PPL-W-06', '2025-11-17 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (91, 'PPL-W-07', '2025-05-05 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (92, 'PPL-W-08', '2025-08-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (93, 'PPL-W-11', '2025-08-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (94, 'MOR-P-01', '2024-08-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (95, 'MOR-W-01', '2025-08-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (96, 'MOR-W-05', '2025-08-13 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (97, 'MOR-W-06', '2025-08-08 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (98, 'MOR-W-08', '2025-08-19 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (99, 'MOR-W-09', '2025-10-31 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (100, 'MOR-W-10', '2025-08-19 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (101, 'MOR-W-11', '2024-10-15 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (102, 'MOR-W-12', '2025-04-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (103, 'MOR-W-14', '2025-08-19 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (104, 'MOR-W-15', '2025-08-13 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (105, 'MOR-W-17', '2025-08-28 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (106, 'MOR-W-21', '2025-11-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (107, 'MOR-W-25', '2025-11-14 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (108, 'MOR-W-26', '2025-08-08 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (109, 'MOR-P-02', '2026-01-12 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (110, 'MOR-W-20', '2023-05-23 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (111, 'MOR-W-27', '2025-09-11 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (112, 'MRS-P-01', '2025-05-27 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (113, 'MRS-W-02', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (114, 'MRS-W-03', '2025-11-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (115, 'MRS-W-05', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (116, 'MRS-W-10', '2025-11-14 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (117, 'MRS-W-11', '2025-11-14 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (118, 'MRS-W-13', '2025-08-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (119, 'MRS-W-16', '2024-10-03 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (120, 'MRS-W-18', '2025-08-13 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (121, 'MRS-W-23', '2021-06-11 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (122, 'MRS-W-25', '2025-11-17 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (123, 'MRS-W-28', '2020-05-01 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (124, 'MRS-W-29', '2024-10-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (125, 'MRS-W-31', '2022-12-19 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (126, 'MRS-W-33', '2024-11-19 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (127, 'MRS-P-02 : Before : MSU-P-01', '2025-08-05 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (128, 'MRS-W-26 : Before : MSU-W-07', '2025-11-17 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (129, 'MRS-W-35 : Before : MSU-W-14', '2025-10-30 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (130, 'MRS-W-34 : BEFORE MSU-W-15', '2025-08-18 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (131, 'MRS-W-36', '2025-12-19 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (132, 'PAM-P-01', '2025-08-08 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (133, 'PAM-W-01', '2026-01-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (134, 'PAM-W-02', '2023-12-09 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (135, 'PAM-W-03', '2025-10-03 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (136, 'PAM-W-04', '2026-01-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (137, 'PAM-W-06', '2025-08-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (138, 'PAM-W-07', '2025-11-17 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (139, 'PAM-W-08', '2022-11-10 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (140, 'PAM-W-09', '2025-08-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (141, 'PAM-W-10', '2025-08-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (142, 'PAM-W-11', '2025-08-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (143, 'PAM-W-12', '2025-08-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (144, 'PAM-W-13', '2022-11-10 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (145, 'PAM-W-14', '2025-08-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (146, 'PAM-W-15', '2025-08-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (147, 'PAM-W-16', '2019-10-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (148, 'PAM-W-17', '2019-10-18 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (149, 'PAM-W-18', '2019-10-18 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (150, 'PAM-W-19', '2025-10-03 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (151, 'PAM-W-29', '2025-08-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (152, 'PAM-W-35', '2025-08-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (153, 'PAM-W-37', '2025-08-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (154, 'PAM-W-38', '2025-08-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (155, 'PAM-W-39', '2019-08-15 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (156, 'PAM-W-41', '2025-08-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (157, 'PAM-W-42', '2025-10-30 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (158, 'PAM-W-44', '2025-08-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (159, 'PAM-W-45', '2025-10-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (160, 'PAM-W-46', '2023-12-08 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (161, 'PAM-W-47', '2023-12-09 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (162, 'PAM-W-48', '2023-12-08 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (163, 'PAM-W-49', '2024-12-18 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (164, 'PAM-W-51', '2025-11-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (165, 'FAM-P-01', '2025-08-08 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (166, 'FAM-P-02', '2026-01-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (167, 'FAM-W-06', '2025-08-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (168, 'FAM-W-07', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (169, 'FAM-W-08', '2017-12-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (170, 'FAM-W-09', '2020-10-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (171, 'FAM-W-12', '2025-08-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (172, 'FAM-W-13', '2025-11-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (173, 'FAM-W-16', '2025-08-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (174, 'FAM-W-17', '2011-10-25 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (175, 'FAM-W-19', '2025-10-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (176, 'FAM-W-21', '2025-08-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (177, 'FAM-W-23', '2025-08-13 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (178, 'FAM-W-27', '2025-11-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (179, 'FAM-W-28', '2025-10-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (180, 'CNP-P-01', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (181, 'CNP-W-04', '2025-11-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (182, 'CNP-W-05', '2025-08-14 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (183, 'CNP-W-06', '2026-01-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (184, 'CNP-W-07', '2025-11-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (185, 'CNP-W-09', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (186, 'CNP-W-11', '2007-06-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (187, 'CNP-W-12', '2025-08-08 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (188, 'CNP-W-13', '2026-01-22 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (189, 'CNP-W-14', '2025-08-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (190, 'CNP-P-02', '2024-06-11 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (191, 'CNP-W-01', '2025-08-12 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (192, 'CNP-W-02', '2025-08-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (193, 'CNP-W-03', '2025-11-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (194, 'FSD-P-01', '2025-08-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (195, 'FSD-W-01', '2025-08-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (196, 'FSD-W-02', '2025-08-19 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (197, 'FSD-W-09', '2025-08-19 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (198, 'FSD-W-10', '2025-08-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (199, 'FSD-W-11', '2025-08-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (200, 'PFP-P-01', '2020-07-28 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (201, 'PFP-W-01', '2023-10-26 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (202, 'PFP-W-02', '2025-08-13 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (203, 'PFP-W-03', '2014-04-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (204, 'PFP-W-05', '2004-07-08 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (205, 'PFP-W-06', '2004-10-05 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (206, 'PFP-W-08', '2025-10-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (207, 'PFP-W-10', '2007-10-25 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (208, 'PFP-W-13', '2004-07-06 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (209, 'PFP-W-14', '2025-08-27 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (210, 'PFP-W-17', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (211, 'PFP-W-21', '2025-10-03 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (212, 'PFP-W-22', '2025-07-02 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (213, 'PFP-W-23', '2025-07-02 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (214, 'PFP-W-24', '2022-09-28 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (215, 'PFP-W-25', '2022-12-01 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (216, 'PFP-W-26', '2022-12-01 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (217, 'PFP-W-28', '2025-08-12 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (218, 'PFP-W-29', '2025-09-01 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (219, 'PFP-P-02', '2012-10-31 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (220, 'ETM-P-01', '2020-07-01 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (221, 'ETM-W-02', '2025-08-27 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (222, 'ETM-W-04', '2025-07-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (223, 'ETM-W-05', '2025-07-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (224, 'ETM-W-07', '2025-07-17 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (225, 'ETM-W-10', '2025-11-03 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (226, 'ETM-W-13', '2025-11-17 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (227, 'ETM-W-15', '2025-07-31 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (228, 'ETM-W-19', '2025-08-27 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (229, 'ETM-W-20', '2025-08-07 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (230, 'ETM-W-21', '2025-10-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (231, 'ETM-W-22', '2025-11-21 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (232, 'ETM-W-23', '2025-06-19 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (233, 'PPM-P-01', '2020-07-01 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (234, 'PPM-W-01', '2024-08-08 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (235, 'PPM-W-03', '2025-08-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (236, 'PPM-W-05', '2025-07-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (237, 'PPM-W-06', '2025-08-27 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (238, 'PPM-W-08', '2025-05-27 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (239, 'PPM-W-10', '2025-11-03 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (240, 'PPM-W-11', '2025-08-20 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (241, 'PPM-W-12', '2025-12-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (242, 'CMD-P-01', '2021-12-29 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (243, 'CMD-P-02', '2022-12-16 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (244, 'CMD-W-01', '2013-07-17 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (245, 'CMD-W-02', '2025-11-14 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (246, 'CMD-W-03', '2025-08-18 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (247, 'CMD-W-04', '2024-11-08 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');
INSERT INTO public.backup_schedules VALUES (254, 'PRP-0909', '2026-03-06 16:00:00', 'pending', NULL, 0, NULL, '2026-02-27 14:55:17.412535', '2026-02-27 14:55:17.412535');


--
-- Data for Name: document_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.document_reviews VALUES (24, '13215', 'Relevan', '0', 2, '2026-03-12 12:26:25.897328', '2026-03-12 12:27:06.237769');
INSERT INTO public.document_reviews VALUES (27, 'PRP-0909', 'Telah dibaca', '0', 2, '2026-03-12 12:33:34.252426', '2026-03-12 13:49:32.966834');
INSERT INTO public.document_reviews VALUES (30, 'T-0900', 'Relevan', '0', 2, '2026-03-12 13:17:46.068701', '2026-03-12 14:49:32.737675');
INSERT INTO public.document_reviews VALUES (47, 'T-0909', 'Relevan', '0', 2, '2026-03-12 14:49:32.737675', '2026-03-12 14:49:32.737675');
INSERT INTO public.document_reviews VALUES (21, '010101', 'Relevan', '0', 2, '2026-03-05 09:16:29.251698', '2026-03-12 14:49:32.737675');
INSERT INTO public.document_reviews VALUES (26, 'TRX-090', 'Relevan', '0', 2, '2026-03-12 12:32:45.204419', '2026-03-12 14:49:54.529271');
INSERT INTO public.document_reviews VALUES (22, '09092', 'Relevan', '0', 2, '2026-03-12 11:54:34.722655', '2026-03-12 14:52:57.00108');
INSERT INTO public.document_reviews VALUES (23, '1', 'Relevan', '0', 2, '2026-03-12 12:00:38.824948', '2026-03-12 15:02:40.400719');
INSERT INTO public.document_reviews VALUES (60, 'BPR-W-01', 'Relevan', '03', 6, '2026-03-12 16:06:26.061115', '2026-03-12 16:08:05.744608');
INSERT INTO public.document_reviews VALUES (62, 'IAU-W-07', 'Obsolete', '01', 6, '2026-03-12 16:08:05.744608', '2026-03-12 16:08:05.744608');
INSERT INTO public.document_reviews VALUES (63, 'IAU-W-09', 'Revisi', '4', 6, '2026-03-12 16:08:05.744608', '2026-03-12 16:08:05.744608');
INSERT INTO public.document_reviews VALUES (64, 'BOS-W-02', 'Relevan', '02', 6, '2026-03-12 16:08:05.744608', '2026-03-12 16:08:05.744608');
INSERT INTO public.document_reviews VALUES (65, 'IAU-W-01', 'Revisi', '4', 6, '2026-03-12 16:08:05.744608', '2026-03-12 16:08:05.744608');
INSERT INTO public.document_reviews VALUES (66, 'IAU-W-02', 'Obsolete', '09', 6, '2026-03-12 16:08:05.744608', '2026-03-12 16:08:05.744608');
INSERT INTO public.document_reviews VALUES (69, '13215', 'Relevan', '0', 1, '2026-03-27 08:21:34.527113', '2026-03-27 08:22:33.086919');
INSERT INTO public.document_reviews VALUES (71, '0091J', 'Relevan', '0', 0, '2026-03-27 08:36:53.250718', '2026-03-27 10:29:15.644096');
INSERT INTO public.document_reviews VALUES (37, 'PRP-0909', 'Relevan', '3', 1, '2026-03-12 14:12:55.442593', '2026-03-27 10:29:15.644096');
INSERT INTO public.document_reviews VALUES (75, 'KJL-01', 'Relevan', '0', 3, '2026-04-01 01:01:29.095598', '2026-04-01 01:01:29.095598');
INSERT INTO public.document_reviews VALUES (74, '0108-JJ', 'Relevan', '0', 4, '2026-03-28 10:36:24.405859', '2026-04-01 08:07:56.217048');
INSERT INTO public.document_reviews VALUES (77, '0909-DP', 'Relevan', '0', 3, '2026-04-01 16:04:37.653328', '2026-04-01 16:04:37.653328');
INSERT INTO public.document_reviews VALUES (78, 'AI-0917', 'Telah dibaca', '0', 3, '2026-04-24 07:30:46.664277', '2026-04-24 07:30:46.664277');


--
-- Data for Name: email_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.email_schedules VALUES (259, '010101', '2026-03-04 12:53:00', 'sent', '2026-03-04 12:52:59.255545', 0, NULL, '2026-03-04 12:19:15.102061', '2026-03-04 12:52:59.255545');
INSERT INTO public.email_schedules VALUES (264, '09092', '2026-03-12 14:51:00', 'sent', NULL, 0, NULL, '2026-03-12 10:05:37.43317', '2026-03-12 14:52:25.524053');
INSERT INTO public.email_schedules VALUES (263, '1', '2026-03-12 14:51:00', 'sent', NULL, 0, NULL, '2026-03-12 10:03:43.875525', '2026-03-12 14:52:25.524053');
INSERT INTO public.email_schedules VALUES (261, 'T-0900', '2026-03-05 13:15:00', 'sent', '2026-03-05 12:02:24.446916', 0, NULL, '2026-03-05 11:49:35.104408', '2026-03-05 13:18:53.798913');
INSERT INTO public.email_schedules VALUES (260, 'T-0909', '2026-03-05 13:15:00', 'sent', '2026-03-05 12:02:24.446916', 0, NULL, '2026-03-05 11:49:35.042482', '2026-03-05 13:18:53.798913');
INSERT INTO public.email_schedules VALUES (266, 'IAU-W-07', '2026-03-12 16:00:00', 'sent', NULL, 0, NULL, '2026-03-12 15:34:07.877776', '2026-03-12 16:00:26.983175');
INSERT INTO public.email_schedules VALUES (267, 'IAU-W-09', '2026-03-12 16:00:00', 'sent', NULL, 0, NULL, '2026-03-12 15:34:07.994295', '2026-03-12 16:00:26.983175');
INSERT INTO public.email_schedules VALUES (268, 'BPR-W-01', '2026-03-12 16:00:00', 'sent', NULL, 0, NULL, '2026-03-12 15:34:08.020425', '2026-03-12 16:00:26.983175');
INSERT INTO public.email_schedules VALUES (269, 'BOS-W-02', '2026-03-12 16:00:00', 'sent', NULL, 0, NULL, '2026-03-12 15:34:08.040478', '2026-03-12 16:00:26.983175');
INSERT INTO public.email_schedules VALUES (262, 'TRX-090', '2026-03-12 12:31:00', 'sent', NULL, 0, NULL, '2026-03-05 13:12:09.439937', '2026-03-12 12:32:24.857434');
INSERT INTO public.email_schedules VALUES (270, 'IAU-W-01', '2026-03-12 16:00:00', 'sent', NULL, 0, NULL, '2026-03-12 15:34:08.061694', '2026-03-12 16:00:26.983175');
INSERT INTO public.email_schedules VALUES (271, 'IAU-W-02', '2026-03-12 16:00:00', 'sent', NULL, 0, NULL, '2026-03-12 15:34:08.080653', '2026-03-12 16:00:26.983175');
INSERT INTO public.email_schedules VALUES (265, '13215', '2026-03-27 08:19:00', 'cancelled', NULL, 0, NULL, '2026-03-12 10:07:33.351781', '2026-03-27 08:21:34.527113');
INSERT INTO public.email_schedules VALUES (258, 'PRP-0909', '2026-03-13 10:31:00', 'cancelled', '2026-03-04 12:52:56.621972', 0, NULL, '2026-02-27 15:53:04.950309', '2026-03-27 10:29:15.760641');
INSERT INTO public.email_schedules VALUES (273, '0108-JJ', '2026-03-01 10:40:00', 'cancelled', NULL, 0, NULL, '2026-03-28 10:32:20.987114', '2026-03-28 10:36:24.405859');
INSERT INTO public.email_schedules VALUES (280, 'KJL-01', '2026-04-01 00:51:09.311', 'cancelled', '2026-04-01 00:52:13.265607', 0, NULL, '2026-04-01 00:51:09.31254', '2026-04-01 01:01:29.203507');
INSERT INTO public.email_schedules VALUES (281, '0909-DP', '2026-04-04 17:50:00', 'sent', '2026-04-04 17:50:51.936238', 0, NULL, '2026-04-01 16:00:34.276003', '2026-04-04 17:50:51.936238');
INSERT INTO public.email_schedules VALUES (282, 'AI-0917', '2026-04-21 15:48:04.626', 'cancelled', '2026-04-21 15:59:36.010666', 0, NULL, '2026-04-21 15:48:04.627462', '2026-04-24 07:30:46.664277');
INSERT INTO public.email_schedules VALUES (272, '0091J', '2026-05-01 08:00:00', 'pending', '2026-04-21 16:01:36.097237', 0, NULL, '2026-03-27 08:36:31.083825', '2026-04-24 07:36:59.225425');


--
-- Data for Name: pic_activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.pic_activities VALUES (42, 124, 'login', 'PIC login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', NULL, NULL, '2026-04-27 14:02:28.531772');
INSERT INTO public.pic_activities VALUES (43, 125, 'login', 'PIC login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', NULL, NULL, '2026-04-27 14:02:46.158919');
INSERT INTO public.pic_activities VALUES (44, 124, 'login', 'PIC login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', NULL, NULL, '2026-04-28 07:30:16.827944');
INSERT INTO public.pic_activities VALUES (45, 148, 'login', 'PIC login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', NULL, NULL, '2026-04-28 07:30:45.996596');
INSERT INTO public.pic_activities VALUES (46, 124, 'login', 'PIC login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', NULL, NULL, '2026-04-28 07:31:26.091871');
INSERT INTO public.pic_activities VALUES (47, 124, 'document', 'Membuat permintaan dokumen baru: Thank You', NULL, NULL, NULL, NULL, '2026-04-28 07:31:50.728349');
INSERT INTO public.pic_activities VALUES (48, 124, 'login', 'PIC login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', NULL, NULL, '2026-04-28 07:47:02.924461');


--
-- Data for Name: pic_document_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.pic_document_requests VALUES (5, 124, '', 'Thank You', 'Terimakasih', 'Arigatou', 'pending', '2026-04-28 07:31:50.728349', '2026-04-28 07:31:50.728349', true, '2026-04-28 07:32:06.740385', 'admin');


--
-- Data for Name: pic_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pic_otp; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.pic_otp VALUES (1, 'DP', '141623', '2026-03-31 23:59:59', '2026-03-04 12:52:53.913002');
INSERT INTO public.pic_otp VALUES (2, 'DP', '141623', '2026-03-31 23:59:59', '2026-03-04 12:52:56.624807');
INSERT INTO public.pic_otp VALUES (3, 'DP', '0DD86D', '2026-03-31 23:59:59', '2026-03-05 13:16:25.793078');
INSERT INTO public.pic_otp VALUES (4, 'DP', '0DD86D', '2026-03-31 23:59:59', '2026-03-05 13:18:51.15044');
INSERT INTO public.pic_otp VALUES (5, 'FS', '13B99C', '2026-03-31 23:59:59', '2026-03-05 13:20:51.186489');
INSERT INTO public.pic_otp VALUES (6, 'FS', '13B99C', '2026-03-31 23:59:59', '2026-03-05 16:03:48.246524');
INSERT INTO public.pic_otp VALUES (7, 'DP', '0DD86D', '2026-03-31 23:59:59', '2026-03-12 10:08:55.514196');
INSERT INTO public.pic_otp VALUES (8, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 11:42:21.357452');
INSERT INTO public.pic_otp VALUES (9, 'FS', '932925', '2026-03-31 23:59:59', '2026-03-12 12:32:21.300433');
INSERT INTO public.pic_otp VALUES (10, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 12:36:21.305162');
INSERT INTO public.pic_otp VALUES (11, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 12:52:21.319457');
INSERT INTO public.pic_otp VALUES (12, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 12:56:22.842567');
INSERT INTO public.pic_otp VALUES (13, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 12:58:22.852305');
INSERT INTO public.pic_otp VALUES (14, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 13:02:22.792008');
INSERT INTO public.pic_otp VALUES (15, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 13:28:22.80288');
INSERT INTO public.pic_otp VALUES (16, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 13:30:22.803712');
INSERT INTO public.pic_otp VALUES (17, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 13:36:22.813116');
INSERT INTO public.pic_otp VALUES (18, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 14:14:22.832987');
INSERT INTO public.pic_otp VALUES (19, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 14:18:22.836186');
INSERT INTO public.pic_otp VALUES (20, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 14:22:23.067648');
INSERT INTO public.pic_otp VALUES (21, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 14:24:22.862281');
INSERT INTO public.pic_otp VALUES (22, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 14:28:22.895828');
INSERT INTO public.pic_otp VALUES (23, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 14:38:22.81487');
INSERT INTO public.pic_otp VALUES (24, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 14:48:22.831555');
INSERT INTO public.pic_otp VALUES (25, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 14:52:22.803783');
INSERT INTO public.pic_otp VALUES (26, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 15:04:22.79834');
INSERT INTO public.pic_otp VALUES (27, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 15:06:22.802431');
INSERT INTO public.pic_otp VALUES (28, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 15:12:22.803097');
INSERT INTO public.pic_otp VALUES (29, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-12 15:14:22.804869');
INSERT INTO public.pic_otp VALUES (30, 'ISR', '833343', '2026-03-31 23:59:59', '2026-03-12 16:00:22.794576');
INSERT INTO public.pic_otp VALUES (31, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-13 10:17:13.321823');
INSERT INTO public.pic_otp VALUES (32, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-13 10:31:13.316228');
INSERT INTO public.pic_otp VALUES (33, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-27 08:20:14.521371');
INSERT INTO public.pic_otp VALUES (34, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-27 08:38:14.505383');
INSERT INTO public.pic_otp VALUES (35, 'DP', '982774', '2026-03-31 23:59:59', '2026-03-28 10:34:06.305564');
INSERT INTO public.pic_otp VALUES (36, 'DP', '205385', '2026-04-30 23:59:59', '2026-04-01 00:52:09.635534');
INSERT INTO public.pic_otp VALUES (37, 'DP', '205385', '2026-04-30 23:59:59', '2026-04-01 16:01:25.614823');
INSERT INTO public.pic_otp VALUES (38, 'DP', '205385', '2026-04-30 23:59:59', '2026-04-04 17:50:46.60485');
INSERT INTO public.pic_otp VALUES (39, 'DP', '205385', '2026-04-30 23:59:59', '2026-04-21 15:59:32.510369');
INSERT INTO public.pic_otp VALUES (40, 'DP', '205385', '2026-04-30 23:59:59', '2026-04-21 16:01:32.608193');


--
-- Data for Name: pic_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pic_review_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pic_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.pic_users VALUES (124, 'dp@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Dp', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (125, '123agung.i@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Ain', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (126, '123david.a@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Daf', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (127, 'forstudy0903@gmail.com', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Fs', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (128, '123wiwin.w@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Wwi', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (129, '123dwi.as@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Das', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (130, '123noivasari@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Nia', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (131, '123ika.y@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Isr', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (132, '123david.k@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Dkr', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (133, '123evaningsih@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Emu', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (134, '123hayu.p@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Hpu', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (135, '123shinta.f@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Sfe', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (136, '123riska.o@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Rko', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (137, 'agung.i@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Ain', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (138, 'atiek.s@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Asw', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (139, 'toni.w@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Twi', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (140, '123danny.h@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Dhs', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (141, '123ferry.i@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Fir', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (142, 'dany.h@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Dhs', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (143, '123arie.t@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Ath', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (144, '123arianto.s@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Ase', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (145, '123yachrul.h@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Yhe', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (146, '123hary.sw@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Hsw', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (147, 'untuksemua0309@gmail.com', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Dp', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (148, '123hendy.m@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Hma', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (149, '123m.chasan@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Mcb', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (150, '123vinny.r@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Vra', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (151, '123toni.w@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Twi', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (152, 'daniarpriambodo11@gmail.com', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Dp', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (153, '123lilis.s@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Lse', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (154, '123yuli.f@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Hpu', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (155, '123catur.h@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Cha', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (156, '123widyastuti.s@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Wsu', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (157, '123lita.d@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Lda', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (158, '123m.rafi@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Mmr', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (159, '123endang.s@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Ens', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (160, '123aris.c@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Aca', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');
INSERT INTO public.pic_users VALUES (162, '123atiek.s@jai.co.id', '$2b$10$JWTSnUYoXmnkV6DuiNF5O.5zjYJvo/DbLJUUf47EJrOHSN0Gu.wAS', 'Asw', 'Quality Assurance', true, NULL, '2026-04-27 14:01:36.076033', '2026-04-27 14:01:36.076033');


--
-- Data for Name: procedure_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.procedure_documents VALUES (766, 'QR_QA', 'T-0909', '3', '2026-03-05', '0', 'DP', 'DP', 'Relevan', true, '2026-03-05 11:42:30.694821', '2026-03-12 14:49:32.737675', 'daniarpriambodo11@gmail.com');
INSERT INTO public.procedure_documents VALUES (788, 'Test_April', 'KJL-01', '1', '2026-04-01', '0', 'DP', 'DP', 'Relevan', true, '2026-04-01 00:51:09.281208', '2026-04-01 01:01:29.095598', 'untuksemua0309@gmail.com');
INSERT INTO public.procedure_documents VALUES (501, 'Business Plan', 'BPR-P-01', '2', '2025-10-01', '08', 'QSA', 'ISR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-13 08:49:51.41916', '123ika.y@jai.co.id');
INSERT INTO public.procedure_documents VALUES (502, 'Risk Analysis', 'BPR-W-01', '3', '2025-07-31', '03', 'QSA', 'ISR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-13 08:49:51.41916', '123ika.y@jai.co.id');
INSERT INTO public.procedure_documents VALUES (769, 'Test Hari Ini 123', '1', '1', '2026-03-11', '0', 'DP', 'DP', 'Relevan', true, '2026-03-12 10:03:43.82576', '2026-04-09 03:49:20.039678', 'daniarpriambodo11@gmail.com');
INSERT INTO public.procedure_documents VALUES (791, 'TESTING_PROSEDUR_APRIL', 'AI_0912', '3', '2026-04-21', '0', 'DP', 'DP', 'Relevan', true, '2026-04-21 15:46:36.268055', '2026-04-21 15:46:36.268055', 'dp@jai.co.id');
INSERT INTO public.procedure_documents VALUES (773, 'dokumen-januari', '0091J', '1', '2026-01-01', '0', 'DP', 'DP', 'Belum dikirim', true, '2026-03-27 08:34:51.574294', '2026-04-24 07:36:59.225425', 'daniarpriambodo11@gmail.com');
INSERT INTO public.procedure_documents VALUES (785, 'DK-98', '09-LL', '3', '2026-03-24', '0', 'DP', 'DP', 'Relevan', true, '2026-03-31 04:15:32.28548', '2026-03-31 04:15:32.28548', 'daniarpriambodo11@gmail.com');
INSERT INTO public.procedure_documents VALUES (767, 'QR_GA', 'T-0900', '3', '2026-03-05', '0', 'DP', 'DP', 'Relevan', true, '2026-03-05 11:43:21.560862', '2026-03-12 14:49:32.737675', 'daniarpriambodo11@gmail.com');
INSERT INTO public.procedure_documents VALUES (771, 'test hari ini 2', '09092', '2', '2026-03-12', '0', 'DP', 'DP', 'Relevan', true, '2026-03-12 10:05:37.430786', '2026-03-12 14:52:57.00108', 'daniarpriambodo11@gmail.com');
INSERT INTO public.procedure_documents VALUES (789, 'Test April 00 Update', '0909-DP', '3', '2026-03-28', '0', 'DP', 'DP,US', 'Telah terkirim', true, '2026-04-01 16:00:34.245137', '2026-04-15 03:10:13.66082', 'daniarpriambodo11@gmail.com, untuksemua0309@gmail.com');
INSERT INTO public.procedure_documents VALUES (792, 'TESTING_PROSEDUR_JULI', 'AI-0917', '3', '2026-04-21', '0', 'DP', 'DP', 'Telah dibaca', true, '2026-04-21 15:48:04.616931', '2026-04-24 07:30:46.664277', 'dp@jai.co.id');
INSERT INTO public.procedure_documents VALUES (555, 'Risk Assessment', 'PQP-W-06', '3', '2007-10-09', '02', 'PP', 'LDA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lita.d@jai.co.id');
INSERT INTO public.procedure_documents VALUES (772, '123', '13215', '2', '2026-02-12', '0', 'DP', 'DP', 'Relevan', true, '2026-03-12 10:07:10.367594', '2026-03-27 08:22:33.086919', 'daniarpriambodo11@gmail.com');
INSERT INTO public.procedure_documents VALUES (786, 'TEST-02', '3AQ', '3', '2026-04-30', '0', 'DP', 'DP', 'Relevan', true, '2026-03-31 04:16:14.983863', '2026-03-31 04:16:14.983863', 'daniarpriambodo11@gmail.com');
INSERT INTO public.procedure_documents VALUES (768, 'MINE', 'TRX-090', '3', '2026-03-05', '0', 'FS', 'FS', 'Relevan', true, '2026-03-05 13:10:43.842287', '2026-03-12 14:49:54.529271', 'forstudy0903@gmail.com');
INSERT INTO public.procedure_documents VALUES (778, 'test-prosedur', '0108-JJ', '1', '2026-05-28', '0', 'DP', 'DP', 'Relevan', true, '2026-03-28 10:32:20.98051', '2026-04-01 08:07:56.217048', 'daniarpriambodo11@gmail.com');
INSERT INTO public.procedure_documents VALUES (506, 'Management Review', 'MRE-P-01', '2', '2025-08-22', '06', 'QSA', 'ISR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-13 08:49:51.41916', '123ika.y@jai.co.id');
INSERT INTO public.procedure_documents VALUES (508, 'Internal Audit', 'IAU-P-01', '2', '2025-09-03', '14', 'QSA', 'ISR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-13 08:49:51.41916', '123ika.y@jai.co.id');
INSERT INTO public.procedure_documents VALUES (520, 'Pembuatan Dan Pengendalian Informasi Terdokumentasi', 'COD-P-01', '2', '2025-09-23', '11', 'QSA', 'ISR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-13 08:49:51.41916', '123ika.y@jai.co.id');
INSERT INTO public.procedure_documents VALUES (522, 'Pengendalian Quality Record', 'COD-W-04', '3', '2025-08-22', '08', 'QSA', 'ISR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-13 08:49:51.41916', '123ika.y@jai.co.id');
INSERT INTO public.procedure_documents VALUES (523, 'Responsibility and Authority', 'HRM-P-01', '2', '2025-08-22', '02', 'TOP MGMT (DEVELOPMENT)', 'ISR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-13 08:49:51.41916', '123ika.y@jai.co.id');
INSERT INTO public.procedure_documents VALUES (513, 'Pemeliharaan & Pengembangan Kompetensi Auditor', 'IAU-W-07', '3', '2025-07-31', '01', 'QSA', 'ISR', 'Obsolete', false, '2026-02-18 09:08:32.000013', '2026-03-13 08:49:51.41916', '123ika.y@jai.co.id');
INSERT INTO public.procedure_documents VALUES (515, 'Second Party Audit', 'IAU-W-09', '3', '2025-07-31', '4', 'QSA', 'ISR', 'Revisi', false, '2026-02-18 09:08:32.000013', '2026-03-13 08:49:51.41916', '123ika.y@jai.co.id');
INSERT INTO public.procedure_documents VALUES (504, 'Customer Satisfaction', 'BOS-W-02', '3', '2017-07-03', '02', 'QSA', 'ISR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-13 08:49:51.41916', '123ika.y@jai.co.id');
INSERT INTO public.procedure_documents VALUES (509, 'Quality Management System Audit', 'IAU-W-01', '3', '2025-07-31', '4', 'QSA', 'ISR', 'Revisi', false, '2026-02-18 09:08:32.000013', '2026-03-13 08:49:51.41916', '123ika.y@jai.co.id');
INSERT INTO public.procedure_documents VALUES (510, 'Pengisian Form Corrective Action Request (CAR)', 'IAU-W-02', '3', '2025-07-31', '09', 'QSA', 'ISR', 'Obsolete', false, '2026-02-18 09:08:32.000013', '2026-03-13 08:49:51.41916', '123ika.y@jai.co.id');
INSERT INTO public.procedure_documents VALUES (763, 'Proposal Magang JAI', 'PRP-0909', '1', '2026-02-27', '3', 'DAN', 'DP', 'Relevan', true, '2026-02-27 12:40:11.346421', '2026-03-27 10:29:15.644096', 'daniarpriambodo11@gmail.com');
INSERT INTO public.procedure_documents VALUES (722, 'Set up Tooling Applikator', 'ETM-W-04', '3', '2025-07-22', '04', 'MTC', 'MCB', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id');
INSERT INTO public.procedure_documents VALUES (723, 'Modifikasi Applicator', 'ETM-W-05', '3', '2025-07-22', '05', 'MTC', 'MCB', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id');
INSERT INTO public.procedure_documents VALUES (724, 'Penyediaan dan Pengelolaan Spare Part', 'ETM-W-07', '3', '2025-07-10', '09', 'MTC', 'MCB', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id');
INSERT INTO public.procedure_documents VALUES (725, 'Mapping Applikator', 'ETM-W-10', '3', '2025-10-27', '04', 'MTC', 'MCB', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id');
INSERT INTO public.procedure_documents VALUES (726, 'Tooling Control Maintenance', 'ETM-W-13', '3', '2025-11-10', '07', 'MTC', 'MCB', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id');
INSERT INTO public.procedure_documents VALUES (727, 'Sistem Informasi Perubahan Posisi Applicator', 'ETM-W-15', '3', '2025-07-24', '03', 'MTC', 'MCB', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id');
INSERT INTO public.procedure_documents VALUES (728, 'Production Equipment Breakdown', 'ETM-W-19', '3', '2025-08-20', '01', 'PE', 'DHS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123danny.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (729, 'Review Equipment', 'ETM-W-20', '3', '2025-07-31', '02', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (730, 'Pengontrolan Inspection Jig', 'ETM-W-21', '3', '2025-10-14', '05', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (731, 'Pengontrolan Alat Potong', 'ETM-W-22', '3', '2025-11-14', '01', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (732, 'Stock Opname Sparepart', 'ETM-W-23', '3', '2025-06-12', '0', 'MTC SC', 'DKR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123david.k@jai.co.id');
INSERT INTO public.procedure_documents VALUES (733, 'Preventive and Predictive Maintenance', 'PPM-P-01', '2', '2020-06-24', '03', 'MTC, PROD ENG', 'MCB, DHS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id, dany.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (734, 'Preventive and Predictive Maintenance Mesin Produksi & Applicator', 'PPM-W-01', '3', '2024-08-01', '07', 'MTC', 'MCB', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id');
INSERT INTO public.procedure_documents VALUES (735, 'Penanganan Kerusakan Pada Mesin Produksi', 'PPM-W-03', '3', '2025-08-13', '03', 'MTC', 'MCB', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id');
INSERT INTO public.procedure_documents VALUES (736, 'Pelaksanaan Evaluasi Preventive Maintenance Mesin Produksi', 'PPM-W-05', '3', '2025-07-22', '05', 'MTC', 'MCB', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id');
INSERT INTO public.procedure_documents VALUES (737, 'Preventive Maintenance Equipment Final Assy', 'PPM-W-06', '3', '2025-08-20', '07', 'PE', 'DHS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123danny.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (738, 'Pengisian CS Patroli Harian Equipment Final Assy', 'PPM-W-08', '3', '2025-05-20', '03', 'PE', 'DHS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123danny.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (739, 'Pengisian Checksheet Patroli Harian Mesin', 'PPM-W-10', '3', '2025-10-27', '01', 'MTC', 'MCB', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id');
INSERT INTO public.procedure_documents VALUES (740, 'Review Dokumen (Checksheet) Mesin & Equipment Produksi', 'PPM-W-11', '3', '2025-08-13', '01', 'MTC', 'MCB', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id');
INSERT INTO public.procedure_documents VALUES (741, 'Review Dokumen (Checksheet) Mesin & Equipment Final Assy', 'PPM-W-12', '3', '2025-12-22', '0', 'PROD ENG', 'YHE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123yachrul.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (742, 'Pengendalian Alat Ukur', 'CMD-P-01', '2', '2021-12-22', '08', 'QC MSA', 'SFE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123shinta.f@jai.co.id');
INSERT INTO public.procedure_documents VALUES (743, 'Measurement System Analysis (MSA)', 'CMD-P-02', '2', '2022-12-09', '03', 'QC MSA', 'SFE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123shinta.f@jai.co.id');
INSERT INTO public.procedure_documents VALUES (744, 'Pembuatan MSA Plan & Evaluation', 'CMD-W-01', '3', '2013-07-10', '02', 'QC MSA', 'SFE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123shinta.f@jai.co.id');
INSERT INTO public.procedure_documents VALUES (780, 'test-test', 'QQ-0909', '3', '2026-06-30', '0', 'DP', 'DP', 'Relevan', true, '2026-03-31 03:41:55.145993', '2026-03-31 03:41:55.145993', 'daniarpriambodo11@gmail.com');
INSERT INTO public.procedure_documents VALUES (505, 'Work In Process Finish Good', 'BOS-W-03', '3', '2025-10-13', '01', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (507, 'Quality Meeting', 'MRE-W-01', '3', '2025-07-31', '02', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (511, 'Tear Down Inspection', 'IAU-W-03', '3', '2024-12-11', '11', 'QC CHECK W/H', 'SFE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123shinta.f@jai.co.id');
INSERT INTO public.procedure_documents VALUES (512, 'Finish Good Sampling', 'IAU-W-06', '3', '2025-11-14', '01', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (514, 'Kakotora Audit', 'IAU-W-08', '3', '2025-08-28', '01', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (717, 'Fire Minor', 'PFP-W-28', '3', '2025-08-05', '01', 'PGA', 'AIN', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123agung.i@jai.co.id');
INSERT INTO public.procedure_documents VALUES (718, 'Penambahan Daya Listrik', 'PFP-W-29', '3', '2025-08-25', '0', 'PGA', 'ACA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123aris.c@jai.co.id');
INSERT INTO public.procedure_documents VALUES (719, 'Pembuatan Contigency Plan', 'PFP-P-02', '2', '2012-10-24', '02', 'PGA', 'HPU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123hayu.p@jai.co.id');
INSERT INTO public.procedure_documents VALUES (720, 'Equipment, Tooling & Spare Part Management', 'ETM-P-01', '2', '2020-06-24', '11', 'MTC, PROD ENG', 'MCB, DHS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id, dany.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (516, 'Sertifikasi Eksternal', 'IAU-W-10', '3', '2025-08-22', '01', 'QSA, PGA', 'ISR, AIN', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123ika.y@jai.co.id, agung.i@jai.co.id');
INSERT INTO public.procedure_documents VALUES (517, 'Layered Audit', 'IAU-W-11', '3', '2025-07-31', '01', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (518, 'Moto Audit', 'IAU-W-13', '3', '2025-08-13', '05', 'QC STANDARISASI', 'ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (519, '8 Disciplines (8D)', 'IMP-W-01', '3', '2025-08-15', '03', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (521, 'Metode Distribusi Standard kerja', 'COD-W-02', '3', '2007-08-15', '01', 'DSG, QC STD', 'VRA, ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123vinny.r@jai.co.id, atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (524, 'Evaluasi Kinerja Karyawan', 'HRM-W-02', '3', '2025-08-15', '08', 'IR', 'NIA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123noivasari@jai.co.id');
INSERT INTO public.procedure_documents VALUES (525, 'Pelaksanaan Rekruitmen Dengan Syarat Khusus', 'HRM-W-13', '3', '2025-12-31', '05', 'IR', 'NIA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123noivasari@jai.co.id');
INSERT INTO public.procedure_documents VALUES (526, 'Pengunduran Diri', 'HRM-W-06', '3', '2025-08-20', '07', 'IR', 'NIA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123noivasari@jai.co.id');
INSERT INTO public.procedure_documents VALUES (527, 'ID Card Karyawan & Temporary ID', 'HRM-W-15', '3', '2011-04-13', '01', 'HR', 'ATH', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123arie.t@jai.co.id');
INSERT INTO public.procedure_documents VALUES (528, 'Pelaksanaan Kerja Lembur', 'HRM-W-14', '3', '2022-11-01', '04', 'HR', 'ATH', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123arie.t@jai.co.id');
INSERT INTO public.procedure_documents VALUES (529, 'Training System', 'HRM-P-03', '2', '2025-11-07', '10', 'TRAINING', 'WWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123wiwin.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (530, 'Sistem Training Karyawan Baru dan Peserta Magang', 'HRM-W-03', '3', '2025-09-19', '09', 'TRAINING', 'WWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123wiwin.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (531, 'Pembuatan Dan Review Materi Training', 'HRM-W-05', '3', '2025-08-19', '04', 'TRAINING', 'WWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123wiwin.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (532, 'Prosedur Prakerin', 'HRM-W-08', '3', '2025-09-09', '03', 'TRAINING', 'WWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123wiwin.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (533, 'Pengajuan Training & License User Removal Tool', 'HRM-W-10', '3', '2025-08-22', '03', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (534, 'Sistem Promosi Group Leader, Line Leader, Foreman Dan ESO', 'HRM-W-11', '3', '2025-09-24', '07', 'TRAINING & HR', 'WWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123wiwin.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (535, 'Penunjukkan Inspektor Baru', 'HRM-W-12', '3', '2018-12-11', '05', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (536, 'License Sistem', 'HRM-W-16', '3', '2025-09-09', '05', 'TRAINING', 'WWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123wiwin.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (537, 'Prosedur Renewal License', 'HRM-W-17', '3', '2025-09-09', '02', 'TRAINING', 'WWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123wiwin.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (538, 'Pelaporan Kehilangan Dan Atau Kerusakan Kartu License', 'HRM-W-20', '3', '2025-08-19', '01', 'TRAINING', 'WWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123wiwin.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (539, 'Permohonan Pengesahan Perjanjian Magang Ke Disnaker', 'HRM-W-21', '3', '2025-08-14', '01', 'TRAINING', 'WWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123wiwin.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (540, 'Pengambilan & Pengembalian Form Catatan Meninggalkan Pekerjaan (CMP)', 'HRM-W-22', '3', '2025-08-06', '01', 'HR', 'ATH', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123arie.t@jai.co.id');
INSERT INTO public.procedure_documents VALUES (541, 'Prosedur Pengontrolan License', 'HRM-W-23', '3', '2025-09-09', '05', 'TRAINING', 'WWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123wiwin.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (542, 'Prosedur Pengontrolan License Eksternal', 'HRM-W-27', '3', '2025-09-09', '01', 'TRAINING', 'WWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123wiwin.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (543, 'Pelaksanaan Kaizen (Improvisasi)', 'HRM-W-28', '3', '2025-11-10', '10', 'NYS', 'LSE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lilis.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (544, 'Aktivitas QC Circle', 'HRM-W-29', '3', '2019-10-22', '06', 'NYS', 'LSE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lilis.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (545, 'Konvensi QC Circle Internal', 'HRM-W-30', '3', '2025-08-12', '02', 'NYS', 'LSE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lilis.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (546, 'Mutasi Karyawan', 'HRM-W-32', '3', '2025-08-19', '01', 'IR', 'NIA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123noivasari@jai.co.id');
INSERT INTO public.procedure_documents VALUES (547, 'Perubahan Atau Pembatalan Pelaksanaan Training', 'HRM-W-33', '3', '2025-08-19', '01', 'TRAINING', 'WWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123wiwin.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (548, 'Pendistribusian Dan Pengisian Form Request Training', 'HRM-W-35', '3', '2025-08-19', '01', 'TRAINING', 'WWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123wiwin.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (549, 'Medical Emergency', 'HRM-W-36', '3', '2025-08-18', '01', 'HR, IR', 'ATH', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123arie.t@jai.co.id');
INSERT INTO public.procedure_documents VALUES (550, 'Tidak Masuk Mogok Kerja & Kekurangan Tenaga Kerja', 'HRM-W-37', '3', '2022-06-06', '0', 'IR', 'NIA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123noivasari@jai.co.id');
INSERT INTO public.procedure_documents VALUES (551, 'Standard Backup Data Komputer', 'HRM-W-09', '3', '2018-10-26', '02', 'IT', 'HMA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123hendy.m@jai.co.id');
INSERT INTO public.procedure_documents VALUES (552, 'Product Realization', 'PQP-P-01', '2', '2023-09-04', '19', 'PP', 'LDA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lita.d@jai.co.id');
INSERT INTO public.procedure_documents VALUES (764, 'TEST_1', '010101', '1', '2026-03-05', '0', 'DP', 'DP', 'Relevan', true, '2026-03-04 09:45:02.327927', '2026-03-12 14:49:32.737675', 'daniarpriambodo11@gmail.com');
INSERT INTO public.procedure_documents VALUES (503, 'Business Operating System (BOS)', 'BOS-P-01', '2', '2025-10-01', '04', 'QSA', 'ISR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-13 08:49:51.41916', '123ika.y@jai.co.id');
INSERT INTO public.procedure_documents VALUES (553, 'Pembuatan PQTP (Product Quality Timing Plan)', 'PQP-W-01', '3', '2024-05-27', '07', 'PP', 'LDA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lita.d@jai.co.id');
INSERT INTO public.procedure_documents VALUES (554, 'Form Pick up Problem', 'PQP-W-05', '3', '2010-11-12', '02', 'PP', 'LDA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lita.d@jai.co.id');
INSERT INTO public.procedure_documents VALUES (556, 'Pembuatan & Pengontrolan Operation Standard (OS)', 'PQP-W-08', '3', '2025-08-07', '05', 'DSG', 'VRA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123vinny.r@jai.co.id');
INSERT INTO public.procedure_documents VALUES (557, 'Pembuatan & Review Berkala Production Process Flow Chart (PPFC)', 'PQP-W-10', '3', '2025-08-07', '06', 'DSG', 'CHA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123catur.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (558, 'Pembuatan & Pengontrolan Inspection Standard (IS)', 'PQP-W-11', '3', '2025-08-13', '05', 'QC STANDARISASI', 'ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (559, 'Pembuatan, Pengontrolan & Review Berkala Dokumen PFMEA', 'PQP-W-12', '3', '2024-10-04', '14', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (560, 'Pembuatan, Pengontrolan & Review Berkala Dokumen Control Plan & MQC', 'PQP-W-13', '3', '2024-10-04', '12', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (561, 'Offline Training & HVPT', 'PQP-W-14', '3', '2007-10-30', '0', 'PP', 'LDA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lita.d@jai.co.id');
INSERT INTO public.procedure_documents VALUES (562, 'Initial Mass Production Intensive Quality Control', 'PQP-W-16', '3', '2025-08-28', '01', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (563, 'Production Preparation Cost Control', 'PQP-W-17', '3', '2024-06-10', '02', 'PP', 'LDA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lita.d@jai.co.id');
INSERT INTO public.procedure_documents VALUES (564, 'Cross Functional Review', 'PQP-W-18', '3', '2019-07-31', '0', 'PP', 'LDA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lita.d@jai.co.id');
INSERT INTO public.procedure_documents VALUES (565, 'Identifikasi & Pengontrolan Proses Penting & Proses Spesial', 'PQP-W-19', '3', '2019-10-22', '02', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (566, 'Initial Process Study Pengukuran Dimensi Clip To Protector', 'PQP-W-20', '3', '2023-12-02', '0', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (567, 'Hinkaku Production Approval', 'PQP-W-21', '3', '2024-07-19', '0', 'PP', 'LDA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lita.d@jai.co.id');
INSERT INTO public.procedure_documents VALUES (568, 'Design Change', 'CDC-P-01', '2', '2025-08-12', '16', 'PPC', 'EMU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123evaningsih@jai.co.id');
INSERT INTO public.procedure_documents VALUES (569, 'Pembuatan Dokumen Engineering Design and Standard', 'CDC-W-01', '3', '2025-08-07', '05', 'DSG', 'CHA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123catur.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (570, 'Proses Input Part List di AS 400', 'CDC-W-02', '3', '2025-08-07', '03', 'DSG', 'CHA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123catur.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (571, 'Pembuatan Engineering Package', 'CDC-W-03', '3', '2025-08-07', '08', 'DSG', 'CHA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123catur.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (572, 'Cross Section Terminal & Pengecekan Circuit Size Besar', 'CDC-W-05', '3', '2025-08-08', '05', 'QC LAB', 'SFE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123shinta.f@jai.co.id');
INSERT INTO public.procedure_documents VALUES (573, 'Print Clarification Dan Design Request', 'CDC-W-07', '3', '2008-10-28', '04', 'DSG', 'CHA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123catur.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (574, 'Initial Process Study crimping', 'CDC-W-10', '3', '2025-09-26', '11', 'QC LAB', 'SFE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123shinta.f@jai.co.id');
INSERT INTO public.procedure_documents VALUES (575, 'Control of Part Design Change', 'CDC-W-11', '3', '2025-08-08', '06', 'QC REC', 'ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (576, 'Verifikasi Proses Crimping', 'CDC-W-12', '3', '2025-05-02', '05', 'DSG', 'WSU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123widyastuti.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (577, 'Pembuatan Bonding Standart', 'CDC-W-13', '3', '2021-11-03', '06', 'DSG, QC LAB & MTC', 'VRA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123vinny.r@jai.co.id');
INSERT INTO public.procedure_documents VALUES (578, 'Temporary Crimping Standard', 'CDC-W-14', '3', '2025-11-12', '01', 'DSG', 'WSU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123widyastuti.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (579, 'Pembuatan Dan Perubahan Job Station', 'CDC-W-15', '3', '2023-07-21', '03', 'PP', 'LDA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lita.d@jai.co.id');
INSERT INTO public.procedure_documents VALUES (580, 'Control Circuit Dalam Joint Yang Sama', 'CDC-W-22', '3', '2025-08-07', '01', 'DSG', 'CHA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123catur.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (581, 'Mekanisme Penentuan Point Inspeksi', 'CDC-W-23', '3', '2019-10-25', '01', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (582, 'Pelaksanaan PPAP, ISIR & TR', 'PAP-P-01', '2', '2025-07-31', '06', 'QC CHECK W/H', 'SFE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123shinta.f@jai.co.id');
INSERT INTO public.procedure_documents VALUES (583, 'Pengisian Form PPAP Build Concern', 'PAP-W-08', '3', '2025-07-31', '06', 'QC CHECK W/H', 'SFE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123shinta.f@jai.co.id');
INSERT INTO public.procedure_documents VALUES (584, 'Production Plan', 'PPL-P-01', '2', '2025-08-14', '06', 'PPC', 'EMU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123evaningsih@jai.co.id');
INSERT INTO public.procedure_documents VALUES (585, 'Pembuatan Sample Build Timing', 'PPL-W-01', '3', '2025-08-14', '03', 'PPC', 'EMU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123evaningsih@jai.co.id');
INSERT INTO public.procedure_documents VALUES (586, 'Pembuatan SPP (Six Months Production Plan)', 'PPL-W-02', '3', '2025-08-19', '05', 'PPC', 'EMU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123evaningsih@jai.co.id');
INSERT INTO public.procedure_documents VALUES (587, 'Pembuatan Assy Plan', 'PPL-W-03', '3', '2025-08-14', '04', 'PPC', 'EMU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123evaningsih@jai.co.id');
INSERT INTO public.procedure_documents VALUES (588, 'Follow Up Delay Produksi', 'PPL-W-04', '3', '2025-08-19', '02', 'PPC', 'EMU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123evaningsih@jai.co.id');
INSERT INTO public.procedure_documents VALUES (589, 'Pengontrolan Polytainer Dan Pallet Rental', 'PPL-W-05', '3', '2025-08-06', '04', 'MPC', 'DAS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123dwi.as@jai.co.id');
INSERT INTO public.procedure_documents VALUES (590, 'Pembuatan Instruction Kanban', 'PPL-W-06', '3', '2025-11-10', '04', 'NYS', 'LSE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lilis.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (591, 'Production Plan for Part & Service', 'PPL-W-07', '3', '2025-04-28', '03', 'PPC', 'EMU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123evaningsih@jai.co.id');
INSERT INTO public.procedure_documents VALUES (592, 'Request Air Freight Finish Goods', 'PPL-W-08', '3', '2025-08-14', '01', 'PPC', 'EMU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123evaningsih@jai.co.id');
INSERT INTO public.procedure_documents VALUES (593, 'Increase And Decrease Order', 'PPL-W-11', '3', '2025-08-14', '02', 'PPC', 'EMU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123evaningsih@jai.co.id');
INSERT INTO public.procedure_documents VALUES (594, 'Material Ordering', 'MOR-P-01', '2', '2024-08-19', '08', 'MPC', 'MMR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.rafi@jai.co.id');
INSERT INTO public.procedure_documents VALUES (595, 'Input Assy Plan Di AS 400', 'MOR-W-01', '3', '2025-08-14', '02', 'PPC', 'EMU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123evaningsih@jai.co.id');
INSERT INTO public.procedure_documents VALUES (596, 'Pengadaan PSW Material', 'MOR-W-05', '3', '2025-08-06', '05', 'MPC', 'DAS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123dwi.as@jai.co.id');
INSERT INTO public.procedure_documents VALUES (597, 'Line Condition Report', 'MOR-W-06', '3', '2025-08-01', '03', 'MPC', 'MMR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.rafi@jai.co.id');
INSERT INTO public.procedure_documents VALUES (598, 'Follow Up Over Quantity Shipment', 'MOR-W-08', '3', '2025-08-12', '04', 'MPC', 'MMR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.rafi@jai.co.id');
INSERT INTO public.procedure_documents VALUES (599, 'Hot Part', 'MOR-W-09', '3', '2025-10-24', '03', 'MPC', 'MMR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.rafi@jai.co.id');
INSERT INTO public.procedure_documents VALUES (600, 'Follow Up Shipment Delay Part', 'MOR-W-10', '3', '2025-08-12', '02', 'MPC', 'MMR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.rafi@jai.co.id');
INSERT INTO public.procedure_documents VALUES (601, 'Follow Up Material Order', 'MOR-W-11', '3', '2024-10-08', '04', 'MPC', 'MMR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.rafi@jai.co.id');
INSERT INTO public.procedure_documents VALUES (602, 'Analisa Material', 'MOR-W-12', '3', '2025-04-15', '05', 'MPC', 'DAS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123dwi.as@jai.co.id');
INSERT INTO public.procedure_documents VALUES (603, 'Order Adjustment', 'MOR-W-14', '3', '2025-08-12', '04', 'MPC', 'MMR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.rafi@jai.co.id');
INSERT INTO public.procedure_documents VALUES (604, 'Air Freight Request', 'MOR-W-15', '3', '2025-08-06', '04', 'MPC', 'DAS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123dwi.as@jai.co.id');
INSERT INTO public.procedure_documents VALUES (605, 'Mekanisme Approval', 'MOR-W-17', '3', '2025-08-21', '20', 'FA', 'YFI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123yuli.f@jai.co.id');
INSERT INTO public.procedure_documents VALUES (606, 'Flow Informasi Penggunaan Material Jika Terjadi Kondisi Abnormal', 'MOR-W-21', '3', '2025-11-13', '01', 'MPC', 'MMR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.rafi@jai.co.id');
INSERT INTO public.procedure_documents VALUES (607, 'Standard Agreement Purchase Untuk Non Material W/H', 'MOR-W-25', '3', '2025-11-07', '09', 'PURCHASE', 'RKO', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123riska.o@jai.co.id');
INSERT INTO public.procedure_documents VALUES (608, 'Interruption From Externally Provided', 'MOR-W-26', '3', '2025-08-01', '01', 'MPC', 'MMR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.rafi@jai.co.id');
INSERT INTO public.procedure_documents VALUES (609, 'Purchasing', 'MOR-P-02', '2', '2026-01-05', '10', 'PURCHASE', 'RKO', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123riska.o@jai.co.id');
INSERT INTO public.procedure_documents VALUES (610, 'Pembuatan PR & AF Requisition', 'MOR-W-20', '3', '2023-05-16', '10', 'PURCHASE', 'RKO', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123riska.o@jai.co.id');
INSERT INTO public.procedure_documents VALUES (611, 'Pembuatan Application For Advance Payment (AFAP)', 'MOR-W-27', '3', '2025-09-04', '01', 'PGA,QA,MPC,FA', 'HPU,TWI,DAS,YFI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123yuli.f@jai.co.id');
INSERT INTO public.procedure_documents VALUES (612, 'Material Receiving And Storage', 'MRS-P-01', '2', '2025-05-20', '08', 'QC REC, WHS', 'ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (613, 'Quality Receiving Inspection', 'MRS-W-02', '3', '2025-07-31', '08', 'QC REC', 'ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (614, 'Rec. Insp. For Abnormal Condition', 'MRS-W-03', '3', '2025-11-14', '02', 'QC REC', 'ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (615, 'Pembuatan Receiving Inspection Standard', 'MRS-W-05', '3', '2025-07-31', '02', 'QC REC', 'ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (616, 'Pengisian CS Pemeriksaan Ulang Part / Material', 'MRS-W-10', '3', '2025-11-07', '04', 'QC REC', 'ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (617, 'Material Alert', 'MRS-W-11', '3', '2025-11-07', '04', 'QC REC', 'ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (618, 'Kontrol Material Slow Moving', 'MRS-W-13', '3', '2025-08-15', '05', 'WHS', 'FIR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123ferry.i@jai.co.id');
INSERT INTO public.procedure_documents VALUES (619, 'Mekanisme Pengontrolan Dan Pengecekan SOC Untuk Direct Material & In Direct Material', 'MRS-W-16', '3', '2024-09-26', '08', 'MPC', 'DAS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123dwi.as@jai.co.id');
INSERT INTO public.procedure_documents VALUES (620, 'Claim Dead Stock Material ke Customer', 'MRS-W-18', '3', '2025-08-06', '04', 'MPC', 'DAS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123dwi.as@jai.co.id');
INSERT INTO public.procedure_documents VALUES (621, 'Control New Part & Similar Part', 'MRS-W-23', '3', '2021-06-04', '02', 'QC REC', 'ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (622, 'Pembuatan Cutting Kanban Dan Shikake Kanban', 'MRS-W-25', '3', '2025-11-10', '05', 'NYS', 'LSE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lilis.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (623, 'Part Requisition', 'MRS-W-28', '3', '2020-04-24', '03', 'WHS', 'FIR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123ferry.i@jai.co.id');
INSERT INTO public.procedure_documents VALUES (624, 'New Part', 'MRS-W-29', '3', '2024-10-22', '02', 'MPC', 'MMR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.rafi@jai.co.id');
INSERT INTO public.procedure_documents VALUES (625, 'Pengembalian Sisa Material Prototype', 'MRS-W-31', '3', '2022-12-12', '0', 'PP', 'LDA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lita.d@jai.co.id');
INSERT INTO public.procedure_documents VALUES (626, 'Pembuatan dan Penyimpanan Name Plate', 'MRS-W-33', '3', '2024-11-12', '08', 'WHS', 'FIR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123ferry.i@jai.co.id');
INSERT INTO public.procedure_documents VALUES (627, 'Material Supply', 'MRS-P-02 : Before : MSU-P-01', '2', '2025-07-29', '05', 'WHS', 'FIR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123ferry.i@jai.co.id');
INSERT INTO public.procedure_documents VALUES (628, 'Pembuatan Kanban Wire Dan Terminal', 'MRS-W-26 : Before : MSU-W-07', '3', '2025-11-10', '03', 'NYS', 'LSE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123lilis.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (629, 'Penyediaan Tube Untuk Produksi', 'MRS-W-35 : Before : MSU-W-14', '3', '2025-10-23', '03', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (630, 'Stock Opname', 'MRS-W-34 : BEFORE MSU-W-15', '3', '2025-08-11', '03', 'WHS', 'FIR', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123ferry.i@jai.co.id');
INSERT INTO public.procedure_documents VALUES (631, 'Persiapan SoC Sample Untuk Pengecekan Phthlate Esther Ke YIC-AP', 'MRS-W-36', '3', '2025-12-12', '0', 'MPC', 'DAS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123dwi.as@jai.co.id');
INSERT INTO public.procedure_documents VALUES (632, 'Pre Assembly Process & Inspection', 'PAM-P-01', '2', '2025-08-01', '03', 'PRODUKSI, QA', 'ENS, TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id, toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (633, 'Lot Management Bonding', 'PAM-W-01', '3', '2026-01-15', '06', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (634, 'Pengisihan CS LK Operator & Inspector Heat Shrink (Raychem)', 'PAM-W-02', '3', '2023-12-02', '03', 'PRODUKSI, QA', 'ENS, TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id, toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (635, 'Set Up Verification', 'PAM-W-03', '3', '2025-09-26', '14', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (636, 'Pengisian Form Rework Pre Assy', 'PAM-W-04', '3', '2026-01-15', '03', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (637, 'Pengisian CS LK Operator & Inspector Gun / Dip Solder', 'PAM-W-06', '3', '2025-08-15', '04', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (638, 'Pengisian CS LK Operator Dan Inspektor Cutting', 'PAM-W-07', '3', '2025-11-10', '16', 'PROD, QA, NYS', 'ENS, TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id, toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (639, 'Pengisian CS LK Operator Dan Inspektor Man. Crimping', 'PAM-W-08', '3', '2022-11-03', '14', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (640, 'Pengisian CS LK Operator Middle Stripping', 'PAM-W-09', '3', '2025-08-15', '04', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (641, 'Pengisian CS LK Operator Wire Twisting', 'PAM-W-10', '3', '2025-08-15', '09', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (642, 'Pengisian CS LK Operator Pemasangan Tube / Accessories', 'PAM-W-11', '3', '2025-08-14', '05', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (643, 'Pengisian CS LK Operator Joint Taping', 'PAM-W-12', '3', '2025-08-15', '04', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (644, 'Pengisian CS LK Operator Manual Taping', 'PAM-W-13', '3', '2022-11-03', '05', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (645, 'Pengisian CS LK Operator & Inspektor Joint Crimping', 'PAM-W-14', '3', '2025-08-15', '08', 'PRODUKSI, QA', 'ENS, TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id, toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (646, 'Pengisian CS L/K Operator & Inspektor Joint Welding / Bonder', 'PAM-W-15', '3', '2025-08-22', '10', 'PRODUKSI, QA', 'ENS, TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id, toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (647, 'Pengisian CS LK Operator & Inspector Manual Crimping Shield Wire', 'PAM-W-16', '3', '2019-10-22', '0', 'PRODUKSI, QA', 'ENS, TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id, toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (648, 'Pengisian CS LK Operator Accessories Insertion Shield Wire', 'PAM-W-17', '3', '2019-10-11', '0', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (649, 'Pengisian CS LK Operator Cutting Doren Shield Wire', 'PAM-W-18', '3', '2019-10-11', '0', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (650, 'Voltage Test Dan Pengecheckan Scratch Core', 'PAM-W-19', '3', '2025-09-26', '08', 'QC LAB', 'SFE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123shinta.f@jai.co.id');
INSERT INTO public.procedure_documents VALUES (651, 'Pengisian CS L/K Operator & Inspektor Manual Crimping Air Bag', 'PAM-W-29', '3', '2025-08-14', '04', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (652, 'Pengisian LKO Pemasangan Tube / Accesories Airbag', 'PAM-W-35', '3', '2025-08-15', '04', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (653, 'Quality Tube', 'PAM-W-37', '3', '2025-08-13', '04', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (654, 'Pengisian LKO Rolling Machine Wire /Tube', 'PAM-W-38', '3', '2025-08-13', '03', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (655, 'Rule 4M Transition Pre Assy', 'PAM-W-39', '3', '2019-08-08', '02', 'PRODUKSI, QA', 'ENS, TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id, toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (656, 'Pengisian CS Daily Report Prosess Cutting', 'PAM-W-41', '3', '2025-08-15', '06', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (657, 'Pengisian C/S LKO Operator End Stripping', 'PAM-W-42', '3', '2025-10-23', '04', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (658, 'Statistical Process Control (SPC)', 'PAM-W-44', '3', '2025-08-15', '02', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (659, 'Pengisian C/S Lembar Kerja Operator & Inspector Joint Ultrasonic', 'PAM-W-45', '3', '2025-10-13', '01', 'PRODUKSI, QA', 'ENS, TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id, toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (660, 'Pengisian C/S Lembar Kerja Operator Proses Anti Korosi Aluminium Wire (Ultraviolet)', 'PAM-W-46', '3', '2023-12-01', '00', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (661, 'Pengisian Checksheet Proses Anti Korosi (Ultraviolet)', 'PAM-W-47', '3', '2023-12-02', '00', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (662, 'Pengisian C/S Laporan Kerja Operator Hodoki', 'PAM-W-48', '3', '2023-12-01', '00', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (663, 'Pengisian Checksheet Pengecheckan Kekentalan Aron Alpha', 'PAM-W-49', '3', '2024-12-11', '01', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (664, 'Pengisian Checksheet LKO Cutting Jam Twist', 'PAM-W-51', '3', '2025-11-19', '00', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (665, 'Final Assembly Process & Inspection', 'FAM-P-01', '2', '2025-08-01', '03', 'PRODUKSI, QA', 'ENS, TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id, toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (666, 'Proses Inspeksi di Final Assy', 'FAM-P-02', '2', '2026-01-15', '03', 'PRODUKSI, QA', 'ENS, TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id, toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (667, 'Kontrol Harian Produksi', 'FAM-W-06', '3', '2025-08-19', '03', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (668, 'Pengisian CS Laporan Kerja Inspektor F/A', 'FAM-W-07', '3', '2025-07-31', '12', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (669, 'Pengisian CS Laporan Kerja Operator F/A', 'FAM-W-08', '3', '2017-12-14', '02', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (670, 'Pengisian CS Pengisian Material Mesin Water Proof Injection', 'FAM-W-09', '3', '2020-10-19', '03', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (671, 'Pengisian C/S Sample Test Mesin Water Proof Injection', 'FAM-W-12', '3', '2025-08-13', '02', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (672, 'Standard Setting Torque Driver & Torque Checker', 'FAM-W-13', '3', '2025-11-13', '04', 'PD, PE, QC MSA', 'DAF,YHE,TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123david.a@jai.co.id');
INSERT INTO public.procedure_documents VALUES (673, 'Pengisian CS Laporan Kerja Operator FA Airbag', 'FAM-W-16', '3', '2025-08-13', '03', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (674, 'Pengisian CS Housing Airbag', 'FAM-W-17', '3', '2011-10-18', '03', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (675, 'Pengisian My QA', 'FAM-W-19', '3', '2025-10-13', '02', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (676, 'Pengisian Defect Tracking Checksheet Removal Terminal', 'FAM-W-21', '3', '2025-08-15', '05', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (677, 'Rule 4M Transition Final Assy', 'FAM-W-23', '3', '2025-08-06', '10', 'PRODUKSI, QA', 'ENS, TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id, toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (678, 'Proses Torque', 'FAM-W-27', '3', '2025-11-14', '03', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (679, 'Kontrol Pemakaian Name Plate', 'FAM-W-28', '3', '2025-10-13', '04', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (680, 'Control of Nonconforming Product', 'CNP-P-01', '2', '2025-07-31', '09', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (681, 'Pembuatan dan Pengisian Quality Alert', 'CNP-W-04', '3', '2025-11-19', '10', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (682, 'Cara Pengisian Form Defective Tag', 'CNP-W-05', '3', '2025-08-07', '07', 'PRODUKSI, QA', 'ENS, TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id, toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (683, 'Product Sorting / Rework Instruction', 'CNP-W-06', '3', '2026-01-15', '06', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (684, 'Traceability Process', 'CNP-W-07', '3', '2025-11-19', '02', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (685, 'Perhitungan Quality Cost', 'CNP-W-09', '3', '2025-07-31', '03', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (686, 'Penanganan Product di Quarantine Area', 'CNP-W-11', '3', '2007-06-19', '01', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (687, 'Pengisian Form Countermeasure Defect', 'CNP-W-12', '3', '2025-08-01', '02', 'PRODUKSI, QA', 'ENS, TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id, toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (688, 'Customer Complaint', 'CNP-W-13', '3', '2026-01-15', '16', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (689, 'Quality Notification / Business Memo', 'CNP-W-14', '3', '2025-08-22', '01', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (690, 'Control Nonconforming Part / Material', 'CNP-P-02', '2', '2024-06-04', '09', 'QC REC', 'ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (691, 'Pembuatan dan Follow Up Defective Report', 'CNP-W-01', '3', '2025-08-05', '07', 'QC REC', 'ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (692, 'Pembuatan Summary Report "Sorting Cost of Defective Parts" And Follow Up', 'CNP-W-02', '3', '2025-08-13', '06', 'QC REC', 'ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (693, 'Pemeriksaan Part Material 100%', 'CNP-W-03', '3', '2025-11-14', '04', 'QC REC', 'ASW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123atiek.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (694, 'Finished Goods Storage & Delivery', 'FSD-P-01', '2', '2025-08-13', '10', 'EXIM', 'ASE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123arianto.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (695, 'Loading to Container', 'FSD-W-01', '3', '2025-08-13', '04', 'EXIM', 'ASE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123arianto.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (696, 'Penarikan dan Penyusunan F/G di area Loading Dock', 'FSD-W-02', '3', '2025-08-12', '04', 'EXIM', 'ASE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123arianto.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (697, 'Shipping Release Review', 'FSD-W-09', '3', '2025-08-12', '03', 'PPC', 'EMU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123evaningsih@jai.co.id');
INSERT INTO public.procedure_documents VALUES (698, 'Repacking Process', 'FSD-W-10', '3', '2025-08-14', '01', 'PPC', 'EMU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123evaningsih@jai.co.id');
INSERT INTO public.procedure_documents VALUES (699, 'Pembuatan Invoice Finish Good', 'FSD-W-11', '3', '2025-08-14', '03', 'PPC', 'EMU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123evaningsih@jai.co.id');
INSERT INTO public.procedure_documents VALUES (700, 'Plant and Facility Planning', 'PFP-P-01', '2', '2020-07-21', '04', 'MTC, PROD ENG', 'MCB, DHS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id, dany.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (701, 'Perhitungan Dan Order Kebutuhan Mesin Produksi', 'PFP-W-01', '3', '2023-10-19', '03', 'MTC', 'MCB', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123m.chasan@jai.co.id');
INSERT INTO public.procedure_documents VALUES (702, 'Pembuatan Production Layout', 'PFP-W-02', '3', '2025-08-06', '06', 'NYS', 'HSW', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123hary.sw@jai.co.id');
INSERT INTO public.procedure_documents VALUES (703, 'Pembuatan Jig Board Drawing', 'PFP-W-03', '3', '2014-04-14', '01', 'PE', 'DHS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123danny.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (704, 'Pembuatan Cheker Program', 'PFP-W-05', '3', '2004-07-01', '0', 'PE', 'DHS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123danny.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (705, 'Pembuatan Jig Board', 'PFP-W-06', '3', '2004-09-28', '0', 'PE', 'DHS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123danny.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (706, 'Form Permintaan Pekerjaan', 'PFP-W-08', '3', '2025-10-13', '05', 'PRODUKSI', 'ENS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123endang.s@jai.co.id');
INSERT INTO public.procedure_documents VALUES (707, 'Approval dan Verifikasi Jig Board', 'PFP-W-10', '3', '2007-10-18', '05', 'PE', 'DHS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123danny.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (708, 'Checker Progran Validation', 'PFP-W-13', '3', '2004-06-29', '0', 'PE', 'DHS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123danny.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (709, 'Kebutuhan Special Equipment', 'PFP-W-14', '3', '2025-08-20', '01', 'PE, PD', 'DHS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123danny.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (710, 'Approval Fuse Insertion Dan Fuse Verification Plate', 'PFP-W-17', '3', '2025-07-31', '01', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (711, 'Pengisian Daily Check Inspector Dan GL Inspect', 'PFP-W-21', '3', '2025-09-26', '09', 'QA', 'TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123toni.w@jai.co.id');
INSERT INTO public.procedure_documents VALUES (712, 'Power Failure (Black Out)', 'PFP-W-22', '3', '2025-06-25', '01', 'PGA', 'ACA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123aris.c@jai.co.id');
INSERT INTO public.procedure_documents VALUES (713, 'Air Compression Failure', 'PFP-W-23', '3', '2025-06-25', '01', 'PGA', 'ACA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123aris.c@jai.co.id');
INSERT INTO public.procedure_documents VALUES (714, 'Water Supply Interuption', 'PFP-W-24', '3', '2022-09-21', '0', 'PGA', 'ACA', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123aris.c@jai.co.id');
INSERT INTO public.procedure_documents VALUES (715, 'Chemical Spills (Tumpahan B3 Cair)', 'PFP-W-25', '3', '2022-11-24', '0', 'PGA', 'AIN', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123agung.i@jai.co.id');
INSERT INTO public.procedure_documents VALUES (716, 'Telecomunication Failure (Telephone)', 'PFP-W-26', '3', '2022-11-24', '0', 'PGA', 'HPU', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123hayu.p@jai.co.id');
INSERT INTO public.procedure_documents VALUES (721, 'Penyediaan Dan Pengadaan Part / Equipment', 'ETM-W-02', '3', '2025-08-20', '02', 'PE', 'DHS', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123danny.h@jai.co.id');
INSERT INTO public.procedure_documents VALUES (745, 'Analisa Hasil Kalibrasi', 'CMD-W-02', '3', '2025-11-07', '06', 'QC MSA', 'SFE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123shinta.f@jai.co.id');
INSERT INTO public.procedure_documents VALUES (746, 'Verifikasi Torque', 'CMD-W-03', '3', '2025-08-11', '02', 'PD, PE, QC MSA', 'DAF,YHE,TWI', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123david.a@jai.co.id');
INSERT INTO public.procedure_documents VALUES (747, 'Penaganan Kerusakan Atau Kehilangan Alat Ukur', 'CMD-W-04', '3', '2024-11-01', '02', 'QC MSA', 'SFE', 'Relevan', false, '2026-02-18 09:08:32.000013', '2026-03-05 11:32:57.084179', '123shinta.f@jai.co.id');


--
-- Data for Name: procedure_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.procedure_files VALUES (3, 'BPR-P-01', 'BPR-P-01 Business Plan R08.pdf', '/uploads/documents/BPR-P-01/BPR-P-01 Business Plan R08.pdf', 206161, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (4, 'BPR-W-01', 'BPR-W-01 Risk Analysis R03.pdf', '/uploads/documents/BPR-W-01/BPR-W-01 Risk Analysis R03.pdf', 255123, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (5, 'CDC-P-01', 'CDC-P-01 Design Change R16.pdf', '/uploads/documents/CDC-P-01/CDC-P-01 Design Change R16.pdf', 765255, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (6, 'CDC-W-01', 'CDC-W-01 Pembuatan Dokumen Engineering Design & Standard R05.pdf', '/uploads/documents/CDC-W-01/CDC-W-01 Pembuatan Dokumen Engineering Design & Standard R05.pdf', 223783, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (7, 'CDC-W-02', 'CDC-W-02 Proses Input Part List Di AS400 R03.pdf', '/uploads/documents/CDC-W-02/CDC-W-02 Proses Input Part List Di AS400 R03.pdf', 224141, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (8, 'CDC-W-03', 'CDC-W-03 Pembuatan Engineering Package R08.pdf', '/uploads/documents/CDC-W-03/CDC-W-03 Pembuatan Engineering Package R08.pdf', 261400, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (10, 'CDC-W-07', 'CDC-W-07 Concern Report Sheet (Monrensyo) R05.pdf', '/uploads/documents/CDC-W-07/CDC-W-07 Concern Report Sheet (Monrensyo) R05.pdf', 168335, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (11, 'CDC-W-10', 'CDC-W-10 Initial Process Study Crimping R11.pdf', '/uploads/documents/CDC-W-10/CDC-W-10 Initial Process Study Crimping R11.pdf', 387870, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (12, 'CDC-W-11', 'CDC-W-11 Control Of Part Design Change R06.pdf', '/uploads/documents/CDC-W-11/CDC-W-11 Control Of Part Design Change R06.pdf', 161643, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (13, 'CDC-W-12', 'CDC-W-12 Verifikasi Crimping Standard R06.pdf', '/uploads/documents/CDC-W-12/CDC-W-12 Verifikasi Crimping Standard R06.pdf', 291717, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (14, 'CDC-W-13', 'CDC-W-13 Pembuatan Bonding Standard R07.pdf', '/uploads/documents/CDC-W-13/CDC-W-13 Pembuatan Bonding Standard R07.pdf', 353030, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (15, 'CDC-W-14', 'CDC-W-14 Temporary Crimping Standard R01.pdf', '/uploads/documents/CDC-W-14/CDC-W-14 Temporary Crimping Standard R01.pdf', 291671, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (16, 'CDC-W-22', 'CDC-W-22 Control Circuit Dalam Joint Yang Sama R01.pdf', '/uploads/documents/CDC-W-22/CDC-W-22 Control Circuit Dalam Joint Yang Sama R01.pdf', 251814, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (17, 'CMD-P-01', 'CMD-P-01 Pengendalian Alat Ukur R09.pdf', '/uploads/documents/CMD-P-01/CMD-P-01 Pengendalian Alat Ukur R09.pdf', 408496, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (18, 'CMD-P-02', 'CMD-P-02 Measurement System Analysis (MSA) R05.pdf', '/uploads/documents/CMD-P-02/CMD-P-02 Measurement System Analysis (MSA) R05.pdf', 425802, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (19, 'CMD-W-01', 'CMD-W-01 Pembuatan MSA Plan & Evaluation R03.pdf', '/uploads/documents/CMD-W-01/CMD-W-01 Pembuatan MSA Plan & Evaluation R03.pdf', 173876, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (20, 'CMD-W-02', 'CMD-W-02 Analisa Hasil Kalibrasi R06.pdf', '/uploads/documents/CMD-W-02/CMD-W-02 Analisa Hasil Kalibrasi R06.pdf', 188175, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (21, 'CMD-W-03', 'CMD-W-03 Verifikasi Torque R02.pdf', '/uploads/documents/CMD-W-03/CMD-W-03 Verifikasi Torque R02.pdf', 252804, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (23, 'CNP-P-01', 'CNP-P-01 Control Of Nonconforming Product R09.pdf', '/uploads/documents/CNP-P-01/CNP-P-01 Control Of Nonconforming Product R09.pdf', 262613, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (24, 'CNP-P-02', 'CNP-P-02 Control of Nonconforming Part_Material R09_NEW.pdf', '/uploads/documents/CNP-P-02/CNP-P-02 Control of Nonconforming Part_Material R09_NEW.pdf', 170313, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (25, 'CNP-W-01', 'CNP-W-01 Pembuatan Dan Follow Up Defective Report R07.pdf', '/uploads/documents/CNP-W-01/CNP-W-01 Pembuatan Dan Follow Up Defective Report R07.pdf', 352261, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (26, 'CNP-W-02', 'CNP-W-02 Pembuatan Summary Report Sorting Cost of Defective Part & Follow Up R06.pdf', '/uploads/documents/CNP-W-02/CNP-W-02 Pembuatan Summary Report Sorting Cost of Defective Part & Follow Up R06.pdf', 258791, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (27, 'CNP-W-03', 'CNP-W-03 Pemeriksaan Part_Material 100% R04.pdf', '/uploads/documents/CNP-W-03/CNP-W-03 Pemeriksaan Part_Material 100% R04.pdf', 182680, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (28, 'CNP-W-04', 'CNP-W-04 Pembuatan Dan Pengisian Quality Alert R10.pdf', '/uploads/documents/CNP-W-04/CNP-W-04 Pembuatan Dan Pengisian Quality Alert R10.pdf', 412619, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (29, 'CNP-W-05', 'CNP-W-05 Cara Pengisian Form Defective Tag R07.pdf', '/uploads/documents/CNP-W-05/CNP-W-05 Cara Pengisian Form Defective Tag R07.pdf', 1009530, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (30, 'CNP-W-06', 'CNP-W-06 Product Sorting_Rework Instruction R06.pdf', '/uploads/documents/CNP-W-06/CNP-W-06 Product Sorting_Rework Instruction R06.pdf', 236675, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (31, 'CNP-W-07', 'CNP-W-07 Traceability Process R02.pdf', '/uploads/documents/CNP-W-07/CNP-W-07 Traceability Process R02.pdf', 337593, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (32, 'CNP-W-09', 'CNP-W-09 Perhitungan Quality Cost R03.pdf', '/uploads/documents/CNP-W-09/CNP-W-09 Perhitungan Quality Cost R03.pdf', 351065, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (33, 'CNP-W-11', 'CNP-W-11 Penanganan Product di Quarantine Area R02.pdf', '/uploads/documents/CNP-W-11/CNP-W-11 Penanganan Product di Quarantine Area R02.pdf', 338345, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (34, 'CNP-W-12', 'CNP-W-12 Pengisian Form Countermeasure Defect R02.pdf', '/uploads/documents/CNP-W-12/CNP-W-12 Pengisian Form Countermeasure Defect R02.pdf', 282816, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (35, 'CNP-W-13', 'CNP-W-13 Customer Complaint R16.pdf', '/uploads/documents/CNP-W-13/CNP-W-13 Customer Complaint R16.pdf', 186924, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (36, 'CNP-W-14', 'CNP-W-14 Quality Notification atau Business Memo R01.pdf', '/uploads/documents/CNP-W-14/CNP-W-14 Quality Notification atau Business Memo R01.pdf', 226929, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (38, 'COD-W-02', 'COD-W-02 Metode Distribusi Standard kerja R03.pdf', '/uploads/documents/COD-W-02/COD-W-02 Metode Distribusi Standard kerja R03.pdf', 177504, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (39, 'COD-W-04', 'COD-W-04  Pengendalian Quality Record R08.pdf', '/uploads/documents/COD-W-04/COD-W-04  Pengendalian Quality Record R08.pdf', 352361, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (2, 'BOS-W-03', 'BOS-W-03 Work In Process Finish Good R01.pdf', '/uploads/documents/BOS-W-03/BOS-W-03 Work In Process Finish Good R01.pdf', 229735, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (42, 'ETM-W-04', 'ETM-W-04 Set Up Tooling Applicator R04.pdf', '/uploads/documents/ETM-W-04/ETM-W-04 Set Up Tooling Applicator R04.pdf', 234333, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (43, 'ETM-W-05', 'ETM-W-05 Modifikasi Applikator R05.pdf', '/uploads/documents/ETM-W-05/ETM-W-05 Modifikasi Applikator R05.pdf', 226576, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (44, 'ETM-W-07', 'ETM-W-07 Penyediaan Dan Pengelolaan Spare Part R09.pdf', '/uploads/documents/ETM-W-07/ETM-W-07 Penyediaan Dan Pengelolaan Spare Part R09.pdf', 282371, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (45, 'ETM-W-10', 'ETM-W-10 Mapping Applicator R04.pdf', '/uploads/documents/ETM-W-10/ETM-W-10 Mapping Applicator R04.pdf', 249741, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (46, 'ETM-W-13', 'ETM-W-13 Tooling Control Maintenance R07.pdf', '/uploads/documents/ETM-W-13/ETM-W-13 Tooling Control Maintenance R07.pdf', 215514, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (47, 'ETM-W-15', 'ETM-W-15 Sistem Informasi Perubahan Posisi Applicator R03.pdf', '/uploads/documents/ETM-W-15/ETM-W-15 Sistem Informasi Perubahan Posisi Applicator R03.pdf', 229447, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (48, 'ETM-W-19', 'ETM-W-19 Production Equipment Breakdown R01.pdf', '/uploads/documents/ETM-W-19/ETM-W-19 Production Equipment Breakdown R01.pdf', 260676, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (49, 'ETM-W-20', 'ETM-W-20 Review Equipment R03.pdf', '/uploads/documents/ETM-W-20/ETM-W-20 Review Equipment R03.pdf', 292461, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (50, 'ETM-W-21', 'ETM-W-21 Pengontrolan Inspection Jig R05.pdf', '/uploads/documents/ETM-W-21/ETM-W-21 Pengontrolan Inspection Jig R05.pdf', 276704, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (51, 'ETM-W-22', 'ETM-W-22 Pengontrolan Alat Potong R01.pdf', '/uploads/documents/ETM-W-22/ETM-W-22 Pengontrolan Alat Potong R01.pdf', 195309, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (53, 'FAM-P-01', 'FAM-P-01 Final Assembly Process And Inspection R03.pdf', '/uploads/documents/FAM-P-01/FAM-P-01 Final Assembly Process And Inspection R03.pdf', 367585, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (54, 'FAM-P-02', 'FAM-P-02 Proses Inspeksi Di Final Assy 03.pdf', '/uploads/documents/FAM-P-02/FAM-P-02 Proses Inspeksi Di Final Assy 03.pdf', 196788, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (55, 'FAM-W-06', 'FAM-W-06 Kontrol Harian Produksi R03.pdf', '/uploads/documents/FAM-W-06/FAM-W-06 Kontrol Harian Produksi R03.pdf', 528757, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (56, 'FAM-W-07', 'FAM-W-07 Pengisian CS Laporan Kerja Inspector FA R12.pdf', '/uploads/documents/FAM-W-07/FAM-W-07 Pengisian CS Laporan Kerja Inspector FA R12.pdf', 350972, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (57, 'FAM-W-08', 'FAM-W-08 Pengisian CS Laporan Kerja Operator FA R03.pdf', '/uploads/documents/FAM-W-08/FAM-W-08 Pengisian CS Laporan Kerja Operator FA R03.pdf', 270324, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (58, 'FAM-W-09', 'FAM-W-09 Pengisian CS Material Mesin Water Proof Injection R04.pdf', '/uploads/documents/FAM-W-09/FAM-W-09 Pengisian CS Material Mesin Water Proof Injection R04.pdf', 192613, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (59, 'FAM-W-12', 'FAM-W-12 Pengisian CS Sample Test Mesin Water Proof Injection R02.pdf', '/uploads/documents/FAM-W-12/FAM-W-12 Pengisian CS Sample Test Mesin Water Proof Injection R02.pdf', 294068, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (60, 'FAM-W-13', 'FAM-W-13 Standard Setting Torque Driver & Torque Checker R04.pdf', '/uploads/documents/FAM-W-13/FAM-W-13 Standard Setting Torque Driver & Torque Checker R04.pdf', 629093, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (62, 'FAM-W-17', 'FAM-W-17 Pengisian LKO Housing Airbag R04.pdf', '/uploads/documents/FAM-W-17/FAM-W-17 Pengisian LKO Housing Airbag R04.pdf', 174065, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (63, 'FAM-W-19', 'FAM-W-19 Pengisian My QA R02.pdf', '/uploads/documents/FAM-W-19/FAM-W-19 Pengisian My QA R02.pdf', 330237, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (64, 'FAM-W-21', 'FAM-W-21 Pengisian Defect Tracking Checksheet Removal Terminal R05.pdf', '/uploads/documents/FAM-W-21/FAM-W-21 Pengisian Defect Tracking Checksheet Removal Terminal R05.pdf', 429643, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (65, 'FAM-W-23', 'FAM-W-23 Rule 4M Transition Final Assy R11.pdf', '/uploads/documents/FAM-W-23/FAM-W-23 Rule 4M Transition Final Assy R11.pdf', 657000, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (66, 'FAM-W-27', 'FAM-W-27 Proses Torque R03.pdf', '/uploads/documents/FAM-W-27/FAM-W-27 Proses Torque R03.pdf', 951494, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (67, 'FAM-W-28', 'FAM-W-28 Kontrol Pemakaian Name Plate R04.pdf', '/uploads/documents/FAM-W-28/FAM-W-28 Kontrol Pemakaian Name Plate R04.pdf', 387557, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (68, 'FSD-P-01', 'FSD-P-01 Finished Goods Storage & Delivery R10.pdf', '/uploads/documents/FSD-P-01/FSD-P-01 Finished Goods Storage & Delivery R10.pdf', 248579, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (69, 'FSD-W-01', 'FSD-W-01 Loading To Container R05.pdf', '/uploads/documents/FSD-W-01/FSD-W-01 Loading To Container R05.pdf', 248263, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (70, 'FSD-W-02', 'FSD-W-02 Penarikan & Penyusunan FG Di Area Loading Dock R04.pdf', '/uploads/documents/FSD-W-02/FSD-W-02 Penarikan & Penyusunan FG Di Area Loading Dock R04.pdf', 248177, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (71, 'FSD-W-09', 'FSD-W-09 Shipping Release Review R03.pdf', '/uploads/documents/FSD-W-09/FSD-W-09 Shipping Release Review R03.pdf', 227542, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (72, 'FSD-W-10', 'FSD-W-10 Repacking Process R01.pdf', '/uploads/documents/FSD-W-10/FSD-W-10 Repacking Process R01.pdf', 274180, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (73, 'FSD-W-11', 'FSD-W-11 Pembuatan invoice Finish Good R03.pdf', '/uploads/documents/FSD-W-11/FSD-W-11 Pembuatan invoice Finish Good R03.pdf', 295875, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (74, 'HRM-P-01', 'HRM-P-01 Responsibility And Authority R02.pdf', '/uploads/documents/HRM-P-01/HRM-P-01 Responsibility And Authority R02.pdf', 271134, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (75, 'HRM-P-03', 'HRM-P-03 Training System R10.pdf', '/uploads/documents/HRM-P-03/HRM-P-03 Training System R10.pdf', 198126, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (76, 'HRM-W-02', 'HRM-W-02 Evaluasi Kinerja Karyawan R08.pdf', '/uploads/documents/HRM-W-02/HRM-W-02 Evaluasi Kinerja Karyawan R08.pdf', 271191, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (78, 'HRM-W-05', 'HRM-W-05 Pembuatan Dan Review Materi Training R04.pdf', '/uploads/documents/HRM-W-05/HRM-W-05 Pembuatan Dan Review Materi Training R04.pdf', 258407, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (41, 'ETM-W-02', 'ETM-W-02 Penyediaan & Pengadaan Part Equipment R02.pdf', '/uploads/documents/ETM-W-02/ETM-W-02 Penyediaan & Pengadaan Part Equipment R02.pdf', 242591, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (83, 'HRM-W-11', 'HRM-W-11 Sistem Promosi Group Leader Line Leader Forman & ESO R07.pdf', '/uploads/documents/HRM-W-11/HRM-W-11 Sistem Promosi Group Leader Line Leader Forman & ESO R07.pdf', 169001, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (84, 'HRM-W-12', 'HRM-W-12 Penunjukan Inspector Baru R06.pdf', '/uploads/documents/HRM-W-12/HRM-W-12 Penunjukan Inspector Baru R06.pdf', 519732, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (85, 'HRM-W-13', 'HRM-W-13 Pelaksanaan Rekrutmen Dengan Syarat Khusus R05.pdf', '/uploads/documents/HRM-W-13/HRM-W-13 Pelaksanaan Rekrutmen Dengan Syarat Khusus R05.pdf', 310967, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (86, 'HRM-W-14', 'HRM-W-14 Pelaksanaan Kerja Lembur.pdf', '/uploads/documents/HRM-W-14/HRM-W-14 Pelaksanaan Kerja Lembur.pdf', 332072, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (87, 'HRM-W-15', 'HRM-W-15 Id Card Karyawan Dan Temporary ID R02.pdf', '/uploads/documents/HRM-W-15/HRM-W-15 Id Card Karyawan Dan Temporary ID R02.pdf', 342155, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (88, 'HRM-W-16', 'HRM-W-16 License Sistem R05.pdf', '/uploads/documents/HRM-W-16/HRM-W-16 License Sistem R05.pdf', 249901, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (89, 'HRM-W-17', 'HRM-W-17 Prosedur Revewal License R02.pdf', '/uploads/documents/HRM-W-17/HRM-W-17 Prosedur Revewal License R02.pdf', 259974, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (91, 'HRM-W-21', 'HRM-W-21 Permohonan Pengesahan Perjanjian Magang Ke Disnaker R01.pdf', '/uploads/documents/HRM-W-21/HRM-W-21 Permohonan Pengesahan Perjanjian Magang Ke Disnaker R01.pdf', 336147, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (92, 'HRM-W-22', 'HRM-W-22 Pengambilan Dan Pengembalian Form CMP R01.pdf', '/uploads/documents/HRM-W-22/HRM-W-22 Pengambilan Dan Pengembalian Form CMP R01.pdf', 246914, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (93, 'HRM-W-23', 'HRM-W-23 Prosedur Pengontrolan License R05.pdf', '/uploads/documents/HRM-W-23/HRM-W-23 Prosedur Pengontrolan License R05.pdf', 251984, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (94, 'HRM-W-27', 'HRM-W-27 Prosedur Pengontrolan License Eksternal R01.pdf', '/uploads/documents/HRM-W-27/HRM-W-27 Prosedur Pengontrolan License Eksternal R01.pdf', 263284, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (95, 'HRM-W-28', 'HRM-W-28 Pelaksanaan Kaizen (Improvisasi) R10.pdf', '/uploads/documents/HRM-W-28/HRM-W-28 Pelaksanaan Kaizen (Improvisasi) R10.pdf', 255260, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (96, 'HRM-W-29', 'HRM-W-29 Aktivitas QC Circle R07.pdf', '/uploads/documents/HRM-W-29/HRM-W-29 Aktivitas QC Circle R07.pdf', 228659, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (97, 'HRM-W-30', 'HRM-W-30 Konvensi QC Circle Internal R02.pdf', '/uploads/documents/HRM-W-30/HRM-W-30 Konvensi QC Circle Internal R02.pdf', 226843, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (98, 'HRM-W-32', 'HRM-W-32 Mutasi Karyawan R01.pdf', '/uploads/documents/HRM-W-32/HRM-W-32 Mutasi Karyawan R01.pdf', 239945, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (99, 'HRM-W-33', 'HRM-W-33 Perubahan Atau Pembatalan Pelaksanaan Training R01.pdf', '/uploads/documents/HRM-W-33/HRM-W-33 Perubahan Atau Pembatalan Pelaksanaan Training R01.pdf', 231642, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (100, 'HRM-W-35', 'HRM-W-35 Pendistribusian Dan Pengisian Form Request Training R01.pdf', '/uploads/documents/HRM-W-35/HRM-W-35 Pendistribusian Dan Pengisian Form Request Training R01.pdf', 222952, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (101, 'HRM-W-36', 'HRM-W-36 Medical Emergency R01.pdf', '/uploads/documents/HRM-W-36/HRM-W-36 Medical Emergency R01.pdf', 241082, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (102, 'HRM-W-37', 'HRM-W-37 Tidak Masuk_Mogok Kerja & Kekurangan Tenaga kerja R01.pdf', '/uploads/documents/HRM-W-37/HRM-W-37 Tidak Masuk_Mogok Kerja & Kekurangan Tenaga kerja R01.pdf', 364248, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (103, 'IAU-P-01', 'IAU-P-01 Internal Audit R14.pdf', '/uploads/documents/IAU-P-01/IAU-P-01 Internal Audit R14.pdf', 297146, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (104, 'IAU-W-01', 'IAU-W-01 Quality Management System Audit R03.pdf', '/uploads/documents/IAU-W-01/IAU-W-01 Quality Management System Audit R03.pdf', 239537, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (106, 'IAU-W-03', 'IAU-W-03 Tear Down Inspection R11_New.pdf', '/uploads/documents/IAU-W-03/IAU-W-03 Tear Down Inspection R11_New.pdf', 247059, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (107, 'IAU-W-06', 'IAU-W-06 Finish Good Sampling R01.pdf', '/uploads/documents/IAU-W-06/IAU-W-06 Finish Good Sampling R01.pdf', 182346, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (108, 'IAU-W-07', 'IAU-W-07 Pemeliharaan & Pengembangan Kompetensi Auditor R01.pdf', '/uploads/documents/IAU-W-07/IAU-W-07 Pemeliharaan & Pengembangan Kompetensi Auditor R01.pdf', 218798, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (109, 'IAU-W-08', 'IAU-W-08 Kakotora Audit R01.pdf', '/uploads/documents/IAU-W-08/IAU-W-08 Kakotora Audit R01.pdf', 154548, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (110, 'IAU-W-09', 'IAU-W-09 Second Party Audit R03.pdf', '/uploads/documents/IAU-W-09/IAU-W-09 Second Party Audit R03.pdf', 199964, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (111, 'IAU-W-10', 'IAU-W-10 Sertifikasi Eksternal R01.pdf', '/uploads/documents/IAU-W-10/IAU-W-10 Sertifikasi Eksternal R01.pdf', 422363, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (112, 'IAU-W-11', 'IAU-W-11 Layered Audit R01.pdf', '/uploads/documents/IAU-W-11/IAU-W-11 Layered Audit R01.pdf', 202331, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (113, 'IAU-W-13', 'IAU-W-13 Moto Audit R05.pdf', '/uploads/documents/IAU-W-13/IAU-W-13 Moto Audit R05.pdf', 224899, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (114, 'IMP-W-01', 'IMP-W-01 8 Disciplines (8D) R03.pdf', '/uploads/documents/IMP-W-01/IMP-W-01 8 Disciplines (8D) R03.pdf', 274972, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (115, 'MOR-P-01', 'MOR-P-01 Material Ordering R08.pdf', '/uploads/documents/MOR-P-01/MOR-P-01 Material Ordering R08.pdf', 381813, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (116, 'MOR-P-02', 'MOR-P-02 Purchasing R11.pdf', '/uploads/documents/MOR-P-02/MOR-P-02 Purchasing R11.pdf', 237601, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (117, 'MOR-W-01', 'MOR-W-01 Input Assy Plan Di AS400 R02.pdf', '/uploads/documents/MOR-W-01/MOR-W-01 Input Assy Plan Di AS400 R02.pdf', 275202, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (118, 'MOR-W-05', 'MOR-W-05 Pengadaan PSW Material R05.pdf', '/uploads/documents/MOR-W-05/MOR-W-05 Pengadaan PSW Material R05.pdf', 263971, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (119, 'MOR-W-06', 'MOR-W-06 Line Condition Report R03.pdf', '/uploads/documents/MOR-W-06/MOR-W-06 Line Condition Report R03.pdf', 258433, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (80, 'HRM-W-08', 'HRM-W-08 Prosedur Prakerin R03.pdf', '/uploads/documents/HRM-W-08/HRM-W-08 Prosedur Prakerin R03.pdf', 267192, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (122, 'MOR-W-10', 'MOR-W-10 Follow Up Shipment Delay Part R02.pdf', '/uploads/documents/MOR-W-10/MOR-W-10 Follow Up Shipment Delay Part R02.pdf', 376553, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (123, 'MOR-W-11', 'MOR-W-11 Follow Up Material Order R05.pdf', '/uploads/documents/MOR-W-11/MOR-W-11 Follow Up Material Order R05.pdf', 174687, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (124, 'MOR-W-12', 'MOR-W-12 Analisa Material R05.pdf', '/uploads/documents/MOR-W-12/MOR-W-12 Analisa Material R05.pdf', 269226, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (126, 'MOR-W-15', 'MOR-W-15 Air Freight Request R04.pdf', '/uploads/documents/MOR-W-15/MOR-W-15 Air Freight Request R04.pdf', 277689, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (127, 'MOR-W-17', 'MOR-W-17 Mekanisme Approval R20.pdf', '/uploads/documents/MOR-W-17/MOR-W-17 Mekanisme Approval R20.pdf', 386412, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (128, 'MOR-W-20', 'MOR-W-20 Pembuatan Purchase Req & Air Freight Req R10.pdf', '/uploads/documents/MOR-W-20/MOR-W-20 Pembuatan Purchase Req & Air Freight Req R10.pdf', 329493, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (130, 'MOR-W-25', 'MOR-W-25 Standard Agreement Purchase Untuk Non Material WH R09.pdf', '/uploads/documents/MOR-W-25/MOR-W-25 Standard Agreement Purchase Untuk Non Material WH R09.pdf', 595471, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (131, 'MOR-W-26', 'MOR-W-26 Interruption From Externally Provided R01.pdf', '/uploads/documents/MOR-W-26/MOR-W-26 Interruption From Externally Provided R01.pdf', 222892, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (132, 'MOR-W-27', 'MOR-W-27 Pembuatan Application For Advance Payment AFAP R01.pdf', '/uploads/documents/MOR-W-27/MOR-W-27 Pembuatan Application For Advance Payment AFAP R01.pdf', 316203, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (133, 'MRE-P-01', 'MRE-P-01 Management Review R06.pdf', '/uploads/documents/MRE-P-01/MRE-P-01 Management Review R06.pdf', 269084, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (134, 'MRE-W-01', 'MRE-W-01 Quality Meeting R02.pdf', '/uploads/documents/MRE-W-01/MRE-W-01 Quality Meeting R02.pdf', 227812, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (135, 'MRS-P-01', 'MRS-P-01 Material Receiving And Storage R08.pdf', '/uploads/documents/MRS-P-01/MRS-P-01 Material Receiving And Storage R08.pdf', 301071, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (136, 'MRS-W-02', 'MRS-W-02 Quality Receiving Inspection.pdf', '/uploads/documents/MRS-W-02/MRS-W-02 Quality Receiving Inspection.pdf', 256296, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (137, 'MRS-W-03', 'MRS-W-03 Receiving Inspection For Abnormal Condition R02.pdf', '/uploads/documents/MRS-W-03/MRS-W-03 Receiving Inspection For Abnormal Condition R02.pdf', 206087, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (138, 'MRS-W-05', 'MRS-W-05 Pembuatan Receiving Inspection Standard R02.pdf', '/uploads/documents/MRS-W-05/MRS-W-05 Pembuatan Receiving Inspection Standard R02.pdf', 225447, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (139, 'MRS-W-10', 'MRS-W-10 Pengisian CS Pemeriksaan Ulang Part_Material R04.pdf', '/uploads/documents/MRS-W-10/MRS-W-10 Pengisian CS Pemeriksaan Ulang Part_Material R04.pdf', 182612, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (140, 'MRS-W-11', 'MRS-W-11 Material Alert R04.pdf', '/uploads/documents/MRS-W-11/MRS-W-11 Material Alert R04.pdf', 180785, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (141, 'MRS-W-13', 'MRS-W-13 Kontrol Material Slow Moving R05.pdf', '/uploads/documents/MRS-W-13/MRS-W-13 Kontrol Material Slow Moving R05.pdf', 313788, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (142, 'MRS-W-16', 'MRS-W-16 Mekanisme Pengontorlan & Pengecekan SoC Untuk Direct & Indirect Material R10.pdf', '/uploads/documents/MRS-W-16/MRS-W-16 Mekanisme Pengontorlan & Pengecekan SoC Untuk Direct & Indirect Material R10.pdf', 370816, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (143, 'MRS-W-18', 'MRS-W-18 Claim Dead Stock Material ke Customer R04.pdf', '/uploads/documents/MRS-W-18/MRS-W-18 Claim Dead Stock Material ke Customer R04.pdf', 280812, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (144, 'MRS-W-23', 'MRS-W-23 Control New Part & Similar Part R03.pdf', '/uploads/documents/MRS-W-23/MRS-W-23 Control New Part & Similar Part R03.pdf', 348932, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (145, 'MRS-W-25', 'MRS-W-25 Pembuatan Cutting Kanban Dan Shikake Kanban R05.pdf', '/uploads/documents/MRS-W-25/MRS-W-25 Pembuatan Cutting Kanban Dan Shikake Kanban R05.pdf', 282286, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (146, 'MRS-W-28', 'MRS-W-28 Part Requisition R04.pdf', '/uploads/documents/MRS-W-28/MRS-W-28 Part Requisition R04.pdf', 183763, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (147, 'MRS-W-29', 'MRS-W-29 New Part R02.pdf', '/uploads/documents/MRS-W-29/MRS-W-29 New Part R02.pdf', 153842, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (149, 'MRS-W-33', 'MRS-W-33 Pembuatan & Penyimpanan Name Plate R08.pdf', '/uploads/documents/MRS-W-33/MRS-W-33 Pembuatan & Penyimpanan Name Plate R08.pdf', 213263, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (150, 'MRS-W-36', 'MRS-W-36 Persiapan SoC Sample Untuk Pengecekan Phthlate Ester Ke YIC AP R01.pdf', '/uploads/documents/MRS-W-36/MRS-W-36 Persiapan SoC Sample Untuk Pengecekan Phthlate Ester Ke YIC AP R01.pdf', 498703, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (151, 'PAM-P-01', 'PAM-P-01 Pre Assembly Process And Inspection R03.pdf', '/uploads/documents/PAM-P-01/PAM-P-01 Pre Assembly Process And Inspection R03.pdf', 272683, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (152, 'PAM-W-01', 'PAM-W-01 Lot Management Bonding R06.pdf', '/uploads/documents/PAM-W-01/PAM-W-01 Lot Management Bonding R06.pdf', 324943, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (153, 'PAM-W-02', 'PAM-W-02 Pengisian CS LK Operator & Inspector Heat Shrink_Raychem.pdf', '/uploads/documents/PAM-W-02/PAM-W-02 Pengisian CS LK Operator & Inspector Heat Shrink_Raychem.pdf', 263479, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (154, 'PAM-W-03', 'PAM-W-03 Set Up Verification R14.pdf', '/uploads/documents/PAM-W-03/PAM-W-03 Set Up Verification R14.pdf', 507961, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (155, 'PAM-W-04', 'PAM-W-04 Pengisian Form Rework Pre Assy R03.pdf', '/uploads/documents/PAM-W-04/PAM-W-04 Pengisian Form Rework Pre Assy R03.pdf', 282512, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (156, 'PAM-W-06', 'PAM-W-06 Pengisian CS LK Operator & Inspector Gun_Dip Solder R04.pdf', '/uploads/documents/PAM-W-06/PAM-W-06 Pengisian CS LK Operator & Inspector Gun_Dip Solder R04.pdf', 301425, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (157, 'PAM-W-07', 'PAM-W-07 Pengisian CS LK Operator & Inspector Cutting R16.pdf', '/uploads/documents/PAM-W-07/PAM-W-07 Pengisian CS LK Operator & Inspector Cutting R16.pdf', 451847, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (121, 'MOR-W-09', 'MOR-W-09 Hot Part R03.pdf', '/uploads/documents/MOR-W-09/MOR-W-09 Hot Part R03.pdf', 239881, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (162, 'PAM-W-12', 'PAM-W-12 Pengisian CS LK Operator Joint Taping R04.pdf', '/uploads/documents/PAM-W-12/PAM-W-12 Pengisian CS LK Operator Joint Taping R04.pdf', 295958, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (163, 'PAM-W-13', 'PAM-W-13 Pengisian CS LKO Manual Taping R06.pdf', '/uploads/documents/PAM-W-13/PAM-W-13 Pengisian CS LKO Manual Taping R06.pdf', 476405, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (164, 'PAM-W-14', 'PAM-W-14 Pengisian CS LK Operator & Inspektor Joint Crimping R08.pdf', '/uploads/documents/PAM-W-14/PAM-W-14 Pengisian CS LK Operator & Inspektor Joint Crimping R08.pdf', 396567, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (165, 'PAM-W-15', 'PAM-W-15 Pengisian CS LK Operator  & Inspector Joint Welding_Bonder R10.pdf', '/uploads/documents/PAM-W-15/PAM-W-15 Pengisian CS LK Operator  & Inspector Joint Welding_Bonder R10.pdf', 379113, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (166, 'PAM-W-16', 'PAM-W-16 Pengisian CS LK Operator & Inspector Manual Crimp Shield Wire R01.pdf', '/uploads/documents/PAM-W-16/PAM-W-16 Pengisian CS LK Operator & Inspector Manual Crimp Shield Wire R01.pdf', 478339, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (167, 'PAM-W-17', 'PAM-W-17 Pengisian CS LKO Acc Insertion Shield Wire R01.pdf', '/uploads/documents/PAM-W-17/PAM-W-17 Pengisian CS LKO Acc Insertion Shield Wire R01.pdf', 247096, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (168, 'PAM-W-18', 'PAM-W-18 Pengisian CS LKO Cutting Doren Shield Wire R01.pdf', '/uploads/documents/PAM-W-18/PAM-W-18 Pengisian CS LKO Cutting Doren Shield Wire R01.pdf', 244489, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (169, 'PAM-W-19', 'PAM-W-19 Voltage Test & Pengecekan Scratch Core R08.pdf', '/uploads/documents/PAM-W-19/PAM-W-19 Voltage Test & Pengecekan Scratch Core R08.pdf', 476043, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (170, 'PAM-W-29', 'PAM-W-29 Pengisian CS LK Operator & Inspektor Manual Crimping Air Bag R04.pdf', '/uploads/documents/PAM-W-29/PAM-W-29 Pengisian CS LK Operator & Inspektor Manual Crimping Air Bag R04.pdf', 402837, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (171, 'PAM-W-35', 'PAM-W-35 Pengisian LKO Pemasangan Tube_Accesories Airbag R05.pdf', '/uploads/documents/PAM-W-35/PAM-W-35 Pengisian LKO Pemasangan Tube_Accesories Airbag R05.pdf', 350256, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (172, 'PAM-W-37', 'PAM-W-37 Quality Tube R04.pdf', '/uploads/documents/PAM-W-37/PAM-W-37 Quality Tube R04.pdf', 377667, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (173, 'PAM-W-38', 'PAM-W-38 Pengisian LKO Rolling Machine Wire Tube R03.pdf', '/uploads/documents/PAM-W-38/PAM-W-38 Pengisian LKO Rolling Machine Wire Tube R03.pdf', 265772, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (174, 'PAM-W-39', 'PAM-W-39 Rule 4M Transition Pre Assy_R02.pdf', '/uploads/documents/PAM-W-39/PAM-W-39 Rule 4M Transition Pre Assy_R02.pdf', 459312, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (176, 'PAM-W-42', 'PAM-W-42 Pengisian CS LKO End Stripping R04.pdf', '/uploads/documents/PAM-W-42/PAM-W-42 Pengisian CS LKO End Stripping R04.pdf', 434011, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (177, 'PAM-W-44', 'PAM-W-44 Statistical Process Control R02.pdf', '/uploads/documents/PAM-W-44/PAM-W-44 Statistical Process Control R02.pdf', 1125781, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (178, 'PAM-W-45', 'PAM-W-45 Pengisian CS LK Operator & Inspector Joint Ultrasonic R01.pdf', '/uploads/documents/PAM-W-45/PAM-W-45 Pengisian CS LK Operator & Inspector Joint Ultrasonic R01.pdf', 453588, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (179, 'PAM-W-46', 'PAM-W-46 Pengisian CS LKO Proses Anti Korosi Aluminium Wire_Ultraviolet R01.pdf', '/uploads/documents/PAM-W-46/PAM-W-46 Pengisian CS LKO Proses Anti Korosi Aluminium Wire_Ultraviolet R01.pdf', 315233, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (180, 'PAM-W-47', 'PAM-W-47 Pengisian CS Proses Anti Korosi (Ultraviolet).pdf', '/uploads/documents/PAM-W-47/PAM-W-47 Pengisian CS Proses Anti Korosi (Ultraviolet).pdf', 395634, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (181, 'PAM-W-48', 'PAM-W-48 Pengisian CS Laporan kerja Operator Hodoki R01.pdf', '/uploads/documents/PAM-W-48/PAM-W-48 Pengisian CS Laporan kerja Operator Hodoki R01.pdf', 234341, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (182, 'PAM-W-49', 'PAM-W-49 Pengisian CS Pengecekan Kekentalan Aron Alpha R02.pdf', '/uploads/documents/PAM-W-49/PAM-W-49 Pengisian CS Pengecekan Kekentalan Aron Alpha R02.pdf', 248665, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (183, 'PAM-W-51', 'PAM-W-51 Pengisian CS LKO Cutting Jam Twist NR.pdf', '/uploads/documents/PAM-W-51/PAM-W-51 Pengisian CS LKO Cutting Jam Twist NR.pdf', 334623, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (184, 'PAP-P-01', 'PAP-P-01 Pelaksanaan PPAP ISIR & TR R06.pdf', '/uploads/documents/PAP-P-01/PAP-P-01 Pelaksanaan PPAP ISIR & TR R06.pdf', 314338, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (185, 'PAP-W-08', 'PAP-W-08 Pengisian Form PPAP Build Concern R06.pdf', '/uploads/documents/PAP-W-08/PAP-W-08 Pengisian Form PPAP Build Concern R06.pdf', 284708, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (186, 'PFP-P-01', 'PFP-P-01 Plant And Facility Planning.pdf', '/uploads/documents/PFP-P-01/PFP-P-01 Plant And Facility Planning.pdf', 175119, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (187, 'PFP-P-02', 'PFP-P-02 Pembuatan Contingency Plan R03.pdf', '/uploads/documents/PFP-P-02/PFP-P-02 Pembuatan Contingency Plan R03.pdf', 138224, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (188, 'PFP-W-01', 'PFP-W-01 Perhitungan & Order Kebutuhan Mesin Produksi R03.pdf', '/uploads/documents/PFP-W-01/PFP-W-01 Perhitungan & Order Kebutuhan Mesin Produksi R03.pdf', 157098, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (189, 'PFP-W-02', 'PFP-W-02 Pembuatan Production Layout R06.pdf', '/uploads/documents/PFP-W-02/PFP-W-02 Pembuatan Production Layout R06.pdf', 263976, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (190, 'PFP-W-03', 'PFP-W-03 Pembuatan Jig Board Drawing R02.pdf', '/uploads/documents/PFP-W-03/PFP-W-03 Pembuatan Jig Board Drawing R02.pdf', 363251, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (192, 'PFP-W-08', 'PFP-W-08 Form Permintaan Pekerjaan R05.pdf', '/uploads/documents/PFP-W-08/PFP-W-08 Form Permintaan Pekerjaan R05.pdf', 338933, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (193, 'PFP-W-10', 'PFP-W-10 Approval Dan Verifikasi Jig Board R06.pdf', '/uploads/documents/PFP-W-10/PFP-W-10 Approval Dan Verifikasi Jig Board R06.pdf', 195535, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (194, 'PFP-W-13', 'PFP-W-13 Checker Program Validation.pdf', '/uploads/documents/PFP-W-13/PFP-W-13 Checker Program Validation.pdf', 105108, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (195, 'PFP-W-14', 'PFP-W-14 Kebutuhan Special Equipment R01.pdf', '/uploads/documents/PFP-W-14/PFP-W-14 Kebutuhan Special Equipment R01.pdf', 238746, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (160, 'PAM-W-10', 'PAM-W-10 Pengisian CS LK Operator Wire Twisting R09.pdf', '/uploads/documents/PAM-W-10/PAM-W-10 Pengisian CS LK Operator Wire Twisting R09.pdf', 309978, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (198, 'PFP-W-22', 'PFP-W-22 Power Failure (Black Out) R01.pdf', '/uploads/documents/PFP-W-22/PFP-W-22 Power Failure (Black Out) R01.pdf', 237429, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (199, 'PFP-W-23', 'PFP-W-23 Air Compression Failure R01.pdf', '/uploads/documents/PFP-W-23/PFP-W-23 Air Compression Failure R01.pdf', 227760, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (200, 'PFP-W-24', 'PFP-W-24 Water Supply Interuption.pdf', '/uploads/documents/PFP-W-24/PFP-W-24 Water Supply Interuption.pdf', 186571, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (201, 'PFP-W-25', 'PFP-W-25 Checical Spills (Tumpahan B3 Cair).pdf', '/uploads/documents/PFP-W-25/PFP-W-25 Checical Spills (Tumpahan B3 Cair).pdf', 241771, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (202, 'PFP-W-26', 'PFP-W-26 Telecomunication Failur (Telephone) R01.pdf', '/uploads/documents/PFP-W-26/PFP-W-26 Telecomunication Failur (Telephone) R01.pdf', 157040, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (203, 'PFP-W-28', 'PFP-W-28 Fire Minor R01.pdf', '/uploads/documents/PFP-W-28/PFP-W-28 Fire Minor R01.pdf', 198741, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (204, 'PFP-W-29', 'PFP-W-29 Penambahan Daya Listrik.pdf', '/uploads/documents/PFP-W-29/PFP-W-29 Penambahan Daya Listrik.pdf', 222896, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (205, 'PPL-P-01', 'PPL-P-01 Production Plan R06.pdf', '/uploads/documents/PPL-P-01/PPL-P-01 Production Plan R06.pdf', 304924, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (207, 'PPL-W-02', 'PPL-W-02 Pembuatan SPP R05.pdf', '/uploads/documents/PPL-W-02/PPL-W-02 Pembuatan SPP R05.pdf', 236857, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (208, 'PPL-W-03', 'PPL-W-03 Pembuatan Assy Plan R04.pdf', '/uploads/documents/PPL-W-03/PPL-W-03 Pembuatan Assy Plan R04.pdf', 282630, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (209, 'PPL-W-04', 'PPL-W-04 Follow Up Delay Produksi R02.pdf', '/uploads/documents/PPL-W-04/PPL-W-04 Follow Up Delay Produksi R02.pdf', 217315, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (210, 'PPL-W-05', 'PPL-W-05 Pengontrolan Polytainer Dan Pallet Rental R04.pdf', '/uploads/documents/PPL-W-05/PPL-W-05 Pengontrolan Polytainer Dan Pallet Rental R04.pdf', 267436, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (211, 'PPL-W-06', 'PPL-W-06 Pembuatan Instruction Kanban R04.pdf', '/uploads/documents/PPL-W-06/PPL-W-06 Pembuatan Instruction Kanban R04.pdf', 250887, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (212, 'PPL-W-07', 'PPL-W-07 Production Plan For Parts & Service R03.pdf', '/uploads/documents/PPL-W-07/PPL-W-07 Production Plan For Parts & Service R03.pdf', 286324, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (213, 'PPL-W-08', 'PPL-W-08 Request Air Freight Finish Goods  R01.pdf', '/uploads/documents/PPL-W-08/PPL-W-08 Request Air Freight Finish Goods  R01.pdf', 289708, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (214, 'PPL-W-11', 'PPL-W-11 Increase And Decrease Order R02.pdf', '/uploads/documents/PPL-W-11/PPL-W-11 Increase And Decrease Order R02.pdf', 283777, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (215, 'PPM-P-01', 'PPM-P-01 Preventive And Predictive Maintenance.pdf', '/uploads/documents/PPM-P-01/PPM-P-01 Preventive And Predictive Maintenance.pdf', 149523, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (217, 'PPM-W-03', 'PPM-W-03 Penanganan Kerusakan Pada Mesin Produksi R03.pdf', '/uploads/documents/PPM-W-03/PPM-W-03 Penanganan Kerusakan Pada Mesin Produksi R03.pdf', 250610, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (218, 'PPM-W-05', 'PPM-W-05 Pelaksanaan Evaluasi Preventive Maintenance Mesin Prod R05.pdf', '/uploads/documents/PPM-W-05/PPM-W-05 Pelaksanaan Evaluasi Preventive Maintenance Mesin Prod R05.pdf', 213204, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (219, 'PPM-W-06', 'PPM-W-06 Preventive Maintenance Equipment FA R07.pdf', '/uploads/documents/PPM-W-06/PPM-W-06 Preventive Maintenance Equipment FA R07.pdf', 307474, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (220, 'PPM-W-08', 'PPM-W-08 Pengisian CS Patroli Harian Equipment FA R03.pdf', '/uploads/documents/PPM-W-08/PPM-W-08 Pengisian CS Patroli Harian Equipment FA R03.pdf', 605069, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (221, 'PPM-W-10', 'PPM-W-10 Pengisian CS Patroli Harian Mesin R01.pdf', '/uploads/documents/PPM-W-10/PPM-W-10 Pengisian CS Patroli Harian Mesin R01.pdf', 413038, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (222, 'PPM-W-11', 'PPM-W-11 Review Dokumen (CS) Mesin & Equipment Produksi R01.pdf', '/uploads/documents/PPM-W-11/PPM-W-11 Review Dokumen (CS) Mesin & Equipment Produksi R01.pdf', 272020, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (223, 'PPM-W-12', 'PPM-W-12 Review Dokumen (CS) Mesin & Equipment FA NR.pdf', '/uploads/documents/PPM-W-12/PPM-W-12 Review Dokumen (CS) Mesin & Equipment FA NR.pdf', 389231, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (224, 'PQP-P-01', 'PQP-P-01 Product Realization R19.pdf', '/uploads/documents/PQP-P-01/PQP-P-01 Product Realization R19.pdf', 413628, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (225, 'PQP-W-01', 'PQP-W-01 Pembuatan PQTP R07.pdf', '/uploads/documents/PQP-W-01/PQP-W-01 Pembuatan PQTP R07.pdf', 319606, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (226, 'PQP-W-08', 'PQP-W-08 Pembuatan & Pengontrolan Operation Standard (OS) R05.pdf', '/uploads/documents/PQP-W-08/PQP-W-08 Pembuatan & Pengontrolan Operation Standard (OS) R05.pdf', 313952, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (227, 'PQP-W-10', 'PQP-W-10 Pembuatan & Review Berkala Production Process Flowchart (PPFC) R06.pdf', '/uploads/documents/PQP-W-10/PQP-W-10 Pembuatan & Review Berkala Production Process Flowchart (PPFC) R06.pdf', 254948, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (228, 'PQP-W-11', 'PQP-W-11 Pembuatan & Pengontrolan Inspection Standard (IS) R05.pdf', '/uploads/documents/PQP-W-11/PQP-W-11 Pembuatan & Pengontrolan Inspection Standard (IS) R05.pdf', 236029, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (230, 'PQP-W-13', 'PQP-W-13 Pembuatan Pengontrolan & Review Berkala Dokumen Control Plan & MQC R12.pdf', '/uploads/documents/PQP-W-13/PQP-W-13 Pembuatan Pengontrolan & Review Berkala Dokumen Control Plan & MQC R12.pdf', 340963, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (231, 'PQP-W-16', 'PQP-W-16 Initial Mass Production Intensive Quality Control R01.pdf', '/uploads/documents/PQP-W-16/PQP-W-16 Initial Mass Production Intensive Quality Control R01.pdf', 162450, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (232, 'PQP-W-17', 'PQP-W-17 Production Preparation Cost Control R02.pdf', '/uploads/documents/PQP-W-17/PQP-W-17 Production Preparation Cost Control R02.pdf', 172819, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (233, 'PQP-W-18', 'PQP-W-18 Cross Functional Review.pdf', '/uploads/documents/PQP-W-18/PQP-W-18 Cross Functional Review.pdf', 133137, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (197, 'PFP-W-21', 'PFP-W-21 Pengisian Daily Check Inspector & GL Inspect R10.pdf', '/uploads/documents/PFP-W-21/PFP-W-21 Pengisian Daily Check Inspector & GL Inspect R10.pdf', 605429, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (235, 'PQP-W-20', 'PQP-W-20 Initial Process Study Pengukuran Dimensi Clip To Protector.pdf', '/uploads/documents/PQP-W-20/PQP-W-20 Initial Process Study Pengukuran Dimensi Clip To Protector.pdf', 235353, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (236, 'PQP-W-21', 'PQP-W-21 Hinkaku Production Approval.pdf', '/uploads/documents/PQP-W-21/PQP-W-21 Hinkaku Production Approval.pdf', 567995, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (1, 'BOS-P-01', 'BOS-P-01 Business Operating System_BOS R04.pdf', '/uploads/documents/BOS-P-01/BOS-P-01 Business Operating System_BOS R04.pdf', 242772, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (9, 'CDC-W-05', 'CDC-W-05 Cross Section Terminal & Pengecekan Circuit Size Besar R05.pdf', '/uploads/documents/CDC-W-05/CDC-W-05 Cross Section Terminal & Pengecekan Circuit Size Besar R05.pdf', 270655, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (22, 'CMD-W-04', 'CMD-W-04 Penanganan Kerusakan Atau kehilangan Alat Ukur R03.pdf', '/uploads/documents/CMD-W-04/CMD-W-04 Penanganan Kerusakan Atau kehilangan Alat Ukur R03.pdf', 426690, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (37, 'COD-P-01', 'COD-P-01 Pembuatan Dan Pengendalian Informasi Terdokumentasi R11.pdf', '/uploads/documents/COD-P-01/COD-P-01 Pembuatan Dan Pengendalian Informasi Terdokumentasi R11.pdf', 187060, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (40, 'ETM-P-01', 'ETM-P-01 Equipment Tooling & Sparepart Management R12.pdf', '/uploads/documents/ETM-P-01/ETM-P-01 Equipment Tooling & Sparepart Management R12.pdf', 329089, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (52, 'ETM-W-23', 'ETM-W-23 Stock Opname Sparepart_R0.pdf', '/uploads/documents/ETM-W-23/ETM-W-23 Stock Opname Sparepart_R0.pdf', 223146, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (61, 'FAM-W-16', 'FAM-W-16 Pengisian CS Laporan Kerja Operator FA Airbag R03.pdf', '/uploads/documents/FAM-W-16/FAM-W-16 Pengisian CS Laporan Kerja Operator FA Airbag R03.pdf', 296442, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (77, 'HRM-W-03', 'HRM-W-03 Sistem Training Karyawan Baru & Peserta Magang R09.pdf', '/uploads/documents/HRM-W-03/HRM-W-03 Sistem Training Karyawan Baru & Peserta Magang R09.pdf', 244446, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (79, 'HRM-W-06', 'HRM-W-06 Pengunduran Diri R07.pdf', '/uploads/documents/HRM-W-06/HRM-W-06 Pengunduran Diri R07.pdf', 239688, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (81, 'HRM-W-09', 'HRM-W-09 Standard Backup Data Komputer R03.pdf', '/uploads/documents/HRM-W-09/HRM-W-09 Standard Backup Data Komputer R03.pdf', 162221, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (82, 'HRM-W-10', 'HRM-W-10  Pengajuan Training & License RT R03.pdf', '/uploads/documents/HRM-W-10/HRM-W-10  Pengajuan Training & License RT R03.pdf', 249090, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (90, 'HRM-W-20', 'HRM-W-20 Pelaporan Kehilangan & Atau Kerusakan Kartu License R01.pdf', '/uploads/documents/HRM-W-20/HRM-W-20 Pelaporan Kehilangan & Atau Kerusakan Kartu License R01.pdf', 232528, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (105, 'IAU-W-02', 'IAU-W-02 Pengisian Form Corrective Acton Request_CAR R09.pdf', '/uploads/documents/IAU-W-02/IAU-W-02 Pengisian Form Corrective Acton Request_CAR R09.pdf', 375523, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (120, 'MOR-W-08', 'MOR-W-08 Follow Up Over Quantity Shipment R04.pdf', '/uploads/documents/MOR-W-08/MOR-W-08 Follow Up Over Quantity Shipment R04.pdf', 277366, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (125, 'MOR-W-14', 'MOR-W-14 Order Adjustment R04.pdf', '/uploads/documents/MOR-W-14/MOR-W-14 Order Adjustment R04.pdf', 379608, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (129, 'MOR-W-21', 'MOR-W-21 Flow Informasi Penggunaan Material Jika Terjadi Kondisi Abnormal R01.pdf', '/uploads/documents/MOR-W-21/MOR-W-21 Flow Informasi Penggunaan Material Jika Terjadi Kondisi Abnormal R01.pdf', 349200, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (148, 'MRS-W-31', 'MRS-W-31 Pengembalian Sisa Material Prototype.pdf', '/uploads/documents/MRS-W-31/MRS-W-31 Pengembalian Sisa Material Prototype.pdf', 274779, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (158, 'PAM-W-08', 'PAM-W-08 Pengisian CS LK Operator & Inspector Man Crimping R15.pdf', '/uploads/documents/PAM-W-08/PAM-W-08 Pengisian CS LK Operator & Inspector Man Crimping R15.pdf', 503735, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (159, 'PAM-W-09', 'PAM-W-09 Pengisian CS LK Operator Middle Stripping R04.pdf', '/uploads/documents/PAM-W-09/PAM-W-09 Pengisian CS LK Operator Middle Stripping R04.pdf', 316891, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (161, 'PAM-W-11', 'PAM-W-11 Pengisian CS LK Operator Pemasangan Tube_Accessories R05.pdf', '/uploads/documents/PAM-W-11/PAM-W-11 Pengisian CS LK Operator Pemasangan Tube_Accessories R05.pdf', 369446, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (175, 'PAM-W-41', 'PAM-W-41 Pengisian CS Daily Report Prosess Cutting R06.pdf', '/uploads/documents/PAM-W-41/PAM-W-41 Pengisian CS Daily Report Prosess Cutting R06.pdf', 560492, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (191, 'PFP-W-05', 'PFP-W-05 Pembuatan Checker Program & Fabrikasi Checker Board R01.pdf', '/uploads/documents/PFP-W-05/PFP-W-05 Pembuatan Checker Program & Fabrikasi Checker Board R01.pdf', 159930, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (196, 'PFP-W-17', 'PFP-W-17 Approval Fuse Insertion & Fuse Verification Plate R01.pdf', '/uploads/documents/PFP-W-17/PFP-W-17 Approval Fuse Insertion & Fuse Verification Plate R01.pdf', 224187, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (206, 'PPL-W-01', 'PPL-W-01 Pembuatan Sample Build Timing R03.pdf', '/uploads/documents/PPL-W-01/PPL-W-01 Pembuatan Sample Build Timing R03.pdf', 270656, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (216, 'PPM-W-01', 'PPM-W-01 Preventive & Predictive Maintenance Mesin Prod & Aplikator R07.pdf', '/uploads/documents/PPM-W-01/PPM-W-01 Preventive & Predictive Maintenance Mesin Prod & Aplikator R07.pdf', 230935, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (229, 'PQP-W-12', 'PQP-W-12 Pembuatan Pengontrolan & Review Berkala Dokumen PFMEA R14.pdf', '/uploads/documents/PQP-W-12/PQP-W-12 Pembuatan Pengontrolan & Review Berkala Dokumen PFMEA R14.pdf', 423484, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (234, 'PQP-W-19', 'PQP-W-19 Identifikasi Dan Pengontrolan Proses Penting & Proses Spesial R03.pdf', '/uploads/documents/PQP-W-19/PQP-W-19 Identifikasi Dan Pengontrolan Proses Penting & Proses Spesial R03.pdf', 385870, 'application/pdf', 1, true, 'system', '2026-02-20 15:14:31.327466');
INSERT INTO public.procedure_files VALUES (246, '010101', 'Push Gauge.pdf', '/uploads/documents/010101/v1_010101_Push-Gauge_20260305.pdf', 32677, 'application/pdf', 1, true, 'admin', '2026-03-05 08:39:59.117888');
INSERT INTO public.procedure_files VALUES (245, 'PRP-0909', 'Proposal KP (PT JAI).pdf', '/uploads/documents/PRP-0909/v1_PRP-0909_Proposal-KP--PT-JAI-_20260304.pdf', 3623433, 'application/pdf', 1, false, 'admin', '2026-03-04 12:19:47.534319');
INSERT INTO public.procedure_files VALUES (247, 'PRP-0909', 'Proposal KP (PT JAI).pdf', '/uploads/documents/PRP-0909/v2_PRP-0909_Proposal-KP--PT-JAI-_20260305.pdf', 3623433, 'application/pdf', 2, true, 'admin', '2026-03-05 09:11:56.853702');
INSERT INTO public.procedure_files VALUES (248, 'T-0909', 'Daniar Priambodo_week 1-4 report - Sheet1.pdf', '/uploads/documents/T-0909/v1_T-0909_Daniar-Priambodo-week-1-4-report---Sheet1_20260305.pdf', 81116, 'application/pdf', 1, true, 'admin', '2026-03-05 12:00:26.26728');
INSERT INTO public.procedure_files VALUES (249, 'T-0900', 'pppp.pdf', '/uploads/documents/T-0900/v1_T-0900_pppp_20260305.pdf', 261122, 'application/pdf', 1, true, 'admin', '2026-03-05 12:00:37.856471');
INSERT INTO public.procedure_files VALUES (250, '13215', 'pppp.pdf', '/uploads/documents/13215/v1_13215_pppp_20260312.pdf', 261122, 'application/pdf', 1, true, 'admin', '2026-03-12 12:02:03.506914');
INSERT INTO public.procedure_files VALUES (251, '0091J', 'projek_web_peminjaman.pdf', '/uploads/documents/0091J/v1_0091J_projek-web-peminjaman_20260327.pdf', 73931, 'application/pdf', 1, true, 'admin', '2026-03-27 08:35:07.8162');
INSERT INTO public.procedure_files VALUES (252, '0909-DP', 'Kode Qr Checksheet QA.pdf', '/uploads/documents/0909-DP/v1_0909-DP_Kode-Qr-Checksheet-QA_20260401.pdf', 586960, 'application/pdf', 1, true, 'admin', '2026-04-01 16:06:57.661058');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users VALUES (1, 'admin', '$2b$10$ndEuUKpYL7UocuaJGfva6.m/.QTJEfI.zy2Hzgjpv8vHYDS6Yzgkm', 'Administrator', 'admin@jai.co.id', 'admin', true, '2026-02-18 08:04:42.548139', '2026-02-18 08:18:26.129885');


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 193, true);


--
-- Name: arsip_prosedur_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.arsip_prosedur_id_seq', 29, true);


--
-- Name: backup_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.backup_schedules_id_seq', 254, true);


--
-- Name: document_reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.document_reviews_id_seq', 78, true);


--
-- Name: email_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_schedules_id_seq', 282, true);


--
-- Name: pic_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pic_activities_id_seq', 48, true);


--
-- Name: pic_document_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pic_document_requests_id_seq', 5, true);


--
-- Name: pic_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pic_documents_id_seq', 1, false);


--
-- Name: pic_otp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pic_otp_id_seq', 40, true);


--
-- Name: pic_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pic_requests_id_seq', 1, true);


--
-- Name: pic_review_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pic_review_requests_id_seq', 7, true);


--
-- Name: pic_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pic_users_id_seq', 163, true);


--
-- Name: procedure_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.procedure_documents_id_seq', 792, true);


--
-- Name: procedure_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.procedure_files_id_seq', 252, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: arsip_prosedur arsip_prosedur_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.arsip_prosedur
    ADD CONSTRAINT arsip_prosedur_pkey PRIMARY KEY (id);


--
-- Name: backup_schedules backup_schedules_nomor_dokumen_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backup_schedules
    ADD CONSTRAINT backup_schedules_nomor_dokumen_key UNIQUE (nomor_dokumen);


--
-- Name: backup_schedules backup_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backup_schedules
    ADD CONSTRAINT backup_schedules_pkey PRIMARY KEY (id);


--
-- Name: document_reviews document_reviews_nomor_dokumen_last_reviewed_month_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_reviews
    ADD CONSTRAINT document_reviews_nomor_dokumen_last_reviewed_month_key UNIQUE (nomor_dokumen, last_reviewed_month);


--
-- Name: document_reviews document_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_reviews
    ADD CONSTRAINT document_reviews_pkey PRIMARY KEY (id);


--
-- Name: email_schedules email_schedules_nomor_dokumen_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_schedules
    ADD CONSTRAINT email_schedules_nomor_dokumen_key UNIQUE (nomor_dokumen);


--
-- Name: email_schedules email_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_schedules
    ADD CONSTRAINT email_schedules_pkey PRIMARY KEY (id);


--
-- Name: pic_activities pic_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_activities
    ADD CONSTRAINT pic_activities_pkey PRIMARY KEY (id);


--
-- Name: pic_document_requests pic_document_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_document_requests
    ADD CONSTRAINT pic_document_requests_pkey PRIMARY KEY (id);


--
-- Name: pic_documents pic_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_documents
    ADD CONSTRAINT pic_documents_pkey PRIMARY KEY (id);


--
-- Name: pic_otp pic_otp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_otp
    ADD CONSTRAINT pic_otp_pkey PRIMARY KEY (id);


--
-- Name: pic_requests pic_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_requests
    ADD CONSTRAINT pic_requests_pkey PRIMARY KEY (id);


--
-- Name: pic_review_requests pic_review_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_review_requests
    ADD CONSTRAINT pic_review_requests_pkey PRIMARY KEY (id);


--
-- Name: pic_users pic_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_users
    ADD CONSTRAINT pic_users_email_key UNIQUE (email);


--
-- Name: pic_users pic_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_users
    ADD CONSTRAINT pic_users_pkey PRIMARY KEY (id);


--
-- Name: procedure_documents procedure_documents_nomor_dokumen_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.procedure_documents
    ADD CONSTRAINT procedure_documents_nomor_dokumen_key UNIQUE (nomor_dokumen);


--
-- Name: procedure_documents procedure_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.procedure_documents
    ADD CONSTRAINT procedure_documents_pkey PRIMARY KEY (id);


--
-- Name: procedure_files procedure_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.procedure_files
    ADD CONSTRAINT procedure_files_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_activity_logs_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_logs_type ON public.activity_logs USING btree (activity_type);


--
-- Name: idx_activity_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_logs_user ON public.activity_logs USING btree (username);


--
-- Name: idx_arsip_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_arsip_deleted_at ON public.arsip_prosedur USING btree (deleted_at);


--
-- Name: idx_arsip_nomor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_arsip_nomor ON public.arsip_prosedur USING btree (nomor_dokumen);


--
-- Name: idx_arsip_pic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_arsip_pic ON public.arsip_prosedur USING btree (pic);


--
-- Name: idx_email_schedules_nomor_dokumen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_schedules_nomor_dokumen ON public.email_schedules USING btree (nomor_dokumen);


--
-- Name: idx_email_schedules_scheduled_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_schedules_scheduled_at ON public.email_schedules USING btree (scheduled_email_at);


--
-- Name: idx_email_schedules_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_schedules_status ON public.email_schedules USING btree (email_status);


--
-- Name: idx_email_schedules_status_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_schedules_status_time ON public.email_schedules USING btree (email_status, scheduled_email_at);


--
-- Name: idx_nomor_dokumen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nomor_dokumen ON public.procedure_documents USING btree (nomor_dokumen);


--
-- Name: idx_pic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pic ON public.procedure_documents USING btree (pic);


--
-- Name: idx_pic_doc_req_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pic_doc_req_is_read ON public.pic_document_requests USING btree (is_read, created_at DESC);


--
-- Name: idx_pic_otp_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pic_otp_expires ON public.pic_otp USING btree (expires_at);


--
-- Name: idx_pic_otp_pic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pic_otp_pic ON public.pic_otp USING btree (pic);


--
-- Name: idx_pic_review_req_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pic_review_req_is_read ON public.pic_review_requests USING btree (is_read, created_at DESC);


--
-- Name: idx_pic_review_req_nomor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pic_review_req_nomor ON public.pic_review_requests USING btree (nomor_dokumen);


--
-- Name: idx_pic_review_req_pic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pic_review_req_pic_id ON public.pic_review_requests USING btree (pic_id);


--
-- Name: idx_procedure_docs_tanggal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_procedure_docs_tanggal ON public.procedure_documents USING btree (tanggal_selesai_approval);


--
-- Name: idx_procedure_files_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_procedure_files_is_active ON public.procedure_files USING btree (is_active);


--
-- Name: idx_procedure_files_nomor_dokumen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_procedure_files_nomor_dokumen ON public.procedure_files USING btree (nomor_dokumen);


--
-- Name: idx_procedure_files_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_procedure_files_version ON public.procedure_files USING btree (version);


--
-- Name: idx_review_month; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_review_month ON public.document_reviews USING btree (last_reviewed_month);


--
-- Name: idx_review_nomor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_review_nomor ON public.document_reviews USING btree (nomor_dokumen);


--
-- Name: idx_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_status ON public.procedure_documents USING btree (status);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: document_reviews update_document_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_document_reviews_updated_at BEFORE UPDATE ON public.document_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_schedules update_email_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_email_schedules_updated_at BEFORE UPDATE ON public.email_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: procedure_documents update_procedure_documents_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_procedure_documents_updated_at BEFORE UPDATE ON public.procedure_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: backup_schedules fk_email_schedules_nomor_dokumen; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backup_schedules
    ADD CONSTRAINT fk_email_schedules_nomor_dokumen FOREIGN KEY (nomor_dokumen) REFERENCES public.procedure_documents(nomor_dokumen) ON DELETE CASCADE;


--
-- Name: email_schedules fk_email_schedules_nomor_dokumen; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_schedules
    ADD CONSTRAINT fk_email_schedules_nomor_dokumen FOREIGN KEY (nomor_dokumen) REFERENCES public.procedure_documents(nomor_dokumen) ON DELETE CASCADE;


--
-- Name: procedure_files fk_procedure_files_nomor_dokumen; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.procedure_files
    ADD CONSTRAINT fk_procedure_files_nomor_dokumen FOREIGN KEY (nomor_dokumen) REFERENCES public.procedure_documents(nomor_dokumen) ON DELETE CASCADE;


--
-- Name: pic_activities pic_activities_pic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_activities
    ADD CONSTRAINT pic_activities_pic_id_fkey FOREIGN KEY (pic_id) REFERENCES public.pic_users(id);


--
-- Name: pic_document_requests pic_document_requests_pic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_document_requests
    ADD CONSTRAINT pic_document_requests_pic_id_fkey FOREIGN KEY (pic_id) REFERENCES public.pic_users(id);


--
-- Name: pic_documents pic_documents_pic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_documents
    ADD CONSTRAINT pic_documents_pic_id_fkey FOREIGN KEY (pic_id) REFERENCES public.pic_users(id);


--
-- Name: pic_requests pic_requests_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_requests
    ADD CONSTRAINT pic_requests_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.pic_documents(id);


--
-- Name: pic_requests pic_requests_pic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_requests
    ADD CONSTRAINT pic_requests_pic_id_fkey FOREIGN KEY (pic_id) REFERENCES public.pic_users(id);


--
-- Name: pic_review_requests pic_review_requests_pic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pic_review_requests
    ADD CONSTRAINT pic_review_requests_pic_id_fkey FOREIGN KEY (pic_id) REFERENCES public.pic_users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict kMzWP0At2ElHUT2qPxnfDhfANQoecuK5qVrzdsKFtoenVlj0XEOPDGBvaM9Sl37

