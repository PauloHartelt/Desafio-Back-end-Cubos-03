const yup = require("./yup");

const userValidation = yup.object().shape({
  name: yup.string().required(),
  email: yup.string().email().required(),
  password: yup.string().required()
});

const loginValidation = yup.object().shape({
  email: yup.string().email().required(),
  password: yup.string().required()
});

const transactionValidation = yup.object().shape({
  description: yup.string().required(),
  value: yup.string().required(),
  date: yup.string().required(),
  category_id: yup.number().required(),
  type: yup.string().required()
});

module.exports = { userValidation, loginValidation, transactionValidation };
