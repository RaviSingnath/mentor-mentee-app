/**
 * Demo community for the "load demo data" admin action.
 *
 * 70 people, split evenly between two domains:
 *   tech     -> 10 mentees + 25 mentors
 *   business -> 10 mentees + 25 mentors
 * Topic names are canonical display strings; the database normalises them to slugs.
 * Availability is written in each person's LOCAL time ("Mon 18-20" = Monday 18:00 to 20:00).
 * Everything here is invented; none of these are real people.
 */
import type { AvailabilitySlot } from "@/lib/matching/availability";
import type { ExperienceLevel } from "@/lib/matching/matching";

export type SeedDomain = "tech" | "business";

export interface SeedProfile {
  key: string; // stable id, also the email local part: demo-<key>@<domain>
  domain: SeedDomain;
  fullName: string;
  role: "mentor" | "mentee";
  bio: string;
  experienceLevel: ExperienceLevel;
  city: string;
  state: string;
  country: string;
  timezone: string;
  languages: string[];
  skills: string[];
  goals: string[];
  interests: string[];
  availability: AvailabilitySlot[];
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------
const TECH = {
  react: "React",
  ts: "TypeScript",
  node: "Node.js",
  python: "Python",
  ml: "Machine Learning",
  analysis: "Data Analysis",
  dataEng: "Data Engineering",
  systemDesign: "System Design",
  cloud: "Cloud Computing",
  devops: "DevOps",
  mobile: "Mobile Development",
  ux: "UX Design",
  pm: "Product Management",
  security: "Cybersecurity",
  qa: "QA and Testing",
} as const;

const BIZ = {
  fundraising: "Fundraising",
  startup: "Startup Strategy",
  marketing: "Marketing",
  sales: "Sales",
  finance: "Financial Modeling",
  leadership: "Leadership",
  operations: "Operations",
  speaking: "Public Speaking",
  negotiation: "Negotiation",
  branding: "Branding",
  career: "Career Growth",
  projects: "Project Management",
  hiring: "Hiring and Talent",
  ecommerce: "E-commerce",
  customer: "Customer Success",
} as const;

const INT = {
  oss: "Open Source",
  aiEthics: "AI Ethics",
  fintech: "Fintech",
  health: "Healthtech",
  edtech: "Edtech",
  climate: "Climate Tech",
  remote: "Remote Work",
  women: "Women in Tech",
  gaming: "Gaming",
  writing: "Writing",
  sustainability: "Sustainability",
} as const;

const t = TECH;
const b = BIZ;
const i = INT;

// ---------------------------------------------------------------------------
// Places (city, state, country, IANA timezone)
// ---------------------------------------------------------------------------
const PLACES = {
  blr: { city: "Bengaluru", state: "Karnataka", country: "India", timezone: "Asia/Kolkata" },
  mum: { city: "Mumbai", state: "Maharashtra", country: "India", timezone: "Asia/Kolkata" },
  pune: { city: "Pune", state: "Maharashtra", country: "India", timezone: "Asia/Kolkata" },
  del: { city: "New Delhi", state: "Delhi", country: "India", timezone: "Asia/Kolkata" },
  lon: { city: "London", state: "England", country: "United Kingdom", timezone: "Europe/London" },
  ber: { city: "Berlin", state: "Berlin", country: "Germany", timezone: "Europe/Berlin" },
  nyc: { city: "New York", state: "New York", country: "United States", timezone: "America/New_York" },
  sf: { city: "San Francisco", state: "California", country: "United States", timezone: "America/Los_Angeles" },
  tor: { city: "Toronto", state: "Ontario", country: "Canada", timezone: "America/Toronto" },
  sin: { city: "Singapore", state: "Singapore", country: "Singapore", timezone: "Asia/Singapore" },
  syd: { city: "Sydney", state: "New South Wales", country: "Australia", timezone: "Australia/Sydney" },
  lag: { city: "Lagos", state: "Lagos", country: "Nigeria", timezone: "Africa/Lagos" },
  nbo: { city: "Nairobi", state: "Nairobi", country: "Kenya", timezone: "Africa/Nairobi" },
  jnb: { city: "Johannesburg", state: "Gauteng", country: "South Africa", timezone: "Africa/Johannesburg" },
  dxb: { city: "Dubai", state: "Dubai", country: "United Arab Emirates", timezone: "Asia/Dubai" },
  sao: { city: "Sao Paulo", state: "Sao Paulo", country: "Brazil", timezone: "America/Sao_Paulo" },
} as const;

type PlaceKey = keyof typeof PLACES;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** "Mon 18-20; Sat 10:30-12" -> slots. Throws on a malformed entry so mistakes surface immediately. */
function slots(spec: string): AvailabilitySlot[] {
  return spec.split(";").map((part) => {
    const m = part.trim().match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (\d{1,2})(?::(\d{2}))?-(\d{1,2})(?::(\d{2}))?$/);
    if (!m) throw new Error(`Bad availability entry: "${part}"`);
    const hhmm = (h: string, min?: string) => `${h.padStart(2, "0")}:${min ?? "00"}`;
    return { weekday: DAYS.indexOf(m[1] as (typeof DAYS)[number]), start: hhmm(m[2], m[3]), end: hhmm(m[4], m[5]) };
  });
}

function andList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

type Entry = {
  name: string;
  title: string;
  place: PlaceKey;
  level: ExperienceLevel;
  langs: string[];
  topics: string[]; // skills for mentors, goals for mentees
  interests: string[];
  when: string;
};

const MENTOR_BIO = [
  (e: Entry, city: string) => `${e.title} in ${city}. Can help you with ${andList(e.topics.slice(0, 3))}.`,
  (e: Entry, city: string) => `${e.title} based in ${city}, mentoring on ${andList(e.topics.slice(0, 3))}.`,
  (e: Entry, city: string) => `${e.title} (${city}). Glad to share experience in ${andList(e.topics.slice(0, 3))}.`,
];
const MENTEE_BIO = [
  (e: Entry, city: string) => `${e.title} in ${city}. Looking for guidance on ${andList(e.topics)}.`,
  (e: Entry, city: string) => `${e.title} based in ${city}, hoping to learn more about ${andList(e.topics)}.`,
  (e: Entry, city: string) => `${e.title} (${city}). Keen to grow in ${andList(e.topics)}.`,
];

function build(domain: SeedDomain, role: "mentor" | "mentee", entries: Entry[]): SeedProfile[] {
  return entries.map((e, idx) => {
    const place = PLACES[e.place];
    const bio = (role === "mentor" ? MENTOR_BIO : MENTEE_BIO)[idx % 3](e, place.city);
    return {
      key: `${domain}-${role}-${pad(idx + 1)}`,
      domain,
      fullName: e.name,
      role,
      bio,
      experienceLevel: e.level,
      ...place,
      languages: e.langs,
      skills: role === "mentor" ? e.topics : [],
      goals: role === "mentee" ? e.topics : [],
      interests: e.interests,
      availability: slots(e.when),
    };
  });
}

// ---------------------------------------------------------------------------
// Tech mentors (25)
// ---------------------------------------------------------------------------
const TECH_MENTORS: Entry[] = [
  { name: "Priya Nair", title: "Frontend lead", place: "blr", level: "lead", langs: ["en", "hi", "ta"], topics: [t.react, t.ts, t.systemDesign, b.leadership], interests: [i.oss, i.women, i.edtech], when: "Tue 18-20; Thu 18-20; Sat 10-12" },
  { name: "Daniel Okafor", title: "Backend engineer", place: "lag", level: "senior", langs: ["en", "yo"], topics: [t.node, t.cloud, t.devops, t.systemDesign], interests: [i.fintech, i.oss, i.remote], when: "Mon 19-21; Wed 19-21; Sun 16-18" },
  { name: "Meera Joshi", title: "Machine learning engineer", place: "pune", level: "senior", langs: ["en", "hi", "mr"], topics: [t.python, t.ml, t.analysis], interests: [i.aiEthics, i.health, i.writing], when: "Mon 20-22; Fri 20-22; Sun 9-11" },
  { name: "Lukas Schneider", title: "Security architect", place: "ber", level: "lead", langs: ["en", "de"], topics: [t.security, t.cloud, t.devops, b.leadership], interests: [i.oss, i.gaming], when: "Tue 17-19; Thu 17-19" },
  { name: "Aisha Rahman", title: "Senior product manager", place: "lon", level: "senior", langs: ["en", "ar"], topics: [t.pm, t.ux, b.startup], interests: [i.fintech, i.women, i.edtech], when: "Mon 18-20; Wed 18-20; Sat 11-13" },
  { name: "Wei Chen", title: "Applied scientist", place: "sin", level: "senior", langs: ["en", "zh"], topics: [t.ml, t.python, t.cloud], interests: [i.aiEthics, i.gaming, i.oss], when: "Tue 20-22; Sat 14-16" },
  { name: "Emma Thompson", title: "Mobile and UX engineer", place: "tor", level: "mid", langs: ["en", "fr"], topics: [t.react, t.ux, t.mobile], interests: [i.women, i.edtech, i.remote], when: "Mon 17-19; Thu 17-19; Sun 10-12" },
  { name: "Tomas Rivera", title: "Staff engineer", place: "sf", level: "lead", langs: ["en", "es"], topics: [t.systemDesign, t.node, t.ts, b.leadership], interests: [i.oss, i.remote], when: "Tue 17-19; Thu 17-19; Sat 9-11" },
  { name: "Hannah Weiss", title: "Product designer", place: "ber", level: "mid", langs: ["en", "de"], topics: [t.ux, b.branding, b.speaking], interests: [i.sustainability, i.gaming], when: "Mon 18-20; Wed 18-20" },
  { name: "Jonas Berg", title: "Mobile engineer", place: "ber", level: "senior", langs: ["en", "de"], topics: [t.mobile, t.ts, t.react], interests: [i.gaming, i.oss], when: "Mon 19-21; Fri 17-19" },
  { name: "Oliver Grant", title: "Site reliability engineer", place: "nyc", level: "senior", langs: ["en"], topics: [t.cloud, t.devops, t.security], interests: [i.oss, i.remote], when: "Mon 18-20; Wed 18-20; Sat 10-12" },
  { name: "Grace Liu", title: "Data science director", place: "tor", level: "lead", langs: ["en", "zh"], topics: [t.python, t.ml, t.analysis, b.leadership], interests: [i.aiEthics, i.health, i.women], when: "Tue 18-20; Thu 18-20" },
  { name: "Vikram Singh", title: "Full-stack developer", place: "pune", level: "mid", langs: ["en", "hi", "mr"], topics: [t.react, t.node, b.career], interests: [i.oss, i.gaming, i.edtech], when: "Mon 21-23; Wed 21-23; Sat 18-20" },
  { name: "Lakshmi Venkat", title: "Data platform lead", place: "blr", level: "senior", langs: ["en", "ta", "hi"], topics: [t.dataEng, t.analysis, t.systemDesign], interests: [i.aiEthics, i.oss, i.edtech], when: "Mon 19:30-21:30; Thu 19:30-21:30; Sun 11-13" },
  { name: "Mateo Silva", title: "DevOps engineer", place: "sao", level: "senior", langs: ["en", "pt", "es"], topics: [t.devops, t.cloud, t.security], interests: [i.oss, i.climate], when: "Tue 19-21; Thu 19-21" },
  { name: "Zainab Bello", title: "Cloud engineer", place: "lag", level: "mid", langs: ["en", "yo"], topics: [t.cloud, t.node, t.devops], interests: [i.fintech, i.women], when: "Mon 18-20; Sat 10-12" },
  { name: "Arvind Pillai", title: "Principal engineer", place: "blr", level: "lead", langs: ["en", "hi", "ta"], topics: [t.systemDesign, t.cloud, b.leadership, b.career], interests: [i.oss, i.remote], when: "Wed 20-22; Sat 9-11" },
  { name: "Sara Lindqvist", title: "UX researcher", place: "lon", level: "senior", langs: ["en"], topics: [t.ux, t.pm, b.speaking], interests: [i.edtech, i.sustainability], when: "Tue 17-19; Fri 12-14" },
  { name: "Kenji Watanabe", title: "Game and graphics engineer", place: "syd", level: "senior", langs: ["en"], topics: [t.mobile, t.python, t.systemDesign], interests: [i.gaming, i.oss], when: "Wed 19-21; Sat 10-12" },
  { name: "Nadia Haddad", title: "Analytics lead", place: "dxb", level: "senior", langs: ["en", "ar"], topics: [t.analysis, t.python, t.pm], interests: [i.fintech, i.women], when: "Sun 19-21; Tue 19-21" },
  { name: "Peter Novak", title: "Test automation lead", place: "ber", level: "senior", langs: ["en", "de"], topics: [t.qa, t.devops, t.ts], interests: [i.oss], when: "Mon 17-19; Thu 17-19" },
  { name: "Amina Yusuf", title: "Cybersecurity analyst", place: "nbo", level: "mid", langs: ["en", "sw"], topics: [t.security, t.cloud], interests: [i.women, i.fintech], when: "Mon 18-20; Fri 18-20" },
  { name: "Diego Fernandez", title: "Machine learning researcher", place: "nyc", level: "senior", langs: ["en", "es"], topics: [t.ml, t.python, t.dataEng], interests: [i.aiEthics, i.health], when: "Tue 18-20; Sat 10-12" },
  { name: "Ritu Agarwal", title: "Engineering manager", place: "del", level: "lead", langs: ["en", "hi"], topics: [b.leadership, t.systemDesign, b.career, b.hiring], interests: [i.women, i.remote], when: "Mon 20-22; Thu 20-22; Sun 17-19" },
  { name: "Samuel Ochieng", title: "Backend developer", place: "nbo", level: "mid", langs: ["en", "sw"], topics: [t.node, t.ts, t.dataEng], interests: [i.fintech, i.edtech, i.oss], when: "Tue 18-20; Thu 18-20; Sat 10-12" },
];

// ---------------------------------------------------------------------------
// Business mentors (25)
// ---------------------------------------------------------------------------
const BIZ_MENTORS: Entry[] = [
  { name: "Marcus Bell", title: "Venture capital partner", place: "nyc", level: "lead", langs: ["en"], topics: [b.fundraising, b.startup, b.negotiation, b.finance], interests: [i.fintech, i.climate], when: "Tue 8-10; Thu 8-10; Sat 9-11" },
  { name: "Sofia Alvarez", title: "Brand and growth marketer", place: "sao", level: "senior", langs: ["en", "pt", "es"], topics: [b.marketing, b.branding, b.sales], interests: [i.sustainability, i.writing], when: "Mon 19-21; Wed 19-21" },
  { name: "Rohan Mehta", title: "Sales director", place: "mum", level: "lead", langs: ["en", "hi"], topics: [b.sales, b.leadership, b.operations, b.negotiation], interests: [i.fintech, i.health], when: "Wed 19-21; Sat 10-12" },
  { name: "Chloe Martin", title: "Communications consultant", place: "syd", level: "senior", langs: ["en", "fr"], topics: [b.marketing, b.speaking, b.career], interests: [i.writing, i.sustainability], when: "Tue 18-20; Thu 18-20" },
  { name: "Samuel Mwangi", title: "Startup CFO", place: "nbo", level: "senior", langs: ["en", "sw"], topics: [b.finance, b.fundraising, b.startup], interests: [i.fintech, i.climate], when: "Mon 18-20; Fri 18-20" },
  { name: "Kofi Mensah", title: "Enterprise sales lead", place: "lon", level: "senior", langs: ["en"], topics: [b.sales, b.marketing, b.negotiation, b.career], interests: [i.fintech, i.edtech], when: "Tue 18-20; Sat 10-12" },
  { name: "Neha Kapoor", title: "Chief operating officer", place: "del", level: "lead", langs: ["en", "hi"], topics: [b.operations, b.leadership, b.startup, b.speaking], interests: [i.women, i.health], when: "Mon 20-22; Thu 20-22; Sun 17-19" },
  { name: "Fatima Al-Sayed", title: "Founder and product strategist", place: "dxb", level: "senior", langs: ["en", "ar"], topics: [t.pm, b.fundraising, b.branding], interests: [i.fintech, i.edtech], when: "Sun 19-21; Tue 19-21; Thu 19-21" },
  { name: "Amara Eze", title: "Serial founder", place: "lag", level: "lead", langs: ["en", "yo"], topics: [b.startup, b.operations, b.fundraising, b.leadership], interests: [i.fintech, i.women, i.climate], when: "Tue 18-20; Thu 18-20" },
  { name: "Ethan Brooks", title: "Growth lead", place: "sf", level: "senior", langs: ["en"], topics: [b.marketing, b.sales, b.startup, b.branding], interests: [i.climate, i.writing], when: "Mon 9-11; Wed 9-11; Fri 9-11" },
  { name: "Ingrid Larsen", title: "Supply chain director", place: "ber", level: "lead", langs: ["en", "de"], topics: [b.operations, b.projects, b.leadership], interests: [i.sustainability], when: "Tue 17-19; Fri 12-14" },
  { name: "Rahul Deshmukh", title: "E-commerce founder", place: "mum", level: "senior", langs: ["en", "hi", "mr"], topics: [b.ecommerce, b.marketing, b.operations], interests: [i.sustainability, i.fintech], when: "Mon 20-22; Sat 11-13" },
  { name: "Camila Ortega", title: "HR business partner", place: "sao", level: "senior", langs: ["en", "es", "pt"], topics: [b.hiring, b.leadership, b.career], interests: [i.women, i.remote], when: "Wed 19-21; Fri 19-21" },
  { name: "Hassan Rahimi", title: "Management consultant", place: "lon", level: "senior", langs: ["en", "ar"], topics: [b.projects, b.operations, b.negotiation, b.speaking], interests: [i.edtech], when: "Mon 18-20; Thu 18-20" },
  { name: "Olivia Chen", title: "Customer success head", place: "sin", level: "senior", langs: ["en", "zh"], topics: [b.customer, b.sales, b.leadership], interests: [i.remote, i.edtech], when: "Tue 20-22; Sat 14-16" },
  { name: "Thabo Nkosi", title: "Investment analyst", place: "jnb", level: "mid", langs: ["en"], topics: [b.finance, b.fundraising, t.analysis], interests: [i.fintech, i.climate], when: "Mon 18-20; Wed 18-20" },
  { name: "Elena Petrova", title: "Brand strategist", place: "ber", level: "senior", langs: ["en", "de"], topics: [b.branding, b.marketing, b.speaking], interests: [i.writing, i.sustainability], when: "Tue 18-20; Thu 18-20" },
  { name: "Aditya Rao", title: "Product marketing manager", place: "blr", level: "senior", langs: ["en", "hi", "ta"], topics: [b.marketing, t.pm, b.branding], interests: [i.edtech, i.oss], when: "Mon 19-21; Wed 19-21; Sat 10-12" },
  { name: "Naomi Katz", title: "Deals and contracts advisor", place: "nyc", level: "lead", langs: ["en"], topics: [b.negotiation, b.startup, b.fundraising], interests: [i.fintech], when: "Tue 18-20; Sat 10-12" },
  { name: "Pedro Gomes", title: "Retail operations manager", place: "sao", level: "mid", langs: ["en", "pt"], topics: [b.operations, b.ecommerce, b.sales], interests: [i.sustainability], when: "Mon 19-21; Thu 19-21" },
  { name: "Mia Fischer", title: "Agile coach", place: "ber", level: "senior", langs: ["en", "de"], topics: [b.projects, b.leadership, b.speaking], interests: [i.remote, i.women], when: "Wed 17-19; Fri 12-14" },
  { name: "Anita Desai", title: "Career coach", place: "mum", level: "senior", langs: ["en", "hi"], topics: [b.career, b.speaking, b.negotiation, b.leadership], interests: [i.women, i.writing], when: "Tue 19-21; Sun 10-12" },
  { name: "Jack Thompson", title: "Finance manager", place: "syd", level: "mid", langs: ["en"], topics: [b.finance, b.operations, t.analysis], interests: [i.fintech], when: "Tue 18-20; Thu 18-20" },
  { name: "Lina Khoury", title: "Social enterprise founder", place: "dxb", level: "senior", langs: ["en", "ar", "fr"], topics: [b.startup, b.fundraising, b.customer], interests: [i.sustainability, i.edtech, i.health], when: "Mon 19-21; Wed 19-21" },
  { name: "Yusuf Kamara", title: "Business development lead", place: "lag", level: "senior", langs: ["en", "yo"], topics: [b.sales, b.negotiation, b.marketing], interests: [i.fintech, i.climate], when: "Mon 18-20; Fri 18-20" },
];

// ---------------------------------------------------------------------------
// Tech mentees (10) and business mentees (10)
// ---------------------------------------------------------------------------
const TECH_MENTEES: Entry[] = [
  { name: "Arjun Sharma", title: "Computer science student", place: "pune", level: "student", langs: ["en", "hi", "mr"], topics: [t.react, t.ts, b.career], interests: [i.oss, i.gaming], when: "Mon 19-21; Wed 19-21; Sat 10-12" },
  { name: "Zara Ahmed", title: "Junior product analyst", place: "lon", level: "junior", langs: ["en", "ar"], topics: [t.pm, t.ux, t.analysis], interests: [i.fintech, i.women], when: "Mon 18-20; Sat 11-13" },
  { name: "Lucas Moreau", title: "Data science student", place: "ber", level: "student", langs: ["en", "de", "fr"], topics: [t.python, t.ml, t.analysis], interests: [i.aiEthics, i.gaming], when: "Tue 17-19; Sun 14-16" },
  { name: "Ngozi Adeyemi", title: "Junior backend developer", place: "lag", level: "junior", langs: ["en", "yo"], topics: [t.node, t.cloud, t.systemDesign], interests: [i.fintech, i.remote], when: "Mon 19-21; Sun 16-18" },
  { name: "Mei Lin", title: "Junior machine learning engineer", place: "sin", level: "junior", langs: ["en", "zh"], topics: [t.ml, t.cloud, b.career], interests: [i.aiEthics, i.oss], when: "Tue 20-22; Sat 14-16" },
  { name: "Ben Carter", title: "IT student", place: "nyc", level: "student", langs: ["en"], topics: [t.security, t.devops, t.cloud], interests: [i.oss, i.remote], when: "Mon 18-20; Sat 10-12" },
  { name: "Isabelle Roy", title: "Junior designer", place: "tor", level: "junior", langs: ["en", "fr"], topics: [t.ux, t.mobile, b.speaking], interests: [i.women, i.edtech], when: "Mon 17-19; Sun 10-12" },
  { name: "Peter Kimani", title: "Junior QA engineer", place: "nbo", level: "junior", langs: ["en", "sw"], topics: [t.qa, t.devops, t.ts], interests: [i.oss, i.fintech], when: "Tue 18-20; Sat 10-12" },
  { name: "Anjali Reddy", title: "Bootcamp graduate", place: "blr", level: "junior", langs: ["en", "hi", "ta"], topics: [t.react, t.node, t.systemDesign], interests: [i.edtech, i.women], when: "Mon 19-21; Thu 19-21; Sun 11-13" },
  { name: "Takumi Sato", title: "Game developer", place: "syd", level: "mid", langs: ["en"], topics: [t.systemDesign, b.leadership, t.mobile], interests: [i.gaming, i.oss], when: "Wed 19-21; Sat 10-12" },
];

const BIZ_MENTEES: Entry[] = [
  { name: "Carlos Mendes", title: "Aspiring founder", place: "sao", level: "mid", langs: ["en", "pt"], topics: [b.fundraising, b.startup, b.negotiation], interests: [i.fintech, i.sustainability], when: "Mon 19-21; Wed 19-21" },
  { name: "Sana Qureshi", title: "Marketing associate", place: "mum", level: "junior", langs: ["en", "hi"], topics: [b.marketing, b.branding, b.sales], interests: [i.writing, i.sustainability], when: "Wed 19-21; Sat 10-12" },
  { name: "Kwame Otieno", title: "Finance analyst", place: "nbo", level: "mid", langs: ["en", "sw"], topics: [b.finance, b.leadership, b.operations], interests: [i.fintech, i.climate], when: "Mon 18-20; Fri 18-20" },
  { name: "Emily Walker", title: "Operations coordinator", place: "syd", level: "junior", langs: ["en"], topics: [b.projects, b.operations, b.leadership], interests: [i.remote], when: "Tue 18-20; Thu 18-20" },
  { name: "Fatou Diallo", title: "Small business owner", place: "lag", level: "mid", langs: ["en", "fr"], topics: [b.ecommerce, b.marketing, b.customer], interests: [i.fintech, i.women], when: "Mon 18-20; Sat 10-12" },
  { name: "Rajesh Kulkarni", title: "Sales executive", place: "pune", level: "junior", langs: ["en", "hi", "mr"], topics: [b.sales, b.negotiation, b.speaking], interests: [i.fintech, i.edtech], when: "Mon 20-22; Sun 17-19" },
  { name: "Lena Hoffmann", title: "HR generalist", place: "ber", level: "junior", langs: ["en", "de"], topics: [b.hiring, b.leadership, b.career], interests: [i.women, i.remote], when: "Tue 17-19; Fri 12-14" },
  { name: "Yara Mansour", title: "Business student", place: "dxb", level: "student", langs: ["en", "ar"], topics: [b.startup, b.speaking, b.career], interests: [i.sustainability, i.edtech], when: "Sun 19-21; Tue 19-21" },
  { name: "Noah Patel", title: "Product marketing associate", place: "tor", level: "junior", langs: ["en"], topics: [t.pm, b.marketing, t.analysis], interests: [i.edtech], when: "Mon 17-19; Thu 17-19" },
  { name: "Chinedu Okeke", title: "Business development trainee", place: "jnb", level: "junior", langs: ["en"], topics: [b.sales, b.fundraising, b.finance], interests: [i.fintech, i.climate], when: "Mon 18-20; Wed 18-20" },
];

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export const DEMO_PROFILES: SeedProfile[] = [
  ...build("tech", "mentor", TECH_MENTORS),
  ...build("business", "mentor", BIZ_MENTORS),
  ...build("tech", "mentee", TECH_MENTEES),
  ...build("business", "mentee", BIZ_MENTEES),
];
