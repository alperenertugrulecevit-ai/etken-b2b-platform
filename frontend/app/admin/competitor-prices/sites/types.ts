export type CompetitorSiteActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const INITIAL_COMPETITOR_SITE_ACTION_STATE: CompetitorSiteActionState =
  {
    status: "idle",
    message: "",
  };