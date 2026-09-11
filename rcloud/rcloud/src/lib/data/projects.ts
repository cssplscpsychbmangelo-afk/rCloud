/** SEED SOURCE ONLY — initial project records. Live data lives in the DB. */

type ProjectSeed = {
  id: string;
  name: string;
  description: string;
  status: "Pending" | "Ongoing" | "Completed" | "Cancelled";
  budget: number;
  utilized: number;
};

export const projects: ProjectSeed[] = [
  { id: "flood-response", name: "Apektado ng Baha Response Drive", description: "Relief and assistance coordination for CSSP students affected by flooding in nearby communities.", status: "Ongoing", budget: 25_000, utilized: 14_500 },
  { id: "mental-health-week", name: "Mental Health Awareness Week", description: "A week of talks, booths and peer-support activities promoting student wellbeing across CSSP.", status: "Completed", budget: 15_000, utilized: 14_200 },
  { id: "rcloud-portal", name: "rCloud Transparency Portal", description: "This portal — a permanent home for council documents, budgets and constituency data.", status: "Ongoing", budget: 5_000, utilized: 1_800 },
  { id: "community-pantry", name: "CSSP Community Pantry", description: "A student-run pantry offering free essentials to constituents who need them.", status: "Pending", budget: 20_000, utilized: 0 },
  { id: "sports-fest", name: "Inter-Class Sports Fest", description: "Planned inter-class tournament; postponed and cancelled for this school year.", status: "Cancelled", budget: 30_000, utilized: 2_400 },
];
