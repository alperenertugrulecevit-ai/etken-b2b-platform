export type CompetitorMappingActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const INITIAL_COMPETITOR_MAPPING_ACTION_STATE: CompetitorMappingActionState =
  {
    status: "idle",
    message: "",
  };