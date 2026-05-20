import { builder } from "../builder.js";

builder.prismaObject("Building", {
  fields: (t) => ({
    id: t.exposeInt("id"),
    name: t.exposeString("name"),
    department: t.exposeString("department"),
    squareFootage: t.exposeInt("squareFootage", { nullable: true }),
    locationAddress: t.exposeString("locationAddress", { nullable: true }),
    locationCity: t.exposeString("locationCity", { nullable: true }),
    locationState: t.exposeString("locationState", { nullable: true }),
    locationZip: t.exposeString("locationZip", { nullable: true }),
    latitude: t.exposeFloat("latitude", { nullable: true }),
    longitude: t.exposeFloat("longitude", { nullable: true }),
    usageRecords: t.relation("usageRecords"),
  }),
});
