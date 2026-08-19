//! Run a local coding-agent CLI (Grok / Claude / Codex) and stream its output.
//! Same allowlist + argv pattern as Forge Notes. The webview can only ask
//! "backend X, prompt P" — binaries and flags are built here.

use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};

use serde::Serialize;
use tauri::ipc::Channel;

#[derive(Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CliEvent {
    Line { text: String },
    Status { message: String },
    Done { code: i32 },
    Error { message: String },
}

fn binary_for(backend: &str) -> Option<&'static str> {
    match backend {
        "grok-cli" => Some("grok"),
        "claude-cli" => Some("claude"),
        "codex-cli" => Some("codex"),
        _ => None,
    }
}

fn args_for(backend: &str, prompt: &str) -> Vec<String> {
    let p = prompt.to_string();
    match backend {
        "grok-cli" => vec!["-p".into(), p],
        "claude-cli" => vec![
            "-p".into(),
            p,
            "--output-format".into(),
            "stream-json".into(),
            "--verbose".into(),
        ],
        "codex-cli" => vec!["exec".into(), "--skip-git-repo-check".into(), p],
        _ => vec![],
    }
}

fn resolve_binary(name: &str) -> Option<PathBuf> {
    let mut roots: Vec<PathBuf> = Vec::new();

    if let Some(home) = std::env::var_os("HOME").map(PathBuf::from) {
        roots.push(home.join(".local/bin"));
        roots.push(home.join(".grok/bin"));
        roots.push(home.join(".bun/bin"));
        roots.push(home.join(".cargo/bin"));
        roots.push(home.join(".npm-global/bin"));
    }
    roots.push(PathBuf::from("/opt/homebrew/bin"));
    roots.push(PathBuf::from("/usr/local/bin"));

    if let Some(path) = std::env::var_os("PATH") {
        roots.extend(std::env::split_paths(&path));
    }

    roots
        .into_iter()
        .map(|dir| dir.join(name))
        .find(|candidate| candidate.is_file())
}

#[tauri::command]
pub fn ai_cli_available(backend: String) -> bool {
    binary_for(&backend).and_then(resolve_binary).is_some()
}

#[tauri::command]
pub async fn run_ai_cli(
    backend: String,
    prompt: String,
    on_event: Channel<CliEvent>,
) -> Result<(), String> {
    if prompt.trim().is_empty() {
        return Err("Nothing to send — the prompt is empty.".into());
    }

    let name = binary_for(&backend).ok_or_else(|| format!("Unknown AI backend: {backend}"))?;
    let bin = resolve_binary(name).ok_or_else(|| {
        format!("`{name}` is not installed, or not in a location AGER searches.")
    })?;

    let args = args_for(&backend, &prompt);

    tauri::async_runtime::spawn_blocking(move || {
        let _ = on_event.send(CliEvent::Status {
            message: format!("Running {}…", bin.display()),
        });

        let mut child = match Command::new(&bin)
            .args(&args)
            .env("NO_COLOR", "1")
            .env("FORCE_COLOR", "0")
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(c) => c,
            Err(e) => {
                let _ = on_event.send(CliEvent::Error {
                    message: format!("Could not start {}: {e}", bin.display()),
                });
                return;
            }
        };

        if let Some(stdout) = child.stdout.take() {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                let _ = on_event.send(CliEvent::Line { text: line });
            }
        }

        let status = child.wait();
        let code = status.as_ref().map(|s| s.code().unwrap_or(-1)).unwrap_or(-1);

        if code != 0 {
            let mut detail = String::new();
            if let Some(stderr) = child.stderr.take() {
                for line in BufReader::new(stderr).lines().map_while(Result::ok).take(20) {
                    detail.push_str(&line);
                    detail.push('\n');
                }
            }
            let detail = detail.trim();
            let _ = on_event.send(CliEvent::Error {
                message: if detail.is_empty() {
                    format!("{name} exited with code {code}")
                } else {
                    format!("{name} failed: {detail}")
                },
            });
        }

        let _ = on_event.send(CliEvent::Done { code });
    })
    .await
    .map_err(|e| format!("AI process failed to run: {e}"))
}
