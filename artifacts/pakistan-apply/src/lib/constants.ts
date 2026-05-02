export const PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Azad Jammu & Kashmir",
  "Gilgit-Baltistan",
];

export const BOARDS = [
  "FBISE (Federal Board)",
  "BISE Lahore",
  "BISE Rawalpindi",
  "BISE Faisalabad",
  "BISE Gujranwala",
  "BISE Sargodha",
  "BISE Multan",
  "BISE Bahawalpur",
  "BISE Sahiwal",
  "BISE DG Khan",
  "BISE Karachi",
  "BISE Hyderabad",
  "BISE Sukkur",
  "BISE Larkana",
  "BISE Mirpurkhas",
  "BISE Peshawar",
  "BISE Mardan",
  "BISE Abbottabad",
  "BISE Malakand",
  "BISE Kohat",
  "BISE DI Khan",
  "BISE Bannu",
  "BISE Quetta",
  "Aga Khan University Examination Board",
  "Cambridge (O/A Levels)",
  "Other",
];

export const ACADEMIC_LEVELS = [
  { value: "matric", label: "Matric (SSC)" },
  { value: "o_levels", label: "O-Levels" },
  { value: "intermediate", label: "Intermediate (HSSC / FSc / FA)" },
  { value: "a_levels", label: "A-Levels" },
  { value: "bachelors", label: "Bachelors" },
  { value: "other", label: "Other" },
];

export const TEST_NAMES = [
  { value: "ECAT", label: "ECAT (Engineering)" },
  { value: "MDCAT", label: "MDCAT (Medical)" },
  { value: "NTS", label: "NTS (National Testing Service)" },
  { value: "HAT", label: "HAT (Higher Education)" },
  { value: "SAT", label: "SAT" },
  { value: "ACT", label: "ACT" },
  { value: "IELTS", label: "IELTS" },
  { value: "TOEFL", label: "TOEFL" },
  { value: "other", label: "Other" },
];

export const ACTIVITY_CATEGORIES = [
  { value: "sports", label: "Sports & Athletics" },
  { value: "arts", label: "Arts & Culture" },
  { value: "community_service", label: "Community Service" },
  { value: "academics", label: "Academic Clubs" },
  { value: "religious", label: "Religious & Spiritual" },
  { value: "leadership", label: "Leadership & Student Government" },
  { value: "work", label: "Work & Internships" },
  { value: "other", label: "Other" },
];

export const RELIGIONS = [
  "Islam", "Christianity", "Hinduism", "Sikhism", "Buddhism", "Other", "Prefer not to say",
];

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
  waitlisted: "Waitlisted",
  withdrawn: "Withdrawn",
};

export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-sky-100 text-sky-700",
  under_review: "bg-amber-100 text-amber-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  waitlisted: "bg-orange-100 text-orange-700",
  withdrawn: "bg-slate-100 text-slate-400",
};

export const STEPS = [
  { slug: "profile", label: "Profile", href: "/profile" },
  { slug: "family", label: "Family", href: "/profile" },
  { slug: "education", label: "Education", href: "/education" },
  { slug: "testing", label: "Testing", href: "/testing" },
  { slug: "activities", label: "Activities", href: "/activities" },
  { slug: "writing", label: "Writing", href: "/writing" },
  { slug: "courses", label: "Courses", href: "/education" },
];
