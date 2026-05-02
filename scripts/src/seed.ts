import { db } from "@workspace/db";
import { universitiesTable, programsTable } from "@workspace/db";

async function seed() {
  console.log("Seeding universities...");

  await db.delete(programsTable);
  await db.delete(universitiesTable);

  const unis = await db
    .insert(universitiesTable)
    .values([
      {
        name: "Lahore University of Management Sciences",
        shortName: "LUMS",
        province: "Punjab",
        city: "Lahore",
        type: "private",
        ranking: 1,
        established: 1984,
        website: "https://lums.edu.pk",
        description:
          "A leading institution of higher learning focused on excellence in business, liberal arts, law, science, and engineering.",
        admissionOpen: true,
        isFeatured: true,
        applicationDeadline: "November 30, 2025",
      },
      {
        name: "National University of Sciences and Technology",
        shortName: "NUST",
        province: "Islamabad Capital Territory",
        city: "Islamabad",
        type: "public",
        ranking: 2,
        established: 1991,
        website: "https://nust.edu.pk",
        description:
          "A world-class research-intensive university producing top engineers and scientists.",
        admissionOpen: true,
        isFeatured: true,
        applicationDeadline: "October 31, 2025",
      },
      {
        name: "FAST National University of Computer and Emerging Sciences",
        shortName: "FAST-NU",
        province: "Punjab",
        city: "Lahore",
        type: "private",
        ranking: 3,
        established: 2000,
        website: "https://nu.edu.pk",
        description:
          "Pakistan's premier computer science and engineering university.",
        admissionOpen: true,
        isFeatured: true,
        applicationDeadline: "December 15, 2025",
      },
      {
        name: "Institute of Business Administration",
        shortName: "IBA",
        province: "Sindh",
        city: "Karachi",
        type: "public",
        ranking: 4,
        established: 1955,
        website: "https://iba.edu.pk",
        description:
          "The oldest business school in Asia outside of Japan, producing top business leaders.",
        admissionOpen: true,
        isFeatured: true,
        applicationDeadline: "January 10, 2026",
      },
      {
        name: "University of Engineering and Technology",
        shortName: "UET",
        province: "Punjab",
        city: "Lahore",
        type: "public",
        ranking: 5,
        established: 1921,
        website: "https://uet.edu.pk",
        description:
          "The oldest and most prestigious engineering university in Pakistan.",
        admissionOpen: true,
        isFeatured: true,
        applicationDeadline: "November 15, 2025",
      },
      {
        name: "Aga Khan University",
        shortName: "AKU",
        province: "Sindh",
        city: "Karachi",
        type: "private",
        ranking: 6,
        established: 1983,
        website: "https://aku.edu",
        description:
          "A world-class health sciences university with a focus on medicine, nursing, and public health.",
        admissionOpen: true,
        isFeatured: true,
        applicationDeadline: "December 31, 2025",
      },
      {
        name: "Quaid-i-Azam University",
        shortName: "QAU",
        province: "Islamabad Capital Territory",
        city: "Islamabad",
        type: "public",
        ranking: 7,
        established: 1967,
        website: "https://qau.edu.pk",
        description:
          "A leading public research university offering programs in sciences, social sciences and arts.",
        admissionOpen: true,
        isFeatured: false,
        applicationDeadline: "September 30, 2025",
      },
      {
        name: "University of the Punjab",
        shortName: "PU",
        province: "Punjab",
        city: "Lahore",
        type: "public",
        ranking: 8,
        established: 1882,
        website: "https://pu.edu.pk",
        description:
          "The oldest university in Pakistan with a broad range of academic programs.",
        admissionOpen: true,
        isFeatured: false,
        applicationDeadline: "October 15, 2025",
      },
      {
        name: "Comsats University Islamabad",
        shortName: "COMSATS",
        province: "Islamabad Capital Territory",
        city: "Islamabad",
        type: "public",
        ranking: 9,
        established: 2000,
        website: "https://comsats.edu.pk",
        description:
          "A leading multi-campus university focused on science, technology and information sciences.",
        admissionOpen: true,
        isFeatured: false,
        applicationDeadline: "November 30, 2025",
      },
      {
        name: "University of Peshawar",
        shortName: "UOP",
        province: "Khyber Pakhtunkhwa",
        city: "Peshawar",
        type: "public",
        ranking: 10,
        established: 1950,
        website: "https://uop.edu.pk",
        description:
          "The oldest university in Khyber Pakhtunkhwa offering diverse academic programs.",
        admissionOpen: true,
        isFeatured: false,
        applicationDeadline: "October 20, 2025",
      },
      {
        name: "BUITEMS",
        shortName: "BUITEMS",
        province: "Balochistan",
        city: "Quetta",
        type: "public",
        ranking: 11,
        established: 2002,
        website: "https://buitms.edu.pk",
        description: "A premier technology and management sciences university in Balochistan.",
        admissionOpen: true,
        isFeatured: false,
        applicationDeadline: "October 31, 2025",
      },
      {
        name: "Habib University",
        shortName: "HU",
        province: "Sindh",
        city: "Karachi",
        type: "private",
        ranking: 12,
        established: 2014,
        website: "https://habib.edu.pk",
        description:
          "An innovative liberal arts and sciences university in Karachi.",
        admissionOpen: true,
        isFeatured: false,
        applicationDeadline: "December 1, 2025",
      },
    ])
    .returning();

  console.log(`Inserted ${unis.length} universities.`);

  // Seed programs for each university
  const lumsId = unis.find((u) => u.shortName === "LUMS")!.id;
  const nustId = unis.find((u) => u.shortName === "NUST")!.id;
  const fastId = unis.find((u) => u.shortName === "FAST-NU")!.id;
  const ibaId = unis.find((u) => u.shortName === "IBA")!.id;
  const uetId = unis.find((u) => u.shortName === "UET")!.id;
  const akuId = unis.find((u) => u.shortName === "AKU")!.id;

  await db.insert(programsTable).values([
    // LUMS
    { universityId: lumsId, name: "BSc Computer Science", department: "SBASSE", degree: "BS", duration: 4, seats: 120, entryTest: "SAT / NTS", feePerSemester: "250000" },
    { universityId: lumsId, name: "BSc Economics", department: "SDSB", degree: "BS", duration: 4, seats: 80, entryTest: "SAT / NTS", feePerSemester: "250000" },
    { universityId: lumsId, name: "BBA", department: "SDSB", degree: "BBA", duration: 4, seats: 100, entryTest: "SAT / NTS", feePerSemester: "250000" },
    { universityId: lumsId, name: "LLB (Hons)", department: "Shaikh Ahmad Hassan School of Law", degree: "LLB", duration: 4, seats: 60, entryTest: "LUMS LAT", feePerSemester: "250000" },
    // NUST
    { universityId: nustId, name: "BE Electrical Engineering", department: "SEECS", degree: "BE", duration: 4, seats: 150, entryTest: "NUST NET", feePerSemester: "120000" },
    { universityId: nustId, name: "BE Computer Engineering", department: "SEECS", degree: "BE", duration: 4, seats: 100, entryTest: "NUST NET", feePerSemester: "120000" },
    { universityId: nustId, name: "BS Computer Science", department: "SEECS", degree: "BS", duration: 4, seats: 100, entryTest: "NUST NET", feePerSemester: "120000" },
    { universityId: nustId, name: "MBBS", department: "SMME", degree: "MBBS", duration: 5, seats: 100, entryTest: "MDCAT", feePerSemester: "200000" },
    // FAST-NU
    { universityId: fastId, name: "BS Computer Science", department: "CS", degree: "BS", duration: 4, seats: 200, entryTest: "NU Entry Test", feePerSemester: "95000" },
    { universityId: fastId, name: "BS Software Engineering", department: "CS", degree: "BS", duration: 4, seats: 150, entryTest: "NU Entry Test", feePerSemester: "95000" },
    { universityId: fastId, name: "BS Electrical Engineering", department: "EE", degree: "BS", duration: 4, seats: 120, entryTest: "NU Entry Test", feePerSemester: "95000" },
    // IBA
    { universityId: ibaId, name: "BBA", department: "Business Administration", degree: "BBA", duration: 4, seats: 150, entryTest: "IBA Aptitude Test", feePerSemester: "85000" },
    { universityId: ibaId, name: "BS Economics & Mathematics", department: "Economics", degree: "BS", duration: 4, seats: 60, entryTest: "IBA Aptitude Test", feePerSemester: "85000" },
    { universityId: ibaId, name: "BS Computer Science", department: "CS", degree: "BS", duration: 4, seats: 80, entryTest: "IBA Aptitude Test", feePerSemester: "85000" },
    // UET
    { universityId: uetId, name: "BE Civil Engineering", department: "Civil Engineering", degree: "BE", duration: 4, seats: 200, entryTest: "ECAT", feePerSemester: "45000" },
    { universityId: uetId, name: "BE Electrical Engineering", department: "Electrical Engineering", degree: "BE", duration: 4, seats: 200, entryTest: "ECAT", feePerSemester: "45000" },
    { universityId: uetId, name: "BE Computer Engineering", department: "Computer Engineering", degree: "BE", duration: 4, seats: 150, entryTest: "ECAT", feePerSemester: "45000" },
    { universityId: uetId, name: "BS Architecture", department: "Architecture", degree: "BS", duration: 5, seats: 60, entryTest: "ECAT", feePerSemester: "45000" },
    // AKU
    { universityId: akuId, name: "MBBS", department: "Medical College", degree: "MBBS", duration: 5, seats: 100, entryTest: "MDCAT", feePerSemester: "600000" },
    { universityId: akuId, name: "BScN (Nursing)", department: "School of Nursing", degree: "BS", duration: 4, seats: 80, entryTest: "AKU Entry Test", feePerSemester: "180000" },
  ]);

  console.log("Programs seeded!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
