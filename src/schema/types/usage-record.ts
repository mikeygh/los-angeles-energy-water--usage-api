import { builder } from "../builder.js";

builder.prismaObject("UsageRecord", {
  fields: (t) => ({
    id: t.exposeID("id"),
    buildingId: t.exposeInt("buildingId"),
    year: t.exposeInt("year"),
    energyStarScore: t.exposeInt("energyStarScore", { nullable: true }),
    siteEuiKbtuFt: t.exposeFloat("siteEuiKbtuFt", { nullable: true }),
    sourceEuiKbtuFt: t.exposeFloat("sourceEuiKbtuFt", { nullable: true }),
    weatherNormalizedSiteEuiKbtuFt: t.exposeFloat("weatherNormalizedSiteEuiKbtuFt", { nullable: true }),
    weatherNormalizedSourceEuiKbtuFt: t.exposeFloat("weatherNormalizedSourceEuiKbtuFt", { nullable: true }),
    waterUseAllSourcesKGal: t.exposeFloat("waterUseAllSourcesKGal", { nullable: true }),
    indirectGhgEmissionsMetricTonsCo2e: t.exposeFloat("indirectGhgEmissionsMetricTonsCo2e", { nullable: true }),
    directGhgEmissionsMetricTonsCo2e: t.exposeFloat("directGhgEmissionsMetricTonsCo2e", { nullable: true }),
    totalGhgEmissionsMetricTonsCo2e: t.exposeFloat("totalGhgEmissionsMetricTonsCo2e", { nullable: true }),
    totalGhgEmissionsIntensityKgCo2eFt: t.exposeFloat("totalGhgEmissionsIntensityKgCo2eFt", { nullable: true }),
    indoorWaterUseKGal: t.exposeFloat("indoorWaterUseKGal", { nullable: true }),
    building: t.relation("building"),
  }),
});
