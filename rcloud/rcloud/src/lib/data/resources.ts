/**
 * SEED SOURCE ONLY — the original rCloud repository content
 * (https://rcloud-cssp.carrd.co), preserved one-to-one.
 * The live source of truth is the database; this file seeds it.
 */

type ResourceSeed = {
  id: string;
  title: string;
  description: string;
  url: string;
  internal?: boolean;
  category: string;
  icon: string;
  tags: string[];
};

export const resources: ResourceSeed[] = [
  { id: "crisis-hotlines", title: "Crisis Hotlines", description: "Free and confidential mental health and crisis support lines in the Philippines, available when you need someone to talk to.", url: "https://findahelpline.com/countries/ph/topics/suicidal-thoughts", category: "Safety & Welfare", icon: "heart", tags: ["mental health", "help", "hotline", "wellbeing"] },
  { id: "lsc-directory", title: "CSSP LSC Directory", description: "Official directory of the CSSP Local Student Council so you always know who to reach out to.", url: "https://www.facebook.com/share/p/1715Rtfvpj/", category: "Directories", icon: "users", tags: ["contact", "council", "directory"] },
  { id: "resolutions-projects", title: "Resolutions and Projects", description: "Council resolutions and the projects they power — track what has been approved, ongoing and completed.", url: "/projects", internal: true, category: "Council Documents", icon: "chart", tags: ["resolutions", "projects", "tracker"] },
  { id: "narrative-report-template", title: "Narrative Report Template", description: "The official template for writing narrative reports on council and committee activities.", url: "https://docs.google.com/document/d/12KX3q1DOcgF_fF5qxo2I-TWkNT12Zgio1_RYcXGUAAo/edit?usp=sharing", category: "Templates", icon: "file", tags: ["template", "report", "events"] },
  { id: "executive-documents", title: "Executive Documents", description: "Memoranda, orders and official issuances from the executive side of the council.", url: "https://drive.google.com/drive/folders/1DzkBxrmJfIKxY1114CsZyCpphhNf-ZOq", category: "Council Documents", icon: "folder", tags: ["executive", "memoranda", "documents"] },
  { id: "legislative-documents", title: "Legislative Documents", description: "Bills, resolutions and legislative records of the council, open for every student to read.", url: "https://drive.google.com/drive/folders/1o4EMzmKZiFA49XWsYIiUT4t0dNrSgJzx?usp=sharing", category: "Council Documents", icon: "scale", tags: ["legislative", "bills", "resolutions"] },
  { id: "financial-reports", title: "Financial Reports", description: "Liquidation and financial reports showing how council funds were received and spent.", url: "https://drive.google.com/drive/folders/1xFEU7vW2mLKqIZBvmvJrkRGLZu1WH5ea?usp=sharing", category: "Financial", icon: "coins", tags: ["budget", "finance", "liquidation", "transparency"] },
  { id: "minutes-of-the-meeting", title: "Minutes of the Meeting", description: "Official minutes of council sessions and meetings, archived for reference.", url: "https://drive.google.com/drive/folders/1nqOiRUTk0ci9okuOgIT_RzjLfbq2JNMp?usp=drive_link", category: "Council Documents", icon: "clock", tags: ["minutes", "meetings", "records"] },
  { id: "sg-constitution", title: "SG Constitution and By-Laws", description: "The constitution and by-laws governing the student government of Bulacan State University.", url: "https://drive.google.com/file/d/1MPSAnh7GRifkgpGhtUmYWAsxLgwj6OV6/view?usp=sharing", category: "Governance", icon: "book", tags: ["constitution", "by-laws", "student government"] },
  { id: "bulsu-handbook", title: "BulSU Student Handbook", description: "The official student handbook of Bulacan State University — policies, rights and responsibilities.", url: "https://drive.google.com/file/d/1oNFcUmRBdIeCoKhiEXEy_1K8rhV6oQ-L/view?usp=sharing", category: "Governance", icon: "book", tags: ["handbook", "policies", "bulsu"] },
  { id: "magna-carta", title: "Magna Carta of Students (MCOS)", description: "The charter of student rights and freedoms that every BulSU student can invoke.", url: "https://drive.google.com/file/d/19XD4Er7i9VdZhrcDE3yduwpU12hVhTTW/view?usp=sharing", category: "Governance", icon: "book", tags: ["rights", "magna carta", "mcos"] },
  { id: "cssp-lsc-code", title: "CSSP LSC Code", description: "The internal code of the CSSP Local Student Council — how the council organizes and operates.", url: "https://drive.google.com/file/d/1wpUSCBsGja3YFiwn-KmBh0ddJOlXplBb/view?usp=drive_link", category: "Governance", icon: "scale", tags: ["code", "council", "governance"] },
  { id: "academic-calendar", title: "BulSU Academic Calendar", description: "The current academic calendar of Bulacan State University — key dates, enrollment and breaks.", url: "https://www.facebook.com/share/p/15vpVVmM76/?mibextid=wwXIfr", category: "Campus Life", icon: "calendar", tags: ["calendar", "dates", "enrollment"] },
  { id: "classroom-officers", title: "Classroom Officers Directory", description: "A living spreadsheet of classroom officers across CSSP programs for faster coordination.", url: "https://docs.google.com/spreadsheets/d/1iv6k2LRNHt1pJ5ODwIceRmgYrMawM-mA/edit?usp=drivesdk&ouid=107773750213416118125&rtpof=true&sd=true", category: "Directories", icon: "users", tags: ["classroom", "officers", "directory"] },
];
