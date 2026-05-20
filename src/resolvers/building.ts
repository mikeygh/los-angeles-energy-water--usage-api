import { GraphQLError } from "graphql";
import { builder } from "../schema/builder.js";
import { prisma } from "../db.js";

builder.queryField("building", (t) =>
  t.prismaField({
    type: "Building",
    args: {
      id: t.arg.int({ required: true }),
    },
    nullable: true,
    resolve: async (query, _parent, { id }) => {
      const building = await prisma.building.findUnique({
        ...query,
        where: { id },
      });
      if (!building) {
        throw new GraphQLError("Building not found", {
          extensions: { code: "BUILDING_NOT_FOUND" },
        });
      }
      return building;
    },
  })
);
