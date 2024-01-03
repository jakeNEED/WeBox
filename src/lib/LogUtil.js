const os = require("os");

class LogUtil {
    static initLog(trace) {
        this.trace = trace;
        if (trace) {
            this.log = (...arg) => console.log.apply(null, arg);
            this.logEnd = () => void 0;
        }
    }

    static writeline(...args) {
        process.stdout.write((args.length ? args.join(" ") : "") + os.EOL, "utf8");
    }

    static consoleLog(...args) {
        args.unshift(new Date().toLocaleTimeString());
        console.log.apply(null, args);
    }

    static _tmpReplacer(k) {
        let v = LogUtil._tmpObj[k.charAt(0)];
        while (v.length < k.length) {
            v = "0" + v;
        }
        return v;
    }

    /**
     * 格式化时间戳，毫秒
     * @param {number|Date} time 时间戳，毫秒
     * @param {string} [format=yyyy-MM-dd HH:mm:ss.SSS] y年，M月，d日，H时，m分，s秒，S毫秒
     * @returns {string}
     */
    static formatTime(time, format = "yyyy-MM-dd HH:mm:ss.SSS") {
        let date;
        if (typeof time === "number") {
            date = new Date(time);
        } else {
            date = time;
        }
        LogUtil._tmpObj["y"] = "" + date.getFullYear();
        LogUtil._tmpObj["M"] = "" + (date.getMonth() + 1);
        LogUtil._tmpObj["d"] = "" + date.getDate();
        LogUtil._tmpObj["H"] = "" + date.getHours();
        LogUtil._tmpObj["m"] = "" + date.getMinutes();
        LogUtil._tmpObj["s"] = "" + date.getSeconds();
        LogUtil._tmpObj["S"] = "" + date.getMilliseconds();
        return format.replace(/y+|M+|d+|H+|m+|s+|S+/g, LogUtil._tmpReplacer);
    }

}

LogUtil._tmpObj = {};
LogUtil.trace = false;
LogUtil.cnt = 0;
LogUtil.log = function (...arg) {
    process.stdout.write(".");
    this.cnt++;
    if (this.cnt >= 100) {
        this.cnt = 0;
        process.stdout.write(os.EOL);
    }
};

LogUtil.logEnd = function () {
    if (this.cnt > 0) {
        this.cnt = 0;
        process.stdout.write(os.EOL);
    }
};

module.exports = LogUtil;