import { env } from "./env.js";
import { app } from "./app.js";
import { boot, startLoops } from "./services/protocol.js";
boot()
    .then(() => {
    app.listen(env.port, "0.0.0.0", () => {
        console.log(`api http://localhost:${env.port}`);
    });
    startLoops();
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
