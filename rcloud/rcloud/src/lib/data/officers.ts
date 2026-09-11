/** SEED SOURCE ONLY — council roster as provided. Live data lives in the DB. */

type OfficerSeed = {
  id: string;
  name: string;
  position: string;
  photoUrl: string | null;
  order: number;
};

export const officers: OfficerSeed[] = [
  { id: "gov-alvarado", name: "Angelo Alvarado", position: "Governor", photoUrl: null, order: 1 },
  { id: "vgov-perez", name: "Luigie Perez", position: "Vice Governor", photoUrl: null, order: 2 },
  { id: "bm-santos", name: "Patricia Santos", position: "Board Member — Public Administration", photoUrl: null, order: 3 },
  { id: "bm-delcarmen", name: "Joaquin Del Carmen", position: "Board Member — Psychology", photoUrl: null, order: 4 },
  { id: "bm-ricardo", name: "Josh Ricardo", position: "Board Member — Psychology", photoUrl: null, order: 5 },
  { id: "bm-victorio", name: "Lysa Victorio", position: "Board Member — Social Work", photoUrl: null, order: 6 },
  { id: "bm-clavio", name: "Maricar Clavio", position: "Board Member — Development Studies", photoUrl: null, order: 7 },
];
