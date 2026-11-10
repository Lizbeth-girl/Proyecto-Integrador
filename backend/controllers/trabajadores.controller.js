
const pool = require("../config/database");

// VALIDAR INFORMACIÓN
function validarTrabajador(datos) {
    if (
        typeof datos.nombres !== "string" ||
        !datos.nombres.trim()
    ) {
        return "Ingresa los nombres del trabajador";
    }

    if (
        typeof datos.apellidos !== "string" ||
        !datos.apellidos.trim()
    ) {
        return "Ingresa los apellidos del trabajador";
    }

    if (
        datos.telefono != null &&
        typeof datos.telefono !== "string"
    ) {
        return "El teléfono debe ser texto";
    }

    if (
        datos.cargo != null &&
        typeof datos.cargo !== "string"
    ) {
        return "El cargo debe ser texto";
    }

    const estados = ["Activo", "Inactivo"];

    if (!estados.includes(datos.estado)) {
        return "Selecciona un estado válido";
    }

    const telefono = (datos.telefono || "").trim();

    if (telefono && !/^\+?[0-9\s-]{7,20}$/.test(telefono)) {
        return "Ingresa un teléfono válido";
    }

    return null;
}

// MANEJAR ERRORES
function manejarError(res, error) {
    console.error("Error en trabajadores:", error);

    if (error.code === "23503") {
        return res.status(409).json({
            error: "Este trabajador tiene registros relacionados. No puede eliminarse."
        });
    }

    if (
        ["23502", "23514", "22001", "22P02"]
            .includes(error.code)
    ) {
        return res.status(400).json({
            error: "Los datos no cumplen las restricciones de la tabla"
        });
    }

    return res.status(500).json({
        error: "Error al procesar el trabajador"
    });
}

// CONSULTAR TRABAJADORES
const obtenerTrabajadores = async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                id_trabajador,
                nombres,
                apellidos,
                telefono,
                cargo,
                estado,
                fecha_registro
            FROM trabajadores
            ORDER BY id_trabajador DESC
        `);

        res.json(resultado.rows);
    } catch (error) {
        manejarError(res, error);
    }
};

// REGISTRAR TRABAJADOR
const crearTrabajador = async (req, res) => {
    const datos = req.body;
    const error = validarTrabajador(datos);

    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const resultado = await pool.query(`
            INSERT INTO trabajadores (
                nombres,
                apellidos,
                telefono,
                cargo,
                estado
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            datos.nombres.trim(),
            datos.apellidos.trim(),
            datos.telefono?.trim() || null,
            datos.cargo?.trim() || null,
            datos.estado
        ]);

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        manejarError(res, error);
    }
};

// EDITAR TRABAJADOR
const actualizarTrabajador = async (req, res) => {
    const id = Number(req.params.id);
    const datos = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "Identificador inválido"
        });
    }

    const error = validarTrabajador(datos);

    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const resultado = await pool.query(`
            UPDATE trabajadores
            SET
                nombres = $1,
                apellidos = $2,
                telefono = $3,
                cargo = $4,
                estado = $5
            WHERE id_trabajador = $6
            RETURNING *
        `, [
            datos.nombres.trim(),
            datos.apellidos.trim(),
            datos.telefono?.trim() || null,
            datos.cargo?.trim() || null,
            datos.estado,
            id
        ]);

        if (!resultado.rows.length) {
            return res.status(404).json({
                error: "Trabajador no encontrado"
            });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        manejarError(res, error);
    }
};

// ELIMINAR TRABAJADOR
const eliminarTrabajador = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "Identificador inválido"
        });
    }

    try {
        const resultado = await pool.query(`
            DELETE FROM trabajadores
            WHERE id_trabajador = $1
            RETURNING id_trabajador
        `, [id]);

        if (!resultado.rows.length) {
            return res.status(404).json({
                error: "Trabajador no encontrado"
            });
        }

        res.json({
            mensaje: "Trabajador eliminado correctamente"
        });
    } catch (error) {
        manejarError(res, error);
    }
};

module.exports = {
    obtenerTrabajadores,
    crearTrabajador,
    actualizarTrabajador,
    eliminarTrabajador
};
