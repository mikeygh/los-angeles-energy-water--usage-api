import { builder } from "../schema/builder.js";
import { prisma } from "../db.js";

builder.queryField("departments", (t) =>
  t.field({
    type: ["String"],
    resolve: async () => {
      const result = await prisma.building.findMany({
        select: { department: true },
        distinct: ["department"],
        orderBy: { department: "asc" },
      });
      return result.map((r) => r.department);
    },
  })
);
