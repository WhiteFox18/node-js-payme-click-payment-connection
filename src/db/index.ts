import * as promise from "bluebird"; // best promise library today
import pgPromise, { IDatabase } from "pg-promise";
import dotenv from "dotenv";
import PayMeService from "../services/PayMeService";
import ClickService from "../services/ClickService";

dotenv.config();

interface IExtensions {
  payme: PayMeService,
  click: ClickService
}

export type ExtendedDatabase = IDatabase<IExtensions> & IExtensions

const initOptions: any = {

  // Using a custom promise library, instead of the default ES6 Promise:
  promiseLib: promise,

  // Extending the database protocol with our custom repositories;
  // API: http://vitaly-t.github.io/pg-promise/global.html#event:extend
  extend(db: ExtendedDatabase, dc: any) {
    // Database Context (dc) is mainly needed for extending multiple databases with different access API.

    // Do not use 'require()' here, because this event occurs for every task and transaction being executed,
    // which should be as fast as possible.
    //  TODO: Create repo classes that include only SQL queries as methods and extend obj with repos
    db.payme = new PayMeService({ db, pgp });
    db.click = new ClickService({ db, pgp });
  },
};

const pgp = pgPromise(initOptions);

const connectionObject = {
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  port: Number(process.env.DATABASE_PORT),
};

const db: ExtendedDatabase = pgp(connectionObject);

export default db;
export { pgp };