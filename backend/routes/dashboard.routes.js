import express from "express";
const Router = express.Router()




import {
    getDashboardData
} from "../controller/dashboard.controller.js";
import { authenticateUser } from "../utils/middlewere.js";


Router.get("/",authenticateUser,getDashboardData)



export default Router;

