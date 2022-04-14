"use strict";

const bluebird_1 = require("bluebird");
const fs_extra_p_1 = require("fs-extra-p");
const log_1 = require("../util/log");
const downloadElectron = bluebird_1.Promise.promisify(require("electron-download"));
const extract = bluebird_1.Promise.promisify(require("extract-zip"));
//noinspection JSUnusedLocalSymbols
const __awaiter = require("../util/awaiter");
function createDownloadOpts(opts, platform, arch, electronVersion) {
    const downloadOpts = Object.assign({
        cache: opts.cache,
        strictSSL: opts["strict-ssl"]
    }, opts.download);
    subOptionWarning(downloadOpts, "download", "platform", platform);
    subOptionWarning(downloadOpts, "download", "arch", arch);
    subOptionWarning(downloadOpts, "download", "version", electronVersion);
    return downloadOpts;
}
function subOptionWarning(properties, optionName, parameter, value) {
    if (properties.hasOwnProperty(parameter)) {
        log_1.warn(`${ optionName }.${ parameter } will be inferred from the main options`);
    }
    properties[parameter] = value;
}
function pack(opts, out, platform, arch, electronVersion, initializeApp) {
    return __awaiter(this, void 0, void 0, function* () {
        const zipPath = (yield bluebird_1.Promise.all([downloadElectron(createDownloadOpts(opts, platform, arch, electronVersion)), fs_extra_p_1.emptyDir(out)]))[0];
        yield extract(zipPath, { dir: out });
        if (platform === "darwin" || platform === "mas") {
            yield require("./mac").createApp(opts, out, initializeApp);
        } else {
            yield initializeApp();
        }
    });
}
exports.pack = pack;
//# sourceMappingURL=dirPackager.js.map