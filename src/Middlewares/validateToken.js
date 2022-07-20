const jwt = require("jsonwebtoken"),
  connection = require("../connection");

const validateToken = async (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).json({ message: "User must be logged in" });
  }
  try {
    const token = authorization.replace("Bearer ", "").trim();
    let user = jwt.verify(token, process.env.TOKEN_SECRET);
    let { rows } = await connection.query("SELECT * FROM users WHERE id = $1", [
      user.id
    ]);
    user = rows[0];

    if (user.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    delete user.password;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
};
module.exports = { validateToken };
