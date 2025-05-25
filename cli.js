#!/usr/bin/env node

const { Command } = require("commander");
const inquirer = require("inquirer");
const path = require("path");
const fs = require("fs-extra");
const os = require("os");
const { spawnSync } = require("child_process");
const packageJson = require("./package.json");

const program = new Command();
const configDir = path.join(os.homedir(), ".config", "ripsync");
const configPath = path.join(configDir, "config.json");

function isFirstRun() {
  try {
    return !fs.existsSync(configPath);
  } catch {
    return true;
  }
}

function markAsRun() {
  try {
    fs.ensureDirSync(configDir);
    fs.writeJsonSync(configPath, { firstRun: false }, { spaces: 2 });
  } catch (err) {
    console.error("❌ Failed to save config file:", err);
  }
}

function showBanner() {
  const banner = String.raw`

           d8,                                             
           8P                                              
                                                           
  88bd88b  88b?88,.d88b, .d888b,?88   d8P   88bd88b  d8888b
  88P'     88P ?88'  ?88 ?8b,   d88   88    88P' ?8bd8P'  P
 d88      d88   88b  d8P    ?8b ?8(  d88   d88   800813    
d88'     d88'   888888P' ?888P'  ?88P'?8b d88'   88b ?888P'
                88P'                   )88                 
               d88                    ,d8P                 
               ?8P                  ?888P'                 

  `;
  console.log(banner);
  console.log(`💾  HI! Welcome to \x1b[34mRipSync\x1b[0m – P2P file sharing, simplified.\n`);
  console.log(`👉  Build a Rip server!`);
  console.log(`👉  Or Exit and type \x1b[4mripsync --help\x1b[0m for all commands\n`);
}

function runNodeScript(scriptName, cwd) {
  const scriptPath = path.join(cwd, scriptName);
  if (!fs.existsSync(scriptPath)) {
    console.error(`❌ ${scriptName} not found in ${cwd}`);
    process.exit(1);
  }

  const result = spawnSync("node", [scriptPath], {
    cwd,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.error(`❌ Error running ${scriptName}`);
    process.exit(1);
  }
}

// ----  Command Logic ----

async function buildProject(name) {
  const templatePath = path.join(__dirname, "template");
  const destPath = path.resolve(process.cwd(), name);

  if (fs.existsSync(destPath)) {
    console.error(`❌ Server "${name}" already exists.`);
    process.exit(1);
  }

  fs.copySync(templatePath, destPath);
  console.log(`📁 Created folder in ./${name}`);

  const install = spawnSync("npm", ["install"], {
    cwd: destPath,
    stdio: "inherit",
    shell: true,
  });

  if (install.status !== 0) {
    console.error("❌ npm install failed.");
    process.exit(1);
  }

  runNodeScript("setup.js", destPath);
  console.log(`\n✅ Server created at ./${name}`);
  console.log(`👉 cd ${name} && ripsync init`);
}

function startCurrentProject() {
  runNodeScript("run.js", process.cwd());
}

function runProjectByName(name) {
  const locations = [
    path.join(process.cwd(), name),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.join(os.homedir(), "ripsync-servers", name),
  ];

  for (const loc of locations) {
    const runPath = path.join(loc, "run.js");
    if (fs.existsSync(runPath)) {
      runNodeScript("run.js", loc);
      return;
    }
  }

  console.error(`❌ Could not find a server named "${name}"`);
  process.exit(1);
}

function listProjects() {
  const baseDir = path.join(os.homedir(), "ripsync-servers");
  if (!fs.existsSync(baseDir)) {
    console.log(`📂 ${baseDir} NOT found.`);
    return;
  }

  const dirs = fs.readdirSync(baseDir).filter((f) =>
    fs.existsSync(path.join(baseDir, f, "run.js"))
  );

  if (!dirs.length) {
    console.log("📂 No valid servers found.");
  } else {
    console.log("📁 Available servers:");
    dirs.forEach((dir) => console.log(`- ${dir}`));
  }
}

function cleanProjects() {
  const baseDir = path.join(os.homedir(), "ripsync-servers");
  if (fs.existsSync(baseDir)) {
    fs.removeSync(baseDir);
    console.log("🧹 Cleaned all servers.");
  } else {
    console.log("Nothing to clean.");
  }
}

async function initProject() {
  const sourceDir = process.cwd();
  const projectName = path.basename(sourceDir);
  const targetDir = path.join(os.homedir(), "ripsync-servers", projectName);

  if (fs.existsSync(targetDir)) {
    console.error(`❌ A server named "${projectName}" is already registered at ${targetDir}`);
    process.exit(1);
  }

  fs.ensureDirSync(path.dirname(targetDir));
  fs.moveSync(sourceDir, targetDir, { 
    filter: (src) => !src.includes("node_modules"),
    overwrite: false 
  });

  console.log(`✅ Registered "${projectName}" at: ${targetDir}`);
  console.log(`👉 You can now run it from anywhere with: ripsync run ${projectName}`);
}


async function interactivePrompt() {
  const { action } = await inquirer.prompt({
    type: "list",
    name: "action",
    message: "Choose an action:",
    choices: [
      { name: "🛠   Create new server", value: "build" },
      { name: "▶️  Start server in current directory", value: "start" },
      { name: "🚀  Run server by name", value: "run" },
      { name: "📦  Initialize server", value: "init" },
      { name: "📄  List known servers", value: "list" },
      { name: "🧹  Delete known servers", value: "clean" },
      { name: "❌  Exit", value: "exit" },
    ],
  });

  if (action === "exit") return;
  if (action === "build") {
    const { name } = await inquirer.prompt({
      type: "input",
      name: "name",
      message: "Enter new project name:",
    });
    await buildProject(name);
  } else if (action === "start") {
    startCurrentProject();
  } else if (action === "run") {
    const { name } = await inquirer.prompt({
      type: "input",
      name: "name",
      message: "Enter server name to run:",
    });
    runProjectByName(name);
  } else if (action === "list") {
    listProjects();
  } else if (action === "clean") {
    cleanProjects();
  } else if (action === "init") {
    initProject();
  }
}

// ---- CLI Setup ----

program
    .name("ripsync(rs)")
    .version(packageJson.version)
    .description("📡 RipSync – P2P file sharing CLI");

program
    .command("build <name>")
    .description("Scaffold a new server")
    .action(buildProject);
program
    .command("start")
    .description("Start the server in the current directory\nMust be in the root directory of the server")
    .action(startCurrentProject);
program
    .command("run <name>")
    .description("Run a server by name from anywhere\nGobally executable")
    .action(runProjectByName);
program
    .command("list")
    .description("List all known servers")
    .action(listProjects);
program
    .command("clean")
    .description("Remove all known servers")
    .action(cleanProjects);
program
    .command("init")
    .description("Register and move this project to ~/ripsync-servers/<server>\nMakes it globally executable with 'run' command\nMust be in the root directory of the server")
    .action(initProject);
program
    .command("ascii")
    .description("Prints the RipSync ASCII banner art")
    .action(showBanner);


// ---- Entry Point ----

(async () => {
  const hasArgs = process.argv.length > 2;

  if (isFirstRun()) {
    showBanner();
    markAsRun();
    await interactivePrompt();
  } else if (!hasArgs) {
    await interactivePrompt();
  } else {
    program.parse(process.argv);
  }
})();

