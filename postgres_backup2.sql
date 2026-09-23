--
-- PostgreSQL database dump
--

\restrict VJnZQrdXLdU83eMe6cXb8DlB0TZmr2G9hQhrS5RpRiOsye4WZeU8YzZMUqpDhdY

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_sessions (
    token_hash bytea NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT admin_sessions_token_hash_check CHECK ((octet_length(token_hash) = 32))
);


ALTER TABLE public.admin_sessions OWNER TO postgres;

--
-- Name: guestbook_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guestbook_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    message text NOT NULL,
    website_url text,
    is_approved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.guestbook_comments OWNER TO postgres;

--
-- Name: guestbook_replies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guestbook_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    user_id uuid,
    message text NOT NULL,
    is_published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.guestbook_replies OWNER TO postgres;

--
-- Name: portfolio_admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.portfolio_admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'admin'::text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT portfolio_admins_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text])))
);


ALTER TABLE public.portfolio_admins OWNER TO postgres;

--
-- Name: portfolio_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.portfolio_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    description text,
    project_url text,
    source_url text,
    image_url text,
    cloudinary_public_id text,
    cloudinary_resource_type text DEFAULT 'image'::text,
    technologies text[] DEFAULT '{}'::text[] NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    category text DEFAULT 'work'::text NOT NULL,
    CONSTRAINT portfolio_items_category_check CHECK ((category = ANY (ARRAY['work'::text, 'skill'::text, 'tool'::text, 'repository'::text])))
);


ALTER TABLE public.portfolio_items OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    full_name text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: admin_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_sessions (token_hash, user_id, created_at, expires_at) FROM stdin;
\\x9ac9f6cfd80ffa6240d27b042b8c2195508a40d98663be498339f8e1626d69cb	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 20:43:37.696957+03	2026-09-18 04:43:37.695604+03
\\xd921104ecd00b4c568cc4f486d18d37efe66513d56c3b38c7b7f7786a5df8c3e	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 20:45:21.416112+03	2026-09-18 04:45:21.414969+03
\\xfc794666b0da6e8cba298ae68f5783e091c7edb135547fd542b3502824fae297	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 20:47:17.609692+03	2026-09-18 04:47:17.609228+03
\\x2de83334af81c77e677030c0bc6f58ce1ac3301fdeb4f358191ef98c06d75876	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 20:48:01.277649+03	2026-09-18 04:48:01.276684+03
\\x1a6d36379a02322a5b126ec98527d51cbd4dfe259af896bc198290ccd9d9f0a0	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 20:51:54.093796+03	2026-09-18 04:51:54.092974+03
\\x11631bdaa9f174370255a346ac4a52dedfd30cf88ea3537a11748a9fd0999254	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 20:52:01.901948+03	2026-09-18 04:52:01.901704+03
\\x02c14a1c60fc81558d8088ce9af8df6de3c438c8820f962deede0a4d0ee45154	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 21:07:37.581215+03	2026-09-18 05:07:37.580225+03
\\xf4f7e202bb02747b0f0b5590f49aabfacfd1869c7a83843cd322758e667c4850	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 21:09:11.931336+03	2026-09-18 05:09:11.930984+03
\\x5fef886290f71575eff95ac2330cfcbeec570f8e24e14e54c34f3b77bf6363e2	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 21:18:29.856043+03	2026-09-18 05:18:29.855465+03
\\xc935886eb1ececf69fae3f346ff315b05e2f3c00a00ca9ff66b82f17ce23dadf	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 21:20:26.037996+03	2026-09-18 05:20:26.037284+03
\\x7005402af3d441c9856fff64e6fd8a01c6a681a688a900386f84de66a6a52293	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 21:28:31.986863+03	2026-09-18 05:28:31.986597+03
\\xd764d4bb89dffd7f488dd523fb4edc18fdec193aeb9673c570ff3c76290cdea1	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 21:30:24.219368+03	2026-09-18 05:30:24.219098+03
\\x627425978f94de594f485e69e2494194717e0644dd99d9295e81be686444c5fd	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 21:30:34.154911+03	2026-09-18 05:30:34.154579+03
\\xc0f37f5d541c1a97c4c0669f9ea9afec896500b5ec280cd7623af09d736b499a	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 21:33:34.396438+03	2026-09-18 05:33:34.396051+03
\\x00539e378eeb64db7c0270796a275d91fd105c1b167f267cee8ac793d9997d74	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 21:33:40.158185+03	2026-09-18 05:33:40.15782+03
\\x39c4f6d1f25b1d9a1e610eff670c1b984003f1f62dc2a2530f3edc186ed43833	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 21:34:14.538624+03	2026-09-18 05:34:14.537756+03
\\xb139f9e1e79bdb3727904c731daf68c010ae7e15cf93a029f32f0036634bd43e	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 21:34:42.871997+03	2026-09-18 05:34:42.871164+03
\\x2254a0a73fe4593f6433cea562548397169897473da466d33620af8b3141cae8	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 21:43:26.924643+03	2026-09-18 05:43:26.923691+03
\\x7262f60408e2ae01da7ac4ac833a0223ef9e4174387b564256526164b99caf95	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-17 21:48:26.657576+03	2026-09-18 05:48:26.657241+03
\\x2f61ede54370b6fda1d820ee7030dc7b4e7322ccf4458386a5d6235f55b8c8c4	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-18 14:47:36.355881+03	2026-09-18 22:47:36.355574+03
\\x9414a87d4f03d2ea55af052519577152a3f430966f12eb97532f032611ad479d	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-18 14:48:12.848424+03	2026-09-18 22:48:12.848085+03
\\x91c1771768a70a94130583ff8af4a068e3ce4f30cf95267f16121bbd6c40352f	3cbc4e94-2243-4900-9b17-94b749d96d74	2026-09-18 17:28:34.530671+03	2026-09-19 01:28:34.530158+03
\.


--
-- Data for Name: guestbook_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guestbook_comments (id, name, email, message, website_url, is_approved, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: guestbook_replies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guestbook_replies (id, comment_id, user_id, message, is_published, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: portfolio_admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.portfolio_admins (id, user_id, role, created_at) FROM stdin;
134ca7ad-365d-4419-ba04-89aeb8bf1f12	3cbc4e94-2243-4900-9b17-94b749d96d74	owner	2026-09-17 20:00:55.618717+03
\.


--
-- Data for Name: portfolio_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.portfolio_items (id, title, slug, description, project_url, source_url, image_url, cloudinary_public_id, cloudinary_resource_type, technologies, sort_order, is_published, created_at, updated_at, category) FROM stdin;
5d6ca9d7-422b-401b-bdc0-9b5afd3b8089	TypeScript	typescript	\N	\N	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/qb1v8jilljl-1785602481817.webp	\N	image	{}	0	t	2026-08-01 19:41:22.071479+03	2026-09-14 17:59:09.685585+03	skill
73646247-3490-41ff-847a-6edf2333791c	JavaScript	javascript	\N	\N	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/xnhbc1q7j8j-1785602472586.png	\N	image	{}	0	t	2026-08-01 19:41:12.819309+03	2026-09-14 17:59:09.685585+03	skill
9c9873b4-3796-43be-9dcc-b73b21b2ea84	SQL	sql	\N	\N	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/v28lsz733u9-1785602460044.png	\N	image	{}	0	t	2026-08-01 19:41:00.340112+03	2026-09-14 17:59:09.685585+03	skill
aad02201-c966-4b9d-a783-a643a0b28520	GO	go	\N	\N	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/o40wc9lgfg-1788697143172.png	\N	image	{}	0	t	2026-09-06 15:19:05.828407+03	2026-09-14 17:59:09.685585+03	skill
b5f5dfb6-969f-4d82-a906-22b7795caa30	Python	python	\N	\N	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/ycqgpanrcx-1785602491828.png	\N	image	{}	0	t	2026-08-01 19:41:32.289257+03	2026-09-14 17:59:09.685585+03	skill
c6d9df39-51c7-41d8-ae8a-fc04055e85c6	React JS	react-js	\N	\N	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/h40wpchgcw7-1789309883185.webp	\N	image	{}	0	t	2026-09-13 17:31:25.293954+03	2026-09-14 17:59:09.685585+03	skill
1461a01b-263b-4001-96a3-340865c8259a	Git	git	\N	\N	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/0h99mpakf035-1785602549854.jpg	\N	image	{}	2	t	2026-08-01 19:42:30.651777+03	2026-09-14 17:59:09.694911+03	tool
1de1174f-44a9-442f-b70c-4d7b93d8d61a	VS code	vs-code	\N	\N	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/oqp7oscu7yk-1785602507570.png	\N	image	{}	0	t	2026-08-01 19:41:47.812359+03	2026-09-14 17:59:09.694911+03	tool
39239c2e-3bd0-4ac4-b801-83a8e5546f3d	Github	github	\N	\N	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/88j7cfa4i8w-1788697181127.webp	\N	image	{}	0	t	2026-09-06 15:19:43.676849+03	2026-09-14 17:59:09.694911+03	tool
e9c84b96-a537-47f0-9b98-6660e91f468f	Figma	figma	\N	\N	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/kvudxxo5icf-1785602523234.webp	\N	image	{}	3	t	2026-08-01 19:42:03.932353+03	2026-09-14 17:59:09.694911+03	tool
611960c8-06c8-487a-a59a-688793e01d1e	build your own x	build-your-own-x	Master programming by recreating your favorite technologies from scratch.	https://github.com/codecrafters-io/build-your-own-x	https://github.com/codecrafters-io/build-your-own-x	https://github.githubassets.com/favicons/favicon.svg	\N	image	{}	0	t	2026-08-25 18:11:42.518436+03	2026-09-14 17:59:09.699733+03	repository
b1238764-99e2-47d2-ada5-4fda29e58749	Free For Dev	free-for-dev	A list of SaaS, PaaS and IaaS offerings that have free tiers of interest to devops and infradev	https://github.com/jixserver/free-for-dev#design-and-ui	https://github.com/jixserver/free-for-dev	https://github.githubassets.com/favicons/favicon.svg	\N	image	{}	0	t	2026-08-25 19:22:34.250726+03	2026-09-14 17:59:09.699733+03	repository
b9d9293a-6072-498a-912b-0d882777c7a7	Public APIs	public-apis	A collective list of free APIs (+1400 API)	https://github.com/public-apis/public-apis	https://github.com/public-apis/public-apis	https://github.githubassets.com/favicons/favicon.svg	\N	image	{}	0	t	2026-08-25 19:24:09.65805+03	2026-09-14 17:59:09.699733+03	repository
c0007869-f6d7-40d9-bff7-3c2a30c1ad1f	Awesome MCP Servers	awesome-mcp-servers	A collection of GitHub repositories / A collection of MCP servers.	https://github.com/punkpeye/awesome-mcp-servers	https://github.com/punkpeye/awesome-mcp-servers	https://github.githubassets.com/favicons/favicon.svg	\N	image	{}	0	t	2026-08-25 19:27:36.755984+03	2026-09-14 17:59:09.699733+03	repository
f714bf78-5695-422b-82e0-6e8436a0b139	Your Site	your-site	an website made for me and my friend's business	https://yours1te.netlify.app/	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/ysfojzq91v8-1785602305073.png	\N	image	{}	1	t	2026-08-01 19:38:25.963404+03	2026-09-14 17:59:09.704064+03	work
deaaed69-00be-46cc-8f1c-bbb62f44dfa2	Theebah surveying	theebah-surveying	An website I made for a surveying office called "Theebah Surveying"	https://theebah.netlify.app/	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/jwjqsk33boo-1785602368941.png	\N	image	{}	2	t	2026-08-01 19:39:29.921394+03	2026-09-14 17:59:09.704064+03	work
3868615b-a1e6-4272-8082-1d826331bdd1	Mappe	mappe	Mappe is portfolio has been built to be a 100% free way to showcase your art (I was bored)	https://mappe1.netlify.app/	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/h85z8p26ern-1785602394778.png	\N	image	{}	3	t	2026-08-01 19:39:55.210337+03	2026-09-14 17:59:09.704064+03	work
bba0df55-e0c6-423d-a911-ddb93bcc0e1b	Roasters Coffee House	roasters-coffee-house	A website for a local coffee shop to showcase their products and services	https://roasterscoffeehouse.netlify.app/	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/yfz6i5mklo-1785602436652.png	\N	image	{}	4	t	2026-08-01 19:40:28.089113+03	2026-09-14 17:59:09.704064+03	work
8b4c555c-ef41-4c5e-baa1-1047b7cfa875	TableMesh	tablemesh	TableMesh is a free Database Schema Visualizer that turns a row SQL code into canvas to made understanding the relationships easier	https://tablemesh.netlify.app/	\N	https://fhwrermokfjhkfjtzhms.supabase.co/storage/v1/object/public/portfolio-images/uploads/qk6pp1cfncb-1787244401480.png	\N	image	{}	5	t	2026-08-20 19:46:42.919659+03	2026-09-14 17:59:09.704064+03	work
c3ddbbe9-8991-4351-ac2c-3975f2866884	Test Project	test-project	\N	\N	\N	https://res.cloudinary.com/YOUR_CLOUD/image/upload/v123/portfolio/example.jpg	portfolio/example	image	{Go,PostgreSQL}	0	f	2026-09-19 13:13:09.783244+03	2026-09-19 13:13:16.502909+03	work
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, full_name, is_active, created_at, updated_at, last_login_at) FROM stdin;
3cbc4e94-2243-4900-9b17-94b749d96d74	theebahmad10@gmail.com	$2a$10$YTejJBXr71/uueOeRr6FX.1C4CyFeaOd9ff7hpDwK4uY1LqMu61UC	ns0t	t	2026-09-17 20:00:55.618717+03	2026-09-18 17:28:34.530671+03	2026-09-18 17:28:34.530671+03
\.


--
-- Name: admin_sessions admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (token_hash);


--
-- Name: guestbook_comments guestbook_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guestbook_comments
    ADD CONSTRAINT guestbook_comments_pkey PRIMARY KEY (id);


--
-- Name: guestbook_replies guestbook_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guestbook_replies
    ADD CONSTRAINT guestbook_replies_pkey PRIMARY KEY (id);


--
-- Name: portfolio_admins portfolio_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolio_admins
    ADD CONSTRAINT portfolio_admins_pkey PRIMARY KEY (id);


--
-- Name: portfolio_admins portfolio_admins_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolio_admins
    ADD CONSTRAINT portfolio_admins_user_id_key UNIQUE (user_id);


--
-- Name: portfolio_items portfolio_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_pkey PRIMARY KEY (id);


--
-- Name: portfolio_items portfolio_items_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_slug_key UNIQUE (slug);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: admin_sessions_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_sessions_expires_at_idx ON public.admin_sessions USING btree (expires_at);


--
-- Name: guestbook_comments_approved_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX guestbook_comments_approved_created_idx ON public.guestbook_comments USING btree (is_approved, created_at DESC);


--
-- Name: guestbook_replies_comment_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX guestbook_replies_comment_created_idx ON public.guestbook_replies USING btree (comment_id, created_at);


--
-- Name: guestbook_replies_published_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX guestbook_replies_published_idx ON public.guestbook_replies USING btree (is_published, created_at DESC);


--
-- Name: portfolio_admins_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX portfolio_admins_user_id_idx ON public.portfolio_admins USING btree (user_id);


--
-- Name: portfolio_items_cloudinary_public_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX portfolio_items_cloudinary_public_id_idx ON public.portfolio_items USING btree (cloudinary_public_id);


--
-- Name: portfolio_items_published_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX portfolio_items_published_order_idx ON public.portfolio_items USING btree (is_published, sort_order, created_at DESC);


--
-- Name: portfolio_items_slug_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX portfolio_items_slug_unique ON public.portfolio_items USING btree (slug);


--
-- Name: users_email_unique_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_unique_idx ON public.users USING btree (lower(email));


--
-- Name: guestbook_comments guestbook_comments_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER guestbook_comments_set_updated_at BEFORE UPDATE ON public.guestbook_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: guestbook_replies guestbook_replies_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER guestbook_replies_set_updated_at BEFORE UPDATE ON public.guestbook_replies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: portfolio_items portfolio_items_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER portfolio_items_set_updated_at BEFORE UPDATE ON public.portfolio_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users users_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: admin_sessions admin_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: guestbook_replies guestbook_replies_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guestbook_replies
    ADD CONSTRAINT guestbook_replies_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.guestbook_comments(id) ON DELETE CASCADE;


--
-- Name: guestbook_replies guestbook_replies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guestbook_replies
    ADD CONSTRAINT guestbook_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: portfolio_admins portfolio_admins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolio_admins
    ADD CONSTRAINT portfolio_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict VJnZQrdXLdU83eMe6cXb8DlB0TZmr2G9hQhrS5RpRiOsye4WZeU8YzZMUqpDhdY

