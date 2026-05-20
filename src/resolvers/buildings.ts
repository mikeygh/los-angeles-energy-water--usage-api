import { GraphQLError } from "graphql";
import { builder } from "../schema/builder.js";
import { prisma } from "../db.js";
import { Prisma } from "@prisma/client";

const BuildingOrderBy = builder.enumType("BuildingOrderBy", {
  values: ["NAME_ASC", "NAME_DESC", "DEPARTMENT_ASC", "DEPARTMENT_DESC"] as const,
});

const BuildingFilter = builder.inputType("BuildingFilter", {
  fields: (t) => ({
    department: t.string({ required: false }),
    year: t.int({ required: false }),
    nameContains: t.string({ required: false }),
    minEnergyScore: t.int({ required: false }),
    maxEnergyScore: t.int({ required: false }),
  }),
});

builder.queryField("buildings", (t) =>
  t.prismaConnection(
    {
      type: "Building",
      cursor: "id",
      maxSize: 100,
      args: {
        filter: t.arg({ type: BuildingFilter, required: false }),
        orderBy: t.arg({ type: BuildingOrderBy, required: false }),
      },
      resolve: (query, _parent, args) => {
        const filter = args.filter ?? {};
        const where: Prisma.BuildingWhereInput = {};

        if (filter.department) {
          where.department = filter.department;
        }
        if (filter.nameContains) {
          where.name = { contains: filter.nameContains, mode: "insensitive" };
        }
        if (filter.year || filter.minEnergyScore != null || filter.maxEnergyScore != null) {
          where.usageRecords = {};
          const recordFilters: Prisma.UsageRecordWhereInput[] = [];
          if (filter.year) {
            if (filter.year !== 2014 && filter.year !== 2015) {
              throw new GraphQLError("Year must be 2014 or 2015", {
                extensions: { code: "INVALID_YEAR" },
              });
            }
            recordFilters.push({ year: filter.year });
          }
          if (filter.minEnergyScore != null) {
            if (filter.minEnergyScore < 0 || filter.minEnergyScore > 100) {
              throw new GraphQLError("minEnergyScore must be between 0 and 100", {
                extensions: { code: "INVALID_SCORE" },
              });
            }
            recordFilters.push({ energyStarScore: { gte: filter.minEnergyScore } });
          }
          if (filter.maxEnergyScore != null) {
            if (filter.maxEnergyScore < 0 || filter.maxEnergyScore > 100) {
              throw new GraphQLError("maxEnergyScore must be between 0 and 100", {
                extensions: { code: "INVALID_SCORE" },
              });
            }
            recordFilters.push({ energyStarScore: { lte: filter.maxEnergyScore } });
          }
          where.usageRecords = { some: { AND: recordFilters } };
        }

        const orderBy = parseOrderBy(args.orderBy ?? undefined);

        return prisma.building.findMany({ ...query, where, orderBy });
      },
    }
  )
);

function parseOrderBy(orderBy?: typeof BuildingOrderBy.$inferType): Prisma.BuildingOrderByWithRelationInput {
  switch (orderBy) {
    case "NAME_ASC": return { name: "asc" };
    case "NAME_DESC": return { name: "desc" };
    case "DEPARTMENT_ASC": return { department: "asc" };
    case "DEPARTMENT_DESC": return { department: "desc" };
    default: return { id: "asc" };
  }
}
