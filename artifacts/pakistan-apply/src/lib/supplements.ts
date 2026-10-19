// Supplement questions live in the shared API contract package so the server
// can enforce required answers with the exact same definitions the UI renders.
export {
  SUPPLEMENT_QUESTIONS,
  DEFAULT_SUPPLEMENT_QUESTIONS,
  getSupplementQuestions,
  type SupplementQuestion,
} from "@workspace/api-zod";
