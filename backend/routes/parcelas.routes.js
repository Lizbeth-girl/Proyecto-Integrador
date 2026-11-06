
const express = require("express");
const router = express.Router();

const {
    obtenerParcelas,
    crearParcela,
    actualizarParcela,
    eliminarParcela
} = require("../controllers/parcelas.controller");

router.get("/", obtenerParcelas);
router.post("/", crearParcela);
router.put("/:id", actualizarParcela);
router.delete("/:id", eliminarParcela);

module.exports = router;
