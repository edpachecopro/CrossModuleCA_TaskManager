"use strict";
const https = require("https");
const httpRequest_1 = require("../util/httpRequest");
const bluebird_1 = require("bluebird");
//noinspection JSUnusedLocalSymbols
const __awaiter = require("../util/awaiter");
function githubRequest(path, token, data = null, method = "GET") {
    return request("api.github.com", path, token, data, method);
}
exports.githubRequest = githubRequest;
function bintrayRequest(path, auth, data = null, method = "GET") {
    return request("api.bintray.com", path, auth, data, method);
}
exports.bintrayRequest = bintrayRequest;
function request(hostname, path, token, data = null, method = "GET") {
    const options = {
        hostname: hostname,
        path: path,
        method: method,
        headers: {
            "User-Agent": "electron-builder"
        }
    };
    if (hostname.includes("github")) {
        options.headers.Accept = "application/vnd.github.v3+json";
    }
    const encodedData = data == null ? null : new Buffer(JSON.stringify(data));
    if (encodedData != null) {
        options.method = "post";
        options.headers["Content-Type"] = "application/json";
        options.headers["Content-Length"] = encodedData.length;
    }
    return doApiRequest(options, token, it => it.end(encodedData));
}
function doApiRequest(options, token, requestProcessor) {
    if (token != null) {
        options.headers.authorization = token.startsWith("Basic") ? token : `token ${token}`;
    }
    return new bluebird_1.Promise((resolve, reject, onCancel) => {
        const request = https.request(options, (response) => {
            try {
                if (response.statusCode === 404) {
                    // error is clear, we don't need to read detailed error description
                    reject(new HttpError(response, `method: ${options.method} url: https://${options.hostname}${options.path}

Please double check that your GitHub Token is correct. Due to security reasons GitHub doesn't report actual status, but 404.
`));
                }
                else if (response.statusCode === 204) {
                    // on DELETE request
                    resolve();
                    return;
                }
                let data = "";
                response.setEncoding("utf8");
                response.on("data", (chunk) => {
                    data += chunk;
                });
                response.on("end", () => {
                    try {
                        if (response.statusCode >= 400) {
                            const contentType = response.headers["content-type"];
                            if (contentType != null && contentType.includes("json")) {
                                reject(new HttpError(response, JSON.parse(data)));
                            }
                            else {
                                reject(new HttpError(response));
                            }
                        }
                        else {
                            resolve(data.length === 0 ? null : JSON.parse(data));
                        }
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            }
            catch (e) {
                reject(e);
            }
        });
        httpRequest_1.addTimeOutHandler(request, reject);
        request.on("error", reject);
        requestProcessor(request, reject);
        onCancel(() => request.abort());
    });
}
exports.doApiRequest = doApiRequest;
class HttpError extends Error {
    constructor(response, description = null) {
        super(response.statusCode + " " + response.statusMessage + (description == null ? "" : ("\n" + JSON.stringify(description, null, "  "))) + "\nHeaders: " + JSON.stringify(response.headers, null, "  "));
        this.response = response;
        this.description = description;
    }
}
exports.HttpError = HttpError;
//# sourceMappingURL=restApiRequest.js.map