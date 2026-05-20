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
      return prisma.building.findUnique({
        ...query,
        where: { id },
      });
    },
  })
);
