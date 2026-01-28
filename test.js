import AppError from "./errors/AppError";

export const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    404,
    `Cannot find ${req.method} ${req.originalUrl} on this server!`,
  );

  error.requestInfo = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  };

  console.log(`\n 404 NOT FOUND`);
  console.log(`Path: ${req.method} ${req.originalUrl}`);
  console.log(`Ip: ${req.ip}`);
  console.log(`User Agent: ${req.get("User-Agent")}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  next(error);
};

export const smartNotFoundHandler = (req, res, next) => {
  const availableRoutes = [
    { method: "GET", path: "/api/v1/users" },
    { method: "POST", path: "/api/v1/users" },
    { method: "GET", path: "/api/v1/products" },
    { method: "POST", path: "/api/v1/products" },
  ];

  const similarRoutes = availableRoutes.filter((route) => {
    const requestedPath = req.path.toLowerCase();
    const routePath = route.path.toLowerCase();

    return (
      routePath.includes(requestedPath.split("/")[2]) ||
      requestedPath.includes(routePath.split("/")[2])
    );
  });

  const error = new AppError(
    404,
    `Cannot find ${req.method} ${req.originalUrl} on this server!` +
      (similarRoutes.length
        ? ` Did you mean: ${similarRoutes.map((r) => `${r.method} ${r.path}`).join(", ")}?`
        : ""),
  );

  if (similarRoutes.length > 0) {
    error.suggestions = {
      message: "Did you mean one of these routes?",
      routes: similarRoutes.slice(0, 3),
    };
  }
  next(error);
};
