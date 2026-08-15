export interface Course {
  code: string;
  level: string;
  title: string;
  faculty: string | null;
  ue: boolean;
  scholarship: boolean;
  description: string;
  pathway: string;
  components: string[];
  external_credits: number | null;
  internal_credits: number | null;
  metrics_raw: string;
  also_listed_under: string[];
}

export interface LineDefinition {
  line: number;
  codes: string[];
}
