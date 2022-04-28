"use strict";

const metadata_1 = require("./metadata");
const bluebird_1 = require("bluebird");
const path = require("path");
const electron_packager_tf_1 = require("electron-packager-tf");
const fs_extra_p_1 = require("fs-extra-p");
const util_1 = require("./util");
const archive_1 = require("./targets/archive");
const minimatch_1 = require("minimatch");
const asarUtil_1 = require("./asarUtil");
const deepAssign = require("deep-assign");
//noinspection JSUnusedLocalSymbols
const __awaiter = require("./awaiter");
exports.commonTargets = ["dir", "zip", "7z", "tar.xz", "tar.lz", "tar.gz", "tar.bz2"];
exports.DIR_TARGET = "dir";
class PlatformPackager {
    constructor(info) {
        this.info = info;
        this.options = info.options;
        this.projectDir = info.projectDir;
        this.metadata = info.metadata;
        this.devMetadata = info.devMetadata;
        this.buildResourcesDir = path.resolve(this.projectDir, this.relativeBuildResourcesDirname);
        this.customBuildOptions = info.devMetadata.build[this.platform.buildConfigurationKey] || Object.create(null);
        this.appName = metadata_1.getProductName(this.metadata, this.devMetadata);
        this.resourceList = fs_extra_p_1.readdir(this.buildResourcesDir).catch(e => {
            if (e.code !== "ENOENT") {
                throw e;
            }
            return [];
        });
    }
    get platform() {}
    getCscPassword() {
        const password = this.options.cscKeyPassword;
        if (password == null) {
            util_1.log("CSC_KEY_PASSWORD is not defined, empty password will be used");
            return "";
        } else {
            return password.trim();
        }
    }
    hasOnlyDirTarget() {
        for (let targets of this.options.targets.get(this.platform).values()) {
            for (let t of targets) {
                if (t !== "dir") {
                    return false;
                }
            }
        }
        const targets = normalizeTargets(this.customBuildOptions.target);
        return targets != null && targets.length === 1 && targets[0] === "dir";
    }
    get relativeBuildResourcesDirname() {
        return util_1.use(this.devMetadata.directories, it => it.buildResources) || "build";
    }
    get supportedTargets() {}
    computeAppOutDir(outDir, arch) {
        return path.join(outDir, `${ this.platform.buildConfigurationKey }${ arch === metadata_1.Arch.x64 ? "" : `-${ metadata_1.Arch[arch] }` }`);
    }
    dispatchArtifactCreated(file, artifactName) {
        this.info.eventEmitter.emit("artifactCreated", {
            file: file,
            artifactName: artifactName,
            platform: this.platform
        });
    }
    doPack(options, outDir, appOutDir, arch, customBuildOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const asarOptions = this.computeAsarOptions(customBuildOptions);
            options.initializeApp = (opts, buildDir, appRelativePath) => __awaiter(this, void 0, void 0, function* () {
                const appPath = path.join(buildDir, appRelativePath);
                const resourcesPath = path.dirname(appPath);
                let promise = null;
                const deprecatedIgnore = this.devMetadata.build.ignore;
                if (deprecatedIgnore) {
                    if (typeof deprecatedIgnore === "function") {
                        util_1.log(`"ignore is specified as function, may be new "files" option will be suit your needs? Please see https://github.com/electron-userland/electron-builder/wiki/Options#BuildMetadata-files`);
                    } else {
                        util_1.warn(`"ignore is deprecated, please use "files", see https://github.com/electron-userland/electron-builder/wiki/Options#BuildMetadata-files`);
                    }
                    promise = fs_extra_p_1.copy(this.info.appDir, appPath, { filter: electron_packager_tf_1.userIgnoreFilter(opts), dereference: true });
                } else {
                    const ignoreFiles = new Set([path.relative(this.info.appDir, opts.out), path.relative(this.info.appDir, this.buildResourcesDir)]);
                    if (!this.info.isTwoPackageJsonProjectLayoutUsed) {
                        const result = yield bluebird_1.Promise.all([listDependencies(this.info.appDir, false), listDependencies(this.info.appDir, true)]);
                        const productionDepsSet = new Set(result[1]);
                        // npm returns real path, so, we should use relative path to avoid any mismatch
                        const realAppDirPath = yield fs_extra_p_1.realpath(this.info.appDir);
                        for (let it of result[0]) {
                            if (!productionDepsSet.has(it)) {
                                if (it.startsWith(realAppDirPath)) {
                                    it = it.substring(realAppDirPath.length + 1);
                                } else if (it.startsWith(this.info.appDir)) {
                                    it = it.substring(this.info.appDir.length + 1);
                                }
                                ignoreFiles.add(it);
                            }
                        }
                    }
                    let patterns = this.getFilePatterns("files", customBuildOptions);
                    if (patterns == null || patterns.length === 0) {
                        patterns = ["**/*"];
                    }
                    promise = copyFiltered(this.info.appDir, appPath, this.getParsedPatterns(patterns, arch), true, ignoreFiles);
                }
                const promises = [promise];
                if (this.info.electronVersion[0] === "0") {
                    // electron release >= 0.37.4 - the default_app/ folder is a default_app.asar file
                    promises.push(fs_extra_p_1.remove(path.join(resourcesPath, "default_app.asar")), fs_extra_p_1.remove(path.join(resourcesPath, "default_app")));
                } else {
                    promises.push(fs_extra_p_1.unlink(path.join(resourcesPath, "default_app.asar")));
                }
                yield bluebird_1.Promise.all(promises);
                if (opts.prune != null) {
                    util_1.warn("prune is deprecated — development dependencies are never copied in any case");
                }
                if (asarOptions != null) {
                    yield asarUtil_1.createAsarArchive(appPath, resourcesPath, asarOptions);
                }
            });
            yield electron_packager_tf_1.pack(options);
            yield this.doCopyExtraFiles(true, appOutDir, arch, customBuildOptions);
            yield this.doCopyExtraFiles(false, appOutDir, arch, customBuildOptions);
            const afterPack = this.devMetadata.build.afterPack;
            if (afterPack != null) {
                yield afterPack({
                    appOutDir: appOutDir,
                    options: options
                });
            }
            yield this.sanityCheckPackage(appOutDir, asarOptions != null);
        });
    }
    computePackOptions(outDir, appOutDir, arch) {
        const version = this.metadata.version;
        let buildVersion = version;
        const buildNumber = this.computeBuildNumber();
        if (buildNumber != null) {
            buildVersion += "." + buildNumber;
        }
        //noinspection JSUnusedGlobalSymbols
        const options = deepAssign({
            dir: this.info.appDir,
            out: outDir,
            name: this.appName,
            productName: this.appName,
            platform: this.platform.nodeName,
            arch: metadata_1.Arch[arch],
            version: this.info.electronVersion,
            icon: path.join(this.buildResourcesDir, "icon"),
            overwrite: true,
            "app-version": version,
            "app-copyright": `Copyright © ${ new Date().getFullYear() } ${ this.metadata.author.name || this.appName }`,
            "build-version": buildVersion,
            tmpdir: false,
            generateFinalBasename: () => path.basename(appOutDir),
            "version-string": {
                CompanyName: this.metadata.author.name,
                FileDescription: smarten(this.metadata.description),
                ProductName: this.appName,
                InternalName: this.appName
            }
        }, this.devMetadata.build);
        delete options.osx;
        delete options.win;
        delete options.linux;
        // this option only for windows-installer
        delete options.iconUrl;
        return options;
    }
    computeAsarOptions(customBuildOptions) {
        let result = this.devMetadata.build.asar;
        let platformSpecific = customBuildOptions.asar;
        if (platformSpecific != null) {
            result = platformSpecific;
        }
        if (result === false) {
            return null;
        }
        const buildMetadata = this.devMetadata.build;
        if (buildMetadata["asar-unpack"] != null) {
            util_1.warn("asar-unpack is deprecated, please set as asar.unpack");
        }
        if (buildMetadata["asar-unpack-dir"] != null) {
            util_1.warn("asar-unpack-dir is deprecated, please set as asar.unpackDir");
        }
        if (result == null || result === true) {
            return {
                unpack: buildMetadata["asar-unpack"],
                unpackDir: buildMetadata["asar-unpack-dir"]
            };
        } else {
            return result;
        }
    }
    expandPattern(pattern, arch) {
        return pattern.replace(/\$\{arch}/g, metadata_1.Arch[arch]).replace(/\$\{os}/g, this.platform.buildConfigurationKey).replace(/\$\{\/\*}/g, "{,/**/*,/**/.*}");
    }
    doCopyExtraFiles(isResources, appOutDir, arch, customBuildOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const base = isResources ? this.getResourcesDir(appOutDir) : this.platform === metadata_1.Platform.OSX ? path.join(appOutDir, `${ this.appName }.app`, "Contents") : appOutDir;
            const patterns = this.getFilePatterns(isResources ? "extraResources" : "extraFiles", customBuildOptions);
            return patterns == null || patterns.length === 0 ? null : copyFiltered(this.projectDir, base, this.getParsedPatterns(patterns, arch));
        });
    }
    getParsedPatterns(patterns, arch) {
        const minimatchOptions = {};
        const parsedPatterns = [];
        for (let i = 0; i < patterns.length; i++) {
            parsedPatterns[i] = new minimatch_1.Minimatch(this.expandPattern(patterns[i], arch), minimatchOptions);
        }
        return parsedPatterns;
    }
    getFilePatterns(name, customBuildOptions) {
        let patterns = this.devMetadata.build[name];
        if (patterns != null && !Array.isArray(patterns)) {
            patterns = [patterns];
        }
        let platformSpecificPatterns = customBuildOptions[name];
        if (platformSpecificPatterns != null) {
            if (!Array.isArray(platformSpecificPatterns)) {
                platformSpecificPatterns = [platformSpecificPatterns];
            }
            return patterns == null ? platformSpecificPatterns : Array.from(new Set(patterns.concat(platformSpecificPatterns)));
        }
        return patterns;
    }
    computePackageUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const url = this.metadata.homepage || this.devMetadata.homepage;
            if (url != null) {
                return url;
            }
            if (this.info.repositoryInfo != null) {
                const info = yield this.info.repositoryInfo.getInfo(this);
                if (info != null) {
                    return `https://github.com/${ info.user }/${ info.project }`;
                }
            }
            return null;
        });
    }
    computeBuildNumber() {
        return this.devMetadata.build["build-version"] || process.env.TRAVIS_BUILD_NUMBER || process.env.APPVEYOR_BUILD_NUMBER || process.env.CIRCLE_BUILD_NUM || process.env.BUILD_NUMBER;
    }
    getResourcesDir(appOutDir) {
        return this.platform === metadata_1.Platform.OSX ? this.getOSXResourcesDir(appOutDir) : path.join(appOutDir, "resources");
    }
    getOSXResourcesDir(appOutDir) {
        return path.join(appOutDir, `${ this.appName }.app`, "Contents", "Resources");
    }
    checkFileInPackage(resourcesDir, file, isAsar) {
        return __awaiter(this, void 0, void 0, function* () {
            const relativeFile = path.relative(this.info.appDir, path.resolve(this.info.appDir, file));
            if (isAsar) {
                yield asarUtil_1.checkFileInPackage(path.join(resourcesDir, "app.asar"), relativeFile);
            } else {
                const outStat = yield util_1.statOrNull(path.join(resourcesDir, "app", relativeFile));
                if (outStat == null) {
                    throw new Error(`Application entry file "${ relativeFile }" does not exist. Seems like a wrong configuration.`);
                } else if (!outStat.isFile()) {
                    throw new Error(`Application entry file "${ relativeFile }" is not a file. Seems like a wrong configuration.`);
                }
            }
        });
    }
    sanityCheckPackage(appOutDir, isAsar) {
        return __awaiter(this, void 0, void 0, function* () {
            const outStat = yield util_1.statOrNull(appOutDir);
            if (outStat == null) {
                throw new Error(`Output directory "${ appOutDir }" does not exist. Seems like a wrong configuration.`);
            } else if (!outStat.isDirectory()) {
                throw new Error(`Output directory "${ appOutDir }" is not a directory. Seems like a wrong configuration.`);
            }
            const mainFile = this.metadata.main || "index.js";
            yield this.checkFileInPackage(this.getResourcesDir(appOutDir), mainFile, isAsar);
        });
    }
    archiveApp(format, appOutDir, outFile) {
        return __awaiter(this, void 0, void 0, function* () {
            return archive_1.archiveApp(this.devMetadata.build.compression, format, outFile, this.platform === metadata_1.Platform.OSX ? path.join(appOutDir, `${ this.appName }.app`) : appOutDir);
        });
    }
}
exports.PlatformPackager = PlatformPackager;
function getArchSuffix(arch) {
    return arch === metadata_1.Arch.x64 ? "" : `-${ metadata_1.Arch[arch] }`;
}
exports.getArchSuffix = getArchSuffix;
function normalizeTargets(targets) {
    if (targets == null) {
        return null;
    } else {
        return (Array.isArray(targets) ? targets : [targets]).map(it => it.toLowerCase().trim());
    }
}
exports.normalizeTargets = normalizeTargets;
// fpm bug - rpm build --description is not escaped, well... decided to replace quite to smart quote
// http://leancrew.com/all-this/2010/11/smart-quotes-in-javascript/
function smarten(s) {
    // opening singles
    s = s.replace(/(^|[-\u2014\s(\["])'/g, "$1\u2018");
    // closing singles & apostrophes
    s = s.replace(/'/g, "\u2019");
    // opening doubles
    s = s.replace(/(^|[-\u2014/\[(\u2018\s])"/g, "$1\u201c");
    // closing doubles
    s = s.replace(/"/g, "\u201d");
    return s;
}
exports.smarten = smarten;
// https://github.com/joshwnj/minimatch-all/blob/master/index.js
function minimatchAll(path, patterns) {
    let match = false;
    for (let pattern of patterns) {
        // If we've got a match, only re-test for exclusions.
        // if we don't have a match, only re-test for inclusions.
        if (match !== pattern.negate) {
            continue;
        }
        // partial match — pattern: foo/bar.txt path: foo — we must allow foo
        // use it only for non-negate patterns: const m = new Minimatch("!node_modules/@(electron-download|electron-prebuilt)/**/*", {dot: true }); m.match("node_modules", true) will return false, but must be true
        match = pattern.match(path, !pattern.negate);
        if (!match && !pattern.negate) {
            const rawPattern = pattern.pattern;
            // 1 - slash
            const patternLengthPlusSlash = rawPattern.length + 1;
            if (path.length > patternLengthPlusSlash) {
                // foo: include all directory content
                match = path[rawPattern.length] === "/" && path.startsWith(rawPattern);
            }
        }
    }
    return match;
}
// we use relative path to avoid canonical path issue - e.g. /tmp vs /private/tmp
function copyFiltered(src, destination, patterns) {
    let dereference = arguments.length <= 3 || arguments[3] === undefined ? false : arguments[3];
    let ignoreFiles = arguments[4];

    return fs_extra_p_1.copy(src, destination, {
        dereference: dereference,
        filter: it => {
            if (src === it) {
                return true;
            }
            let relative = it.substring(src.length + 1);
            // yes, check before path sep normalization
            if (ignoreFiles != null && ignoreFiles.has(relative)) {
                return false;
            }
            if (path.sep === "\\") {
                relative = relative.replace(/\\/g, "/");
            }
            return minimatchAll(relative, patterns);
        }
    });
}
function computeEffectiveTargets(rawList, targetsFromMetadata) {
    let targets = normalizeTargets(rawList.length === 0 ? targetsFromMetadata : rawList);
    return targets == null ? ["default"] : targets;
}
exports.computeEffectiveTargets = computeEffectiveTargets;
function listDependencies(appDir, production) {
    return __awaiter(this, void 0, void 0, function* () {
        let npmExecPath = process.env.npm_execpath || process.env.NPM_CLI_JS;
        const npmExecArgs = ["ls", production ? "--production" : "--dev", "--parseable"];
        if (npmExecPath == null) {
            npmExecPath = process.platform === "win32" ? "npm.cmd" : "npm";
        } else {
            npmExecArgs.unshift(npmExecPath);
            npmExecPath = process.env.npm_node_execpath || process.env.NODE_EXE || "node";
        }
        const result = (yield util_1.exec(npmExecPath, npmExecArgs, {
            cwd: appDir,
            stdio: "inherit",
            maxBuffer: 1024 * 1024
        })).trim().split("\n");
        if (result.length > 0 && !(result[0].indexOf("/node_modules/") !== -1)) {
            // first line is a project dir
            const lastIndex = result.length - 1;
            result[0] = result[lastIndex];
            result.length = result.length - 1;
        }
        return result;
    });
}
//# sourceMappingURL=platformPackager.js.map