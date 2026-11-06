
const pool = require("../config/database");

const columnas = `
    id_cultivo, id_parcela, nombre, fecha_siembra,
    fecha_cosecha_estimada, estado, observaciones
`;

const validar = (datos) => {
    const { id_parcela, nombre, fecha_siembra,
        fecha_cosecha_estimada, estado } = datos;

    if (!Number.isInteger(Number(id_parcela)) ||
        Number(id_parcela) <= 0 ||
        !nombre?.trim() || !fecha_siembra || !estado?.trim()) {
        return "Completa correctamente los campos obligatorios";
    }

    if (fecha_cosecha_estimada &&
        fecha_cosecha_estimada < fecha_siembra) {
        return "La cosecha estimada no puede ser anterior a la siembra";
    }

    return null;
};

const manejarError = (res, error) => {
    console.error(error);

    if (error.code === "23503") {
        return res.status(409).json({
            error: "La parcela no existe o el cultivo tiene registros asociados"
        });
    }

    if (error.code === "23502" || error.code === "23514") {
        return res.status(400).json({
            error: "Los datos no cumplen las condiciones de la tabla"
        });
    }

    res.status(500).json({ error: "Error en la base de datos" });
};

const obtenerCultivos = async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT c.*, p.nombre AS parcela
            FROM cultivos c
            JOIN parcelas p ON c.id_parcela = p.id_parcela
            ORDER BY c.id_cultivo
        `);

        res.json(resultado.rows);
    } catch (error) {
        manejarError(res, error);
    }
};

const crearCultivo = async (req, res) => {
    const datos = req.body;
    const error = validar(datos);

    if (error) return res.status(400).json({ error });

    try {
        const resultado = await pool.query(`
            INSERT INTO cultivos (
                id_parcela, nombre, fecha_siembra,
                fecha_cosecha_estimada, estado, observaciones
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            datos.id_parcela,
            datos.nombre.trim(),
            datos.fecha_siembra,
            datos.fecha_cosecha_estimada || null,
            datos.estado,
            datos.observaciones || null
        ]);

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        manejarError(res, error);
    }
};

const actualizarCultivo = async (req, res) => {
    const { id } = req.params;
    const datos = req.body;
    const error = validar(datos);

    if (error) return res.status(400).json({ error });

    try {
        const resultado = await pool.query(`
            UPDATE cultivos SET
                id_parcela = $1,
                nombre = $2,
                fecha_siembra = $3,
                fecha_cosecha_estimada = $4,
                estado = $5,
                observaciones = $6
            WHERE id_cultivo = $7
            RETURNING *
        `, [
            datos.id_parcela,
            datos.nombre.trim(),
            datos.fecha_siembra,
            datos.fecha_cosecha_estimada || null,
            datos.estado,
            datos.observaciones || null,
            id
        ]);

        if (!resultado.rows.length) {
            return res.status(404).json({
                error: "Cultivo no encontrado"
            });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        manejarError(res, error);
    }
};

const eliminarCultivo = async (req, res) => {
    try {
        const resultado = await pool.query(
            "DELETE FROM cultivos WHERE id_cultivo = $1 RETURNING id_cultivo",
            [req.params.id]
        );

        if (!resultado.rows.length) {
            return res.status(404).json({
                error: "Cultivo no encontrado"
            });
        }

        res.json({ mensaje: "Cultivo eliminado correctamente" });
    } catch (error) {
        manejarError(res, error);
    }
};

module.exports = {
    obtenerCultivos,
    crearCultivo,
    actualizarCultivo,
    eliminarCultivo
};
