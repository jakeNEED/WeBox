const child_process = window.require("child_process");
const LogUtil = require("./LogUtil");
const os = require("os");
const fs = require("fs");
const FileUtil = require("./FileUtil");

class ShellUtil {
    static async sleep(time) {
        return new Promise(resolve => setTimeout(resolve, time));
    }

    static shellCwd(command, cwd, ...args) {
        console.log('command: ' , command);
        let cfg = {maxBuffer: 1024 * 1024 * 100, encoding: "utf8", cwd: cwd};
        if (args && typeof args[args.length - 1] === "function") {
            let callback = args.pop();
            return child_process.exec(command + " " + args.join(" "), cfg, callback);
        }
        return new Promise((resolve, reject) => {
            const cmd = command + " " + args.join(" ");
            child_process.exec(cmd, cfg, (error, stdout, stderr) => {
                if (error) {
                    LogUtil.consoleLog(stdout);
                    LogUtil.consoleLog(stderr);
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    static shell(command, ...args) {
        console.log('command: ' , command);
        let cfg = {maxBuffer: 1024 * 1024 * 100, encoding: "utf8"};
        if (args && typeof args[args.length - 1] === "function") {
            let callback = args.pop();
            return child_process.exec(command + " " + args.join(" "), cfg, callback);
        }
        return new Promise((resolve, reject) => {
            const cmd = command + " " + args.join(" ");
            // LogUtil.consoleLog("运行的命令", cmd);
            child_process.exec(cmd, cfg, (error, stdout, stderr) => {
                if (error) {
                    console.log(error)
                    LogUtil.consoleLog(stdout);
                    LogUtil.consoleLog(stderr);
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    /**
     * 获取目录svn信息
     * @param tar
     * @returns {Promise<{
     * Path: string,
     * WorkingCopyRootPath: string,
     * URL: string,
     * RelativeURL: string,
     * RepositoryRoot: string,
     * RepositoryUUID: string,
     * Revision: string,
     * NodeKind: string,
     * Schedule: string,
     * LastChangedAuthor: string,
     * LastChangedRev: string,
     * LastChangedDate: string,
     * }>}
     */
    static async svnInfo(tar) {
        let res = await ShellUtil.shell("svn", "info", tar);
        let ret = {};
        res.split(os.EOL).map(function (str) {
            if (!str || !str.length) {
                return;
            }
            let index = str.indexOf(":");
            if (index < 0) {
                return;
            }
            let key = str.substring(0, index).trim().replace(/\s/g, "");
            ret[key] = str.substring(index + 1).trim();
        });
        return ret;
    }

    /**
     * 获取目录svn文件状态
     * @param {string} tar
     * @returns {Promise<{non_versioned: string[], missing: string[], added: string[], deleted: string[], modified: string[]}>}
     */
    static async svnStatus(tar) {
        let res = await ShellUtil.shell("svn", "st", tar);
        let ret = {non_versioned: [], missing: [], added: [], deleted: [], modified: []};
        res.split(os.EOL).map(function (str) {
            let t = str.charAt(0);
            let p = str.substr(7).trim();
            switch (t) {
                case "?":
                    ret.non_versioned.push(p);
                    break;
                case "!":
                    ret.missing.push(p);
                    break;
                case "A":
                    ret.added.push(p);
                    break;
                case "D":
                    ret.deleted.push(p);
                    break;
                case "M":
                    ret.modified.push(p);
                    break;
            }
        });
        return ret;
    }

    /**
     *
     * @param {string} repos
     * @param {string} tar
     * @return {Promise<void>}
     */
    static async svnSwitch(repos, tar) {
        await ShellUtil.shell("svn", "sw", repos, tar, "--ignore-ancestry");
    }

    static async svnUpdate(tar) {
        return await ShellUtil.shell("svn", "up", `${tar}`, "--accept", "tc");
    }

    static async svnAdd(tar) {
        return await ShellUtil.shell("svn", "add", `${tar}`, "--force");
    }

    static async svnDel(tar) {
        return await ShellUtil.shell("svn", "delete", `${tar}`);
    }

    static async svnRevert(tar) {
        if (fs.statSync(tar).isDirectory()) {
            let status = await ShellUtil.svnStatus(tar);
            let revertList = [].concat(status.added, status.deleted, status.modified, status.missing);
            let delList = [].concat(status.added, status.non_versioned);
            for (let p of revertList) {
                await ShellUtil.shell("svn", "revert", `${p}`);
            }
            for (let p of delList) {
                FileUtil.delAnyway(p);
            }
            return;
        }
        return await ShellUtil.shell("svn", "revert", `${tar}`);
    }

    static async svnCommit(tar, ciMsg) {
        let stat = fs.statSync(tar);
        if (stat.isDirectory()) {
            let status = await ShellUtil.svnStatus(tar);
            for (let p of status.missing) {
                await ShellUtil.svnDel(p);
            }
            for (let p of status.non_versioned) {
                await ShellUtil.svnAdd(p);
            }
        }
        await ShellUtil.shell("svn", "ci", `"${tar}"`, "-m", `"${ciMsg}"`);
    }

    static async svnCleanup(tar) {
        await ShellUtil.shell("svn", "cleanup", "--remove-unversioned", "--remove-ignored", "--vacuum-pristines", "--include-externals",
            "-q", `${tar}`);
    }

}

module.exports = ShellUtil;
