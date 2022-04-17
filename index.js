"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = require("path");
const threads = Number(process.argv[2]) || 10;
const commits = Number(process.argv[3]) || 10;
const forever = Boolean(process.argv[4]);
if (__filename.split("/").reverse()[1] === "master") {
    if ((0, path_1.join)(process.cwd(), "index.js") !== __filename) {
        console.log(`You must be inside the master repository.`);
        process.exit();
    }
    console.log(`Spawning ${threads} slave${threads !== 1 ? "s" : ""}...`);
    let cleaned = false;
    const exit = () => {
        if (!cleaned) {
            console.log(`Cleaning up... please wait.`);
            for (let i = 0; i < threads; i++)
                (0, child_process_1.execSync)(`./merge.sh ${i} || echo \"Unable to merge 'slave-${i}'\"`);
            (0, child_process_1.execSync)(`rm -rf ../slave-*`);
        }
        cleaned = true;
        process.exit();
    };
    process.on("SIGINT", exit).on("exit", exit);
    for (let i = 0; i < threads; i++) {
        (0, child_process_1.execSync)(`git clone ../master ../slave-${i}`);
        const slave = (0, child_process_1.fork)(`../slave-${i}/index.js`, [threads, commits, i].map(String), { cwd: (0, path_1.join)(process.cwd(), "..", `slave-${i}`) });
        slave.on("exit", () => (0, child_process_1.execSync)(`./merge.sh ${i} || echo \"Unable to merge 'slave-${i}'\"`));
    }
}
else {
    const id = process.argv[4];
    (0, child_process_1.execSync)(`git checkout -b slave-${id}`);
    (0, child_process_1.execSync)(`./commit.sh ${id} ${commits} ${forever}`);
}
