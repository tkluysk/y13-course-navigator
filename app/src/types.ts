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
  entry_text: string;
  donation_text: string;
  donation_amount: string | null;
  also_listed_under: string[];
  required_credits: number | null;
  explicit_prerequisites: string[];
  implied_prerequisite: string | null;
  alternative_category: string | null;
  alternative_faculty: string | null;
}

export interface LineDefinition {
  line: number;
  codes: string[];
}
