import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";

const port = Number(process.argv[2]);
const dir = process.cwd();
const next = createRequire(path.join(dir, "package.json"))("next");

const LISTENER_METHODS = new Set([
    "on",
    "once",
    "addListener",
    "prependListener",
    "prependOnceListener",
]);
const SHIELDED_EVENTS = new Set(["close", "error"]);

function shieldSocket(socket) {
    const shielded = new Proxy(socket, {
        get(target, property) {
            if (property === "destroyed") return false;
            if (property === "writable") return true;
            if (LISTENER_METHODS.has(property)) {
                return (event, listener) => {
                    if (!SHIELDED_EVENTS.has(event)) target[property](event, listener);
                    return shielded;
                };
            }
            const value = Reflect.get(target, property, target);
            return typeof value === "function" ? value.bind(target) : value;
        },
    });
    return shielded;
}

const app = next({ dev: false, dir, hostname: "localhost", port });
const handle = app.getRequestHandler();
await app.prepare();

createServer((req, res) => {
    if (req.url?.startsWith("/_next/image")) {
        Object.defineProperty(req, "socket", {
            value: shieldSocket(req.socket),
            configurable: true,
            writable: true,
        });
    }
    handle(req, res);
}).listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
});
