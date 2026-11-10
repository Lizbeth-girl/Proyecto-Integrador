
const express = require("express");
const router = express.Router();

const {
    obtenerActividades,
    crearActividad,
    actualizarActividad,
    eliminarActividad
} = require("../controllers/actividades.controller");

// Listar actividades
router.get("/", obtenerActividades);

// Registrar actividad
router.post("/", crearActividad);

// Actualizar actividad
router.put("/:id", actualizarActividad);

// Eliminar actividad
router.delete("/:id", eliminarActividad);

module.exports = router;
