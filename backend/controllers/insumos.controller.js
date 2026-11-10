
const pool = require("../config/database");

// VALIDAR DATOS DEL INSUMO
function validarInsumo(datos) {
    if (
        typeof datos.nombre !== "string" ||
        !datos.nombre.trim()
    ) {
        return "Ingresa el nombre del insumo";
    }

    if (
        typeof datos.categoria !== "string" ||
        !datos.categoria.trim()
    ) {
        return "Selecciona una categoría";
    }

    if (
        typeof datos.unidad_medida !== "string" ||
        !datos.unidad_medida.trim()
    ) {
        return "Selecciona una unidad de medida";
    }

    const actual = Number(datos.stock_actual);
    const minimo = Number(datos.stock_minimo);

    if (
        datos.stock_actual === "" ||
        datos.stock_actual == null ||
        !Number.isFinite(actual) ||
        actual < 0
    ) {
        return "El stock actual debe ser un número igual o mayor a cero";
    }

    if (
        datos.stock_minimo === "" ||
        datos.stock_minimo == null ||
        !Number.isFinite(minimo) ||
        minimo < 0
    ) {
        return "El stock mínimo debe ser un número igual o mayor a cero";
    }

    if (
        datos.unidad_medida === "unidades" &&
        (!Number.isInteger(actual) || !Number.isInteger(minimo))
    ) {
        return "Para unidades debes ingresar cantidades enteras";
    }

    return null;
}

// MANEJAR ERRORES DE POSTGRESQL
function manejarError(res, error) {
    console.error("Error en insumos:", error);

    if (error.code === "23503") {
        return res.status(409).json({
            error: "No se puede eliminar este insumo porque tiene registros asociados"
        });
    }

    if (
        ["23502", "23514", "22001", "22003", "22P02"]
            .includes(error.code)
    ) {
        return res.status(400).json({
            error: "Los datos no cumplen las restricciones de la tabla"
        });
    }

    return res.status(500).json({
        error: "Error al procesar el insumo"
    });
}

// CONSULTAR INSUMOS
const obtenerInsumos = async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                id_insumo,
                nombre,
                categoria,
                unidad_medida,
                stock_actual,
                stock_minimo,
                fecha_registro
            FROM insumos
            ORDER BY id_insumo DESC
        `);

        res.json(resultado.rows);
    } catch (error) {
        manejarError(res, error);
    }
};

// REGISTRAR INSUMO
const crearInsumo = async (req, res) => {
    const datos = req.body;
    const error = validarInsumo(datos);

    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const resultado = await pool.query(`
            INSERT INTO insumos (
                nombre,
                categoria,
                unidad_medida,
                stock_actual,
                stock_minimo
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            datos.nombre.trim(),
            datos.categoria.trim(),
            datos.unidad_medida.trim(),
            Number(datos.stock_actual),
            Number(datos.stock_minimo)
        ]);

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        manejarError(res, error);
    }
};

// ACTUALIZAR INSUMO
const actualizarInsumo = async (req, res) => {
    const id = Number(req.params.id);
    const datos = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "Identificador inválido"
        });
    }

    const error = validarInsumo(datos);

    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const resultado = await pool.query(`
            UPDATE insumos
            SET
                nombre = $1,
                categoria = $2,
                unidad_medida = $3,
                stock_actual = $4,
                stock_minimo = $5
            WHERE id_insumo = $6
            RETURNING *
        `, [
            datos.nombre.trim(),
            datos.categoria.trim(),
            datos.unidad_medida.trim(),
            Number(datos.stock_actual),
            Number(datos.stock_minimo),
            id
        ]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                error: "Insumo no encontrado"
            });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        manejarError(res, error);
    }
};

// ELIMINAR INSUMO
const eliminarInsumo = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "Identificador inválido"
        });
    }

    try {
        const resultado = await pool.query(`
            DELETE FROM insumos
            WHERE id_insumo = $1
            RETURNING id_insumo
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                error: "Insumo no encontrado"
            });
        }

        res.json({
            mensaje: "Insumo eliminado correctamente"
        });
    } catch (error) {
        manejarError(res, error);
    }
};

module.exports = {
    obtenerInsumos,
    crearInsumo,
    actualizarInsumo,
    eliminarInsumo
};