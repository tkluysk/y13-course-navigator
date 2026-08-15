import type { LineDefinition } from "../types";

// Transcribed from "Planning Page for Study in NCEA Level 3 2027 V1"
// (Wellington High School timetable-line planning sheet).
export const LINES: LineDefinition[] = [
  {
    line: 1,
    codes: [
      "CHI335", "FIN330", "FLM335", "FTE335", "FTX335", "HCL335",
      "JRN335", "MAC335", "MAI035", "MAS335", "MUS335", "NUM000",
      "PED334", "PWK334",
    ],
  },
  {
    line: 2,
    codes: [
      "ASC335", "BIO335", "CLS335", "DVC335", "ELT335", "ENC335",
      "GEO335", "JRN335", "ODE335", "PHO335", "PHY335", "PWD335",
      "TOI003",
    ],
  },
  {
    line: 3,
    codes: [
      "ANI335", "APR335", "CHE335", "ENG335", "ENP335", "ENW335",
      "GDD335", "HOS334", "LIT000", "MAC335", "MAS335", "PER000",
      "PHO335", "PWS020", "SPS335", "TAH000",
    ],
  },
  {
    line: 4,
    codes: [
      "APT335", "CHE335", "CSC335", "ENP335", "ESS335", "GEO335",
      "HED335", "HIS335", "HOS334", "MAT335", "PSY335", "PWS020",
      "SON334",
    ],
  },
  {
    line: 5,
    codes: [
      "BIO335", "DTE355", "ECO335", "ENG335", "ENW335", "FLM335",
      "JPN335", "MEG335", "NUM000", "ODE335", "PSY335", "SPA335",
      "TMA234",
    ],
  },
  {
    line: 6,
    codes: [
      "BAR020", "BIO335", "CLS335", "DES335", "DRA335", "ENG335",
      "ENP335", "HIS335", "LIT000", "MAC335", "MAT335", "PHY335",
      "PSY335", "PWS020", "SOC335",
    ],
  },
];

// Highlighted on the actual planning sheet: one course chosen per line
// (Line 5 was left blank on the sheet).
export const CURRENT_PICKS: Record<number, string | null> = {
  1: "FTX335",
  2: "BIO335",
  3: "MAS335",
  4: "CHE335",
  5: null,
  6: "DES335",
};

// Transcribed from the Y12 (Level 2, 2026) planning sheet.
export const LINES_Y12: LineDefinition[] = [
  {
    line: 1,
    codes: [
      "APT223", "BIO223", "CHE223", "CHI223", "CLE223", "CSC223",
      "ENG223", "ENS223", "FTE223", "HKO100", "HOS223", "MAI035",
      "MAT223", "NUM000", "ODE223/ODI223*", "PHO223",
    ],
  },
  {
    line: 2,
    codes: [
      "BIO223", "CHE223", "CSC223", "ECO223", "ENG223", "ENR223",
      "ENW223", "FIN223", "FTX223", "GEO223", "HCL223", "LSS000",
      "MAT223", "PED223", "PSY223", "PWS020", "TOI003",
    ],
  },
  {
    line: 3,
    codes: [
      "APR223", "BIO223", "CHE223", "CLE223", "ENG223", "EPB223",
      "ESS223", "JPN223", "MAT223", "MTL223", "MUS223", "ODE223/ODI223*",
      "PER000", "PHO223", "PWS020", "SOC223", "TAH000",
    ],
  },
  {
    line: 4,
    codes: [
      "ANI223", "BIO223", "DVC223", "ECO223", "ELT223", "ENW223",
      "EPB223", "FLM223", "JRN223", "MAT223", "ODE223/ODI223*", "PHY223",
      "PSY223", "SPS223",
    ],
  },
  {
    line: 5,
    codes: [
      "APT223", "DES223", "ENG223", "ENR223", "FLM223", "HIS223",
      "HOS223", "MAO223", "MAT223", "MEG223", "MUS223", "NUM000",
      "ODE223/ODI223*", "PHY223", "SPA223",
    ],
  },
  {
    line: 6,
    codes: [
      "ASC223", "BAR020", "BIO223", "DRA223", "DTW223", "ENG223",
      "FCM220", "GDD223", "HED223", "LIT000", "MAT223", "MTL223",
      "PHY223", "PSY223", "PWD223", "PWS223", "SON223",
    ],
  },
];

// Highlighted on the Y12 planning sheet.
export const CURRENT_PICKS_Y12: Record<number, string | null> = {
  1: "MAT223",
  2: "FTX223",
  3: "CHE223",
  4: "ANI223",
  5: "ENG223",
  6: "BIO223",
};
