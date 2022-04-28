"use strict";

const codeSign_1 = require("./codeSign");
const bluebird_1 = require("bluebird");
const platformPackager_1 = require("./platformPackager");
const metadata_1 = require("./metadata");
const path = require("path");
const util_1 = require("./util");
const fs_extra_p_1 = require("fs-extra-p");
const signcode_tf_1 = require("signcode-tf");
//noinspection JSUnusedLocalSymbols
const __awaiter = require("./awaiter");
class WinPackager extends platformPackager_1.PlatformPackager {
    constructor(info, cleanupTasks) {
        super(info);
        const certificateFile = this.customBuildOptions.certificateFile;
        if (certificateFile != null) {
            const certificatePassword = this.customBuildOptions.certificatePassword || this.getCscPassword();
            this.cscInfo = bluebird_1.Promise.resolve({
                file: certificateFile,
                password: certificatePassword == null ? null : certificatePassword.trim()
            });
        } else if (this.options.cscLink != null) {
            this.cscInfo = codeSign_1.downloadCertificate(this.options.cscLink).then(path => {
                cleanupTasks.push(() => fs_extra_p_1.deleteFile(path, true));
                return {
                    file: path,
                    password: this.getCscPassword()
                };
            });
        } else {
            this.cscInfo = bluebird_1.Promise.resolve(null);
        }
        this.iconPath = this.getValidIconPath();
    }
    get platform() {
        return metadata_1.Platform.WINDOWS;
    }
    get supportedTargets() {
        return ["squirrel"];
    }
    getValidIconPath() {
        return __awaiter(this, void 0, void 0, function* () {
            const iconPath = path.join(this.buildResourcesDir, "icon.ico");
            yield checkIcon(iconPath);
            return iconPath;
        });
    }
    pack(outDir, arch, targets, postAsyncTasks) {
        return __awaiter(this, void 0, void 0, function* () {
            if (arch === metadata_1.Arch.ia32) {
                util_1.warn("For windows consider only distributing 64-bit, see https://github.com/electron-userland/electron-builder/issues/359#issuecomment-214851130");
            }
            // we must check icon before pack because electron-packager uses icon and it leads to cryptic error message "spawn wine ENOENT"
            yield this.iconPath;
            const appOutDir = this.computeAppOutDir(outDir, arch);
            const packOptions = this.computePackOptions(outDir, appOutDir, arch);
            yield this.doPack(packOptions, outDir, appOutDir, arch, this.customBuildOptions);
            yield this.sign(appOutDir);
            this.packageInDistributableFormat(outDir, appOutDir, arch, packOptions, targets, postAsyncTasks);
        });
    }
    computeAppOutDir(outDir, arch) {
        return path.join(outDir, `win${ platformPackager_1.getArchSuffix(arch) }-unpacked`);
    }
    sign(appOutDir) {
        return __awaiter(this, void 0, void 0, function* () {
            const cscInfo = yield this.cscInfo;
            if (cscInfo != null) {
                const filename = `${ this.appName }.exe`;
                util_1.log(`Signing ${ filename } (certificate file "${ cscInfo.file }")`);
                yield this.doSign({
                    path: path.join(appOutDir, filename),
                    cert: cscInfo.file,
                    password: cscInfo.password,
                    name: this.appName,
                    site: yield this.computePackageUrl(),
                    overwrite: true,
                    hash: this.customBuildOptions.signingHashAlgorithms
                });
            }
        });
    }
    doSign(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return bluebird_1.Promise.promisify(signcode_tf_1.sign)(opts);
        });
    }
    packageInDistributableFormat(outDir, appOutDir, arch, packOptions, targets, promises) {
        for (let target of targets) {
            if (target === "squirrel.windows" || target === "default") {
                const helperClass = require("./targets/squirrelWindows").default;
                promises.push(new helperClass(this, appOutDir, arch).build(packOptions));
            } else {
                util_1.log(`Creating Windows ${ target }`);
                // we use app name here - see https://github.com/electron-userland/electron-builder/pull/204
                const outFile = path.join(outDir, `${ this.appName }-${ this.metadata.version }${ platformPackager_1.getArchSuffix(arch) }-win.${ target }`);
                promises.push(this.archiveApp(target, appOutDir, outFile).then(() => this.dispatchArtifactCreated(outFile, `${ this.metadata.name }-${ this.metadata.version }${ platformPackager_1.getArchSuffix(arch) }-win.${ target }`)));
            }
        }
    }
}
exports.WinPackager = WinPackager;
function checkIcon(file) {
    return __awaiter(this, void 0, void 0, function* () {
        const fd = yield fs_extra_p_1.open(file, "r");
        const buffer = new Buffer(512);
        try {
            yield fs_extra_p_1.read(fd, buffer, 0, buffer.length, 0);
        } finally {
            yield fs_extra_p_1.close(fd);
        }
        if (!isIco(buffer)) {
            throw new Error(`Windows icon is not valid ico file, please fix "${ file }"`);
        }
        const sizes = parseIco(buffer);
        for (let size of sizes) {
            if (size.w >= 256 && size.h >= 256) {
                return;
            }
        }
        throw new Error(`Windows icon size must be at least 256x256, please fix "${ file }"`);
    });
}
function parseIco(buffer) {
    if (!isIco(buffer)) {
        throw new Error("buffer is not ico");
    }
    const n = buffer.readUInt16LE(4);
    const result = new Array(n);
    for (let i = 0; i < n; i++) {
        result[i] = {
            w: buffer.readUInt8(6 + i * 16) || 256,
            h: buffer.readUInt8(7 + i * 16) || 256
        };
    }
    return result;
}
function isIco(buffer) {
    return buffer.readUInt16LE(0) === 0 && buffer.readUInt16LE(2) === 1;
}
//# sourceMappingURL=winPackager.js.map