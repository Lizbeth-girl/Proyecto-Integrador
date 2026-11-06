
const pool = require("../config/database");

// Consultar todas las parcelas
const obtenerParcelas = async (req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT * FROM parcelas ORDER BY id_parcela"
        );

        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al consultar parcelas" });
    }
};

// Registrar parcela
const crearParcela = async (req, res) => {
    const { nombre, ubicacion, superficie, estado } = req.body;

    try {
        const resultado = await pool.query(
            `INSERT INTO parcelas (nombre, ubicacion, superficie, estado)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [nombre, ubicacion, superficie, estado]
        );

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al registrar parcela" });
    }
};

// Actualizar parcela
const actualizarParcela = async (req, res) => {
    const { id } = req.params;
    const { nombre, ubicacion, superficie, estado } = req.body;

    try {
        const resultado = await pool.query(
            `UPDATE parcelas
             SET nombre = $1, ubicacion = $2,
                 superficie = $3, estado = $4
             WHERE id_parcela = $5
             RETURNING *`,
            [nombre, ubicacion, superficie, estado, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: "Parcela no encontrada" });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar parcela" });
    }
};

// Eliminar parcela
const eliminarParcela = async (req, res) => {
    const { id } = req.params;

    try {
        const resultado = await pool.query(
            "DELETE FROM parcelas WHERE id_parcela = $1 RETURNING *",
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: "Parcela no encontrada" });
        }

        res.json({ mensaje: "Parcela eliminada correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "No se pudo eliminar la parcela. Puede tener registros asociados."
        });
    }
};

module.exports = {
    obtenerParcelas,
    crearParcela,
    actualizarParcela,
    eliminarParcela
};
