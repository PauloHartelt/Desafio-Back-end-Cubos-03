const express = require("express");

const {
    registerUser,
    loginUser,
    deleteTransaction,
    detailUser,
    updateUser,
    listCategories,
    listTransactions,
    detailTransaction,
    registerTransaction,
    updateTransaction,
    getExtract
  } = require("./controllers/controllers"),
  { validateToken } = require("./Middlewares/validateToken");

const routes = express();

routes.post("/user", registerUser);

routes.post("/login", loginUser);

routes.use(validateToken);

routes.delete("/transaction/:id", deleteTransaction);

routes.get("/user", detailUser);

routes.put("/user", updateUser);

routes.get("/category", listCategories);

routes.get("/transaction", listTransactions);

routes.get("/transaction/extract", getExtract);

routes.get("/transaction/:id", detailTransaction);

routes.post("/transaction", registerTransaction);

routes.put("/transaction/:id", updateTransaction);

module.exports = routes;
