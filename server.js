import express from "express";
import "babel-polyfill";
import cors from "cors";
import env from "./env.js";
import compression from "compression";

import userRoutes from "./routes/userRoute";
import applicationRoutes from "./routes/applicationRoute";
import cvRoutes from "./routes/cvRoutes";
import jobsRoutes from "./routes/jobsRoute";
import companiesRoute from "./routes/companiesRoute";
import employerRoute from "./routes/employerRoute";
import contactRoutes from "./routes/contactRoutes"
import optionsRoutes from "./routes/optionsRoute";
import candidateRoutes from "./routes/candidateRoutes";
import adminRoutes from "./routes/adminRoute";
import subscriptionRoutes from "./routes/subscriptionRoute";
import paymentRoutes from "./routes/paymentRoute";
import interviewRoute from "./routes/interviewRoute";
import cvBuilderRoutes from "./routes/cvBuilderRoutes";
import messageRoutes from "./routes/messageRoutes";

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
app.use("/api", applicationRoutes);
app.use("/api", cvRoutes);
app.use("/api", jobsRoutes);
app.use("/api", companiesRoute);
app.use("/api", employerRoute);
app.use("/api", contactRoutes);
app.use("/api", optionsRoutes);
app.use("/api", candidateRoutes);
app.use("/api", adminRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", paymentRoutes);
app.use("/api", interviewRoute);
app.use("/api", cvBuilderRoutes);
app.use("/api", messageRoutes);


app.get("/", (req, res) => res.send(`Welcome to ${env.projectName} API`));

app.listen(env.port).on("listening", () => {
  console.log(`running server on port ${env.port}`);
});

// dbQuery.connect();

export default app;
