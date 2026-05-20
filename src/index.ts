import { createYoga } from "graphql-yoga";
import { createServer } from "node:http";
import { builder } from "./schema/builder.js";

import "./schema/types/building.js";
import "./schema/types/usage-record.js";
import "./schema/types/department-stats.js";
import "./resolvers/building.js";
import "./resolvers/buildings.js";
import "./resolvers/usage-records.js";
import "./resolvers/departments.js";
import "./resolvers/department-stats.js";

const schema = builder.toSchema();

const yoga = createYoga({
  schema,
  graphiql: true,
  cors: {
    origin: "*",
    credentials: true,
  },
  healthCheckEndpoint: "/.well-known/apollo/health",
});

const server = createServer(yoga);

const port = parseInt(process.env.PORT ?? "4000", 10);
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/graphql`);
});
