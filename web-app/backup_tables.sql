--
-- PostgreSQL database dump
--

\restrict 9QRmQPXfwiIUFBOKDIe1sfRaOEWBq9e4Tapqm8eREm2tysmF9jgs4qZyo11WXTB

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

SET default_tablespace = '';

SET default_table_access_method = heap;

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
-- Name: idx_pic_doc_req_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pic_doc_req_is_read ON public.pic_document_requests USING btree (is_read, created_at DESC);


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

\unrestrict 9QRmQPXfwiIUFBOKDIe1sfRaOEWBq9e4Tapqm8eREm2tysmF9jgs4qZyo11WXTB

