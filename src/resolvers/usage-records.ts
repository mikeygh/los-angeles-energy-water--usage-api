import { builder } from "../schema/builder.js";
import { prisma } from "../db.js";
import { Prisma } from "@prisma/client";

const UsageRecordOrderBy = builder.enumType("UsageRecordOrderBy", {
  values: [
    "YEAR_ASC",
    "YEAR_DESC",
    "ENERGY_SCORE_DESC",
    "EMISSIONS_DESC",
    "WATER_USE_DESC",
  ] as const,
});

const UsageRecordFilter = builder.inputType("UsageRecordFilter", {
  fields: (t) => ({
    department: t.string({ required: false }),
    year: t.int({ required: false }),
    minEnergyScore: t.int({ required: false }),
    maxEnergyScore: t.int({ required: false }),
  }),
});

builder.queryField("usageRecords", (t) =>
  t.prismaConnection(
    {
      type: "UsageRecord",
      cursor: "id",
      maxSize: 100,
      args: {
        filter: t.arg({ type: UsageRecordFilter, required: false }),
        orderBy: t.arg({ type: UsageRecordOrderBy, required: false }),
      },
      resolve: (query, _parent, args) => {
        const filter = args.filter ?? {};
        const where: Prisma.UsageRecordWhereInput = {};

        if (filter.year) {
          where.year = filter.year;
        }
        if (filter.department) {
          where.building = { department: filter.department };
        }
        if (filter.minEnergyScore != null) {
          where.energyStarScore = { gte: filter.minEnergyScore };
        }
        if (filter.maxEnergyScore != null) {
          where.energyStarScore = { ...((where.energyStarScore as object) || {}), lte: filter.maxEnergyScore };
        }

        const orderBy = parseOrderBy(args.orderBy ?? undefined);

        return prisma.usageRecord.findMany({ ...query, where, orderBy });
      },
    }
  )
);

function parseOrderBy(orderBy?: typeof UsageRecordOrderBy.$inferType): Prisma.UsageRecordOrderByWithRelationInput {
  switch (orderBy) {
    case "YEAR_ASC": return { year: "asc" };
    case "YEAR_DESC": return { year: "desc" };
    case "ENERGY_SCORE_DESC": return { energyStarScore: "desc" };
    case "EMISSIONS_DESC": return { totalGhgEmissionsMetricTonsCo2e: "desc" };
    case "WATER_USE_DESC": return { waterUseAllSourcesKGal: "desc" };
    default: return { id: "asc" };
  }
}
