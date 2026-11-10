
const express = require("express");
const router = express.Router();

const {
    obtenerAsignaciones,
    crearAsignacion,
    actualizarAsignacion,
    eliminarAsignacion
} = require("../controllers/asignaciones.controller");

router.get("/", obtenerAsignaciones);
router.post("/", crearAsignacion);
router.put("/:id", actualizarAsignacion);
router.delete("/:id", eliminarAsignacion);

module.exports = router;
