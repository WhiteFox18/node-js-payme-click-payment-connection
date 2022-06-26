import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import {queryParser} from "express-query-parser";
import express from "express";
import logger from "morgan";
import indexRouter from "./routes"
import {errorHandling} from "./modules/helpers";


dotenv.config();

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(
  queryParser({
    parseNull: true,
    parseUndefined: true,
    parseBoolean: true,
    parseNumber: true
  })
)

// Routes
app.use("/api", indexRouter)

// Error Handling
app.use(errorHandling)

export default app;
