import express from "express";
import "babel-polyfill";
import cors from "cors";
import env from "./env.js";
import compression from "compression";

import userRoutes from "./routes/userRoutes";

const isProduction = process.env.NODE_ENV === "production";

const whitelist = ["http://localhost:4200", "http://localhost:3000"];

// const corsOption = {
//     origin: function (origin, callback) {
//         if (whitelist.indexOf(origin) !== -1) {
//             callback(null, true);
//         } else {
//             callback(new Error(`Not allowed by CORS, origin: ${origin}`))
//         }
//     }
// };

const app = express();
app.use(compression());
// if(isProduction) { //bring back if fix
app.use(cors());
// }
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.enable("trust proxy");

app.use("/api", userRoutes);

app.get("/", (req, res) => res.send("Welcome to Get Hired API"));

app.listen(env.port).on("listening", () => {
  console.log(`running server on port ${env.port}`);
});

// dbQuery.connect();

export default app;
