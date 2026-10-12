const https = require("node:https");

async function readRequestBody(body) {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string" || Buffer.isBuffer(body)) return Buffer.from(body);
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (typeof body.arrayBuffer === "function") return Buffer.from(await body.arrayBuffer());
  if (typeof body.getReader === "function") {
    const reader = body.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }
  throw new TypeError("Unsupported fetch request body type.");
}

function getRequestDetails(input, init = {}) {
  const request = typeof input === "string" || input instanceof URL ? null : input;
  const url = new URL(request ? request.url : input);
  const method = init.method || request?.method || "GET";
  const sourceHeaders = init.headers || request?.headers;
  const headers = {};

  if (sourceHeaders) {
    for (const [name, value] of new Headers(sourceHeaders).entries()) {
      headers[name] = value;
    }
  }

  return {
    body: init.body === undefined ? request?.body : init.body,
    headers,
    method,
    url,
  };
}

async function httpsFetch(input, init = {}) {
  const { body, headers, method, url } = getRequestDetails(input, init);
  const requestBody = await readRequestBody(body);

  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: url.hostname,
      family: 4,
      path: `${url.pathname}${url.search}`,
      port: url.port || 443,
      method,
      headers,
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => {
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (Array.isArray(value)) value.forEach((entry) => responseHeaders.append(name, entry));
          else if (value !== undefined) responseHeaders.set(name, value);
        }

        resolve(new Response(Buffer.concat(chunks), {
          headers: responseHeaders,
          status: response.statusCode || 0,
          statusText: response.statusMessage || "",
        }));
      });
      response.on("error", reject);
    });

    request.on("error", reject);
    if (requestBody) request.write(requestBody);
    request.end();
  });
}

module.exports = httpsFetch;
