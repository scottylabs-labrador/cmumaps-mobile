import { sql } from "drizzle-orm";
import { db } from "../db.ts";

export const dropTablesService = {
  dropTables: async (tableNames: string[]) => {
    const statement = `TRUNCATE TABLE ${tableNames.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`;
    await db.execute(sql.raw(statement));
  },
};
