const sqlite3 = require("sqlite3");

class DBUtil {

    constructor(dbPath) {
        this.db = new sqlite3.Database(dbPath);
        this.db.serialize();
    }

    async run(...params) {
        return new Promise((resolve, reject) => {
            let callback = function (err, res) {
                if (!err) {
                    resolve(res);
                } else {
                    reject(err);
                }
            };
            params.push(callback);
            this.db.run.apply(this.db, params);
        });
    }

    async getFirst(...params) {
        return new Promise((resolve, reject) => {
            let callback = function (err, res) {
                if (!err) {
                    resolve(res);
                } else {
                    reject(err);
                }
            };
            params.push(callback);
            this.db.get.apply(this.db, params);
        });
    }

    async getAll(...params) {
        return new Promise((resolve, reject) => {
            let callback = function (err, res) {
                if (!err) {
                    resolve(res);
                } else {
                    reject(err);
                }
            };
            params.push(callback);
            this.db.all.apply(this.db, params);
        });
    }

    async close() {
        return new Promise((resolve, reject) => {
            let callback = function (err, res) {
                if (!err) {
                    resolve();
                } else {
                    reject(err);
                }
            };
            this.db.close.apply(this.db, [callback]);
        });
    }

}

module.exports = DBUtil;