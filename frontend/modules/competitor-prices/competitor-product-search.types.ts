export type CompetitorProductSearchConfidence =
  | "HIGH"
  | "REVIEW"
  | "REJECTED";

export type CompetitorProductSearchCandidate = {
  title: string;
  productUrl: string;

  score: number;
  matchedTerms: string[];

  confidence: CompetitorProductSearchConfidence;

  variantMatched: boolean;

  rejectionReasons: string[];
};

export type CompetitorProductSearchResult = {
  success: boolean;
  message: string;

  searchUrl: string | null;

  candidates: CompetitorProductSearchCandidate[];
};