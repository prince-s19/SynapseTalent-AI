/** Client-safe types and curated fallback data for the industry trends feed. */

export interface IndustryTrend {
  title: string;
  summary: string;
  whyItMatters: string;
  suggestedStep: string;
  sourceUrl?: string | null;
  sourceName?: string | null;
}

export interface TrendsPayload {
  trends: IndustryTrend[];
  source: "live" | "curated";
  fetchedAt: string;
  notice: string | null;
  scope: string;
}

const ENGINEERING: IndustryTrend[] = [
  {
    title: "AI coding agents move into the standard toolchain",
    summary:
      "Engineering teams increasingly pair developers with AI agents for review, refactoring and test generation.",
    whyItMatters:
      "Reviewing and directing generated code is becoming a core engineering skill rather than an extra.",
    suggestedStep: "Run one internal deliverable end to end with an AI review step and document the outcome.",
  },
  {
    title: "MLOps discipline spreads beyond ML teams",
    summary:
      "Model deployment, evaluation and monitoring are being handled by product engineers, not only specialists.",
    whyItMatters: "Most internal AI roles now expect deployment and evaluation literacy.",
    suggestedStep: "Ship a small model or inference service with monitoring and a rollback path.",
  },
  {
    title: "Typed, contract-first APIs are the default",
    summary:
      "Schema-first contracts and end-to-end type safety are replacing hand-written integration glue.",
    whyItMatters: "Backend and frontend roles increasingly share one contract and one type system.",
    suggestedStep: "Convert one integration in your current project to a schema-validated contract.",
  },
  {
    title: "Platform and cloud cost awareness is an engineering expectation",
    summary:
      "Containerisation, infrastructure as code and cost visibility are moving into everyday delivery work.",
    whyItMatters: "Cloud and DevOps roles screen for hands-on container and pipeline experience.",
    suggestedStep: "Containerise one service and add it to an automated deployment pipeline.",
  },
  {
    title: "Security reviews shift left into delivery",
    summary:
      "Dependency scanning, secret hygiene and threat modelling are handled inside the delivery team.",
    whyItMatters: "Security literacy is now part of senior engineering assessment.",
    suggestedStep: "Add dependency and secret scanning to one repository you own.",
  },
];

const DATA: IndustryTrend[] = [
  {
    title: "Retrieval-augmented analytics reaches business reporting",
    summary:
      "Analytics teams combine warehouses with retrieval and language models for natural-language reporting.",
    whyItMatters: "Data roles increasingly expect both SQL depth and applied AI literacy.",
    suggestedStep: "Prototype a question-answering layer over one existing dataset you know well.",
  },
  {
    title: "Evaluation replaces accuracy as the headline metric",
    summary:
      "Teams invest in structured evaluation suites for models rather than single accuracy numbers.",
    whyItMatters: "Interviewers ask how you evaluate, not just what you trained.",
    suggestedStep: "Write an evaluation set for one model or report you maintain.",
  },
  {
    title: "Data contracts and quality gates become standard",
    summary: "Upstream schema contracts and automated quality checks reduce silent pipeline drift.",
    whyItMatters: "Data engineering roles screen for reliability practice, not only transformation skill.",
    suggestedStep: "Add automated freshness and schema checks to one pipeline.",
  },
  {
    title: "Feature and vector stores converge",
    summary: "Embedding storage is being folded into the same platforms that serve tabular features.",
    whyItMatters: "Understanding both keeps you eligible for ML platform work.",
    suggestedStep: "Build one small semantic search over internal documentation.",
  },
  {
    title: "Governance and lineage expectations rise",
    summary: "Regulators and customers increasingly expect traceable data lineage and access control.",
    whyItMatters: "Governance fluency separates senior analysts from reporting-only profiles.",
    suggestedStep: "Document lineage and access rules for one dataset you own.",
  },
];

const GENERAL: IndustryTrend[] = [
  {
    title: "AI literacy becomes a baseline job expectation",
    summary:
      "Across functions, teams expect people to use AI tools competently and describe their limits honestly.",
    whyItMatters: "Roles are being rewritten around what people can supervise, not only what they produce.",
    suggestedStep: "Automate one recurring task in your own workflow and measure the time saved.",
  },
  {
    title: "Internal mobility replaces external hiring for scarce skills",
    summary:
      "Organisations increasingly fill specialist roles by retraining existing staff rather than hiring outside.",
    whyItMatters: "Documented evidence of adjacent skills directly affects internal opportunities.",
    suggestedStep: "Record your last three deliverables with the skills each one demonstrated.",
  },
  {
    title: "Cross-functional product ownership widens",
    summary:
      "Delivery teams take on discovery, measurement and stakeholder communication rather than handing them off.",
    whyItMatters: "Communication evidence now weighs as heavily as technical depth in senior roles.",
    suggestedStep: "Present one project outcome to a stakeholder group and capture the feedback.",
  },
  {
    title: "Continuous, evidence-based skill assessment",
    summary:
      "Annual reviews are being supplemented with continuous, evidence-linked skill records.",
    whyItMatters: "Keeping evidence current changes which internal roles you appear for.",
    suggestedStep: "Refresh your profile projects and certifications this quarter.",
  },
  {
    title: "Privacy-first data practice becomes a differentiator",
    summary:
      "Consent, minimisation and transparency are increasingly expected in everyday data handling.",
    whyItMatters: "Roles that touch people data expect a working understanding of consent boundaries.",
    suggestedStep: "Review what public data your own profile shares and adjust your consent settings.",
  },
];

export function curatedTrends(department: string): IndustryTrend[] {
  const key = department.toLowerCase();
  if (/engineer|devops|cloud|cyber|security/.test(key)) return ENGINEERING;
  if (/data|analytic|ai|ml/.test(key)) return DATA;
  return GENERAL;
}
