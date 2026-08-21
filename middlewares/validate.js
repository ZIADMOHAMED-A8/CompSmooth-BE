import { AppError } from "../utils/AppError.js";

function validate(schema) {
  return (req, res, next) => {
    req.body = req.body ?? {};

    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => issue.message)
        .join(" ");

      return next(new AppError(message, 400));
    }

    if (Object.hasOwn(result.data, "body")) {
      req.body = result.data.body;
    }

    if (Object.hasOwn(result.data, "params")) {
      req.params = result.data.params;
    }

    if (Object.hasOwn(result.data, "query")) {
      Object.defineProperty(req, "query", {
        value: result.data.query,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    next();
  };
}

export default validate;
