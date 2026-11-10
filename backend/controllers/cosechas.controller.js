
const pool = require("../config/database");

// Validar fecha real
function fechaValida(valor) {
    if (typeof valor !== "string") return false;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return false;
    }

    const [anio, mes, dia] = valor.split("-").map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));

    return (
        fecha.getUTCFullYear() === anio &&
        fecha.getUTCMonth() === mes - 1 &&
        fecha.getUTCDate() === dia
    );
}

// Validar datos de cosecha
function validarCosecha(datos) {
    const idCultivo = Number(datos.id_cultivo);
    const cantidad = Number(datos.cantidad);

    if (!Number.isInteger(idCultivo) || idCultivo <= 0) {
        return "Selecciona un cultivo válido";
    }

    if (!fechaValida(datos.fecha_cosecha)) {
        return "Ingresa una fecha de cosecha válida";
    }

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return "La cantidad debe ser mayor a cero";
    }

    const unidades = ["kg", "toneladas", "quintales", "unidades"];

    if (!unidades.includes(datos.unidad_medida)) {
        return "Selecciona una unidad de medida válida";
    }

    if (
        datos.observaciones != null &&
        typeof datos.observaciones !== "string"
    ) {
        return "Las observaciones deben ser texto";
    }

    return null;
}

// Manejo de errores
function manejarError(res, error) {
    console.error("Error en cosechas:", error);

    if (error.code === "23503") {
        return res.status(409).json({
            error: "El cultivo no existe o la cosecha tiene registros asociados"
        });
    }

    if (
        ["23502", "23514", "22001", "22003"].includes(error.code)
    ) {
        return res.status(400).json({
            error: "Los datos no cumplen las restricciones de la tabla"
        });
    }

    return res.status(500).json({
        error: "Error al procesar la cosecha"
    });
}

// LISTAR COSECHAS
const obtenerCosechas = async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                co.id_cosecha,
                co.id_cultivo,
                TO_CHAR(co.fecha_cosecha, 'YYYY-MM-DD')
                    AS fecha_cosecha,
                co.cantidad,
                co.unidad_medida,
                co.observaciones,
                cu.nombre AS cultivo,
                p.nombre AS parcela
            FROM cosechas co
            INNER JOIN cultivos cu
                ON co.id_cultivo = cu.id_cultivo
            INNER JOIN parcelas p
                ON cu.id_parcela = p.id_parcela
            ORDER BY co.fecha_cosecha DESC, co.id_cosecha DESC
        `);

        res.json(resultado.rows);
    } catch (error) {
        manejarError(res, error);
    }
};

// REGISTRAR COSECHA
const crearCosecha = async (req, res) => {
    const datos = req.body;
    const error = validarCosecha(datos);

    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const resultado = await pool.query(`
            INSERT INTO cosechas (
                id_cultivo,
                fecha_cosecha,
                cantidad,
                unidad_medida,
                observaciones
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            Number(datos.id_cultivo),
            datos.fecha_cosecha,
            Number(datos.cantidad),
            datos.unidad_medida,
            datos.observaciones?.trim() || null
        ]);

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        manejarError(res, error);
    }
};

// ACTUALIZAR COSECHA
const actualizarCosecha = async (req, res) => {
    const id = Number(req.params.id);
    const datos = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "Identificador de cosecha inválido"
        });
    }

    const error = validarCosecha(datos);

    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const resultado = await pool.query(`
            UPDATE cosechas
            SET
                id_cultivo = $1,
                fecha_cosecha = $2,
                cantidad = $3,
                unidad_medida = $4,
                observaciones = $5
            WHERE id_cosecha = $6
            RETURNING *
        `, [
            Number(datos.id_cultivo),
            datos.fecha_cosecha,
            Number(datos.cantidad),
            datos.unidad_medida,
            datos.observaciones?.trim() || null,
            id
        ]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                error: "Cosecha no encontrada"
            });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        manejarError(res, error);
    }
};

// ELIMINAR COSECHA
const eliminarCosecha = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "Identificador de cosecha inválido"
        });
    }

    try {
        const resultado = await pool.query(
            `DELETE FROM cosechas
             WHERE id_cosecha = $1
             RETURNING id_cosecha`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                error: "Cosecha no encontrada"
            });
        }

        res.json({
            mensaje: "Cosecha eliminada correctamente"
        });
    } catch (error) {
        manejarError(res, error);
    }
};

module.exports = {
    obtenerCosechas,
    crearCosecha,
    actualizarCosecha,
    eliminarCosecha
};
