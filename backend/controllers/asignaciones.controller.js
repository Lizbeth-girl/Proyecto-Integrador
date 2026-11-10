
const pool = require("../config/database");

// VALIDAR IDENTIFICADORES
function idValido(valor) {
    const id = Number(valor);
    return Number.isSafeInteger(id) && id > 0;
}

function manejarError(res, error) {
    console.error("Error en asignaciones:", error);

    if (error.code === "23503") {
        return res.status(409).json({
            error: "La actividad o el trabajador no existe, o tiene registros relacionados."
        });
    }

    if (error.code === "23505") {
        return res.status(409).json({
            error: "Esta asignación ya existe."
        });
    }

    return res.status(500).json({
        error: "Error al procesar la asignación"
    });
}

// CONSULTAR ASIGNACIONES
const obtenerAsignaciones = async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                asi.id_asignacion,
                asi.id_actividad,
                asi.id_trabajador,
                a.nombre AS actividad,
                a.estado AS estado_actividad,
                TO_CHAR(a.fecha_programada, 'YYYY-MM-DD')
                    AS fecha_programada,
                c.nombre AS cultivo,
                p.nombre AS parcela,
                t.nombres,
                t.apellidos,
                t.cargo,
                t.estado AS estado_trabajador
            FROM asignaciones asi
            INNER JOIN actividades a
                ON asi.id_actividad = a.id_actividad
            INNER JOIN cultivos c
                ON a.id_cultivo = c.id_cultivo
            INNER JOIN parcelas p
                ON c.id_parcela = p.id_parcela
            INNER JOIN trabajadores t
                ON asi.id_trabajador = t.id_trabajador
            ORDER BY asi.id_asignacion DESC
        `);

        res.json(resultado.rows);
    } catch (error) {
        manejarError(res, error);
    }
};

// COMPROBAR DATOS ANTES DE GUARDAR
async function comprobarAsignacion(idActividad, idTrabajador, idExcluir = 0) {
    const actividad = await pool.query(
        `SELECT id_actividad
         FROM actividades
         WHERE id_actividad = $1`,
        [idActividad]
    );

    if (!actividad.rows.length) {
        return "La actividad seleccionada no existe";
    }

    const trabajador = await pool.query(
        `SELECT estado
         FROM trabajadores
         WHERE id_trabajador = $1`,
        [idTrabajador]
    );

    if (!trabajador.rows.length) {
        return "El trabajador seleccionado no existe";
    }

    if (trabajador.rows[0].estado !== "Activo") {
        return "Solo puedes asignar trabajadores activos";
    }

    const duplicado = await pool.query(`
        SELECT id_asignacion
        FROM asignaciones
        WHERE id_actividad = $1
          AND id_trabajador = $2
          AND id_asignacion <> $3
        LIMIT 1
    `, [idActividad, idTrabajador, idExcluir]);

    if (duplicado.rows.length) {
        return "Este trabajador ya está asignado a esa actividad";
    }

    return null;
}

// CREAR ASIGNACIÓN
const crearAsignacion = async (req, res) => {
    const { id_actividad, id_trabajador } = req.body;

    if (!idValido(id_actividad) || !idValido(id_trabajador)) {
        return res.status(400).json({
            error: "Selecciona una actividad y un trabajador válidos"
        });
    }

    try {
        const error = await comprobarAsignacion(
            Number(id_actividad),
            Number(id_trabajador)
        );

        if (error) {
            return res.status(400).json({ error });
        }

        const resultado = await pool.query(`
            INSERT INTO asignaciones (
                id_actividad,
                id_trabajador
            )
            VALUES ($1, $2)
            RETURNING *
        `, [
            Number(id_actividad),
            Number(id_trabajador)
        ]);

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        manejarError(res, error);
    }
};

// ACTUALIZAR ASIGNACIÓN
const actualizarAsignacion = async (req, res) => {
    const id = Number(req.params.id);
    const { id_actividad, id_trabajador } = req.body;

    if (
        !idValido(id) ||
        !idValido(id_actividad) ||
        !idValido(id_trabajador)
    ) {
        return res.status(400).json({
            error: "Los identificadores son inválidos"
        });
    }

    try {
        const anterior = await pool.query(
            `SELECT * FROM asignaciones
             WHERE id_asignacion = $1`,
            [id]
        );

        if (!anterior.rows.length) {
            return res.status(404).json({
                error: "Asignación no encontrada"
            });
        }

        const registro = anterior.rows[0];

        // Permitir guardar sin cambios asignaciones antiguas
        if (
            registro.id_actividad === Number(id_actividad) &&
            registro.id_trabajador === Number(id_trabajador)
        ) {
            return res.json(registro);
        }

        const error = await comprobarAsignacion(
            Number(id_actividad),
            Number(id_trabajador),
            id
        );

        if (error) {
            return res.status(400).json({ error });
        }

        const resultado = await pool.query(`
            UPDATE asignaciones
            SET
                id_actividad = $1,
                id_trabajador = $2
            WHERE id_asignacion = $3
            RETURNING *
        `, [
            Number(id_actividad),
            Number(id_trabajador),
            id
        ]);

        res.json(resultado.rows[0]);
    } catch (error) {
        manejarError(res, error);
    }
};

// ELIMINAR ASIGNACIÓN
const eliminarAsignacion = async (req, res) => {
    const id = Number(req.params.id);

    if (!idValido(id)) {
        return res.status(400).json({
            error: "Identificador inválido"
        });
    }

    try {
        const resultado = await pool.query(`
            DELETE FROM asignaciones
            WHERE id_asignacion = $1
            RETURNING id_asignacion
        `, [id]);

        if (!resultado.rows.length) {
            return res.status(404).json({
                error: "Asignación no encontrada"
            });
        }

        res.json({
            mensaje: "Asignación eliminada correctamente"
        });
    } catch (error) {
        manejarError(res, error);
    }
};

module.exports = {
    obtenerAsignaciones,
    crearAsignacion,
    actualizarAsignacion,
    eliminarAsignacion
};
