const conexao = require("../conexao"),
  securePassword = require("secure-password"),
  jwt = require("jsonwebtoken"),
  segredo = require("../segredo");

const pwd = securePassword();

const cadastrarUsuario = async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome) {
    return res.status(400).json({ mensagem: "O campo nome é obrigatório." });
  }
  if (!email) {
    return res.status(400).json({ mensagem: "O campo email é obrigatório." });
  }
  if (!senha) {
    return res.status(400).json({ mensagem: "O campo senha é obrigatório." });
  }
  try {
    const query = "SELECT * FROM usuarios WHERE email = $1";
    const { rowCount } = await conexao.query(query, [email]);

    if (rowCount > 0) {
      return res.status(400).json({
        mensagem: "Já existe usuário cadastrado com o e-mail informado."
      });
    }
  } catch (error) {
    return res.status(400).json({ mensagem: error.message });
  }
  try {
    const hash = (await pwd.hash(Buffer.from(senha))).toString("hex");
    const { rowCount, rows } = await conexao.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING *",
      [nome, email, hash]
    );
    if (rowCount === 0) {
      return res
        .status(400)
        .json({ mensagem: "Não foi possível cadastrar o usuário" });
    }
    const usuario = rows[0];
    delete usuario.senha;
    return res.status(201).json(usuario);
  } catch (error) {
    return res.status(400).json({ mensagem: error.message });
  }
};

const logarUsuario = async (req, res) => {
  const { email, senha } = req.body;
  if (!email) {
    return res.status(400).json({ mensagem: "O campo email é obrigatório." });
  }
  if (!senha) {
    return res.status(400).json({ mensagem: "O campo senha é obrigatório." });
  }
  try {
    const { rowCount, rows } = await conexao.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email]
    );
    if (rowCount === 0) {
      return res
        .status(400)
        .json({ mensagem: "Usuário e/ou senha inválido(s)." });
    }
    const usuario = rows[0];
    const resultado = await pwd.verify(
      Buffer.from(senha),
      Buffer.from(usuario.senha, "hex")
    );
    switch (resultado) {
      case securePassword.INVALID_UNRECOGNIZED_HASH:
      case securePassword.INVALID:
        return res
          .status(400)
          .json({ mensagem: "Usuário e/ou senha inválido(s)." });
      case securePassword.VALID:
        break;
      case securePassword.VALID_NEEDS_REHASH:
        const hash = (await pwd.hash(Buffer.from(senha))).toString("hex");
        await conexao.query("UPDATE usuarios SET senha = $1 WHERE email = $2", [
          hash,
          email
        ]);
    }
    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      },
      segredo,
      { expiresIn: "2h" }
    );
    delete usuario.senha;
    return res.status(200).json({
      usuario: usuario,
      token: token
    });
  } catch (error) {
    return res.status(400).json({ mensagem: error.message });
  }
};

const detalharUsuario = async (req, res) => {
  const { usuario } = req;
  if (!usuario) {
    return res.status(401).json({
      mensagem:
        "Para acessar este recurso um token de autenticação válido deve ser enviado."
    });
  }
  try {
    const { rows } = await conexao.query(
      "SELECT * FROM usuarios WHERE id = $1",
      [usuario.id]
    );
    const checagem = rows[0];
    if (!checagem) {
      return res
        .status(404)
        .json({ mensagem: "ID não corresponde ao usuário" });
    }
    return res.status(200).json(usuario);
  } catch (error) {
    return res.status(400).json({ mensagem: error.message });
  }
};

const atualizarUsuario = async (req, res) => {
  const { usuario } = req;
  const { nome, email, senha } = req.body;
  if (!usuario) {
    return res.status(401).json({
      mensagem:
        "Para acessar este recurso um token de autenticação válido deve ser enviado."
    });
  }
  if (!nome) {
    return res.status(400).json({ mensagem: "O campo nome é obrigatório." });
  }
  if (!email) {
    return res.status(400).json({ mensagem: "O campo email é obrigatório." });
  }
  if (!senha) {
    return res.status(400).json({ mensagem: "O campo senha é obrigatório." });
  }
  try {
    let dados = await conexao.query("SELECT * FROM usuarios WHERE email = $1", [
      email
    ]);
    const checagem = dados.rows[0];
    if (checagem && checagem.id !== usuario.id) {
      return res.status(400).json({
        mensagem: "O email informado já está sendo utilizado por outro usuário."
      });
    }
    let hash = (await pwd.hash(Buffer.from(senha))).toString("hex");
    dados = await conexao.query(
      "UPDATE usuarios SET nome = $1, email = $2, senha = $3 WHERE id = $4 RETURNING *",
      [nome, email, hash, usuario.id]
    );
    const usuarioAtualizado = dados.rows[0];
    delete usuarioAtualizado.senha;
    return res.status(204).json(usuarioAtualizado);
  } catch (error) {
    return res.status(400).json({ mensagem: error.message });
  }
};

const excluirTransacao = async (req, res) => {
  const { usuario } = req;
  const { id } = req.params;

  try {
    const queryTransacaoExistente =
      "SELECT * FROM transacoes WHERE id = $1 AND usuario_id = $2";
    const transacaoExistente = await conexao.query(queryTransacaoExistente, [
      id,
      usuario.id
    ]);

    if (transacaoExistente.rowCount === 0) {
      return res.status(404).json("Transação não foi encontrada");
    }

    const { rowCount } = await conexao.query(
      "DELETE FROM transacoes WHERE id =$1",
      [id]
    );

    if (rowCount === 0) {
      return res.status(400).json("Nao foi possivel remover a transação");
    }

    return res.status(200).json("Transação removida com sucesso");
  } catch (error) {
    return res.status(400).json(error.message);
  }
};

const listarCategorias = async (req, res) => {
  const { usuario } = req;
  if (!usuario) {
    return res.status(401).json({
      mensagem:
        "Para acessar este recurso um token de autenticação válido deve ser enviado."
    });
  }
  try {
    const { rows } = await conexao.query("SELECT * FROM categorias");
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(400).json({ mensagem: error.message });
  }
};

//http://localhost:3000/transacao?filtro[]=Vendas&filtro[]=Transporte

const listarTransacoes = async (req, res) => {
  const { usuario } = req;
  const { filtro } = req.query;
  if (!usuario) {
    return res.status(401).json({
      mensagem:
        "Para acessar este recurso um token de autenticação válido deve ser enviado."
    });
  }

  try {
    const filtragem = [];
    if (filtro) {
      const query =
        "SELECT t.id, t.tipo, t.descricao, t.valor, t.data, t.usuario_id, t.categoria_id, c.descricao AS categoria_nome FROM transacoes t LEFT JOIN categorias c ON t.categoria_id = c.id WHERE t.usuario_id = $1 AND c.descricao ILIKE $2";

      for (const elemento of filtro) {
        const transacoes = await conexao.query(query, [usuario.id, elemento]);

        filtragem.push(...transacoes.rows);
      }
    }
    return res.status(200).json(filtragem);
  } catch (error) {
    return res.status(400).json({ mensagem: error.message });
  }
};
const detalharTransacao = async (req, res) => {
  const { usuario } = req;
  const { id } = req.params;
  if (!usuario) {
    return res.status(401).json({
      mensagem:
        "Para acessar este recurso um token de autenticação válido deve ser enviado."
    });
  }
  if (!id) {
    return res.status(400).json({ mensagem: "O ID é obrigatório." });
  }
  try {
    const query =
      "SELECT transacoes.id, transacoes.tipo, transacoes.descricao, transacoes.valor, transacoes.data, transacoes.usuario_id, transacoes.categoria_id, categorias.descricao AS categoria_nome FROM transacoes LEFT JOIN categorias ON transacoes.categoria_id = categorias.id WHERE usuario_id = $1 AND transacoes.id = $2";
    const { rows } = await conexao.query(query, [usuario.id, id]);
    const transacao = rows[0];
    if (!transacao) {
      return res.status(404).json({ mensagem: "Transação não encontrada" });
    }
    return res.status(200).json(transacao);
  } catch (error) {
    return res.status(400).json({ mensagem: error.message });
  }
};

const cadastrarTransacao = async (req, res) => {
  const { usuario } = req;
  const { descricao, valor, data, categoria_id, tipo } = req.body;
  if (!usuario) {
    return res.status(401).json({
      mensagem:
        "Para acessar este recurso um token de autenticação válido deve ser enviado."
    });
  }
  if (!descricao) {
    return res
      .status(400)
      .json({ mensagem: "O campo descricao é obrigatório." });
  }
  if (!valor) {
    return res.status(400).json({ mensagem: "O campo valor é obrigatório." });
  }
  if (!data) {
    return res.status(400).json({ mensagem: "O campo data é obrigatório." });
  }
  if (!categoria_id) {
    return res
      .status(400)
      .json({ mensagem: "O campo categoria_id é obrigatório." });
  }
  if (!tipo) {
    return res.status(400).json({ mensagem: "O campo tipo é obrigatório." });
  }
  let tipoModificado = tipo.toLowerCase();
  if (tipoModificado !== "entrada" && tipoModificado !== "saida") {
    return res.status(400).json({
      mensagem: "O campo tipo deve ser 'entrada' ou 'saida'."
    });
  }
  try {
    const categorias = await conexao.query(
      "SELECT * FROM categorias WHERE id = $1",
      [categoria_id]
    );
    const categoria = categorias.rows[0];
    if (!categoria) {
      return res.status(404).json({ mensagem: "Categoria não encontrada" });
    }
    const { rows } = await conexao.query(
      "INSERT INTO transacoes (descricao, valor, data, categoria_id, tipo, usuario_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [descricao, valor, data, categoria_id, tipoModificado, usuario.id]
    );
    const transacao = rows[0];
    let adicao = { categoria_nome: categoria.descricao };
    let novaTransacao = { ...transacao, ...adicao };
    return res.status(201).json(novaTransacao);
  } catch (error) {
    return res.status(400).json({ mensagem: error.message });
  }
};

const atualizarTransacao = async (req, res) => {
  const { usuario } = req;
  const { id } = req.params;
  const { descricao, valor, data, categoria_id, tipo } = req.body;
  if (!usuario) {
    return res.status(401).json({
      mensagem:
        "Para acessar este recurso um token de autenticação válido deve ser enviado."
    });
  }
  if (!id) {
    return res.status(400).json({ mensagem: "O ID é obrigatório." });
  }
  if (!descricao) {
    return res
      .status(400)
      .json({ mensagem: "O campo descricao é obrigatório." });
  }
  if (!valor) {
    return res.status(400).json({ mensagem: "O campo valor é obrigatório." });
  }
  if (!data) {
    return res.status(400).json({ mensagem: "O campo data é obrigatório." });
  }
  if (!categoria_id) {
    return res
      .status(400)
      .json({ mensagem: "O campo categoria_id é obrigatório." });
  }
  if (!tipo) {
    return res.status(400).json({ mensagem: "O campo tipo é obrigatório." });
  }
  let tipoModificado = tipo.toLowerCase();
  if (tipoModificado !== "entrada" && tipoModificado !== "saida") {
    return res.status(400).json({
      mensagem: "O campo tipo deve ser 'entrada' ou 'saida'."
    });
  }
  try {
    const { rows } = await conexao.query(
      "SELECT * FROM transacoes WHERE id = $1 AND usuario_id = $2",
      [id, usuario.id]
    );
    const transacao = rows[0];
    if (!transacao) {
      return res.status(404).json({ mensagem: "Transação não encontrada" });
    }
  } catch (error) {
    return res.status(400).json({ mensagem: error.message });
  }
  try {
    const categorias = await conexao.query(
      "SELECT * FROM categorias WHERE id = $1",
      [categoria_id]
    );
    const categoria = categorias.rows[0];
    if (!categoria) {
      return res.status(404).json({ mensagem: "Categoria não encontrada" });
    }
    const { rows } = await conexao.query(
      "UPDATE transacoes SET descricao = $1, valor = $2, data = $3, categoria_id = $4, tipo = $5 WHERE id = $6 AND usuario_id = $7 RETURNING *",
      [descricao, valor, data, categoria_id, tipoModificado, id, usuario.id]
    );
    const transacao = rows[0];
    let adicao = { categoria_nome: categoria.descricao };
    let novaTransacao = { ...transacao, ...adicao };
    return res.status(204).json(novaTransacao);
  } catch (error) {
    return res.status(400).json({ mensagem: error.message });
  }
};

const obterExtrato = async (req, res) => {
  const { usuario } = req;
  if (!usuario) {
    return res.status(401).json({
      mensagem:
        "Para acessar este recurso um token de autenticação válido deve ser enviado."
    });
  }
  try {
    const { rows } = await conexao.query(
      "SELECT * FROM transacoes WHERE usuario_id = $1",
      [usuario.id]
    );
    const transacoes = rows;
    let entrada = 0;
    let saida = 0;
    for (const transacao of transacoes) {
      if (transacao.tipo === "entrada") {
        entrada += transacao.valor;
      } else if (transacao.tipo === "saida") {
        saida += transacao.valor;
      }
    }
    const extrato = {
      entrada: entrada,
      saida: saida
    };
    return res.status(200).json(extrato);
  } catch (error) {
    return res.status(400).json({ mensagem: error.message });
  }
};

module.exports = {
  cadastrarUsuario,
  excluirTransacao,
  logarUsuario,
  detalharUsuario,
  atualizarUsuario,
  listarCategorias,
  listarTransacoes,
  detalharTransacao,
  cadastrarTransacao,
  atualizarTransacao,
  obterExtrato
};
