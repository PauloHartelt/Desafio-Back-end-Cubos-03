CREATE DATABASE
  dindin;

DROP TABLE
  IF EXISTS users;

CREATE TABLE
  users (
    id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(60),
    email VARCHAR(60) UNIQUE,
    password TEXT
  );

DROP TABLE
  IF EXISTS categories;

CREATE TABLE
  categories (id SERIAL PRIMARY KEY NOT NULL, description TEXT);

DROP TABLE
  IF EXISTS transactions;

CREATE TABLE
  transactions (
    id SERIAL PRIMARY KEY NOT NULL,
    description TEXT,
    value INT,
    date TEXT,
    category_id INT,
    user_id INT,
    type TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

INSERT INTO
  categories (description)
VALUES
  ('Food'),
  ('Subscriptions and Services'),
  ('Home'),
  ('Market'),
  ('Personal cares'),
  ('Education'),
  ('Family'),
  ('Leisure'),
  ('Pets'),
  ('Gifts'),
  ('Clothes'),
  ('Health'),
  ('Transport'),
  ('Salary'),
  ('Sales'),
  ('Other recipes'),
  ('Other expenses');
