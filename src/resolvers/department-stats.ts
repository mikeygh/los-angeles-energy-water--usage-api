import { builder } from "../schema/builder.js";
import { prisma } from "../db.js";
import { DepartmentStatsRef } from "../schema/types/department-stats.js";

builder.queryField("departmentStats", (t) =>
  t.field({
    type: DepartmentStatsRef,
    args: {
      department: t.arg.string({ required: true }),
      year: t.arg.int({ required: false }),
    },
    nullable: true,
    resolve: async (_parent, { department, year }) => {
      const buildings = await prisma.building.findMany({
        where: { department },
        select: { id: true },
      });

      if (buildings.length === 0) {
        return null;
      }

      const recordWhere: { buildingId: { in: number[] }; year?: number } = {
        buildingId: { in: buildings.map((b) => b.id) },
      };
      if (year) {
        recordWhere.year = year;
      }

      const records = await prisma.usageRecord.findMany({
        where: recordWhere,
      });

      if (records.length === 0) {
        return null;
      }

      const avg = (vals: (number | null)[]): number | null => {
        const nums = vals.filter((v): v is number => v !== null);
        return nums.length > 0
          ? nums.reduce((a, b) => a + b, 0) / nums.length
          : null;
      };

      const sum = (vals: (number | null)[]): number | null => {
        const nums = vals.filter((v): v is number => v !== null);
        return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : null;
      };

      return {
        department,
        year: year ?? null,
        buildingCount: records.length,
        totalSiteEui: sum(records.map((r) => r.siteEuiKbtuFt)),
        totalSourceEui: sum(records.map((r) => r.sourceEuiKbtuFt)),
        totalWaterKGal: sum(records.map((r) => r.waterUseAllSourcesKGal)),
        totalGhgEmissions: sum(records.map((r) => r.totalGhgEmissionsMetricTonsCo2e)),
        avgEnergyStarScore: avg(records.map((r) => r.energyStarScore)),
        avgSiteEui: avg(records.map((r) => r.siteEuiKbtuFt)),
        avgWaterUse: avg(records.map((r) => r.waterUseAllSourcesKGal)),
      };
    },
  })
);
