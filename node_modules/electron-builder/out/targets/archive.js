"use strict";

const util_1 = require("../util");
const path = require("path");
const fs_extra_p_1 = require("fs-extra-p");
const _7zip_bin_1 = require("7zip-bin");
//noinspection JSUnusedLocalSymbols
const __awaiter = require("../awaiter");
class CompressionDescriptor {
    constructor(flag, env, minLevel) {
        let maxLevel = arguments.length <= 3 || arguments[3] === undefined ? "-9" : arguments[3];

        this.flag = flag;
        this.env = env;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
    }
}
const extToCompressionDescriptor = {
    "tar.xz": new CompressionDescriptor("--xz", "XZ_OPT", "-0", "-9e"),
    "tar.lz": new CompressionDescriptor("--lzip", "LZOP", "-0"),
    "tar.gz": new CompressionDescriptor("--gz", "GZIP", "-1"),
    "tar.bz2": new CompressionDescriptor("--bzip2", "BZIP2", "-1")
};
function archiveApp(compression, format, outFile, dirToArchive) {
    return __awaiter(this, void 0, void 0, function* () {
        const storeOnly = compression === "store";
        if (format.startsWith("tar.")) {
            // we don't use 7z here - develar: I spent a lot of time making pipe working - but it works on OS X and often hangs on Linux (even if use pipe-io lib)
            // and in any case it is better to use system tools (in the light of docker - it is not problem for user because we provide complete docker image).
            const info = extToCompressionDescriptor[format];
            let tarEnv = process.env;
            if (compression != null && compression !== "normal") {
                tarEnv = Object.assign({}, process.env);
                tarEnv[info.env] = storeOnly ? info.minLevel : info.maxLevel;
            }
            yield util_1.spawn(process.platform === "darwin" || process.platform === "freebsd" ? "gtar" : "tar", [info.flag, "--transform", `s,^\.,${ path.basename(outFile, "." + format) },`, "-cf", outFile, "."], {
                cwd: dirToArchive,
                stdio: ["ignore", util_1.debug.enabled ? "inherit" : "ignore", "inherit"],
                env: tarEnv
            });
            return;
        }
        const args = util_1.debug7zArgs("a");
        if (compression === "maximum") {
            if (format === "7z" || format.endsWith(".7z")) {
                args.push("-mx=9", "-mfb=64", "-md=32m", "-ms=on");
            } else if (format === "zip") {
                // http://superuser.com/a/742034
                //noinspection SpellCheckingInspection
                args.push("-mfb=258", "-mpass=15");
            } else {
                args.push("-mx=9");
            }
        } else if (storeOnly) {
            if (format !== "zip") {
                args.push("-mx=1");
            }
        }
        // remove file before - 7z doesn't overwrite file, but update
        try {
            yield fs_extra_p_1.unlink(outFile);
        } catch (e) {}
        if (format === "zip" || storeOnly) {
            args.push("-mm=" + (storeOnly ? "Copy" : "Deflate"));
        }
        args.push(outFile, dirToArchive);
        yield util_1.spawn(_7zip_bin_1.path7za, args, {
            cwd: path.dirname(dirToArchive),
            stdio: ["ignore", util_1.debug.enabled ? "inherit" : "ignore", "inherit"]
        });
    });
}
exports.archiveApp = archiveApp;
//# sourceMappingURL=archive.js.map