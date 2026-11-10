
const pool = require("../config/database");

// VALIDAR INFORMACIÓN DEL CLIENTE
function validarCliente(datos) {
    if (
        typeof datos.nombre !== "string" ||
        !datos.nombre.trim()
    ) {
        return "Ingresa el nombre completo del cliente";
    }

    const camposOpcionales = [
        "identificacion",
        "telefono",
        "direccion",
        "correo"
    ];

    for (const campo of camposOpcionales) {
        if (
            datos[campo] != null &&
            typeof datos[campo] !== "string"
        ) {
            return `El campo ${campo} debe ser texto`;
        }
    }

    const telefono = (datos.telefono || "").trim();
    const correo = (datos.correo || "").trim();

    if (
        telefono &&
        !/^\+?[0-9\s-]{7,20}$/.test(telefono)
    ) {
        return "Ingresa un número telefónico válido";
    }

    if (
        correo &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
    ) {
        return "Ingresa un correo electrónico válido";
    }

    return null;
}

// MANEJAR ERRORES
function manejarError(res, error) {
    console.error("Error en clientes:", error);

    if (error.code === "23503") {
        return res.status(409).json({
            error: "El cliente tiene registros relacionados y no puede eliminarse"
        });
    }

    if (error.code === "23505") {
        return res.status(409).json({
            error: "Ya existe un cliente con ese dato único"
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
        error: "Error al procesar el cliente"
    });
}

// CONSULTAR CLIENTES
const obtenerClientes = async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                id_cliente,
                nombre,
                identificacion,
                telefono,
                direccion,
                correo,
                fecha_registro
            FROM clientes
            ORDER BY id_cliente DESC
        `);

        res.json(resultado.rows);

    } catch (error) {
        manejarError(res, error);
    }
};

// CREAR CLIENTE
const crearCliente = async (req, res) => {
    const datos = req.body;
    const error = validarCliente(datos);

    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const resultado = await pool.query(`
            INSERT INTO clientes (
                nombre,
                identificacion,
                telefono,
                direccion,
                correo
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            datos.nombre.trim(),
            datos.identificacion?.trim() || null,
            datos.telefono?.trim() || null,
            datos.direccion?.trim() || null,
            datos.correo?.trim() || null
        ]);

        res.status(201).json(resultado.rows[0]);

    } catch (error) {
        manejarError(res, error);
    }
};

// ACTUALIZAR CLIENTE
const actualizarCliente = async (req, res) => {
    const id = Number(req.params.id);
    const datos = req.body;

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "Identificador inválido"
        });
    }

    const error = validarCliente(datos);

    if (error) {
        return res.status(400).json({ error });
    }

    try {
        const resultado = await pool.query(`
            UPDATE clientes
            SET
                nombre = $1,
                identificacion = $2,
                telefono = $3,
                direccion = $4,
                correo = $5
            WHERE id_cliente = $6
            RETURNING *
        `, [
            datos.nombre.trim(),
            datos.identificacion?.trim() || null,
            datos.telefono?.trim() || null,
            datos.direccion?.trim() || null,
            datos.correo?.trim() || null,
            id
        ]);

        if (!resultado.rows.length) {
            return res.status(404).json({
                error: "Cliente no encontrado"
            });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        manejarError(res, error);
    }
};

// ELIMINAR CLIENTE
const eliminarCliente = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "Identificador inválido"
        });
    }

    try {
        const resultado = await pool.query(`
            DELETE FROM clientes
            WHERE id_cliente = $1
            RETURNING id_cliente
        `, [id]);

        if (!resultado.rows.length) {
            return res.status(404).json({
                error: "Cliente no encontrado"
            });
        }

        res.json({
            mensaje: "Cliente eliminado correctamente"
        });

    } catch (error) {
        manejarError(res, error);
    }
};

module.exports = {
    obtenerClientes,
    crearCliente,
    actualizarCliente,
    eliminarCliente
};
