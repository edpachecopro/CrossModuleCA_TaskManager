"use strict";

const platformPackager_1 = require("../platformPackager");
const electron_winstaller_fixed_1 = require("electron-winstaller-fixed");
const path = require("path");
const util_1 = require("../util");
const fs_extra_p_1 = require("fs-extra-p");
//noinspection JSUnusedLocalSymbols
const __awaiter = require("../awaiter");
class SquirrelWindowsTarget {
    constructor(packager, appOutDir, arch) {
        this.packager = packager;
        this.appOutDir = appOutDir;
        this.arch = arch;
    }
    build(packOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const version = this.packager.metadata.version;
            const archSuffix = platformPackager_1.getArchSuffix(this.arch);
            const setupExeName = `${ this.packager.appName } Setup ${ version }${ archSuffix }.exe`;
            const installerOutDir = path.join(this.appOutDir, "..", `win${ platformPackager_1.getArchSuffix(this.arch) }`);
            yield fs_extra_p_1.emptyDir(installerOutDir);
            const distOptions = yield this.computeEffectiveDistOptions(installerOutDir, packOptions, setupExeName);
            yield electron_winstaller_fixed_1.createWindowsInstaller(distOptions);
            this.packager.dispatchArtifactCreated(path.join(installerOutDir, setupExeName), `${ this.packager.metadata.name }-Setup-${ version }${ archSuffix }.exe`);
            const packagePrefix = `${ this.packager.metadata.name }-${ electron_winstaller_fixed_1.convertVersion(version) }-`;
            this.packager.dispatchArtifactCreated(path.join(installerOutDir, `${ packagePrefix }full.nupkg`));
            if (distOptions.remoteReleases != null) {
                this.packager.dispatchArtifactCreated(path.join(installerOutDir, `${ packagePrefix }delta.nupkg`));
            }
            this.packager.dispatchArtifactCreated(path.join(installerOutDir, "RELEASES"));
        });
    }
    computeEffectiveDistOptions(installerOutDir, packOptions, setupExeName) {
        return __awaiter(this, void 0, void 0, function* () {
            const packager = this.packager;
            let iconUrl = packager.customBuildOptions.iconUrl || packager.devMetadata.build.iconUrl;
            if (iconUrl == null) {
                if (packager.info.repositoryInfo != null) {
                    const info = yield packager.info.repositoryInfo.getInfo(packager);
                    if (info != null) {
                        iconUrl = `https://github.com/${ info.user }/${ info.project }/blob/master/${ packager.relativeBuildResourcesDirname }/icon.ico?raw=true`;
                    }
                }
                if (iconUrl == null) {
                    throw new Error("iconUrl is not specified, please see https://github.com/electron-userland/electron-builder/wiki/Options#WinBuildOptions-iconUrl");
                }
            }
            checkConflictingOptions(packager.customBuildOptions);
            const projectUrl = yield packager.computePackageUrl();
            const rceditOptions = {
                "version-string": packOptions["version-string"],
                "file-version": packOptions["build-version"],
                "product-version": packOptions["app-version"]
            };
            rceditOptions["version-string"].LegalCopyright = packOptions["app-copyright"];
            const cscInfo = yield packager.cscInfo;
            const options = Object.assign({
                name: packager.metadata.name,
                productName: packager.appName,
                exe: packager.appName + ".exe",
                setupExe: setupExeName,
                title: packager.appName,
                appDirectory: this.appOutDir,
                outputDirectory: installerOutDir,
                version: packager.metadata.version,
                description: platformPackager_1.smarten(packager.metadata.description),
                authors: packager.metadata.author.name,
                iconUrl: iconUrl,
                setupIcon: yield packager.iconPath,
                certificateFile: cscInfo == null ? null : cscInfo.file,
                certificatePassword: cscInfo == null ? null : cscInfo.password,
                fixUpPaths: false,
                skipUpdateIcon: true,
                usePackageJson: false,
                extraMetadataSpecs: projectUrl == null ? null : `\n    <projectUrl>${ projectUrl }</projectUrl>`,
                copyright: packOptions["app-copyright"],
                packageCompressionLevel: packager.devMetadata.build.compression === "store" ? 0 : 9,
                sign: {
                    name: packager.appName,
                    site: projectUrl,
                    overwrite: true,
                    hash: packager.customBuildOptions.signingHashAlgorithms
                },
                rcedit: rceditOptions
            }, packager.customBuildOptions);
            if (!("loadingGif" in options)) {
                const resourceList = yield packager.resourceList;
                if (resourceList.indexOf("install-spinner.gif") !== -1) {
                    options.loadingGif = path.join(packager.buildResourcesDir, "install-spinner.gif");
                }
            }
            return options;
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SquirrelWindowsTarget;
function checkConflictingOptions(options) {
    for (let name of ["outputDirectory", "appDirectory", "exe", "fixUpPaths", "usePackageJson", "extraFileSpecs", "extraMetadataSpecs", "skipUpdateIcon", "setupExe"]) {
        if (name in options) {
            throw new Error(`Option ${ name } is ignored, do not specify it.`);
        }
    }
    if ("noMsi" in options) {
        util_1.warn(`noMsi is deprecated, please specify as "msi": true if you want to create an MSI installer`);
        options.msi = !options.noMsi;
    }
    const msi = options.msi;
    if (msi != null && typeof msi !== "boolean") {
        throw new Error(`msi expected to be boolean value, but string '"${ msi }"' was specified`);
    }
}
//# sourceMappingURL=squirrelWindows.js.map