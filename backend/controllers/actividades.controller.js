const pool = require("../config/database");

// Verificar fechas con formato YYYY-MM-DD
function fechaValida(fecha) {
    if (typeof fecha !== "string") return false;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const [anio, mes, dia] = fecha.split("-").map(Number);
    const fechaUTC = new Date(Date.UTC(anio, mes - 1, dia));

    return (
        fechaUTC.getUTCFullYear() === anio &&
        fechaUTC.getUTCMonth() === mes - 1 &&
        fechaUTC.getUTCDate() === dia
    );
}

// Validar información antes de guardar
function validarActividad(datos) {
    const id = Number(datos.id_cultivo);
    const estados = ["Pendiente", "En proceso", "Completada"];

    if (!Number.isInteger(id) || id <= 0) {
        return "Selecciona un cultivo válido";
    }

    if (
        typeof datos.nombre !== "string" ||
        !datos.nombre.trim()
    ) {
        return "Ingresa el nombre de la actividad";
    }

    if (!fechaValida(datos.fecha_programada)) {
        return "Ingresa una fecha programada válida";
    }

    if (
        datos.fecha_realizada &&
        !fechaValida(datos.fecha_realizada)
    ) {
        return "La fecha realizada no es válida";
    }

    if (!estados.includes(datos.estado)) {
        return "Selecciona un estado válido";
    }

    if (
        datos.estado === "Completada" &&
        !datos.fecha_realizada
    ) {
        return "Indica cuándo se completó la actividad";
    }

    if (
        datos.estado !== "Completada" &&
        datos.fecha_realizada
    ) {
        return "La fecha realizada corresponde a una actividad completada";
    }

    return null;
}

// Gestionar errores de PostgreSQL
function errorBaseDatos(res, error) {
    console.error("Error en actividades:", error);

    if (error.code === "23503") {
        return res.status(409).json({
            error: "El cultivo no existe o la actividad tiene registros relacionados"
        });
    }

    if (
        error.code === "23502" ||
        error.code === "23514" ||
        error.code === "22001"
    ) {
        return res.status(400).json({
            error: "Los datos no cumplen las restricciones de la tabla"
        });
    }

    return res.status(500).json({
        error: "Error al procesar la actividad"
    });
}

// CONSULTAR ACTIVIDADES
const obtenerActividades = async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                a.id_actividad,
                a.id_cultivo,
                a.nombre,
                a.descripcion,
                TO_CHAR(a.fecha_programada, 'YYYY-MM-DD')
                    AS fecha_programada,
                TO_CHAR(a.fecha_realizada, 'YYYY-MM-DD')
                    AS fecha_realizada,
                a.estado,
                c.nombre AS cultivo,
                p.nombre AS parcela
            FROM actividades a
            INNER JOIN cultivos c
                ON a.id_cultivo = c.id_cultivo
            INNER JOIN parcelas p
                ON c.id_parcela = p.id_parcela
            ORDER BY a.fecha_programada DESC, a.id_actividad DESC
        `);

        res.json(resultado.rows);
    } catch (error) {
        errorBaseDatos(res, error);
    }
};

// REGISTRAR ACTIVIDAD
const crearActividad = async (req, res) => {
    const datos = req.body;
    const error = validarActividad(datos);

    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const resultado = await pool.query(`
            INSERT INTO actividades (
                id_cultivo,
                nombre,
                descripcion,
                fecha_programada,
                fecha_realizada,
                estado
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            Number(datos.id_cultivo),
            datos.nombre.trim(),
            datos.descripcion?.trim() || null,
            datos.fecha_programada,
            datos.fecha_realizada || null,
            datos.estado
        ]);

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        errorBaseDatos(res, error);
    }
};

// ACTUALIZAR ACTIVIDAD
const actualizarActividad = async (req, res) => {
    const { id } = req.params;
    const datos = req.body;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        return res.status(400).json({
            error: "Identificador inválido"
        });
    }

    const error = validarActividad(datos);

    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const resultado = await pool.query(`
            UPDATE actividades SET
                id_cultivo = $1,
                nombre = $2,
                descripcion = $3,
                fecha_programada = $4,
                fecha_realizada = $5,
                estado = $6
            WHERE id_actividad = $7
            RETURNING *
        `, [
            Number(datos.id_cultivo),
            datos.nombre.trim(),
            datos.descripcion?.trim() || null,
            datos.fecha_programada,
            datos.fecha_realizada || null,
            datos.estado,
            Number(id)
        ]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                error: "Actividad no encontrada"
            });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        errorBaseDatos(res, error);
    }
};

// ELIMINAR ACTIVIDAD
const eliminarActividad = async (req, res) => {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        return res.status(400).json({
            error: "Identificador inválido"
        });
    }

    try {
        const resultado = await pool.query(
            `DELETE FROM actividades
             WHERE id_actividad = $1
             RETURNING id_actividad`,
            [Number(id)]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                error: "Actividad no encontrada"
            });
        }

        res.json({
            mensaje: "Actividad eliminada correctamente"
        });
    } catch (error) {
        errorBaseDatos(res, error);
    }
};

module.exports = {
    obtenerActividades,
    crearActividad,
    actualizarActividad,
    eliminarActividad
};
