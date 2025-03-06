console.clear()
import express from "express";
import routes from "./routes";
import {PORT} from "./secrets";
import {connectDB} from "./lib/db";

const app = express();

app.use("/api", routes);

app.listen(PORT, () => {
  console.log("Server is listening on port: ", PORT);
  connectDB()
});
