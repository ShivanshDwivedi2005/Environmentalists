export type Level = "state" | "district" | "block" | "village";
export const LEVELS: Level[] = ["state", "district", "block", "village"];

export type Place = { name: string; score: number; reports: number; trend: number; children?: Place[] };

// Dirtiness score 0 (clean) – 100 (severely polluted)
export const geo: Place[] = [
  { name: "India", score: 64, reports: 48210, trend: -2.1, children: [
    { name: "Uttar Pradesh", score: 72, reports: 9120, trend: 1.4, children: [
      { name: "Lucknow", score: 69, reports: 2210, trend: -0.8, children: [
        { name: "Chinhat", score: 74, reports: 640, trend: 2.2, children: [
          { name: "Malhaur", score: 81, reports: 120, trend: 3.1 },
          { name: "Ujariyaon", score: 66, reports: 88, trend: -1.2 },
          { name: "Juggaur", score: 58, reports: 64, trend: -4.0 },
        ]},
        { name: "Mohanlalganj", score: 61, reports: 410, trend: -1.9, children: [
          { name: "Nigohan", score: 55, reports: 70, trend: -2.5 },
          { name: "Gosainganj", score: 63, reports: 92, trend: 0.4 },
        ]},
      ]},
      { name: "Kanpur Nagar", score: 78, reports: 1980, trend: 2.7, children: [
        { name: "Bilhaur", score: 71, reports: 300, trend: 1.0, children: [{ name: "Arual", score: 69, reports: 41, trend: 0.2 }] },
      ]},
      { name: "Varanasi", score: 66, reports: 1640, trend: -3.4 },
    ]},
    { name: "Maharashtra", score: 61, reports: 8740, trend: -1.1, children: [
      { name: "Mumbai Suburban", score: 70, reports: 3100, trend: 0.6 },
      { name: "Pune", score: 52, reports: 2010, trend: -2.8 },
      { name: "Nagpur", score: 57, reports: 980, trend: -0.9 },
    ]},
    { name: "Delhi NCT", score: 79, reports: 7300, trend: 0.9, children: [
      { name: "East Delhi", score: 83, reports: 1900, trend: 1.8 },
      { name: "New Delhi", score: 58, reports: 1200, trend: -2.2 },
    ]},
    { name: "Kerala", score: 38, reports: 3400, trend: -4.6 },
    { name: "Sikkim", score: 22, reports: 410, trend: -5.1 },
    { name: "Bihar", score: 70, reports: 5100, trend: 0.3 },
  ]},
];

export const indiaStates: Place[] = geo.find((place) => place.name === "India")?.children ?? [];

export function rankingAreas(path: Place[]): Place[] {
  return path.length ? path.at(-1)?.children ?? [] : indiaStates;
}

export const reports = [
  { id: 1, place: "Malhaur, Lucknow", type: "Land", score: 84, time: "12 min ago", note: "Roadside dumping near railway crossing" },
  { id: 2, place: "Yamuna Ghat, East Delhi", type: "Water", score: 91, time: "38 min ago", note: "Foam & plastic film on river surface" },
  { id: 3, place: "Juhu, Mumbai", type: "Land", score: 62, time: "1 h ago", note: "Post-festival debris on beach" },
  { id: 4, place: "Gomti, Lucknow", type: "Water", score: 77, time: "2 h ago", note: "Drain outfall, dark discharge" },
  { id: 5, place: "Kothrud, Pune", type: "Land", score: 41, time: "3 h ago", note: "Overflowing community bin" },
];

export const cleanups = [
  { id: 1, place: "Gomti Riverfront, Lucknow", date: "Sat, 17 Oct", time: "07:00 – 10:00", joined: 23, need: 40, lead: "Aarav S." },
  { id: 2, place: "Juhu Beach, Mumbai", date: "Sun, 18 Oct", time: "06:30 – 09:00", joined: 61, need: 80, lead: "Meera K." },
  { id: 3, place: "Malhaur Crossing, Lucknow", date: "Sun, 18 Oct", time: "16:00 – 18:00", joined: 8, need: 15, lead: "Rohit V." },
  { id: 4, place: "Sanjay Lake, East Delhi", date: "Sat, 24 Oct", time: "07:30 – 11:00", joined: 34, need: 50, lead: "Fatima N." },
];

export const volunteers = [
  { name: "Meera Kulkarni", city: "Mumbai", drives: 42, impact: 96, delta: 38 },
  { name: "Aarav Singh", city: "Lucknow", drives: 31, impact: 91, delta: 33 },
  { name: "Fatima Noor", city: "Delhi", drives: 27, impact: 88, delta: 29 },
  { name: "Rohit Verma", city: "Lucknow", drives: 19, impact: 82, delta: 24 },
  { name: "Ananya Iyer", city: "Pune", drives: 15, impact: 79, delta: 21 },
];

export const orgs = [
  { name: "River Keepers Collective", focus: "Water", region: "Ganga basin", since: 2011, desc: "Riverbank cleanups, drain monitoring, and citizen water-testing kits." },
  { name: "Clean Coast Foundation", focus: "Coastal", region: "Western coast", since: 2016, desc: "Weekly beach drives and marine-litter data for policy makers." },
  { name: "Green Lane Trust", focus: "Land", region: "North India", since: 2009, desc: "Ward-level waste segregation programs with municipal partners." },
  { name: "Air & Earth Initiative", focus: "Air / Land", region: "Delhi NCR", since: 2018, desc: "Construction dust audits and stubble-burning alternatives." },
  { name: "Lake Revival Network", focus: "Water", region: "Bengaluru & Pune", since: 2014, desc: "Restores urban lakes through desilting and wetland planting." },
  { name: "Zero Waste Villages", focus: "Land", region: "Rural Bihar & UP", since: 2019, desc: "Composting and plastic buy-back centres in villages." },
];

export const municipal = [
  { area: "Lucknow", body: "Lucknow Municipal Corporation", email: "commissioner@lmc.example.gov.in", phone: "0522-000-0000", open: 132 },
  { area: "East Delhi", body: "Municipal Corporation of Delhi – Shahdara South", email: "dc.shahdara@mcd.example.gov.in", phone: "011-000-0000", open: 208 },
  { area: "Mumbai Suburban", body: "Brihanmumbai Municipal Corporation – K/W Ward", email: "ac.kw@bmc.example.gov.in", phone: "022-000-0000", open: 97 },
  { area: "Pune", body: "Pune Municipal Corporation – Kothrud", email: "kothrud@pmc.example.gov.in", phone: "020-000-0000", open: 41 },
  { area: "Kanpur Nagar", body: "Kanpur Nagar Nigam", email: "nagarayukt@knn.example.gov.in", phone: "0512-000-0000", open: 116 },
];

export const water = [
  { name: "Plastic & solid waste", v: 38 }, { name: "Sewage discharge", v: 29 },
  { name: "Industrial effluent", v: 21 }, { name: "Agricultural runoff", v: 12 },
];
export const land = [
  { name: "Open dumping", v: 41 }, { name: "Construction debris", v: 22 },
  { name: "Plastic litter", v: 24 }, { name: "E-waste & hazardous", v: 13 },
];

export function scoreTone(s: number) {
  if (s >= 75) return { label: "Severe", cls: "bg-destructive text-destructive-foreground" };
  if (s >= 55) return { label: "High", cls: "bg-primary text-primary-foreground" };
  if (s >= 35) return { label: "Moderate", cls: "bg-ochre text-ink" };
  return { label: "Clean", cls: "bg-accent text-accent-foreground" };
}
