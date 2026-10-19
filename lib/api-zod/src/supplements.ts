/**
 * Program supplement questions, keyed by university shortName.
 *
 * This is the single source of truth: the API server uses it to enforce that
 * every `required` question is answered before an application can be
 * submitted, and the web app uses it to render the supplement form.
 */
export interface SupplementQuestion {
  key: string;
  question: string;
  required: boolean;
  maxWords: number;
}

export const SUPPLEMENT_QUESTIONS: Record<string, SupplementQuestion[]> = {
  LUMS: [
    { key: "why_lums", question: "Why do you want to pursue your education at LUMS? How does LUMS align with your academic and career goals?", required: true, maxWords: 350 },
    { key: "leadership", question: "Describe a leadership role or experience that has shaped your character. What did you learn from it?", required: true, maxWords: 300 },
    { key: "preferred_dept", question: "Which department or program area interests you most at LUMS, and why?", required: false, maxWords: 200 },
  ],
  NUST: [
    { key: "why_nust", question: "Why do you want to join NUST? How will a degree from NUST help you achieve your goals?", required: true, maxWords: 350 },
    { key: "stem_project", question: "Describe a STEM project, research initiative, or technical achievement you are proud of.", required: false, maxWords: 300 },
    { key: "career_vision", question: "Where do you see yourself in 10 years? How does your chosen program align with this vision?", required: true, maxWords: 250 },
  ],
  IBA: [
    { key: "why_iba", question: "Why have you chosen IBA for your business education? What specific aspects of IBA's program appeal to you?", required: true, maxWords: 350 },
    { key: "entrepreneurial", question: "Describe an entrepreneurial, social, or innovative initiative you have undertaken or would like to pursue.", required: true, maxWords: 300 },
  ],
  "FAST-NU": [
    { key: "why_fast", question: "Why do you want to study at FAST-NUCES? What draws you to a technology-focused education?", required: true, maxWords: 300 },
    { key: "coding_exp", question: "Describe any programming projects, hackathons, or competitions you have participated in. Include technologies used.", required: false, maxWords: 300 },
  ],
  UET: [
    { key: "why_uet", question: "Why do you want to study Engineering at UET? What specifically draws you to this institution?", required: true, maxWords: 300 },
    { key: "engineering_interest", question: "Describe your interest in your chosen engineering discipline and the problems you hope to solve.", required: false, maxWords: 250 },
  ],
  "UET Lahore": [
    { key: "why_uet", question: "Why do you want to study Engineering at UET? What specifically draws you to this institution?", required: true, maxWords: 300 },
    { key: "engineering_interest", question: "Describe your interest in your chosen engineering discipline and the problems you hope to solve.", required: false, maxWords: 250 },
  ],
  "COMSATS": [
    { key: "why_comsats", question: "Why have you chosen COMSATS for higher education? What are your expectations from the program?", required: true, maxWords: 300 },
    { key: "research_interest", question: "Describe any research interest or scientific curiosity you have developed.", required: false, maxWords: 250 },
  ],
};

export const DEFAULT_SUPPLEMENT_QUESTIONS: SupplementQuestion[] = [
  { key: "why_university", question: "Why do you want to study at this university? What unique opportunities does it offer you?", required: true, maxWords: 350 },
  { key: "program_choice", question: "Why did you choose this specific program? How does it align with your academic interests and career goals?", required: false, maxWords: 250 },
];

export function getSupplementQuestions(shortName: string | null | undefined): SupplementQuestion[] {
  if (!shortName) return DEFAULT_SUPPLEMENT_QUESTIONS;
  return SUPPLEMENT_QUESTIONS[shortName] ?? DEFAULT_SUPPLEMENT_QUESTIONS;
}

export function countWords(text: string | null | undefined): number {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}
