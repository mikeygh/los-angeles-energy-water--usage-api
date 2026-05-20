import { builder } from "../builder.js";

export interface DepartmentStatsShape {
  department: string;
  year: number | null;
  buildingCount: number;
  totalSiteEui: number | null;
  totalSourceEui: number | null;
  totalWaterKGal: number | null;
  totalGhgEmissions: number | null;
  avgEnergyStarScore: number | null;
  avgSiteEui: number | null;
  avgWaterUse: number | null;
}

export const DepartmentStatsRef = builder.objectRef<DepartmentStatsShape>("DepartmentStats");

builder.objectType(DepartmentStatsRef, {
  fields: (t) => ({
    department: t.exposeString("department"),
    year: t.exposeInt("year", { nullable: true }),
    buildingCount: t.exposeInt("buildingCount"),
    totalSiteEui: t.exposeFloat("totalSiteEui", { nullable: true }),
    totalSourceEui: t.exposeFloat("totalSourceEui", { nullable: true }),
    totalWaterKGal: t.exposeFloat("totalWaterKGal", { nullable: true }),
    totalGhgEmissions: t.exposeFloat("totalGhgEmissions", { nullable: true }),
    avgEnergyStarScore: t.exposeFloat("avgEnergyStarScore", { nullable: true }),
    avgSiteEui: t.exposeFloat("avgSiteEui", { nullable: true }),
    avgWaterUse: t.exposeFloat("avgWaterUse", { nullable: true }),
  }),
});
