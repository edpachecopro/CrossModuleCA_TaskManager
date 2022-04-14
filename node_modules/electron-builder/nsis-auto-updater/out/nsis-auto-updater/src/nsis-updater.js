"use strict";
const events_1 = require("events");
const child_process_1 = require("child_process");
const path = require("path");
const os_1 = require("os");
const bluebird_1 = require("bluebird");
const bintray_1 = require("../../src/publish/bintray");
const restApiRequest_1 = require("../../src/publish/restApiRequest");
//noinspection JSUnusedLocalSymbols
const __awaiter = require("../../src/util/awaiter");
class BintrayProvider {
    constructor(configuration) {
        this.client = new bintray_1.BintrayClient(configuration.user, configuration.package, configuration.repository || "generic");
    }
    checkForUpdates() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield this.client.getVersion("_latest");
                return {
                    version: data.name,
                };
            }
            catch (e) {
                if (e instanceof restApiRequest_1.HttpError && e.response.statusCode === 404) {
                    throw new Error(`No latest version, please ensure that user, repository and package correctly configured. Or at least one version is published.${e.stack || e.message}`);
                }
                throw e;
            }
        });
    }
}
class NsisUpdater extends events_1.EventEmitter {
    constructor(updateUrl) {
        super();
        this.updateUrl = updateUrl;
        this.setupPath = path.join(os_1.tmpdir(), 'innobox-upgrade.exe');
        this.updateAvailable = false;
        this.quitAndInstallCalled = false;
    }
    getFeedURL() {
        return this.updateUrl;
    }
    setFeedURL(value) {
        this.updateUrl = value.toString();
        this.client = new BintrayProvider(value);
    }
    checkForUpdates() {
        if (this.updateUrl == null) {
            const message = "Update URL is not set";
            this.emitError(message);
            return bluebird_1.Promise.reject(new Error(message));
        }
        this.emit("checking-for-update");
        return this.client.checkForUpdates();
    }
    quitAndInstall() {
        if (!this.updateAvailable) {
            this.emitError("No update available, can't quit and install");
            return;
        }
        if (this.quitAndInstallCalled) {
            return;
        }
        // prevent calling several times
        this.quitAndInstallCalled = true;
        child_process_1.spawn(this.setupPath, ["/S"], {
            detached: true,
            stdio: "ignore",
        }).unref();
        require("electron").app.quit();
    }
    // emit both error object and message, this is to keep compatibility with old APIs
    emitError(message) {
        return this.emit("error", new Error(message), message);
    }
}
const updater = new NsisUpdater();
module.exports = updater;
//# sourceMappingURL=nsis-updater.js.map