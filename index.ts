import { execSync, fork } from "child_process";
import { rmSync } from "fs";
import { join } from "path";

const threads = Number(process.argv[2]) || 10;
const commits = Number(process.argv[3]) || 10;

if (__filename.split("/").reverse()[1] === "master") {
  if (join(process.cwd(), "index.ts") !== __filename) {
    console.log(`You must be inside the master repository.`);

    process.exit();
  }

  console.log(`Spawning ${threads} slave${threads !== 1 ? "s" : ""}...`);

  process.on("SIGINT", () => {
    console.log(`Cleaning up... please wait.`);

    for (let i = 0; i < created; i++) {
      try {
        execSync(`git remote remove local`);
        execSync(`git remote add local ../slave-${i}`);
        execSync(`git fetch local`);
        execSync(`git merge local/slave-${i}`);
      } catch {
        console.log(`Unable to merge 'slave-${i}'`);
      }
    }

    execSync(`rm -rf ../slave-*`);

    process.exit();
  });

  let created = 0;

  for (let i = 0; i < threads; i++) {
    execSync(`git clone ../master ../slave-${i}`);

    execSync(`tsc ../slave-${i}/index.ts`);

    const slave = fork(
      `../slave-${i}/index.js`,
      [threads, commits, i.toString()],
      { cwd: join(process.cwd(), "..", `slave-${i}`) }
    );

    created++;

    slave.on("message", (msg) => {
      if (msg === "EXIT") {
        execSync(`git remote remove local`);
        execSync(`git remote add local ../slave-${i}`);
        execSync(`git fetch local`);
        execSync(`git merge local/slave-${i}`);

        rmSync(`../slave-${i}`, { recursive: true, force: true });

        return slave.kill();
      }

      return console.log(`[slave-${i}]: ${msg.toString()}`);
    });
  }
} else {
  const id = process.argv[4];

  execSync(`git checkout -b slave-${id}`);

  for (let i = 1; i < commits * 1000; i++) {
    execSync(`git commit --allow-empty -m "[slave-${id}]: ${i}"`);

    process.send!(`commit ${i}`);
  }

  process.send!("EXIT");
}
