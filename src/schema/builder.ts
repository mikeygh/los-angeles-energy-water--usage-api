import SchemaBuilder from "@pothos/core";
import PrismaPlugin from "@pothos/plugin-prisma";
import RelayPlugin from "@pothos/plugin-relay";
import type { PrismaTypesFromClient } from "@pothos/plugin-prisma";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

type PrismaTypes = PrismaTypesFromClient<typeof prisma>;

export interface PothosTypes {
  PrismaTypes: PrismaTypes;
  Context: {};
}

export const builder = new SchemaBuilder<PothosTypes>({
  plugins: [PrismaPlugin, RelayPlugin],
  prisma: {
    client: prisma,
    dmmf: Prisma.dmmf,
  },
  relay: {
    clientMutationId: "omit",
    cursorType: "String",
  },
});

builder.queryType({});
