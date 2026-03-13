require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/rfq", require("./routes/rfq.routes"));
app.use("/api/vendor", require("./routes/vendor.routes"));

app.listen(process.env.PORT, () => {
  console.log("Server running on port", process.env.PORT);
});