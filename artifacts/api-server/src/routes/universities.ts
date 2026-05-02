import { Router } from "express";
import { db } from "@workspace/db";
import { universitiesTable, programsTable } from "@workspace/db";
import { ListUniversitiesQueryParams, GetUniversityParams, ListProgramsParams } from "@workspace/api-zod";
import { eq, ilike, and, sql, count } from "drizzle-orm";

const router = Router();

router.get("/stats", async (req, res) => {
  const all = await db.select().from(universitiesTable);
  const byProvince = Object.entries(
    all.reduce<Record<string, number>>((acc, u) => {
      acc[u.province] = (acc[u.province] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([province, count]) => ({ province, count }));

  const byType = Object.entries(
    all.reduce<Record<string, number>>((acc, u) => {
      acc[u.type] = (acc[u.type] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([type, count]) => ({ type, count }));

  res.json({
    totalUniversities: all.length,
    byProvince,
    byType,
    admissionOpenCount: all.filter((u) => u.admissionOpen).length,
  });
});

router.get("/featured", async (req, res) => {
  const featured = await db
    .select()
    .from(universitiesTable)
    .where(eq(universitiesTable.isFeatured, true));
  
  const withProgramCount = await Promise.all(
    featured.map(async (u) => {
      const [{ count: programCount }] = await db
        .select({ count: count() })
        .from(programsTable)
        .where(eq(programsTable.universityId, u.id));
      return { ...u, programCount: Number(programCount) };
    })
  );
  
  res.json(withProgramCount);
});

router.get("/", async (req, res) => {
  const query = ListUniversitiesQueryParams.parse(req.query);
  
  let unis = await db.select().from(universitiesTable);
  
  if (query.province) {
    unis = unis.filter((u) => u.province === query.province);
  }
  if (query.type) {
    unis = unis.filter((u) => u.type === query.type);
  }
  if (query.search) {
    const s = query.search.toLowerCase();
    unis = unis.filter(
      (u) =>
        u.name.toLowerCase().includes(s) ||
        (u.shortName ?? "").toLowerCase().includes(s) ||
        u.city.toLowerCase().includes(s)
    );
  }

  const withProgramCount = await Promise.all(
    unis.map(async (u) => {
      const [{ count: programCount }] = await db
        .select({ count: count() })
        .from(programsTable)
        .where(eq(programsTable.universityId, u.id));
      return { ...u, programCount: Number(programCount) };
    })
  );

  res.json(withProgramCount);
});

router.get("/:universityId", async (req, res) => {
  const { universityId } = GetUniversityParams.parse(req.params);
  const uni = await db.query.universitiesTable.findFirst({
    where: eq(universitiesTable.id, universityId),
  });

  if (!uni) return res.status(404).json({ error: "Not found" });

  const [{ count: programCount }] = await db
    .select({ count: count() })
    .from(programsTable)
    .where(eq(programsTable.universityId, universityId));

  res.json({ ...uni, programCount: Number(programCount) });
});

router.get("/:universityId/programs", async (req, res) => {
  const { universityId } = ListProgramsParams.parse(req.params);
  const programs = await db
    .select()
    .from(programsTable)
    .where(eq(programsTable.universityId, universityId));
  res.json(programs);
});

export default router;
