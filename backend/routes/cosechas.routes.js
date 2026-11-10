
const express = require("express");
const router = express.Router();

const {
    obtenerCosechas,
    crearCosecha,
    actualizarCosecha,
    eliminarCosecha
} = require("../controllers/cosechas.controller");

router.get("/", obtenerCosechas);
router.post("/", crearCosecha);
router.put("/:id", actualizarCosecha);
router.delete("/:id", eliminarCosecha);

module.exports = router;
