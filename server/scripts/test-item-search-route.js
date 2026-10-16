const assert = require("node:assert/strict");

const controllerPath = require.resolve("../src/controllers/itemController");
const controllers = {
  createItem: () => {},
  getItems: () => {},
  getItemById: () => {},
  searchItems: () => {},
  searchItemsByImage: () => {},
  getMyItems: () => {},
  resolveMyItem: () => {},
  deleteMyItem: () => {},
};

require.cache[controllerPath] = {
  id: controllerPath,
  filename: controllerPath,
  loaded: true,
  exports: controllers,
};

const router = require("../src/routes/itemRoutes");
const routes = router.stack
  .filter((layer) => layer.route)
  .map((layer) => ({
    path: layer.route.path,
    method: Object.keys(layer.route.methods)[0],
    handler: layer.route.stack[0].handle,
    finalHandler: layer.route.stack[layer.route.stack.length - 1].handle,
  }));
const searchRouteIndex = routes.findIndex((route) => route.method === "get" && route.path === "/search");
const idRouteIndex = routes.findIndex((route) => route.method === "get" && route.path === "/:id");

assert.notEqual(searchRouteIndex, -1, "GET /search route was not registered");
assert.notEqual(idRouteIndex, -1, "GET /:id route was not registered");
assert.ok(searchRouteIndex < idRouteIndex, "GET /search must precede GET /:id");
assert.equal(routes[searchRouteIndex].handler, controllers.searchItems, "GET /search must use searchItems");
assert.equal(routes[idRouteIndex].handler, controllers.getItemById, "GET /:id must use getItemById");

const imageSearchRoute = routes.find((route) => route.method === "post" && route.path === "/search/image");
assert.ok(imageSearchRoute, "POST /search/image route was not registered");
assert.equal(imageSearchRoute.finalHandler, controllers.searchItemsByImage, "POST /search/image must use searchItemsByImage");

console.log("Item search route dispatch verified: text and image search handlers are registered safely.");
