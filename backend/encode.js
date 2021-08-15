const defaultPrefix = Buffer.from("\2");

module.exports = function encode(string, prefix) {
    if (!Buffer.isBuffer(string)) {
        string = Buffer.from(string);
    }

    if (prefix && !Buffer.isBuffer(prefix)) {
        prefix = Buffer.from(prefix);
    }

    const msg = Buffer.concat([prefix || defaultPrefix, string]);

    const header = Buffer.from(2);

    header.writeUInt16BE(msg.length + 4, 0);

    const encoded = Buffer.concat([
        Buffer.from(header.toString("hex").toUpperCase()),
        msg,
    ]);

    return encoded;
};
