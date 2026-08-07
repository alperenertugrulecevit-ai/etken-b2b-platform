export type CompetitorProductSearchCandidate = {
  title: string;
  productUrl: string;
  score: number;
  matchedTerms: string[];
};

export type CompetitorProductSearchResult = {
  success: boolean;
  message: string;

  searchUrl: string | null;
  candidates: CompetitorProductSearchCandidate[];
};