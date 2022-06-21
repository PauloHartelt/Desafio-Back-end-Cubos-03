const express = require("express");

const {
    cadastrarUsuario,
    logarUsuario,
    excluirTransacao,
    detalharUsuario,
    atualizarUsuario,
    listarCategorias,
    listarTransacoes,
    detalharTransacao,
    cadastrarTransacao,
    atualizarTransacao,
    obterExtrato
  } = require("./controladores/controladores"),
  { validarToken } = require("./Middlewares/validarToken");

const rotas = express();

rotas.post("/usuario", cadastrarUsuario);

rotas.post("/login", logarUsuario);

rotas.use(validarToken);

rotas.delete("/transacao/:id", excluirTransacao);

rotas.get("/usuario", detalharUsuario);

rotas.put("/usuario", atualizarUsuario);

rotas.get("/categoria", listarCategorias);

rotas.get("/transacao", listarTransacoes);

rotas.get("/transacao/extrato", obterExtrato);

rotas.get("/transacao/:id", detalharTransacao);

rotas.post("/transacao", cadastrarTransacao);

rotas.put("/transacao/:id", atualizarTransacao);

module.exports = rotas;
