// === run.js ===
// This script installs frontend deps, checks Rust, builds the backend, and starts both servers.

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs-extra");

// Utility: check if a command exists by trying to run it with --version
function checkCommandExists(cmd) {
  try {
    spawnSync(cmd, ["--version"], { stdio: "ignore", shell: true });
    return true;
  } catch {
    return false;
  }
}

// Step 1: Check if Rust is installed by confirming 'cargo' exists
function ensureRustInstalled() {
  const hasCargo = checkCommandExists("cargo");
  if (!hasCargo) {
    console.error("❌ Cargo (Rust compiler) is not installed or not in PATH.");
    console.error("➡️  Please install Rust from https://rustup.rs");
    process.exit(1);
  }
}

// Step 2: Ensure frontend folder exists and install dependencies
function ensureFrontendSetup(frontendPath) {
  if (!fs.existsSync(frontendPath)) {
    console.error(`❌ Frontend folder not found in ${frontendPath}`);
    process.exit(1);
  }

  console.log("📦 Installing frontend packages...");
  const install = spawnSync("npm", ["install"], {
    cwd: frontendPath,
    stdio: "inherit",
    shell: true,
  });
  if (install.error) {
    console.error("❌ Failed to install frontend dependencies:", install.error);
    process.exit(1);
  }

  // Make sure 'concurrently' is available to run backend and frontend together
  const checkConcurrently = spawnSync("npx", ["concurrently", "--version"], {
    cwd: frontendPath,
    stdio: "ignore",
    shell: true,
  });

  if (checkConcurrently.status !== 0) {
    console.log("📦 Installing 'concurrently'...");
    const installConcurrently = spawnSync("npm", ["install", "concurrently", "--save-dev"], {
      cwd: frontendPath,
      stdio: "inherit",
      shell: true,
    });
    if (installConcurrently.error) {
      console.error("❌ Failed to install concurrently:", installConcurrently.error);
      process.exit(1);
    }
  }
}

// Step 3: Compile the Rust backend
function buildBackend(backendPath) {
  console.log("🔧 Building backend...");
  const build = spawnSync("cargo", ["build"], {
    cwd: backendPath,
    stdio: "inherit",
    shell: true,
  });
  if (build.error) {
    console.error("❌ Backend build failed:", build.error);
    process.exit(1);
  }
}

// Step 4: Launch both backend and frontend using 'concurrently'
function startServers(frontendPath, backendPath) {
  console.log("🚀 Starting backend and frontend...");

  const run = spawnSync(
    `npx concurrently "cd '${backendPath}' && cargo run" "cd '${frontendPath}' && npm run network"`,
    {
      stdio: "inherit",
      shell: true,
    }
  );

  if (run.error) {
    console.error("❌ Failed to start servers:", run.error);
    process.exit(1);
  }
}

// Main execution function
function main() {
  const SCRIPT_DIR = __dirname;
  const frontendPath = path.join(SCRIPT_DIR, "p2p-frontend-setup");
  const backendPath = path.join(SCRIPT_DIR, "backend");

  ensureRustInstalled();                      // Step 1
  ensureFrontendSetup(frontendPath);         // Step 2
  buildBackend(backendPath);                // Step 3
  startServers(frontendPath, backendPath); // Step 4
}

// Start the script
main();

