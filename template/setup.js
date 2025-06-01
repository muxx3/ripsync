#!/usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const { execSync, spawnSync } = require("child_process");
const inquirer = require("inquirer");

// === Validation ===
function isValidIP(ip) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
}

function isValidPort(port) {
  const num = Number(port);
  return Number.isInteger(num) && num >= 1 && num <= 65535;
}

// === mkcert ===
function checkMkcertInstalled() {
  try {
    execSync("mkcert --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function detectPackageManager() {
  if (commandExists("brew")) return "brew";
  if (commandExists("choco")) return "choco";
  if (commandExists("apt")) return "apt";
  if (commandExists("pacman")) return "pacman";
  return null;
}

function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function installMkcert(pkgMgr) {
  const commands = {
    brew: "brew install mkcert",
    choco: "choco install mkcert -y",
    apt: "sudo apt update && sudo apt install mkcert -y",
    pacman: "sudo pacman -Syu mkcert --noconfirm",
  };

  try {
    console.log(`📦 Installing mkcert using ${pkgMgr}...`);
    execSync(commands[pkgMgr], { stdio: "inherit" });
    return checkMkcertInstalled();
  } catch {
    return false;
  }
}

// === Main Logic ===
async function main() {
  console.log("🔧 Setting up RipSync...");

  const { ip, port, backendPort, frontendPort } = await inquirer.prompt([
    {
      type: "input",
      name: "ip",
      message: "Enter server IP (e.g. 192.168.1.100):",
      validate: isValidIP,
    },
    {
      type: "input",
      name: "frontendPort",
      message: "Enter frontend port (e.g. 3000):",
      validate: isValidPort,
    },
    {
      type: "input",
      name: "backendPort",
      message: "Enter backend port (e.g. 8000):",
      validate: isValidPort,
    },
  ]);

  // mkcert check/install
  if (!checkMkcertInstalled()) {
    const { consent } = await inquirer.prompt([
      {
        type: "confirm",
        name: "consent",
        message: "mkcert is not installed. Install it now?",
        default: true,
      },
    ]);

    if (!consent) {
      console.log("❌ mkcert is required. Aborting.");
      process.exit(1);
    }

    const pkgMgr = detectPackageManager();
    if (!pkgMgr || !installMkcert(pkgMgr)) {
      console.log("❌ Failed to install mkcert. Please install it manually.");
      process.exit(1);
    }
  }

  // === Create certs ===
  const sslDirs = [
    path.join("backend", "ssl"),
    path.join("p2p-frontend-setup", "ssl"),
  ];

  for (const dir of sslDirs) {
    fs.ensureDirSync(dir);
    console.log(`🔐 Generating certs in ${dir}`);
    const certCmd = `mkcert -cert-file cert.pem -key-file key.pem localhost 127.0.0.1 ${ip}`;
    execSync(certCmd, { cwd: dir, stdio: "inherit" });
  }

  // === Create .env files ===
  fs.writeFileSync(
    "backend/.env",
    `SERVER_IP=${ip}\nSERVER_PORT=${backendPort}\n`
  );

  fs.writeFileSync(
    "p2p-frontend-setup/.env.local",
    `NEXT_PUBLIC_WS_SERVER_IP=${ip}\nNEXT_PUBLIC_WS_SERVER_PORT=${backendPort}\nFRONTEND_PORT=${frontendPort}\n`
  );

  console.log("✅ Environment setup complete!");

}

main();

