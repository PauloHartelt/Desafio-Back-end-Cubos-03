const jwt = require("jsonwebtoken"),
  conexao = require("../conexao"),
  segredo = require("../segredo");

const validarToken = async (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).json({ mensagem: "O usuário deve estar logado" });
  }
  try {
    const token = authorization.replace("Bearer ", "").trim();
    let usuario = jwt.verify(token, segredo);
    let { rows } = await conexao.query("SELECT * FROM usuarios WHERE id = $1", [
      usuario.id
    ]);
    usuario = rows[0];

    if (usuario.rowCount === 0) {
      return res.status(401).json({ mensagem: "Usuário não encontrado" });
    }
    delete usuario.senha;
    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(401).json({ mensagem: error.message });
  }
};
module.exports = { validarToken };
