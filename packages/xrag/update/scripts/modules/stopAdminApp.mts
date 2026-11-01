import { tryRun } from "./run.mts";

async function wait(timeoutMS: number) {
  await new Promise((resolve) => setTimeout(resolve, timeoutMS));
}

export async function stopAdminApp(adminAppName: string) {
  console.log(`Stop Admin App "${adminAppName}"...`);
  let tries = 10;
  console.log("NODE:PID:", process.pid);
  while (tries > 0) {
    const pgrepResult = await tryRun("pgrep", [adminAppName]);
    if (pgrepResult.state === "success") {
      await tryRun("osascript", ["-e", `quit app "${adminAppName}"`]);
    } else {
      // pgrep error means no processes with given name
      console.log(`Stopped Admin App "${adminAppName}"...`);
      return;
    }
    await wait(1000);
    tries -= 1;
  }

  throw new Error(`Could not kill ${adminAppName}`);
}
