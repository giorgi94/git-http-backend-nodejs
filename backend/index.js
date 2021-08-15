const { Duplex } = require("stream");
const { inherits } = require("util");

const url = require("url");
const qs = require("querystring");

const Service = require("./service.js");

const gitServices = ["git-receive-pack", "git-upload-pack"];

const regex = {
    "git-receive-pack": RegExp(
        "([0-9a-fA-F]+) ([0-9a-fA-F]+)" +
            " (refs/[^ \u0000]+)( |00|\u0000)" +
            "|^(0000)$"
    ),
    "git-upload-pack": /^\S+ ([0-9a-fA-F]+)/,
};

const fields = {
    "git-receive-pack": ["last", "head", "refname"],
    "git-upload-pack": ["head"],
};

class Backend extends Duplex {
    constructor(uri, cb) {
        super();

        if (cb) {
            this.on("service", function (s) {
                cb(null, s);
            });
            this.on("error", cb);
        }

        try {
            uri = decodeURIComponent(uri);
        } catch (err) {
            return this.error(msg);
        }

        const u = url.parse(uri);

        if (/\.\/|\.\./.test(u.pathname)) {
            return this.error("invalid git path");
        }

        this.parsed = false;

        const parts = u.pathname.split("/");

        if (/\/info\/refs$/.test(u.pathname)) {
            const params = qs.parse(u.query);
            this.service = params.service;
            this.info = true;
        } else {
            this.service = parts[parts.length - 1];
        }

        if (!gitServices.includes(this.service)) {
            return this.error("unsupported git service");
        }

        if (this.info) {
            const service = new Service(
                { cmd: this.service, info: true },
                this
            );

            process.nextTick(() => {
                this.emit("service", service);
            });
        }
    }

    error(msg) {
        let err = typeof msg === "string" ? new Error(msg) : msg;
        process.nextTick(() => {
            this.emit("error", err);
        });
    }

    _read(n) {
        if (this._stream && this._stream.next) {
            this._ready = false;
            this._stream.next();
        } else {
            this._ready = n;
        }
    }

    _write(buf, enc, next) {
        if (this._stream) {
            this._next = next;
            this._stream.push(buf);
            return;
        } else if (this.info) {
            this._buffer = buf;
            this._next = next;
            return;
        }

        if (this._prev) {
            buf = Buffer.concat([this._prev, buf]);
        }

        let m,
            s = buf.slice(0, 512).toString("utf8");

        if ((m = regex[this.service].exec(s))) {
            this._prev = null;
            this._buffer = buf;
            this._next = next;

            let keys = fields[this.service];
            let row = { cmd: this.service };

            keys.forEach((key, i) => {
                row[key] = m[i + 1];
            });

            this.emit("service", new Service(row, this));
        } else if (buf.length >= 512) {
            return this.emit("error", new Error("unrecognized input"));
        } else {
            this._prev = buf;
            next();
        }
    }
}

module.exports = Backend;
