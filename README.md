<h1 align="center">RipSync</h1>
<p align="center"><b>Instantly create and run P2P file-sharing servers with local HTTPS support </b></p>

<p align="center">
  <img src="https://img.shields.io/badge/CLI-Node.js-green" />
  <img src="https://img.shields.io/badge/Backend-Rust-orange" />
  <img src="https://img.shields.io/badge/Built%20With-RipSync-blueviolet" />
</p>

---

## 📚 Table of Contents

- [ Features](#-features)
- [ Installation](#-installation)
  - [🔹 Install via NPM](#-install-via-npm-recommended)
  - [🔹 Clone via GitHub (HTTPS or SSH)](#-clone-via-github-https-or-ssh)
- [ Example Workflow](#-example-workflow)
- [ CLI Command Reference](#-cli-command-reference)
- [ Configuration](#️-configuration)
- [ Template & Project Structure](#-template--project-structure)
- [ Required Dependencies](#Required-Dependencies)

---

##  Features

-  **Smart Interactive CLI** – Launch an intuitive menu with no arguments
-  **One-Command Setup** – Spin up full frontend/backend servers with HTTPS
-  **Local SSL with `mkcert`** – Automatically installs and configures certs
-  **Global Run Support** – Run named servers from anywhere via `~/ripsync-servers`
-  **Pre-Configured Templates** – Modify backend (Rust) and frontend (Next.js) defaults
-  **Multiple Access Methods** – Install via NPM or clone directly via GitHub

---

##  Installation

### 🔹 Install via NPM (recommended)

```bash
npm install -g ripsync

 You may need to use sudo depending on your system's configuration:
sudo npm install -g ripsync

Once installed, use globally:
ripsync <command>
```
### 🔹 Clone via GitHub (HTTPS or SSH)
 Clone via HTTPS
```bash

git clone https://github.com/muxx3/ripsync.git
cd ripsync
npm install
npm link  # Optional: Enables global access via `ripsync`
```
 Clone via SSH
```
git clone git@github.com:muxx3/ripsync.git
cd ripsync
npm install 
npm link # Optional: Enables global access via `ripsync`
```
---
### 🧪 Example Workflow
```
# 1. Create a new P2P server project
ripsync build <my-server>

# 2. Cd into server directory
cd <my-server>

# 3. Move project to global server folder
ripsync init

# 4. Run the server from anywhere
ripsync run <my-server>
```
###  CLI Command Reference
```
Command	Description
ripsync	                        Launches the interactive CLI menu
ripsync build <project-name>	Scaffold a new file-sharing server project
ripsync start	                Starts the frontend and backend in the current directory
ripsync run <project-name>	Launch a known project from anywhere via ~/ripsync-servers
ripsync init                    Move a project to global folder so it can be run globally
ripsync list                    List all known servers
ripsync clean                   Remove all known servers
ripsync ascii                   Prints the RipSync ASCII banner art
ripsync --help	                Show help and all CLI options
```
---
###  Configuration
```
After running ripsync build, you can tweak the generated project:
Backend (backend/.env)

    Modify ports, host IP for the backend server

Frontend (p2p-frontend-setup/.env.local)

    Adjust frontend port, and host IP

Certs are generated automatically using mkcert during setup.
🗂 Template & Project Structure

ripsync/
├── cli.js                         # CLI entrypoint
├── template/                      # Source templates for new servers
│   ├── backend/                   # Rust backend template
│       └── .env                   # Ports and IP
│   ├── p2p-frontend-setup/        # Next.js frontend template
│       └── .env.local             # Ports and IP
│   ├── setup.js                   # SSL & env generation logic
│   └── run.js                     # Project runner for frontend/backend
│
├── package.json
├── README.md

You can modify the contents of template/ to change future server scaffolding behavior.
```
---
### Required Dependencies

- **Node.js (≥ v16)** | Runs the CLI (cli.js) manages templates and script logic	https://nodejs.org
- **npm** (comes with Node.js)	Used for installing the CLI (npm install -g ripsync)	Bundled with Node
- **Rust** (via cargo)	Compiles and runs the backend server	https://rustup.rs
- **mkcert**	Creates local HTTPS certificates (automatically installed by CLI if missing)	https://github.com/FiloSottile/mkcert
---

```
Feel free to fork, customize, or contribute!
Questions?
Open an issue or start a discussion.
```

----------

## Credits

Made with 🦀 (Rust) by [muxx3](https://github.com/muxx3).
