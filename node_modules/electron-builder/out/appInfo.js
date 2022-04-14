"use strict";

const log_1 = require("./util/log");
const platformPackager_1 = require("./platformPackager");
const util_1 = require("./util/util");
const repositoryInfo_1 = require("./repositoryInfo");
const sanitizeFileName = require("sanitize-filename");
//noinspection JSUnusedLocalSymbols
const __awaiter = require("./util/awaiter");
class AppInfo {
    constructor(metadata, devMetadata, buildVersion) {
        this.metadata = metadata;
        this.devMetadata = devMetadata;
        this.description = platformPackager_1.smarten(this.metadata.description);
        this.version = metadata.version;
        this.buildNumber = this.devMetadata.build["build-version"] || process.env.TRAVIS_BUILD_NUMBER || process.env.APPVEYOR_BUILD_NUMBER || process.env.CIRCLE_BUILD_NUM || process.env.BUILD_NUMBER;
        if (util_1.isEmptyOrSpaces(buildVersion)) {
            buildVersion = this.version;
            if (!util_1.isEmptyOrSpaces(this.buildNumber)) {
                buildVersion += `.${ this.buildNumber }`;
            }
            this.buildVersion = buildVersion;
        } else {
            this.buildVersion = buildVersion;
        }
        this.productName = getProductName(this.metadata, this.devMetadata);
        this.productFilename = sanitizeFileName(this.productName);
    }
    get companyName() {
        return this.metadata.author.name;
    }
    get id() {
        const appId = this.devMetadata.build["app-bundle-id"];
        if (appId != null) {
            log_1.warn("app-bundle-id is deprecated, please use appId");
        }
        if (this.devMetadata.build.appId != null) {
            return this.devMetadata.build.appId;
        }
        if (appId == null) {
            return `com.electron.${ this.metadata.name.toLowerCase() }`;
        }
        return appId;
    }
    get name() {
        return this.metadata.name;
    }
    get category() {
        const metadata = this.devMetadata.build;
        const old = metadata["app-category-type"];
        if (old != null) {
            log_1.warn('"app-category-type" is deprecated — please use "category" instead');
        }
        return metadata.category || old;
    }
    get copyright() {
        const metadata = this.devMetadata.build;
        const old = metadata["app-copyright"];
        if (old != null) {
            log_1.warn('"app-copyright" is deprecated — please use "copyright" instead');
        }
        const copyright = metadata.copyright || old;
        if (copyright != null) {
            return copyright;
        }
        return `Copyright © ${ new Date().getFullYear() } ${ this.metadata.author.name || this.productName }`;
    }
    computePackageUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const url = this.metadata.homepage || this.devMetadata.homepage;
            if (url != null) {
                return url;
            }
            const info = yield repositoryInfo_1.getRepositoryInfo(this.metadata, this.devMetadata);
            if (info != null) {
                return `https://github.com/${ info.user }/${ info.project }`;
            }
            return null;
        });
    }
}
exports.AppInfo = AppInfo;
function getProductName(metadata, devMetadata) {
    return devMetadata.build.productName || metadata.productName || metadata.name;
}
//# sourceMappingURL=appInfo.js.map