
const express = require("express");
const router = express.Router();

const {
    obtenerCultivos,
    crearCultivo,
    actualizarCultivo,
    eliminarCultivo
} = require("../controllers/cultivos.controller");

router.get("/", obtenerCultivos);
router.post("/", crearCultivo);
router.put("/:id", actualizarCultivo);
router.delete("/:id", eliminarCultivo);

module.exports = router;
