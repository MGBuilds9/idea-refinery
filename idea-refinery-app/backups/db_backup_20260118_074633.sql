--
-- PostgreSQL database dump
--

\restrict nqnFbunht9rUwoIvjudggKmQlqTtmdJU89TdGoRhSXrbtQIX1qsuPcpW6Fv0Rdn

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

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
-- Name: items; Type: TABLE; Schema: public; Owner: idearefinery_user
--

CREATE TABLE public.items (
    id uuid NOT NULL,
    user_id uuid,
    type text NOT NULL,
    content jsonb NOT NULL,
    version integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT now(),
    deleted boolean DEFAULT false
);


ALTER TABLE public.items OWNER TO idearefinery_user;

--
-- Name: prompt_overrides; Type: TABLE; Schema: public; Owner: idearefinery_user
--

CREATE TABLE public.prompt_overrides (
    id integer NOT NULL,
    type text NOT NULL,
    content text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.prompt_overrides OWNER TO idearefinery_user;

--
-- Name: prompt_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: idearefinery_user
--

CREATE SEQUENCE public.prompt_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.prompt_overrides_id_seq OWNER TO idearefinery_user;

--
-- Name: prompt_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: idearefinery_user
--

ALTER SEQUENCE public.prompt_overrides_id_seq OWNED BY public.prompt_overrides.id;


--
-- Name: public_blueprints; Type: TABLE; Schema: public; Owner: idearefinery_user
--

CREATE TABLE public.public_blueprints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title text,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    view_count integer DEFAULT 0
);


ALTER TABLE public.public_blueprints OWNER TO idearefinery_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: idearefinery_user
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO idearefinery_user;

--
-- Name: prompt_overrides id; Type: DEFAULT; Schema: public; Owner: idearefinery_user
--

ALTER TABLE ONLY public.prompt_overrides ALTER COLUMN id SET DEFAULT nextval('public.prompt_overrides_id_seq'::regclass);


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: idearefinery_user
--

COPY public.items (id, user_id, type, content, version, updated_at, deleted) FROM stdin;
\.


--
-- Data for Name: prompt_overrides; Type: TABLE DATA; Schema: public; Owner: idearefinery_user
--

COPY public.prompt_overrides (id, type, content, updated_at) FROM stdin;
1	questions	{"system":"You are an expert product manager and technical architect.","prompt":"I have a project idea: \\"${idea}\\"\\n\\nGenerate 3-5 thoughtful, specific questions that would help refine this idea and uncover important requirements, technical considerations, and feature needs. \\n\\nReturn ONLY a JSON array of strings (the questions), nothing else. Format: [\\"question 1\\", \\"question 2\\", ...]"}	2026-01-16 20:50:56.939671+00
2	blueprint	{"system":"You are an expert software architect and product strategist.","prompt":"Based on this project idea and answers, create a comprehensive technical blueprint in markdown format.\\n\\nPROJECT IDEA: \\"${idea}\\"\\n\\nCLARIFYING Q&A:\\n${qaPairs}\\n\\nCRITICAL TECH STACK GUIDELINES:\\n- Recommend MODERN, SIMPLE solutions that get users up and running quickly\\n- Prefer: Next.js, Vite + React, Supabase, Resend, n8n, Tailwind CSS, shadcn/ui\\n- Avoid over-engineering - choose the simplest viable approach\\n- Focus on aesthetic, eye-catching design with minimal complexity\\n- This is for \\"vibe-coders\\" and non-traditional developers\\n\\nGenerate a complete markdown blueprint with these sections:\\n# Project Blueprint: [Project Name]\\n\\n## Overview\\nBrief description and purpose\\n\\n## Core Features\\nComprehensive list of all necessary features\\n\\n## Recommended Tech Stack\\nModern, simple technologies optimized for rapid development\\n\\n## Architecture\\nHigh-level system architecture (keep simple)\\n\\n## Data Models\\nKey entities and relationships\\n\\n## User Flow\\nPrimary user journeys\\n\\n## Implementation Phases\\nSuggested development phases\\n\\n## Design Principles\\nAesthetic and UX considerations\\n\\n## Considerations\\nTechnical constraints, security, performance, scalability\\n\\n---\\n\\n## Master Takeoff Prompt\\n\\n[Generate a comprehensive, ready-to-use prompt that can be pasted directly into Cursor, Lovable, Bolt, Replit, or similar AI coding tools. This should include:\\n- Complete project context\\n- Tech stack specifications\\n- Core features to implement\\n- Design requirements\\n- File structure suggestions\\n- Any specific implementation details\\nMake it detailed enough that an AI agent can start building immediately.]\\n\\nBe specific, thorough, and technical. This should serve as a complete development blueprint."}	2026-01-16 20:50:56.945023+00
3	refine	{"system":"You are helping refine a project blueprint for \\"vibe-coders\\" and non-traditional developers. The user may ask for changes, additions, clarifications, or complete rewrites. \\n\\nALWAYS respond with the updated COMPLETE blueprint in markdown format, incorporating their feedback.\\n\\nCRITICAL TECH STACK PRINCIPLES:\\n- Recommend MODERN, SIMPLE solutions (Next.js, Vite + React, Supabase, Resend, n8n, Tailwind, shadcn/ui)\\n- Avoid over-engineering - simplest viable approach wins\\n- Focus on aesthetic, eye-catching design\\n- Optimize for rapid development and deployment\\n\\nThe blueprint must end with a \\"## Master Takeoff Prompt\\" section that's ready to paste into Cursor, Lovable, Bolt, or Replit. Be thorough and technical."}	2026-01-16 20:50:56.946466+00
4	mockup	{"system":"You are an expert UI/UX designer and frontend developer specializing in data visualization and app showcases.","prompt":"Based on this project blueprint, create a complete, standalone HTML file that VISUALIZES the concept.\\n\\nBLUEPRINT:\\n${blueprint}\\n\\nAnalyze the blueprint to determine if this is primarily a \\"User Interface (App/Website)\\" or a \\"Process/Workflow\\".\\n\\nIF IT IS AN APP OR WEBSITE:\\n- Create a visual mockup of the interface displayed with a \\"Perspective Design\\" style.\\n- Frame the main interface in a stylized window or device container that has a subtle 3D tilt/perspective effect (using CSS transform: perspective/rotate3d) to make it look like a high-end showcase.\\n- The design should look like it's \\"floating\\" in 3D space.\\n- Ensure the UI itself is within this transformed container.\\n- It should look \\"premium\\" and modern, verifying the \\"vibe\\" of the idea.\\n\\nIF IT IS A WORKFLOW, SYSTEM, OR AUTOMATION:\\n- Create a \\"Line Tree Diagram\\" or flowchart visualization.\\n- Use SVGs or CSS to draw nodes and connecting lines representing the steps/logic of the workflow.\\n- Make it interactive (hover effects on nodes.\\n- It should clearly visualize the logic flow, branching, and outputs.\\n\\nGENERAL REQUIREMENTS:\\n- Single HTML file with embedded CSS and JavaScript.\\n- Beautiful, MODERN, eye-catching design.\\n- Showcase 3-5 signature features.\\n- Include the project goal/mission.\\n- Focus on SIMPLICITY and AESTHETICS.\\n- Use Google Fonts.\\n- Dark mode preference unless otherwise specified.\\n- Clean, minimal code.\\n\\nIMPORTANT: At the bottom of the HTML, include a hidden section with the full markdown blueprint embedded in a <pre> tag with id=\\"markdown-content\\". Add a \\"Copy Blueprint\\" button that copies this markdown to clipboard. Style it minimally.\\n\\nReturn ONLY the complete HTML code, nothing else."}	2026-01-16 20:50:56.947732+00
\.


--
-- Data for Name: public_blueprints; Type: TABLE DATA; Schema: public; Owner: idearefinery_user
--

COPY public.public_blueprints (id, user_id, title, content, created_at, expires_at, view_count) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: idearefinery_user
--

COPY public.users (id, username, password_hash, created_at) FROM stdin;
f3fcf5b3-f1e4-44e3-83f9-59be6315d580	admin	$2b$10$TX.Kx9GqL0exggHKsoQA7e1L997jWH2p.7ssFprYykWn/MHk76/PC	2026-01-16 20:46:06.329919+00
\.


--
-- Name: prompt_overrides_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idearefinery_user
--

SELECT pg_catalog.setval('public.prompt_overrides_id_seq', 52, true);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: idearefinery_user
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: items items_user_id_id_key; Type: CONSTRAINT; Schema: public; Owner: idearefinery_user
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_user_id_id_key UNIQUE (user_id, id);


--
-- Name: prompt_overrides prompt_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: idearefinery_user
--

ALTER TABLE ONLY public.prompt_overrides
    ADD CONSTRAINT prompt_overrides_pkey PRIMARY KEY (id);


--
-- Name: prompt_overrides prompt_overrides_type_key; Type: CONSTRAINT; Schema: public; Owner: idearefinery_user
--

ALTER TABLE ONLY public.prompt_overrides
    ADD CONSTRAINT prompt_overrides_type_key UNIQUE (type);


--
-- Name: public_blueprints public_blueprints_pkey; Type: CONSTRAINT; Schema: public; Owner: idearefinery_user
--

ALTER TABLE ONLY public.public_blueprints
    ADD CONSTRAINT public_blueprints_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: idearefinery_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: idearefinery_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_items_sync; Type: INDEX; Schema: public; Owner: idearefinery_user
--

CREATE INDEX idx_items_sync ON public.items USING btree (user_id, updated_at);


--
-- Name: idx_public_blueprints_id; Type: INDEX; Schema: public; Owner: idearefinery_user
--

CREATE INDEX idx_public_blueprints_id ON public.public_blueprints USING btree (id);


--
-- Name: items items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: idearefinery_user
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: public_blueprints public_blueprints_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: idearefinery_user
--

ALTER TABLE ONLY public.public_blueprints
    ADD CONSTRAINT public_blueprints_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict nqnFbunht9rUwoIvjudggKmQlqTtmdJU89TdGoRhSXrbtQIX1qsuPcpW6Fv0Rdn

