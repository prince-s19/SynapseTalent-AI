/**
 * Lightweight skill adjacency map.
 *
 * Read as: TRANSFERS_INTO[target] lists skills that partially transfer INTO
 * the target skill, with an adjacency confidence between 0 and 1.
 *
 * Transferability is NOT equivalence. A transferable skill is always labelled
 * "Transferable Skill", never "Same Skill", and is discounted before scoring.
 */
export const TRANSFER_DISCOUNT = 0.8;

export interface AdjacencyEdge {
  from: string;
  confidence: number;
}

export const TRANSFERS_INTO: Record<string, AdjacencyEdge[]> = {
  Python: [
    { from: "SQL", confidence: 0.55 },
    { from: "JavaScript", confidence: 0.5 },
    { from: "Data Analysis", confidence: 0.6 },
    { from: "Backend Development", confidence: 0.55 },
  ],
  "Machine Learning": [
    { from: "Deep Learning", confidence: 0.85 },
    { from: "Python", confidence: 0.7 },
    { from: "Statistics", confidence: 0.7 },
    { from: "Data Analysis", confidence: 0.6 },
  ],
  "Deep Learning": [
    { from: "Machine Learning", confidence: 0.8 },
    { from: "PyTorch", confidence: 0.85 },
    { from: "TensorFlow", confidence: 0.8 },
  ],
  PyTorch: [
    { from: "Deep Learning", confidence: 0.8 },
    { from: "TensorFlow", confidence: 0.85 },
    { from: "Machine Learning", confidence: 0.6 },
  ],
  TensorFlow: [
    { from: "PyTorch", confidence: 0.85 },
    { from: "Deep Learning", confidence: 0.8 },
  ],
  NLP: [
    { from: "Machine Learning", confidence: 0.7 },
    { from: "Deep Learning", confidence: 0.7 },
    { from: "Prompt Engineering", confidence: 0.6 },
  ],
  "Prompt Engineering": [
    { from: "NLP", confidence: 0.6 },
    { from: "Machine Learning", confidence: 0.5 },
  ],
  MLOps: [
    { from: "Model Deployment", confidence: 0.8 },
    { from: "DevOps", confidence: 0.75 },
    { from: "CI/CD", confidence: 0.7 },
    { from: "Docker", confidence: 0.7 },
    { from: "Kubernetes", confidence: 0.6 },
  ],
  "Model Deployment": [
    { from: "MLOps", confidence: 0.8 },
    { from: "Docker", confidence: 0.7 },
    { from: "Backend Development", confidence: 0.5 },
    { from: "API Development", confidence: 0.5 },
  ],
  "System Design": [
    { from: "Distributed Systems", confidence: 0.8 },
    { from: "Frontend Architecture", confidence: 0.6 },
    { from: "Backend Development", confidence: 0.6 },
    { from: "Systems Programming", confidence: 0.6 },
  ],
  "Distributed Systems": [
    { from: "System Design", confidence: 0.75 },
    { from: "Backend Development", confidence: 0.55 },
  ],
  "Frontend Architecture": [
    { from: "React", confidence: 0.85 },
    { from: "UI Engineering", confidence: 0.7 },
    { from: "TypeScript", confidence: 0.6 },
  ],
  "Backend Development": [
    { from: "Node.js", confidence: 0.8 },
    { from: "Go", confidence: 0.8 },
    { from: "Rust", confidence: 0.7 },
    { from: "Python", confidence: 0.65 },
    { from: "API Development", confidence: 0.8 },
  ],
  "API Development": [
    { from: "Backend Development", confidence: 0.8 },
    { from: "Node.js", confidence: 0.7 },
    { from: "Python", confidence: 0.6 },
  ],
  "Systems Programming": [
    { from: "Rust", confidence: 0.9 },
    { from: "Go", confidence: 0.6 },
  ],
  Rust: [
    { from: "Systems Programming", confidence: 0.7 },
    { from: "Go", confidence: 0.6 },
  ],
  Go: [
    { from: "Rust", confidence: 0.6 },
    { from: "Node.js", confidence: 0.5 },
  ],
  "Node.js": [
    { from: "JavaScript", confidence: 0.75 },
    { from: "TypeScript", confidence: 0.6 },
    { from: "Backend Development", confidence: 0.75 },
  ],
  React: [
    { from: "JavaScript", confidence: 0.7 },
    { from: "TypeScript", confidence: 0.6 },
    { from: "UI Engineering", confidence: 0.7 },
  ],
  TypeScript: [
    { from: "JavaScript", confidence: 0.85 },
    { from: "React", confidence: 0.6 },
  ],
  JavaScript: [{ from: "TypeScript", confidence: 0.9 }],
  "UI Engineering": [
    { from: "React", confidence: 0.75 },
    { from: "Frontend Architecture", confidence: 0.7 },
    { from: "Accessibility", confidence: 0.6 },
  ],
  Accessibility: [
    { from: "UI Engineering", confidence: 0.7 },
    { from: "React", confidence: 0.5 },
  ],
  Docker: [
    { from: "Kubernetes", confidence: 0.85 },
    { from: "DevOps", confidence: 0.7 },
    { from: "CI/CD", confidence: 0.6 },
  ],
  Kubernetes: [
    { from: "Docker", confidence: 0.7 },
    { from: "DevOps", confidence: 0.7 },
  ],
  Terraform: [
    { from: "AWS", confidence: 0.6 },
    { from: "DevOps", confidence: 0.6 },
    { from: "CI/CD", confidence: 0.5 },
  ],
  "CI/CD": [
    { from: "DevOps", confidence: 0.8 },
    { from: "Docker", confidence: 0.6 },
  ],
  DevOps: [
    { from: "CI/CD", confidence: 0.8 },
    { from: "Kubernetes", confidence: 0.7 },
    { from: "Docker", confidence: 0.65 },
    { from: "Incident Response", confidence: 0.5 },
  ],
  AWS: [
    { from: "Cloud Architecture", confidence: 0.8 },
    { from: "Terraform", confidence: 0.6 },
    { from: "DevOps", confidence: 0.6 },
  ],
  "Cloud Architecture": [
    { from: "AWS", confidence: 0.85 },
    { from: "Kubernetes", confidence: 0.6 },
    { from: "System Design", confidence: 0.6 },
  ],
  SQL: [
    { from: "Data Analysis", confidence: 0.7 },
    { from: "Data Engineering", confidence: 0.8 },
  ],
  "Data Analysis": [
    { from: "SQL", confidence: 0.75 },
    { from: "Statistics", confidence: 0.7 },
    { from: "Product Analytics", confidence: 0.7 },
    { from: "Data Visualization", confidence: 0.6 },
  ],
  "Data Engineering": [
    { from: "SQL", confidence: 0.75 },
    { from: "Python", confidence: 0.6 },
  ],
  "Data Visualization": [
    { from: "Data Analysis", confidence: 0.7 },
    { from: "Product Analytics", confidence: 0.6 },
  ],
  Statistics: [
    { from: "Data Analysis", confidence: 0.65 },
    { from: "Machine Learning", confidence: 0.6 },
  ],
  "Product Analytics": [
    { from: "Data Analysis", confidence: 0.75 },
    { from: "Data Visualization", confidence: 0.6 },
    { from: "SQL", confidence: 0.6 },
  ],
  "Technical Leadership": [
    { from: "Mentoring", confidence: 0.8 },
    { from: "Project Management", confidence: 0.6 },
    { from: "Communication", confidence: 0.5 },
  ],
  Mentoring: [
    { from: "Technical Leadership", confidence: 0.8 },
    { from: "Communication", confidence: 0.5 },
  ],
  "Product Strategy": [
    { from: "Roadmapping", confidence: 0.75 },
    { from: "Product Analytics", confidence: 0.6 },
    { from: "User Research", confidence: 0.6 },
    { from: "Stakeholder Management", confidence: 0.6 },
  ],
  Roadmapping: [
    { from: "Product Strategy", confidence: 0.75 },
    { from: "Project Management", confidence: 0.75 },
  ],
  "Stakeholder Management": [
    { from: "Communication", confidence: 0.75 },
    { from: "Project Management", confidence: 0.7 },
  ],
  "Project Management": [
    { from: "Roadmapping", confidence: 0.7 },
    { from: "Stakeholder Management", confidence: 0.7 },
  ],
  Communication: [
    { from: "Stakeholder Management", confidence: 0.7 },
    { from: "Mentoring", confidence: 0.6 },
  ],
  "User Research": [
    { from: "Product Analytics", confidence: 0.5 },
    { from: "Communication", confidence: 0.5 },
  ],
  "Threat Modeling": [
    { from: "Application Security", confidence: 0.8 },
    { from: "System Design", confidence: 0.5 },
  ],
  "Application Security": [
    { from: "Threat Modeling", confidence: 0.8 },
    { from: "Incident Response", confidence: 0.6 },
  ],
  "Incident Response": [
    { from: "Application Security", confidence: 0.6 },
    { from: "DevOps", confidence: 0.55 },
  ],
  "Problem Solving": [
    { from: "System Design", confidence: 0.5 },
    { from: "Data Analysis", confidence: 0.5 },
  ],
};

/** Flat list of adjacency pairs, for the Skill Intelligence page. */
export function adjacencyPairs(): Array<{ from: string; to: string; confidence: number }> {
  const pairs: Array<{ from: string; to: string; confidence: number }> = [];
  for (const [to, edges] of Object.entries(TRANSFERS_INTO)) {
    for (const edge of edges) {
      pairs.push({ from: edge.from, to, confidence: edge.confidence });
    }
  }
  return pairs.sort((a, b) => b.confidence - a.confidence || a.from.localeCompare(b.from));
}
