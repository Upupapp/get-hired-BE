const successMessage = { status: "success" };
const errorMessage = { status: "error" };
const status = {
  success: 200,
  error: 500,
  notfound: 404,
  unauthorized: 401,
  conflict: 409,
  created: 201,
  bad: 400,
  nocontent: 204,
};

const successResponse = (data) => ({ status: "success", data });
const errorResponse = (error) => ({ status: "error", error });

export { successMessage, errorMessage, status, successResponse, errorResponse };
