CREATE DATABASE
  dindin;

DROP TABLE
  IF EXISTS usuarios;

CREATE TABLE
  usuarios (
    id SERIAL PRIMARY KEY NOT NULL,
    nome VARCHAR(60),
    email VARCHAR(60) UNIQUE,
    senha TEXT
  );

DROP TABLE
  IF EXISTS categorias;

CREATE TABLE
  categorias (id SERIAL PRIMARY KEY NOT NULL, descricao TEXT);

DROP TABLE
  IF EXISTS transacoes;

CREATE TABLE
  transacoes (
    id SERIAL PRIMARY KEY NOT NULL,
    descricao TEXT,
    valor INT,
    data TEXT,
    categoria_id INT,
    usuario_id INT,
    tipo TEXT,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );

INSERT INTO
  categorias (descricao)
VALUES
  ('Alimentação'),
  ('Assinaturas e Serviços'),
  ('Casa'),
  ('Mercado'),
  ('Cuidados Pessoais'),
  ('Educação'),
  ('Família'),
  ('Lazer'),
  ('Pets'),
  ('Presentes'),
  ('Roupas'),
  ('Saúde'),
  ('Transporte'),
  ('Salário'),
  ('Vendas'),
  ('Outras receitas'),
  ('Outras despesas');