import db, {pg} from "../db";
import Payme from "./PayMeService";

export const Dummy = new Payme({db, pg})