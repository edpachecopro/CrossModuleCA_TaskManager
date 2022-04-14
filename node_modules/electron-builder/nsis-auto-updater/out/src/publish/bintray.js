"use strict";
const restApiRequest_1 = require("./restApiRequest");
class BintrayClient {
    constructor(user, packageName, repo = "generic", apiKey) {
        this.user = user;
        this.packageName = packageName;
        this.repo = repo;
        this.auth = apiKey == null ? null : `Basic ${new Buffer(`${user}:${apiKey}`).toString("base64")}`;
        this.basePath = `/packages/${this.user}/${this.repo}/${this.packageName}`;
    }
    getVersion(version) {
        return restApiRequest_1.bintrayRequest(`${this.basePath}/versions/${version}`, this.auth);
    }
    createVersion(version) {
        return restApiRequest_1.bintrayRequest(`${this.basePath}/versions`, this.auth, {
            name: version,
        });
    }
    deleteVersion(version) {
        return restApiRequest_1.bintrayRequest(`/packages/${this.user}/${this.repo}/${this.packageName}/versions/${version}`, this.auth, null, "DELETE");
    }
}
exports.BintrayClient = BintrayClient;
//# sourceMappingURL=bintray.js.map