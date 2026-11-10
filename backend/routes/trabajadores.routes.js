
const express = require("express");
const router = express.Router();

const {
    obtenerTrabajadores,
    crearTrabajador,
    actualizarTrabajador,
    eliminarTrabajador
} = require("../controllers/trabajadores.controller");

router.get("/", obtenerTrabajadores);
router.post("/", crearTrabajador);
router.put("/:id", actualizarTrabajador);
router.delete("/:id", eliminarTrabajador);

module.exports = router;
