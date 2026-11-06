
require("dotenv").config();

const express = require("express");
const path = require("path");

const parcelasRoutes = require("./routes/parcelas.routes");
const cultivosRoutes = require("./routes/cultivos.routes");

const app = express();

app.use(express.json());

app.use(express.static(
    path.join(__dirname, "../frontend")
));

app.use("/api/parcelas", parcelasRoutes);
app.use("/api/cultivos", cultivosRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
});
