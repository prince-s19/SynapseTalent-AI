-- =========================================================
-- SynapseTalent.ai — schema
-- =========================================================
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  "current_role" TEXT NOT NULL,
  tenure_years NUMERIC NOT NULL DEFAULT 0,
  avatar_url TEXT,
  career_goal TEXT,
  career_goal_timeline TEXT,
  bio TEXT,
  certifications TEXT[] NOT NULL DEFAULT '{}',
  demo_employee BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency NUMERIC NOT NULL DEFAULT 0,
  confidence NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'declared',
  evidence TEXT,
  skill_type TEXT NOT NULL DEFAULT 'direct',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, skill_id)
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  role TEXT,
  duration TEXT,
  evidence_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT,
  seniority TEXT,
  required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  nice_to_have_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  responsibilities TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.role_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  match_score NUMERIC NOT NULL DEFAULT 0,
  semantic_score NUMERIC NOT NULL DEFAULT 0,
  skill_coverage_score NUMERIC NOT NULL DEFAULT 0,
  transferable_score NUMERIC NOT NULL DEFAULT 0,
  explanation JSONB NOT NULL DEFAULT '[]'::jsonb,
  skill_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, role_id)
);

CREATE TABLE public.career_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  target_role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  roadmap JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_months INTEGER NOT NULL DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, target_role_id)
);

CREATE TABLE public.consent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  github_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  portfolio_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  public_web_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ai_analysis_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.enrichment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  target TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- Grants (demo environment: fictional data, public read)
-- =========================================================
GRANT SELECT ON public.employees TO anon, authenticated;
GRANT SELECT ON public.skills TO anon, authenticated;
GRANT SELECT ON public.employee_skills TO anon, authenticated;
GRANT SELECT ON public.projects TO anon, authenticated;
GRANT SELECT ON public.roles TO anon, authenticated;
GRANT SELECT ON public.role_matches TO anon, authenticated;
GRANT SELECT ON public.career_roadmaps TO anon, authenticated;
GRANT SELECT ON public.consent_settings TO anon, authenticated;
GRANT SELECT ON public.enrichment_runs TO anon, authenticated;
GRANT ALL ON public.employees TO service_role;
GRANT ALL ON public.skills TO service_role;
GRANT ALL ON public.employee_skills TO service_role;
GRANT ALL ON public.projects TO service_role;
GRANT ALL ON public.roles TO service_role;
GRANT ALL ON public.role_matches TO service_role;
GRANT ALL ON public.career_roadmaps TO service_role;
GRANT ALL ON public.consent_settings TO service_role;
GRANT ALL ON public.enrichment_runs TO service_role;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo read employees" ON public.employees FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "demo read skills" ON public.skills FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "demo read employee_skills" ON public.employee_skills FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "demo read projects" ON public.projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "demo read roles" ON public.roles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "demo read role_matches" ON public.role_matches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "demo read career_roadmaps" ON public.career_roadmaps FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "demo read consent_settings" ON public.consent_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "demo read enrichment_runs" ON public.enrichment_runs FOR SELECT TO anon, authenticated USING (true);

-- =========================================================
-- Skills catalogue
-- =========================================================
INSERT INTO public.skills (name, category, description) VALUES
('React','Frontend','Component-driven UI development'),
('TypeScript','Frontend','Typed JavaScript at scale'),
('JavaScript','Frontend','Core web programming language'),
('Frontend Architecture','Frontend','Structuring large client applications'),
('UI Engineering','Frontend','Design-system and interface implementation'),
('Accessibility','Frontend','Inclusive, standards-compliant interfaces'),
('Node.js','Backend','Server-side JavaScript runtime'),
('Python','Backend','General purpose language for data and services'),
('Rust','Backend','Memory-safe systems language'),
('Go','Backend','Concurrent services language'),
('API Development','Backend','Designing and shipping service interfaces'),
('Backend Development','Backend','Server, service and data-layer engineering'),
('Systems Programming','Backend','Low-level performance-critical engineering'),
('Distributed Systems','Backend','Designing resilient multi-node systems'),
('System Design','Architecture','Designing scalable technical architecture'),
('Cloud Architecture','Cloud','Designing cloud-native platforms'),
('AWS','Cloud','Amazon Web Services platform engineering'),
('Docker','Cloud','Containerisation of applications'),
('Kubernetes','Cloud','Container orchestration at scale'),
('Terraform','Cloud','Infrastructure as code'),
('CI/CD','Cloud','Automated build and delivery pipelines'),
('DevOps','Cloud','Operational automation and reliability'),
('SQL','Data','Relational querying and modelling'),
('Data Analysis','Data','Turning raw data into decisions'),
('Data Engineering','Data','Building reliable data pipelines'),
('Data Visualization','Data','Communicating data visually'),
('Statistics','Data','Statistical inference and experimentation'),
('Machine Learning','AI','Training and evaluating predictive models'),
('Deep Learning','AI','Neural network modelling'),
('PyTorch','AI','Deep learning framework'),
('TensorFlow','AI','Deep learning framework'),
('NLP','AI','Natural language processing'),
('MLOps','AI','Operationalising machine learning systems'),
('Model Deployment','AI','Serving models in production'),
('Prompt Engineering','AI','Designing reliable LLM instructions'),
('Threat Modeling','Security','Systematically identifying attack surface'),
('Application Security','Security','Securing software and dependencies'),
('Incident Response','Security','Detecting and containing security events'),
('Product Strategy','Product','Defining product direction'),
('Roadmapping','Product','Sequencing product delivery'),
('Stakeholder Management','Product','Aligning cross-functional partners'),
('User Research','Product','Learning from users systematically'),
('Product Analytics','Product','Measuring product behaviour'),
('Technical Leadership','Leadership','Leading technical direction and teams'),
('Mentoring','Leadership','Growing other engineers'),
('Problem Solving','Leadership','Structured resolution of hard problems'),
('Communication','Leadership','Clear written and verbal collaboration'),
('Project Management','Leadership','Delivering work on time across teams');

-- =========================================================
-- Internal roles
-- =========================================================
INSERT INTO public.roles (id, title, department, description, seniority, required_skills, nice_to_have_skills, responsibilities) VALUES
('a0000000-0000-4000-8000-000000000001','Senior AI Engineer','AI/ML','Design, train and ship production machine learning systems with strong engineering fundamentals.','Senior',
 '[{"skill":"Python","proficiency":85},{"skill":"Machine Learning","proficiency":85},{"skill":"PyTorch","proficiency":85},{"skill":"MLOps","proficiency":70},{"skill":"System Design","proficiency":70},{"skill":"Model Deployment","proficiency":65}]',
 '[{"skill":"Technical Leadership","proficiency":60},{"skill":"Docker","proficiency":55},{"skill":"NLP","proficiency":50}]',
 'Own model architecture decisions, ship models to production, mentor engineers and partner with product on AI capabilities.'),
('a0000000-0000-4000-8000-000000000002','ML Engineer','AI/ML','Build and maintain machine learning pipelines from data ingestion to serving.','Mid',
 '[{"skill":"Python","proficiency":80},{"skill":"Machine Learning","proficiency":75},{"skill":"SQL","proficiency":65},{"skill":"Model Deployment","proficiency":60},{"skill":"Docker","proficiency":55}]',
 '[{"skill":"PyTorch","proficiency":60},{"skill":"MLOps","proficiency":50},{"skill":"Data Engineering","proficiency":50}]',
 'Develop training pipelines, evaluate model quality, deploy and monitor models in production.'),
('a0000000-0000-4000-8000-000000000003','ML Platform Engineer','AI/ML','Build the internal platform that lets ML teams train, deploy and monitor models.','Senior',
 '[{"skill":"Python","proficiency":75},{"skill":"MLOps","proficiency":80},{"skill":"Docker","proficiency":75},{"skill":"Kubernetes","proficiency":70},{"skill":"CI/CD","proficiency":70},{"skill":"System Design","proficiency":70}]',
 '[{"skill":"Terraform","proficiency":55},{"skill":"Model Deployment","proficiency":65},{"skill":"Distributed Systems","proficiency":55}]',
 'Own ML infrastructure, deployment tooling, observability and platform reliability.'),
('a0000000-0000-4000-8000-000000000004','Cloud Engineer','Cloud/DevOps','Design and operate secure, scalable cloud infrastructure.','Mid',
 '[{"skill":"AWS","proficiency":80},{"skill":"Docker","proficiency":70},{"skill":"Terraform","proficiency":65},{"skill":"CI/CD","proficiency":65},{"skill":"Cloud Architecture","proficiency":60}]',
 '[{"skill":"Kubernetes","proficiency":60},{"skill":"Python","proficiency":50},{"skill":"DevOps","proficiency":60}]',
 'Provision infrastructure as code, harden cloud environments and support delivery teams.'),
('a0000000-0000-4000-8000-000000000005','Data Scientist','Data Science','Answer business questions with statistics, experimentation and modelling.','Mid',
 '[{"skill":"Python","proficiency":80},{"skill":"SQL","proficiency":80},{"skill":"Statistics","proficiency":75},{"skill":"Machine Learning","proficiency":70},{"skill":"Data Analysis","proficiency":75}]',
 '[{"skill":"Data Visualization","proficiency":60},{"skill":"Communication","proficiency":65},{"skill":"Deep Learning","proficiency":45}]',
 'Design experiments, build models, and translate analysis into product and business decisions.'),
('a0000000-0000-4000-8000-000000000006','Frontend Lead','Engineering','Lead frontend architecture, quality and the engineers who build it.','Lead',
 '[{"skill":"React","proficiency":85},{"skill":"TypeScript","proficiency":85},{"skill":"Frontend Architecture","proficiency":80},{"skill":"Technical Leadership","proficiency":75},{"skill":"Accessibility","proficiency":60}]',
 '[{"skill":"Mentoring","proficiency":65},{"skill":"UI Engineering","proficiency":70},{"skill":"System Design","proficiency":60}]',
 'Set frontend standards, lead architecture decisions, review code and grow the team.'),
('a0000000-0000-4000-8000-000000000007','Backend Engineer','Engineering','Build reliable services and APIs that power the product.','Mid',
 '[{"skill":"Backend Development","proficiency":80},{"skill":"API Development","proficiency":75},{"skill":"SQL","proficiency":70},{"skill":"Node.js","proficiency":65},{"skill":"System Design","proficiency":60}]',
 '[{"skill":"Go","proficiency":50},{"skill":"Rust","proficiency":45},{"skill":"Distributed Systems","proficiency":55}]',
 'Design service boundaries, ship APIs, own data models and production reliability.'),
('a0000000-0000-4000-8000-000000000008','DevOps Engineer','Cloud/DevOps','Automate delivery and keep production healthy.','Mid',
 '[{"skill":"CI/CD","proficiency":80},{"skill":"Docker","proficiency":75},{"skill":"Kubernetes","proficiency":70},{"skill":"DevOps","proficiency":75},{"skill":"AWS","proficiency":65}]',
 '[{"skill":"Terraform","proficiency":60},{"skill":"Incident Response","proficiency":55},{"skill":"Python","proficiency":50}]',
 'Own pipelines, deployment automation, monitoring and incident readiness.'),
('a0000000-0000-4000-8000-000000000009','Product Manager','Product','Own problem definition, prioritisation and outcomes for a product area.','Mid',
 '[{"skill":"Product Strategy","proficiency":80},{"skill":"Roadmapping","proficiency":75},{"skill":"Stakeholder Management","proficiency":75},{"skill":"Product Analytics","proficiency":65},{"skill":"Communication","proficiency":75}]',
 '[{"skill":"User Research","proficiency":60},{"skill":"SQL","proficiency":45},{"skill":"Project Management","proficiency":60}]',
 'Define the roadmap, align stakeholders and measure product outcomes.'),
('a0000000-0000-4000-8000-000000000010','Cybersecurity Analyst','Cybersecurity','Detect, investigate and reduce security risk across the organisation.','Mid',
 '[{"skill":"Threat Modeling","proficiency":75},{"skill":"Application Security","proficiency":80},{"skill":"Incident Response","proficiency":75},{"skill":"Python","proficiency":55}]',
 '[{"skill":"AWS","proficiency":50},{"skill":"Communication","proficiency":60},{"skill":"Problem Solving","proficiency":65}]',
 'Run detections, lead investigations, and drive remediation with engineering teams.'),
('a0000000-0000-4000-8000-000000000011','Data Analyst','Business Analytics','Turn company data into clear, trusted answers.','Mid',
 '[{"skill":"SQL","proficiency":80},{"skill":"Data Analysis","proficiency":80},{"skill":"Data Visualization","proficiency":70},{"skill":"Communication","proficiency":65}]',
 '[{"skill":"Python","proficiency":50},{"skill":"Statistics","proficiency":55},{"skill":"Product Analytics","proficiency":60}]',
 'Build reporting, investigate trends and support decisions with evidence.'),
('a0000000-0000-4000-8000-000000000012','Cloud AI Engineer','Cloud/DevOps','Run AI workloads reliably and cost-effectively on cloud infrastructure.','Senior',
 '[{"skill":"AWS","proficiency":75},{"skill":"Docker","proficiency":70},{"skill":"MLOps","proficiency":70},{"skill":"Python","proficiency":70},{"skill":"Model Deployment","proficiency":65}]',
 '[{"skill":"Kubernetes","proficiency":60},{"skill":"Machine Learning","proficiency":55},{"skill":"System Design","proficiency":60}]',
 'Own AI infrastructure, inference services, scaling and cost control.');

-- =========================================================
-- Employees (fictional demo data)
-- =========================================================
INSERT INTO public.employees (id, name, email, department, "current_role", tenure_years, career_goal, career_goal_timeline, bio, certifications) VALUES
('e0000000-0000-4000-8000-000000000001','Priya Sharma','priya.sharma@synapsecorp.example','Engineering','Senior Frontend Developer',3,'Senior AI Engineer','12 months','Frontend engineer who keeps drifting into performance, systems and applied AI work on delivery teams.','{"AI Fundamentals (2025)","AWS Cloud Practitioner"}'),
('e0000000-0000-4000-8000-000000000002','Arjun Mehta','arjun.mehta@synapsecorp.example','Engineering','Backend Engineer',4,'Staff Backend Engineer','18 months','Service engineer focused on API design and data-heavy workloads.','{"AWS Solutions Architect Associate"}'),
('e0000000-0000-4000-8000-000000000003','Neha Kulkarni','neha.kulkarni@synapsecorp.example','Engineering','Full Stack Developer',2,'Frontend Lead','12 months','Full stack developer who owns design-system work end to end.','{}'),
('e0000000-0000-4000-8000-000000000004','Rahul Verma','rahul.verma@synapsecorp.example','Data Science','Data Scientist',5,'Head of Data Science','24 months','Experimentation lead for pricing and retention analytics.','{"Deep Learning Specialization"}'),
('e0000000-0000-4000-8000-000000000005','Ananya Iyer','ananya.iyer@synapsecorp.example','Data Science','Junior Data Scientist',1,'ML Engineer','18 months','Early-career scientist with strong Python and modelling fundamentals.','{"AI Fundamentals (2025)"}'),
('e0000000-0000-4000-8000-000000000006','Vikram Rao','vikram.rao@synapsecorp.example','Data Science','Research Analyst',3,'Data Scientist','12 months','Research analyst bridging market data and product analytics.','{}'),
('e0000000-0000-4000-8000-000000000007','Sneha Pillai','sneha.pillai@synapsecorp.example','AI/ML','ML Engineer',4,'Senior AI Engineer','12 months','Ships recommendation and ranking models to production.','{"TensorFlow Developer Certificate"}'),
('e0000000-0000-4000-8000-000000000008','Karthik Nair','karthik.nair@synapsecorp.example','AI/ML','NLP Engineer',2,'ML Platform Engineer','18 months','Language modelling engineer with growing infrastructure interest.','{}'),
('e0000000-0000-4000-8000-000000000009','Meera Joshi','meera.joshi@synapsecorp.example','AI/ML','Associate AI Engineer',1,'ML Engineer','18 months','Associate engineer working on evaluation tooling for models.','{"AI Fundamentals (2025)"}'),
('e0000000-0000-4000-8000-000000000010','Rohit Sinha','rohit.sinha@synapsecorp.example','Product','Product Manager',6,'Director of Product','24 months','Platform PM for internal developer products.','{}'),
('e0000000-0000-4000-8000-000000000011','Divya Menon','divya.menon@synapsecorp.example','Product','Associate Product Manager',2,'Product Manager','12 months','APM on the onboarding and activation surface.','{}'),
('e0000000-0000-4000-8000-000000000012','Aditya Bose','aditya.bose@synapsecorp.example','Product','Technical Program Manager',5,'Product Manager','12 months','TPM who runs complex multi-team technical programmes.','{"PMP"}'),
('e0000000-0000-4000-8000-000000000013','Ishita Roy','ishita.roy@synapsecorp.example','Design','Senior Product Designer',4,'Design Lead','12 months','Designer who prototypes in code and owns the design system.','{}'),
('e0000000-0000-4000-8000-000000000014','Nikhil Gupta','nikhil.gupta@synapsecorp.example','Design','UX Designer',2,'Product Manager','18 months','UX designer with a strong research and analytics habit.','{}'),
('e0000000-0000-4000-8000-000000000015','Tanya Kapoor','tanya.kapoor@synapsecorp.example','Design','Design Systems Engineer',3,'Frontend Lead','12 months','Bridges design and frontend engineering on component libraries.','{}'),
('e0000000-0000-4000-8000-000000000016','Suresh Babu','suresh.babu@synapsecorp.example','Cloud/DevOps','DevOps Engineer',5,'Cloud Architect','18 months','Owns delivery pipelines and Kubernetes platform work.','{"Certified Kubernetes Administrator"}'),
('e0000000-0000-4000-8000-000000000017','Farhan Qureshi','farhan.qureshi@synapsecorp.example','Cloud/DevOps','Site Reliability Engineer',3,'Cloud Engineer','12 months','SRE focused on observability and incident readiness.','{"AWS Cloud Practitioner"}'),
('e0000000-0000-4000-8000-000000000018','Pooja Desai','pooja.desai@synapsecorp.example','Cloud/DevOps','Platform Engineer',4,'ML Platform Engineer','18 months','Platform engineer building internal developer tooling.','{"Terraform Associate"}'),
('e0000000-0000-4000-8000-000000000019','Manish Tiwari','manish.tiwari@synapsecorp.example','Cybersecurity','Security Engineer',6,'Security Architect','18 months','Security engineer covering application and cloud security.','{"CISSP"}'),
('e0000000-0000-4000-8000-000000000020','Ritu Chawla','ritu.chawla@synapsecorp.example','Cybersecurity','Cybersecurity Analyst',2,'Security Architect','24 months','Analyst running detections and investigations.','{"CompTIA Security+"}'),
('e0000000-0000-4000-8000-000000000021','Abhishek Jain','abhishek.jain@synapsecorp.example','Cybersecurity','Application Security Engineer',3,'Cloud Engineer','12 months','AppSec engineer automating security checks in pipelines.','{}'),
('e0000000-0000-4000-8000-000000000022','Sanjana Rane','sanjana.rane@synapsecorp.example','Business Analytics','Business Analyst',4,'Data Scientist','18 months','Analyst who has quietly built forecasting models for operations.','{}'),
('e0000000-0000-4000-8000-000000000023','Deepak Chandra','deepak.chandra@synapsecorp.example','Business Analytics','Data Analyst',2,'Data Scientist','18 months','Analyst with strong SQL and dashboarding practice.','{}'),
('e0000000-0000-4000-8000-000000000024','Kavya Reddy','kavya.reddy@synapsecorp.example','Business Analytics','Analytics Engineer',3,'Data Engineer','12 months','Owns the analytics warehouse and transformation layer.','{}'),
('e0000000-0000-4000-8000-000000000025','Varun Malhotra','varun.malhotra@synapsecorp.example','Marketing','Growth Marketing Manager',5,'Product Manager','18 months','Growth lead who runs heavy experimentation programmes.','{}'),
('e0000000-0000-4000-8000-000000000026','Aisha Khan','aisha.khan@synapsecorp.example','Marketing','Marketing Analyst',2,'Data Analyst','12 months','Marketing analyst working in SQL and dashboards daily.','{}'),
('e0000000-0000-4000-8000-000000000027','Gaurav Shetty','gaurav.shetty@synapsecorp.example','Marketing','Content Strategist',3,'Product Marketing Lead','18 months','Content strategist automating research with LLM tooling.','{}'),
('e0000000-0000-4000-8000-000000000028','Lakshmi Narayan','lakshmi.narayan@synapsecorp.example','Operations','Operations Manager',7,'Program Director','24 months','Operations leader running cross-region delivery.','{"PMP"}'),
('e0000000-0000-4000-8000-000000000029','Imran Sheikh','imran.sheikh@synapsecorp.example','Operations','Business Operations Analyst',3,'Data Analyst','12 months','Ops analyst who builds his own reporting tooling.','{}'),
('e0000000-0000-4000-8000-000000000030','Shruti Agarwal','shruti.agarwal@synapsecorp.example','Operations','Process Automation Specialist',4,'Backend Engineer','18 months','Automates internal processes with Python services.','{"AI Fundamentals (2025)"}');

-- =========================================================
-- Projects
-- =========================================================
INSERT INTO public.projects (employee_id, name, description, tech_stack, role, duration, evidence_url) VALUES
('e0000000-0000-4000-8000-000000000001','AI Code Review Bot','Internal bot that reviews pull requests using transformer models and posts structured feedback.','{"Python","Machine Learning","Deep Learning","Prompt Engineering"}','Creator / lead developer','4 months','https://example.com/internal/ai-code-review-bot'),
('e0000000-0000-4000-8000-000000000001','Rust WebAssembly Performance Project','Rewrote the heaviest rendering path as a Rust WebAssembly module, cutting frame cost by 42%.','{"Rust","Systems Programming","JavaScript"}','Sole engineer','3 months','https://example.com/internal/rust-wasm-perf'),
('e0000000-0000-4000-8000-000000000001','Real-Time WebSocket Platform','Designed a WebSocket-based real-time collaboration architecture serving 40k concurrent sessions.','{"System Design","Node.js","Distributed Systems"}','Architecture owner','6 months','https://example.com/internal/realtime-platform'),
('e0000000-0000-4000-8000-000000000001','E-commerce Platform Migration','Led the cross-functional migration of the storefront across three teams with zero downtime.','{"React","TypeScript","Technical Leadership","AWS"}','Technical lead','8 months','https://example.com/internal/storefront-migration'),
('e0000000-0000-4000-8000-000000000002','Payments Service Rewrite','Rebuilt the payments service with idempotent APIs and strict consistency guarantees.','{"Node.js","API Development","SQL","Distributed Systems"}','Lead engineer','7 months',NULL),
('e0000000-0000-4000-8000-000000000002','Event Streaming Backbone','Introduced an event backbone for order processing across four services.','{"Go","Distributed Systems","System Design"}','Engineer','5 months',NULL),
('e0000000-0000-4000-8000-000000000002','Internal Metrics API','Shipped a metrics aggregation API consumed by every product team.','{"Backend Development","API Development","SQL"}','Engineer','3 months',NULL),
('e0000000-0000-4000-8000-000000000003','Design System 2.0','Rebuilt the component library with accessible primitives and visual regression coverage.','{"React","TypeScript","UI Engineering","Accessibility"}','Engineer','6 months',NULL),
('e0000000-0000-4000-8000-000000000003','Checkout Performance Sprint','Cut checkout load time in half through bundle and rendering work.','{"Frontend Architecture","JavaScript","React"}','Engineer','2 months',NULL),
('e0000000-0000-4000-8000-000000000004','Churn Prediction Model','Built and validated a churn model now used by three business teams.','{"Python","Machine Learning","Statistics","SQL"}','Lead scientist','5 months',NULL),
('e0000000-0000-4000-8000-000000000004','Pricing Experimentation Framework','Created the company experiment framework with sequential testing.','{"Statistics","Python","Data Analysis"}','Owner','4 months',NULL),
('e0000000-0000-4000-8000-000000000004','Forecast Serving Pipeline','Containerised forecast models and shipped them behind an internal API.','{"Docker","Model Deployment","Python"}','Engineer','3 months',NULL),
('e0000000-0000-4000-8000-000000000005','Support Ticket Classifier','Trained a classifier that routes support tickets with 91% accuracy.','{"Python","Machine Learning","NLP"}','Scientist','3 months',NULL),
('e0000000-0000-4000-8000-000000000005','Analytics Notebook Library','Built reusable analysis utilities adopted by the data team.','{"Python","Data Analysis","SQL"}','Contributor','2 months',NULL),
('e0000000-0000-4000-8000-000000000006','Market Intelligence Dashboard','Automated competitor tracking into a live analytics dashboard.','{"SQL","Data Visualization","Data Analysis"}','Owner','4 months',NULL),
('e0000000-0000-4000-8000-000000000006','Survey Modelling Study','Applied statistical modelling to a 30k-response research study.','{"Statistics","Python"}','Analyst','2 months',NULL),
('e0000000-0000-4000-8000-000000000007','Ranking Model v3','Retrained and deployed the core ranking model, lifting engagement 8%.','{"PyTorch","Machine Learning","Python","Model Deployment"}','Lead engineer','6 months',NULL),
('e0000000-0000-4000-8000-000000000007','Feature Store Rollout','Delivered a shared feature store for the ML team.','{"Data Engineering","Python","MLOps"}','Engineer','5 months',NULL),
('e0000000-0000-4000-8000-000000000007','Model Monitoring Service','Built drift monitoring with automated alerting.','{"MLOps","Docker","Model Deployment"}','Engineer','3 months',NULL),
('e0000000-0000-4000-8000-000000000008','Document Understanding Pipeline','Built an extraction pipeline for scanned contracts.','{"NLP","Python","Deep Learning"}','Engineer','5 months',NULL),
('e0000000-0000-4000-8000-000000000008','Inference Autoscaler','Containerised inference workloads and automated scaling.','{"Docker","Kubernetes","Model Deployment"}','Engineer','3 months',NULL),
('e0000000-0000-4000-8000-000000000009','Model Evaluation Harness','Created the evaluation harness used for every model release.','{"Python","Machine Learning","CI/CD"}','Engineer','4 months',NULL),
('e0000000-0000-4000-8000-000000000010','Developer Platform Roadmap','Defined and delivered the two-year internal platform roadmap.','{"Product Strategy","Roadmapping","Stakeholder Management"}','Product owner','12 months',NULL),
('e0000000-0000-4000-8000-000000000010','Self-Serve Migration Programme','Moved 60% of infrastructure requests to self-serve tooling.','{"Product Analytics","Project Management","Communication"}','Product owner','6 months',NULL),
('e0000000-0000-4000-8000-000000000011','Onboarding Activation Revamp','Redesigned activation flow, improving day-7 retention by 14%.','{"Product Analytics","User Research","Roadmapping"}','APM','5 months',NULL),
('e0000000-0000-4000-8000-000000000012','Platform Consolidation Programme','Ran a nine-team consolidation programme to a single service platform.','{"Project Management","Stakeholder Management","System Design"}','Programme lead','14 months',NULL),
('e0000000-0000-4000-8000-000000000012','Delivery Metrics Warehouse','Built delivery metrics reporting across engineering.','{"SQL","Data Analysis","Data Visualization"}','Lead','4 months',NULL),
('e0000000-0000-4000-8000-000000000013','Design Language Refresh','Led the visual language refresh across every product surface.','{"UI Engineering","Accessibility","Communication"}','Design lead','9 months',NULL),
('e0000000-0000-4000-8000-000000000013','Prototype Component Kit','Shipped a coded prototyping kit used by designers and engineers.','{"React","TypeScript","UI Engineering"}','Designer / developer','3 months',NULL),
('e0000000-0000-4000-8000-000000000014','Journey Research Programme','Ran a company-wide journey research programme with 40 interviews.','{"User Research","Communication","Product Analytics"}','Researcher','5 months',NULL),
('e0000000-0000-4000-8000-000000000015','Token Pipeline Automation','Automated design-token generation into the component library build.','{"TypeScript","CI/CD","Frontend Architecture"}','Engineer','4 months',NULL),
('e0000000-0000-4000-8000-000000000015','Accessibility Remediation','Remediated WCAG issues across twelve product areas.','{"Accessibility","React","UI Engineering"}','Engineer','3 months',NULL),
('e0000000-0000-4000-8000-000000000016','Kubernetes Platform Migration','Migrated 70 services onto a managed Kubernetes platform.','{"Kubernetes","Docker","Terraform","AWS"}','Lead engineer','10 months',NULL),
('e0000000-0000-4000-8000-000000000016','Pipeline Standardisation','Standardised CI/CD pipelines across all repositories.','{"CI/CD","DevOps","Docker"}','Engineer','4 months',NULL),
('e0000000-0000-4000-8000-000000000017','Observability Overhaul','Rebuilt tracing and alerting, cutting mean time to detect by 60%.','{"DevOps","Incident Response","AWS"}','Engineer','6 months',NULL),
('e0000000-0000-4000-8000-000000000017','Chaos Testing Programme','Introduced failure injection testing for critical services.','{"Distributed Systems","DevOps","Python"}','Engineer','3 months',NULL),
('e0000000-0000-4000-8000-000000000018','Internal Developer Portal','Built the self-serve developer portal and service catalogue.','{"Python","CI/CD","System Design","Docker"}','Engineer','8 months',NULL),
('e0000000-0000-4000-8000-000000000018','GPU Scheduling Prototype','Prototyped GPU scheduling for model training jobs.','{"Kubernetes","MLOps","Docker"}','Engineer','3 months',NULL),
('e0000000-0000-4000-8000-000000000019','Threat Model Programme','Introduced structured threat modelling for every new service.','{"Threat Modeling","Application Security","System Design"}','Lead','9 months',NULL),
('e0000000-0000-4000-8000-000000000019','Cloud Hardening Initiative','Hardened cloud accounts and automated compliance checks.','{"AWS","Terraform","Application Security"}','Lead','5 months',NULL),
('e0000000-0000-4000-8000-000000000020','Detection Engineering Uplift','Wrote and tuned detections that cut false positives by half.','{"Incident Response","Python","Threat Modeling"}','Analyst','6 months',NULL),
('e0000000-0000-4000-8000-000000000021','Security Pipeline Automation','Embedded dependency and secret scanning into every pipeline.','{"CI/CD","Application Security","Docker","Python"}','Engineer','5 months',NULL),
('e0000000-0000-4000-8000-000000000022','Demand Forecasting Model','Built the operations demand forecasting model used for staffing.','{"Python","Machine Learning","Statistics","SQL"}','Analyst / model owner','6 months',NULL),
('e0000000-0000-4000-8000-000000000022','Executive Reporting Suite','Delivered the executive reporting suite used in board reviews.','{"Data Visualization","SQL","Communication"}','Owner','4 months',NULL),
('e0000000-0000-4000-8000-000000000023','Retention Cohort Analysis','Ran the retention cohort analysis that reshaped the pricing plan.','{"SQL","Data Analysis","Data Visualization"}','Analyst','3 months',NULL),
('e0000000-0000-4000-8000-000000000023','Python Reporting Automation','Automated weekly reporting with Python scripts.','{"Python","Data Analysis"}','Analyst','2 months',NULL),
('e0000000-0000-4000-8000-000000000024','Warehouse Modelling Layer','Rebuilt the warehouse modelling layer with tested transformations.','{"SQL","Data Engineering","CI/CD"}','Owner','7 months',NULL),
('e0000000-0000-4000-8000-000000000024','Pipeline Orchestration Migration','Migrated batch pipelines to a modern orchestrator.','{"Python","Data Engineering","Docker"}','Engineer','4 months',NULL),
('e0000000-0000-4000-8000-000000000025','Growth Experimentation Engine','Ran 120 growth experiments with a shared measurement framework.','{"Product Analytics","Statistics","Data Analysis"}','Owner','10 months',NULL),
('e0000000-0000-4000-8000-000000000025','Lifecycle Messaging Revamp','Rebuilt lifecycle messaging with segmentation modelling.','{"Product Analytics","SQL","Stakeholder Management"}','Owner','5 months',NULL),
('e0000000-0000-4000-8000-000000000026','Attribution Dashboard','Built the marketing attribution dashboard on warehouse data.','{"SQL","Data Visualization","Data Analysis"}','Analyst','4 months',NULL),
('e0000000-0000-4000-8000-000000000027','LLM Research Assistant','Built an internal LLM assistant that drafts competitive research briefs.','{"Prompt Engineering","Python","NLP"}','Creator','3 months',NULL),
('e0000000-0000-4000-8000-000000000028','Regional Delivery Programme','Ran delivery operations across four regions and 200 staff.','{"Project Management","Stakeholder Management","Communication"}','Programme director','24 months',NULL),
('e0000000-0000-4000-8000-000000000029','Ops Reporting Platform','Built the operations reporting platform on SQL and Python.','{"SQL","Python","Data Analysis"}','Analyst','5 months',NULL),
('e0000000-0000-4000-8000-000000000030','Process Automation Services','Shipped seven Python automation services replacing manual workflows.','{"Python","Backend Development","API Development","Docker"}','Engineer','9 months',NULL),
('e0000000-0000-4000-8000-000000000030','Workflow Orchestration Rebuild','Rebuilt internal workflow orchestration with queue-based processing.','{"Python","System Design","Distributed Systems"}','Engineer','5 months',NULL);

-- =========================================================
-- Hero employee skill profile (Priya Sharma) — evidence-backed
-- =========================================================
INSERT INTO public.employee_skills (employee_id, skill_id, proficiency, confidence, source, evidence, skill_type)
SELECT 'e0000000-0000-4000-8000-000000000001', s.id, v.proficiency, v.confidence, v.source, v.evidence, v.skill_type
FROM (VALUES
  ('React',88,95,'declared','Declared skill, used daily as Senior Frontend Developer','direct'),
  ('TypeScript',85,94,'declared','Declared skill, primary language on the storefront migration','direct'),
  ('JavaScript',90,95,'declared','Declared skill across 3 years of frontend delivery','direct'),
  ('Machine Learning',70,78,'project','Built AI Code Review Bot using transformer models','hidden'),
  ('Deep Learning',58,71,'project','Trained and fine-tuned transformer models for the AI Code Review Bot','hidden'),
  ('Prompt Engineering',72,80,'project','Designed structured review prompts for the AI Code Review Bot','hidden'),
  ('Python',68,82,'project','Implemented the AI Code Review Bot service in Python','hidden'),
  ('System Design',75,80,'project','Designed WebSocket-based real-time architecture for 40k concurrent sessions','hidden'),
  ('Technical Leadership',82,85,'project','Led cross-functional e-commerce platform migration across three teams','hidden'),
  ('Rust',65,72,'project','Shipped a Rust WebAssembly module that cut rendering cost by 42%','hidden'),
  ('Systems Programming',58,70,'project','Optimised memory and rendering hot paths in the Rust WebAssembly module','transferable'),
  ('Distributed Systems',54,68,'project','Handled fan-out and reconnection logic in the real-time WebSocket platform','transferable'),
  ('Frontend Architecture',84,90,'project','Owned frontend architecture through the storefront migration','direct'),
  ('Problem Solving',80,88,'project','Diagnosed and removed the rendering bottleneck behind the Rust rewrite','direct'),
  ('Mentoring',70,76,'project','Guided four junior developers through the migration workstreams','hidden'),
  ('AWS',55,75,'certification','AWS Cloud Practitioner certification, applied on the storefront migration','direct'),
  ('PyTorch',40,60,'project','Used a pretrained PyTorch model in the AI Code Review Bot without owning training infrastructure','hidden'),
  ('MLOps',30,55,'ai_inferred','Limited evidence: the review bot was deployed manually, no pipeline ownership found','hidden'),
  ('Model Deployment',38,58,'project','Deployed the review bot as a single container behind an internal endpoint','hidden')
) AS v(skill_name, proficiency, confidence, source, evidence, skill_type)
JOIN public.skills s ON s.name = v.skill_name;

-- =========================================================
-- Declared skills for the rest of the demo organisation
-- =========================================================
INSERT INTO public.employee_skills (employee_id, skill_id, proficiency, confidence, source, evidence, skill_type)
SELECT e.id, s.id,
  58 + (abs(hashtext(e.name || s.name)) % 36),
  78 + (abs(hashtext(s.name || e.name)) % 18),
  'declared',
  'Declared skill on ' || e.name || '''s talent profile (' || e."current_role" || ')',
  'direct'
FROM public.employees e
JOIN (VALUES
  ('Engineering', ARRAY['JavaScript','TypeScript','Node.js','React']),
  ('Data Science', ARRAY['Python','SQL','Statistics','Data Analysis']),
  ('AI/ML', ARRAY['Python','Machine Learning','Deep Learning','SQL']),
  ('Product', ARRAY['Product Strategy','Roadmapping','Stakeholder Management','Communication']),
  ('Design', ARRAY['UI Engineering','User Research','Accessibility','Communication']),
  ('Cloud/DevOps', ARRAY['Docker','Kubernetes','AWS','CI/CD']),
  ('Cybersecurity', ARRAY['Application Security','Threat Modeling','Incident Response','Python']),
  ('Business Analytics', ARRAY['SQL','Data Analysis','Data Visualization','Product Analytics']),
  ('Marketing', ARRAY['Product Analytics','Communication','Data Visualization','Stakeholder Management']),
  ('Operations', ARRAY['Project Management','Communication','Data Analysis','Stakeholder Management'])
) AS d(department, skills) ON d.department = e.department
CROSS JOIN unnest(d.skills) AS sk(skill_name)
JOIN public.skills s ON s.name = sk.skill_name
WHERE e.id <> 'e0000000-0000-4000-8000-000000000001'
ON CONFLICT (employee_id, skill_id) DO NOTHING;

-- =========================================================
-- Project-evidenced skills (hidden where not declared)
-- =========================================================
INSERT INTO public.employee_skills (employee_id, skill_id, proficiency, confidence, source, evidence, skill_type)
SELECT DISTINCT ON (p.employee_id, s.id)
  p.employee_id, s.id,
  52 + (abs(hashtext(p.name || s.name)) % 33),
  68 + (abs(hashtext(s.name || p.name)) % 24),
  'project',
  'Applied ' || s.name || ' while delivering ' || p.name,
  'hidden'
FROM public.projects p
CROSS JOIN unnest(p.tech_stack) AS t(skill_name)
JOIN public.skills s ON s.name = t.skill_name
WHERE p.employee_id <> 'e0000000-0000-4000-8000-000000000001'
ORDER BY p.employee_id, s.id, p.name
ON CONFLICT (employee_id, skill_id) DO NOTHING;

-- =========================================================
-- Consent defaults (external enrichment OFF)
-- =========================================================
INSERT INTO public.consent_settings (employee_id, github_enabled, portfolio_enabled, public_web_enabled, ai_analysis_enabled)
SELECT id, FALSE, FALSE, FALSE, TRUE FROM public.employees;