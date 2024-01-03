const fs = window.require('fs');
const path = window.require('path');
let readline = window.require("readline");

class FileUtil {
    static readLineFilter(p, filter, callback, encoding) {
        let rl = readline.createInterface({input: fs.createReadStream(p, {encoding})});
        let arr = [];
        rl.on("line", function (line) {
            if (filter(line)) {
                arr.push(line);
            }
        });
        rl.on("close", function () {
            callback(arr);
        });
    }

    /**
     *
     * @param {string} dir
     * @param {number} [mode]
     * @return {boolean} result
     */
    static mkdirsSync(dir, mode) {
        try {
            if (!fs.existsSync(dir)) {
                let tmp;
                dir = dir.replace(/\\/g, "/");
                dir.split("/").forEach((name) => {
                    if (tmp) {
                        tmp = path.join(tmp, name);
                    } else {
                        tmp = name;
                    }
                    if (!fs.existsSync(tmp)) {
                        if (!fs.mkdirSync(tmp, mode)) {
                            return false;
                        }
                    }
                });
            }
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    /**
     *
     * @param {string} dir
     * @returns {boolean}
     */
    static cleanDirSync(dir) {
        try {
            if (fs.existsSync(dir)) {
                let files = fs.readdirSync(dir);
                for (let name of files) {
                    if (name.charAt(0) === ".") {
                        continue;
                    }
                    let p = path.join(dir, name);
                    if (fs.lstatSync(p).isDirectory()) {
                        this.rmdirsSync(p);
                    } else {
                        fs.unlinkSync(p);
                    }
                }
            }
        } catch (e) {
            console.error(e);
            return false;
        }
        return true;
    }

    /**
     *
     * @param {string} dir
     * @return {boolean}
     */
    static rmdirsSync(dir) {
        try {
            if (fs.existsSync(dir)) {
                let files = fs.readdirSync(dir);
                for (let name of files) {
                    let p = path.join(dir, name);
                    if (fs.lstatSync(p).isDirectory()) {
                        this.rmdirsSync(p);
                    } else {
                        fs.unlinkSync(p);
                    }
                }
                fs.rmdirSync(dir);
            }
        } catch (e) {
            console.error(e);
            return false;
        }
        return true;
    }

    /**
     *
     * @param {string} p
     */
    static delAnyway(p) {
        if (!fs.existsSync(p)) {
            return false;
        }
        if (fs.lstatSync(p).isDirectory()) {
            FileUtil.rmdirsSync(p);
        } else {
            fs.unlinkSync(p);
        }
    }


    /**
     *
     * @param {string} dir
     * @param {string[]} [res]
     * @param {string|string[]} [ext]
     * @return {string[]}
     */
    static walkSync(dir, res, ext) {
        res = res || [];
        console.log('fs',fs);
        let files = fs.readdirSync(dir);
        for (let f of files) {
            if (f.charAt(0) === ".") {
                continue;
            }
            let p = path.join(dir, f);
            let stat = fs.lstatSync(p);
            if (stat.isDirectory()) {
                this.walkSync(p, res, ext);
            } else if (stat.isFile()) {
                let extF = path.extname(f);
                if (typeof ext === "string") {
                    if (extF !== ext) {
                        continue;
                    }
                } else if (Array.isArray(ext)) {
                    if (ext.indexOf(extF) < 0) {
                        continue;
                    }
                }
                res.push(p);
            }
        }
        return res;
    }
    
    static walkSyncs(dir, res, exts) {
        res = res || [];
        let files = fs.readdirSync(dir);
        exts.forEach(ext => {
            for (let f of files) {
                if (f.charAt(0) === ".") {
                    continue;
                }
                let p = path.join(dir, f);
                let stat = fs.lstatSync(p);
                if (stat.isDirectory()) {
                    this.walkSync(p, res, ext);
                } else if (stat.isFile()) {
                    let extF = path.extname(f);
                    if (typeof ext === "string") {
                        if (extF !== ext) {
                            continue;
                        }
                    } else if (Array.isArray(ext)) {
                        if (ext.indexOf(extF) < 0) {
                            continue;
                        }
                    }
                    res.push(p);
                }
            }
        });
        return res;
    }

    /**
     *
     * @param {string} dir
     * @param {string[]} [res]
     * @returns {string[]}
     */
    static readDirListSync(dir, res) {
        res = res || [];
        let files = fs.readdirSync(dir);
        for (let f of files) {
            if (f.charAt(0) === ".") {
                continue;
            }
            let p = path.join(dir, f);
            let stat = fs.lstatSync(p);
            if (stat.isDirectory()) {
                res.push(f);
            }
        }
        return res;
    }

    /**
     *
     * @param {string} dir
     * @param {string|string[]} [ext]
     * @returns {string[]}
     */
    static readFileListSync(dir, ext) {
        let res = [];
        let files = fs.readdirSync(dir);
        for (let f of files) {
            if (f.charAt(0) === ".") {
                continue;
            }
            let p = path.join(dir, f);
            let stat = fs.lstatSync(p);
            if (stat.isFile()) {
                let extF = path.extname(f);
                if (typeof ext === "string") {
                    if (extF !== ext) {
                        continue;
                    }
                } else if (Array.isArray(ext)) {
                    if (ext.indexOf(extF) < 0) {
                        continue;
                    }
                }
                res.push(f);
            }
        }
        return res;
    }



    static copyDirectory(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        if (!fs.existsSync(src)) {
            return false;
        }
        // console.log("src:" + src + ", dest:" + dest);
        // 拷贝新的内容进去
        var dirs = fs.readdirSync(src);
        dirs.forEach(function(item){
            var item_path = path.join(src, item);
            var temp = fs.statSync(item_path);
            if (temp.isFile()) { // 是文件
               // console.log("Item Is File:" + item);
                fs.copyFileSync(item_path, path.join(dest, item));
            } else if (temp.isDirectory()){ // 是目录
                // console.log("Item Is Directory:" + item);
                FileUtil.copyDirectory(item_path, path.join(dest, item));
            }
        });
    }

}

module.exports = FileUtil;