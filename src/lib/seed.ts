import type { Broadcast, Category, Report, ReportKind } from "./types";
import { DEFAULT_CENTER } from "./geo";
import { seededRandom } from "./geo";

/**
 * Seed dataset for the community network. Generated deterministically around the
 * default city center so the map, heatmap, matching, and dashboard have a living
 * network to work against on first run. Everything is replaceable at runtime —
 * user-created data lives alongside it in the store.
 */

interface SeedTemplate {
  kind: ReportKind;
  category: Category;
  title: string;
  description: string;
  reporter: string;
  trust: number;
  hoursAgo: number;
  privateQ?: string;
  privateA?: string;
  hasPhoto?: boolean;
  sensitive?: boolean;
  status?: "open" | "matched" | "recovered";
}

const TEMPLATES: SeedTemplate[] = [
  {
    kind: "found",
    category: "wallet",
    title: "Brown leather bifold wallet",
    description:
      "Worn brown leather wallet, small tear on the inner pocket, red stitching inside. Found near the cafe by Liberty roundabout.",
    reporter: "Amara K.",
    trust: 92,
    hoursAgo: 1,
    privateQ: "What color is the stitching on the inside?",
    privateA: "red",
    hasPhoto: true,
  },
  {
    kind: "found",
    category: "wallet",
    title: "Dark leather wallet with cards",
    description:
      "Black leather wallet containing loyalty cards. Turned in at the coffee shop counter on main boulevard.",
    reporter: "Diego S.",
    trust: 78,
    hoursAgo: 3,
    privateQ: "How many card slots does it have?",
    privateA: "6",
    hasPhoto: true,
  },
  {
    kind: "found",
    category: "wallet",
    title: "Tan slim cardholder",
    description:
      "Slim tan cardholder with engraved initials, no cash inside. Found on a park bench.",
    reporter: "Priya R.",
    trust: 88,
    hoursAgo: 8,
    privateQ: "Whose initials are engraved on it?",
    privateA: "JM",
  },
  {
    kind: "lost",
    category: "wallet",
    title: "Black wallet with red stitching",
    description:
      "Lost my black leather wallet with distinctive red stitching near the food street. Has my ID and bank cards.",
    reporter: "Hassan A.",
    trust: 71,
    hoursAgo: 5,
    privateQ: "What was the exact amount of cash inside?",
    privateA: "500 rupees",
  },
  {
    kind: "found",
    category: "phone",
    title: "iPhone 15 in black case",
    description:
      "Found an iPhone 15 with a black silicone case on the bus, seat pocket of route 14. Mountain photo on the lock screen.",
    reporter: "Sara P.",
    trust: 85,
    hoursAgo: 5,
    privateQ: "What is the lock screen wallpaper?",
    privateA: "mountains",
    hasPhoto: true,
  },
  {
    kind: "lost",
    category: "phone",
    title: "Samsung S24 cracked screen protector",
    description:
      "Lost dark blue Samsung S24, cracked screen protector on the top corner, near the metro station exit.",
    reporter: "Bilal T.",
    trust: 66,
    hoursAgo: 9,
    privateQ: "What sticker is on the back of the case?",
    privateA: "a panda sticker",
  },
  {
    kind: "found",
    category: "keys",
    title: "Car keys with blue keychain",
    description:
      "Toyota fob with a blue rubber keychain and two house keys, found between the metro and 5th street.",
    reporter: "Ahmed R.",
    trust: 74,
    hoursAgo: 3,
    privateQ: "How many house keys are on the ring?",
    privateA: "2",
  },
  {
    kind: "lost",
    category: "keys",
    title: "Keys with red fob",
    description:
      "Lost a keyring with a red leather fob and four keys somewhere around the university gate.",
    reporter: "Zoya M.",
    trust: 81,
    hoursAgo: 12,
    privateQ: "What is written on the fob?",
    privateA: "ZM",
  },
  {
    kind: "found",
    category: "pet",
    title: "Golden retriever, very friendly",
    description:
      "Friendly golden retriever found at the canal park, red collar with a small bone-shaped tag, answers to whistles.",
    reporter: "Lena M.",
    trust: 90,
    hoursAgo: 2,
    privateQ: "What shape is the collar tag?",
    privateA: "bone",
    hasPhoto: true,
  },
  {
    kind: "lost",
    category: "pet",
    title: "Lost golden retriever 'Miso'",
    description:
      "Our golden retriever Miso slipped her leash at the dog park. Red collar, bone-shaped tag, very friendly with children.",
    reporter: "Omar F.",
    trust: 83,
    hoursAgo: 4,
    privateQ: "What is the dog's favorite toy?",
    privateA: "a yellow tennis ball",
    hasPhoto: true,
  },
  {
    kind: "found",
    category: "laptop",
    title: "Silver MacBook Air with stickers",
    description:
      "Silver MacBook Air left in the library reading room, has a NASA sticker and a small scratch near the trackpad.",
    reporter: "Fatima N.",
    trust: 95,
    hoursAgo: 7,
    privateQ: "Which sticker is on the lid?",
    privateA: "NASA",
    hasPhoto: true,
  },
  {
    kind: "lost",
    category: "laptop",
    title: "MacBook Air, NASA sticker",
    description:
      "Left my silver MacBook Air at the central library, NASA sticker on the lid, scratch near the trackpad.",
    reporter: "Usman G.",
    trust: 77,
    hoursAgo: 6,
    privateQ: "What is the login username?",
    privateA: "usmang",
  },
  {
    kind: "found",
    category: "bag",
    title: "Grey backpack with laptop sleeve",
    description:
      "Grey Uniqlo backpack found in the food court, contains a water bottle and notebooks, name tag inside.",
    reporter: "Kenji T.",
    trust: 65,
    hoursAgo: 20,
    privateQ: "What name is on the tag inside?",
    privateA: "Ali",
  },
  {
    kind: "lost",
    category: "bag",
    title: "Lost grey backpack",
    description:
      "Grey backpack with my notebooks and a steel water bottle, lost at the mall food court around lunch.",
    reporter: "Ali H.",
    trust: 70,
    hoursAgo: 18,
    privateQ: "What brand is the water bottle?",
    privateA: "Milton",
  },
  {
    kind: "found",
    category: "passport",
    title: "Green passport near airport shuttle",
    description:
      "Found a green passport at the airport shuttle stop. Handed to the information desk, keeping details private.",
    reporter: "Nadia I.",
    trust: 89,
    hoursAgo: 11,
    privateQ: "What is the passport number's last three digits?",
    privateA: "482",
  },
  {
    kind: "found",
    category: "jewelry",
    title: "Silver ring with engraving",
    description:
      "Small silver ring with an engraving inside, found by the fountain in the central park.",
    reporter: "Maya W.",
    trust: 86,
    hoursAgo: 26,
    privateQ: "What is engraved inside the ring?",
    privateA: "forever 2019",
  },
  {
    kind: "lost",
    category: "jewelry",
    title: "Lost engagement ring",
    description:
      "Silver engagement ring with an inside engraving, lost near the park fountain during a picnic.",
    reporter: "Sana B.",
    trust: 79,
    hoursAgo: 24,
    privateQ: "What is engraved inside?",
    privateA: "forever 2019",
  },
  {
    kind: "found",
    category: "bicycle",
    title: "Red mountain bike left at station",
    description:
      "Red Giant mountain bike left locked at the railway station for three days, dented rear mudguard.",
    reporter: "Tariq J.",
    trust: 62,
    hoursAgo: 40,
    privateQ: "What is dented on the bike?",
    privateA: "rear mudguard",
  },
  {
    kind: "found",
    category: "electronics",
    title: "AirPods Pro in white case",
    description: "AirPods Pro found on a gym bench, white case with a small ink stain on the back.",
    reporter: "Rachel D.",
    trust: 84,
    hoursAgo: 14,
    privateQ: "What mark is on the case?",
    privateA: "ink stain",
  },
  {
    kind: "lost",
    category: "electronics",
    title: "Lost AirPods Pro",
    description:
      "AirPods Pro in white case, ink stain on the back of the case, lost at the fitness club.",
    reporter: "Danish Q.",
    trust: 73,
    hoursAgo: 13,
    privateQ: "Which earbud has a scratch?",
    privateA: "left",
  },
  {
    kind: "lost",
    category: "license",
    title: "Driving license in card sleeve",
    description:
      "Lost my driving license in a clear card sleeve near the fuel station on ring road.",
    reporter: "Imran S.",
    trust: 68,
    hoursAgo: 30,
    privateQ: "What are the last two digits of the license number?",
    privateA: "37",
  },
  {
    kind: "found",
    category: "other",
    title: "Black umbrella with wooden handle",
    description: "Classic black umbrella with a curved wooden handle, left at the bus shelter.",
    reporter: "Elif Y.",
    trust: 76,
    hoursAgo: 50,
    privateQ: "What is tied around the handle?",
    privateA: "a blue ribbon",
  },
  {
    kind: "found",
    category: "phone",
    title: "Old Nokia phone, blue",
    description: "Blue Nokia feature phone found near the vegetable market, still has battery.",
    reporter: "Gulzar P.",
    trust: 59,
    hoursAgo: 60,
  },
  {
    kind: "lost",
    category: "pet",
    title: "Grey Persian cat 'Simba'",
    description:
      "Grey Persian cat missing from our street, green eyes, answers to Simba, wearing a tiny bell collar.",
    reporter: "Hira L.",
    trust: 82,
    hoursAgo: 16,
    privateQ: "What sound does his collar make?",
    privateA: "bell",
    hasPhoto: true,
  },
  {
    kind: "found",
    category: "keys",
    title: "Office keycard and keys",
    description: "Lanyard with an office keycard and three keys, found in a rickshaw seat.",
    reporter: "Waqas E.",
    trust: 64,
    hoursAgo: 22,
  },
  {
    kind: "lost",
    category: "person",
    title: "Missing: elderly man, grey coat",
    description:
      "Elderly man last seen near the riverside station around 4pm wearing a grey wool coat and cap. Family is searching.",
    reporter: "City Watch",
    trust: 97,
    hoursAgo: 1,
    sensitive: true,
    privateQ: "What is the name of his childhood village?",
    privateA: "Chak 38",
  },
  {
    kind: "found",
    category: "wallet",
    title: "Recovered: velcro sports wallet",
    description:
      "Blue velcro sports wallet, returned to its owner after verification. Case closed.",
    reporter: "Amara K.",
    trust: 92,
    hoursAgo: 70,
    status: "recovered",
  },
  {
    kind: "lost",
    category: "phone",
    title: "Recovered: Pixel 8 with clear case",
    description: "Pixel 8 reunited with owner within six hours via AI match. Case closed.",
    reporter: "Diego S.",
    trust: 78,
    hoursAgo: 90,
    status: "recovered",
  },
  {
    kind: "found",
    category: "bag",
    title: "Recovered: child's school bag",
    description: "Blue cartoon school bag reunited at the school gate. Case closed.",
    reporter: "Sara P.",
    trust: 85,
    hoursAgo: 110,
    status: "recovered",
  },
  {
    kind: "lost",
    category: "keys",
    title: "Recovered: motorcycle keys",
    description: "Honda motorcycle keys found in a parking lot and returned same day.",
    reporter: "Ahmed R.",
    trust: 74,
    hoursAgo: 130,
    status: "recovered",
  },
  {
    kind: "found",
    category: "jewelry",
    title: "Gold bracelet at wedding hall",
    description:
      "Delicate gold bracelet found near the entrance of a wedding hall, kept safe pending verification.",
    reporter: "Mahnoor K.",
    trust: 87,
    hoursAgo: 33,
    privateQ: "How many charms hang on it?",
    privateA: "3",
  },
  {
    kind: "lost",
    category: "bicycle",
    title: "Kid's bicycle with training wheels",
    description: "Small red bicycle with white training wheels, taken from outside our gate.",
    reporter: "Farhan V.",
    trust: 61,
    hoursAgo: 44,
  },
  {
    kind: "found",
    category: "document",
    title: "Folder of university certificates",
    description:
      "Plastic folder containing degree certificates found in a taxi. Names withheld for privacy.",
    reporter: "Careem Captain",
    trust: 72,
    hoursAgo: 15,
    privateQ: "Which university issued the degree?",
    privateA: "Punjab University",
  } as unknown as SeedTemplate,
];

// Positions are deterministic offsets from the city center, spread across ~12 km.
function seedLocation(index: number, id: string): [number, number] {
  const rand = seededRandom(id);
  const angle = rand() * Math.PI * 2;
  const dist = 0.008 + rand() * 0.055; // ~1–6 km in degrees
  const cluster = index % 5 === 0 ? 0.5 : 1; // pull every 5th point toward center for hotspot
  return [
    DEFAULT_CENTER[0] + Math.sin(angle) * dist * cluster,
    DEFAULT_CENTER[1] + Math.cos(angle) * dist * cluster * 1.2,
  ];
}

export function buildSeedReports(): Report[] {
  return TEMPLATES.map((t, i) => {
    const id = `seed_r_${String(i + 1).padStart(3, "0")}`;
    const category = (t.category as string) === "document" ? "other" : t.category;
    return {
      id,
      kind: t.kind,
      category,
      title: t.title,
      description: t.description,
      location: seedLocation(i, id),
      radiusM: 500,
      createdAt: new Date(Date.now() - t.hoursAgo * 3_600_000).toISOString(),
      status: t.status ?? "open",
      reporter: { id: `seed_u_${i}`, name: t.reporter, trust: t.trust },
      privateFields: t.privateQ && t.privateA ? [{ question: t.privateQ, answer: t.privateA }] : [],
      sensitive: t.sensitive,
      photo: t.hasPhoto ? "seeded" : undefined,
    } satisfies Report;
  });
}

export function buildSeedBroadcasts(): Broadcast[] {
  const now = Date.now();
  const items: Omit<Broadcast, "id">[] = [
    {
      author: "City Watch",
      category: "person",
      title: "Missing: elderly man, grey coat",
      body: "Last seen near riverside station around 4pm. Wearing a grey wool coat and cap. Please contact local police if sighted.",
      at: new Date(now - 12 * 60_000).toISOString(),
      distanceKm: 0.8,
      urgent: true,
    },
    {
      author: "Lena M.",
      category: "pet",
      title: "Found golden retriever at canal park",
      body: "Very friendly, red collar with a bone-shaped tag. Safe with me until the owner verifies.",
      at: new Date(now - 65 * 60_000).toISOString(),
      distanceKm: 2.1,
    },
    {
      author: "Ahmed R.",
      category: "keys",
      title: "Found car keys with blue keychain",
      body: "Between the metro and 5th street. Toyota fob. Describe the keyring to claim.",
      at: new Date(now - 3 * 3_600_000).toISOString(),
      distanceKm: 3.4,
    },
    {
      author: "Sara P.",
      category: "phone",
      title: "Found iPhone 15, black case",
      body: "On the route 14 bus, seat pocket. Turned in to the depot lost & found.",
      at: new Date(now - 5 * 3_600_000).toISOString(),
      distanceKm: 4.2,
    },
    {
      author: "Hira L.",
      category: "pet",
      title: "Missing grey Persian cat 'Simba'",
      body: "Green eyes, tiny bell collar. Last seen on our street after dusk. Reward offered.",
      at: new Date(now - 8 * 3_600_000).toISOString(),
      distanceKm: 1.6,
    },
  ];
  return items.map((b, i) => ({ ...b, id: `seed_b_${i + 1}` }));
}
