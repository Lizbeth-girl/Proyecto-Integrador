
const express = require("express");
const router = express.Router();

const {
    obtenerVentas,
    obtenerDisponibilidad,
    crearVenta,
    anularVenta
} = require("../controllers/ventas.controller");

router.get("/disponibilidad", obtenerDisponibilidad);
router.get("/", obtenerVentas);
router.post("/", crearVenta);
router.patch("/:id/anular", anularVenta);

module.exports = router;
