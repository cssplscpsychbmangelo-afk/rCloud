/** SEED SOURCE ONLY — initial announcements. Live data lives in the DB. */

type AnnouncementSeed = {
  id: string;
  title: string;
  body: string;
  date: string;
  tag: string;
};

export const announcements: AnnouncementSeed[] = [
  { id: "general-assembly", title: "2nd Semester General Assembly", body: "Save the date — the council will present its accomplishments and budget report to all CSSP students.", date: "2026-09-18", tag: "Advisory" },
  { id: "financial-posting", title: "Financial reports now posted", body: "The latest liquidation reports are available under Resources → Financial Reports.", date: "2026-09-05", tag: "Transparency" },
  { id: "flood-assistance", title: "Flood assistance form open", body: "Students affected by recent flooding may coordinate with their classroom officers for assistance.", date: "2026-08-28", tag: "Constituency" },
];
