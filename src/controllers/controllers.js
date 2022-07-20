const connection = require("../connection"),
  securePassword = require("secure-password"),
  jwt = require("jsonwebtoken");
const pwd = securePassword();

const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name) {
    return res.status(400).json({ message: "The name field is required." });
  }
  if (!email) {
    return res.status(400).json({ message: "The email field is required." });
  }
  if (!password) {
    return res.status(400).json({ message: "The password field is required." });
  }
  try {
    const query = "SELECT * FROM users WHERE email = $1";
    const { rowCount } = await connection.query(query, [email]);

    if (rowCount > 0) {
      return res.status(400).json({
        message: "There is already a registered user with the email provided."
      });
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  try {
    const hash = (await pwd.hash(Buffer.from(password))).toString("hex");
    const { rowCount, rows } = await connection.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [name, email, hash]
    );
    if (rowCount === 0) {
      return res.status(400).json({ message: "Unable to register user" });
    }
    const user = rows[0];
    delete user.password;
    return res.status(201).json(user);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ message: "The email field is required." });
  }
  if (!password) {
    return res.status(400).json({ message: "The password field is required." });
  }
  try {
    const { rowCount, rows } = await connection.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (rowCount === 0) {
      return res
        .status(400)
        .json({ message: "Invalid username and/or password(s)." });
    }
    const user = rows[0];
    const result = await pwd.verify(
      Buffer.from(password),
      Buffer.from(user.password, "hex")
    );
    switch (result) {
      case securePassword.INVALID_UNRECOGNIZED_HASH:
      case securePassword.INVALID:
        return res
          .status(400)
          .json({ message: "Invalid username and/or password(s)." });
      case securePassword.VALID:
        break;
      case securePassword.VALID_NEEDS_REHASH:
        const hash = (await pwd.hash(Buffer.from(password))).toString("hex");
        await connection.query(
          "UPDATE users SET password = $1 WHERE email = $2",
          [hash, email]
        );
    }
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email
      },
      process.env.TOKEN_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRATION }
    );
    delete user.password;
    return res.status(200).json({
      user,
      token
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const detailUser = async (req, res) => {
  const { user } = req;
  if (!user) {
    return res.status(401).json({
      message:
        "To access this resource a valid authentication token must be sent."
    });
  }
  try {
    const { rows } = await connection.query(
      "SELECT * FROM users WHERE id = $1",
      [user.id]
    );
    const check = rows[0];
    if (!check) {
      return res.status(404).json({ message: "ID does not match user" });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  const { user } = req;
  const { name, email, password } = req.body;
  if (!user) {
    return res.status(401).json({
      message:
        "To access this resource a valid authentication token must be sent."
    });
  }
  if (!name) {
    return res.status(400).json({ message: "The name field is required." });
  }
  if (!email) {
    return res.status(400).json({ message: "The email field is required." });
  }
  if (!password) {
    return res.status(400).json({ message: "The password field is required." });
  }
  try {
    let data = await connection.query("SELECT * FROM users WHERE email = $1", [
      email
    ]);
    const check = data.rows[0];
    if (check && check.id !== user.id) {
      return res.status(400).json({
        message: "The email provided is already being used by another user."
      });
    }
    let hash = (await pwd.hash(Buffer.from(password))).toString("hex");
    data = await connection.query(
      "UPDATE users SET name = $1, email = $2, password = $3 WHERE id = $4 RETURNING *",
      [name, email, hash, user.id]
    );
    const updatedUser = data.rows[0];
    delete updatedUser.password;
    return res.status(204).json(updatedUser);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const deleteTransaction = async (req, res) => {
  const { user } = req;
  const { id } = req.params;

  try {
    const existingTransactionQuery =
      "SELECT * FROM transactions WHERE id = $1 AND user_id = $2";
    const existingTransaction = await connection.query(
      existingTransactionQuery,
      [id, user.id]
    );

    if (existingTransaction.rowCount === 0) {
      return res.status(404).json("Transaction not found");
    }

    const { rowCount } = await connection.query(
      "DELETE FROM transactions WHERE id =$1",
      [id]
    );

    if (rowCount === 0) {
      return res.status(400).json("Unable to remove transaction");
    }

    return res.status(200).json("Transaction successfully removed");
  } catch (error) {
    return res.status(400).json(error.message);
  }
};

const listCategories = async (req, res) => {
  const { user } = req;
  if (!user) {
    return res.status(401).json({
      message:
        "To access this resource a valid authentication token must be sent."
    });
  }
  try {
    const { rows } = await connection.query("SELECT * FROM categories");
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const listTransactions = async (req, res) => {
  const { user } = req;
  const { filter } = req.query;
  if (!user) {
    return res.status(401).json({
      message:
        "To access this resource a valid authentication token must be sent."
    });
  }

  try {
    const filtering = [];
    if (filter) {
      const query =
        "SELECT t.id, t.type, t.description, t.value, t.date, t.user_id, t.category_id, c.description AS category_name FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1 AND c.description ILIKE $2";

      for (const element of filter) {
        const transactions = await connection.query(query, [user.id, element]);

        filtering.push(...transactions.rows);
      }
    }
    return res.status(200).json(filtering);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
const detailTransaction = async (req, res) => {
  const { user } = req;
  const { id } = req.params;
  if (!user) {
    return res.status(401).json({
      message:
        "To access this resource a valid authentication token must be sent."
    });
  }
  if (!id) {
    return res.status(400).json({ message: "The ID is required." });
  }
  try {
    const query =
      "SELECT transactions.id, transactions.type, transactions.description, transactions.value, transactions.date, transactions.user_id, transactions.category_id, category.description AS category_name FROM transactions LEFT JOIN categories ON transactions.category_id = categories.id WHERE user_id = $1 AND transactions.id = $2";
    const { rows } = await connection.query(query, [user.id, id]);
    const transaction = rows[0];
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    return res.status(200).json(transaction);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const registerTransaction = async (req, res) => {
  const { user } = req;
  const { description, value, date, category_id, type } = req.body;
  if (!user) {
    return res.status(401).json({
      message:
        "To access this resource a valid authentication token must be sent."
    });
  }
  if (!description) {
    return res
      .status(400)
      .json({ message: "The description field is mandatory." });
  }
  if (!value) {
    return res.status(400).json({ message: "The value field is mandatory." });
  }
  if (!date) {
    return res.status(400).json({ message: "The date field is mandatory." });
  }
  if (!category_id) {
    return res
      .status(400)
      .json({ message: "The category_id field is required." });
  }
  if (!type) {
    return res.status(400).json({ message: "The type field is mandatory." });
  }
  let modifiedType = type.toLowerCase();
  if (modifiedType !== "input" && modifiedType !== "output") {
    return res.status(400).json({
      message: "The type field must be 'input' or 'output'."
    });
  }
  try {
    const categories = await connection.query(
      "SELECT * FROM categories WHERE id = $1",
      [category_id]
    );
    const category = categories.rows[0];
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    const { rows } = await connection.query(
      "INSERT INTO transactions (description, valor, data, category_id, type, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [description, value, date, category_id, modifiedType, user.id]
    );
    const transaction = rows[0];
    let sum = { category_name: category.description };
    let newTransaction = { ...transaction, ...sum };
    return res.status(201).json(newTransaction);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const updateTransaction = async (req, res) => {
  const { user } = req;
  const { id } = req.params;
  const { description, value, date, category_id, type } = req.body;
  if (!user) {
    return res.status(401).json({
      message:
        "To access this resource a valid authentication token must be sent."
    });
  }
  if (!id) {
    return res.status(400).json({ message: "The ID is required." });
  }
  if (!description) {
    return res
      .status(400)
      .json({ message: "The description field is mandatory." });
  }
  if (!value) {
    return res.status(400).json({ message: "The value field is mandatory." });
  }
  if (!date) {
    return res.status(400).json({ message: "The date field is mandatory." });
  }
  if (!category_id) {
    return res
      .status(400)
      .json({ message: "The category_id field is required." });
  }
  if (!type) {
    return res.status(400).json({ message: "The type field is mandatory." });
  }
  let modifiedType = type.toLowerCase();
  if (modifiedType !== "input" && modifiedType !== "output") {
    return res.status(400).json({
      message: "The type field must be 'input' or 'output'."
    });
  }
  try {
    const { rows } = await connection.query(
      "SELECT * FROM transactions WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    const transaction = rows[0];
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  try {
    const categories = await connection.query(
      "SELECT * FROM categories WHERE id = $1",
      [category_id]
    );
    const category = categories.rows[0];
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    const { rows } = await connection.query(
      "UPDATE transactions SET description = $1, value = $2, date = $3, category_id = $4, type = $5 WHERE id = $6 AND user_id = $7 RETURNING *",
      [description, value, date, category_id, modifiedType, id, user.id]
    );
    const transaction = rows[0];
    let sum = { category_name: category.descricption };
    let newTransaction = { ...transaction, ...sum };
    return res.status(204).json(newTransaction);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getExtract = async (req, res) => {
  const { user } = req;
  if (!user) {
    return res.status(401).json({
      message:
        "To access this resource a valid authentication token must be sent."
    });
  }
  try {
    const { rows } = await connection.query(
      "SELECT * FROM transactions WHERE user_id = $1",
      [user.id]
    );
    const transactions = rows;
    let input = 0;
    let output = 0;
    for (const transaction of transactions) {
      if (transaction.type === "input") {
        input += transaction.valor;
      } else if (transaction.type === "output") {
        output += transaction.valor;
      }
    }
    const extract = {
      input,
      output
    };
    return res.status(200).json(extract);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  deleteTransaction,
  loginUser,
  detailUser,
  updateUser,
  listCategories,
  listTransactions,
  detailTransaction,
  registerTransaction,
  updateTransaction,
  getExtract
};
