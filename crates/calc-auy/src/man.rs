//! Geração de completions e página de manual a partir da árvore do clap.

use std::fmt::Write as _;

use clap::CommandFactory;

use crate::cli::{Cli, Shell};

/// Gera um script de completions para o shell pedido.
#[must_use]
pub(crate) fn completions(shell: Shell) -> String {
    let command = Cli::command();
    let subcommands: Vec<String> = command
        .get_subcommands()
        .map(|sub| sub.get_name().to_string())
        .collect();
    let flags: Vec<String> = command
        .get_arguments()
        .filter_map(|arg| arg.get_long().map(|long| format!("--{long}")))
        .collect();
    match shell {
        Shell::Bash => bash(&subcommands, &flags),
        Shell::Zsh => zsh(&subcommands, &flags),
        Shell::Fish => fish(&command),
    }
}

/// Script de completions para bash.
fn bash(subcommands: &[String], flags: &[String]) -> String {
    let mut words = subcommands.join(" ");
    words.push(' ');
    words.push_str(&flags.join(" "));
    words.push_str(" --help --version");
    format!(
        "# completions para bash: eval \"$(calc-auy man --completions bash)\"\n\
         _calc_auy() {{\n\
         \x20   local cur\n\
         \x20   cur=\"${{COMP_WORDS[COMP_CWORD]}}\"\n\
         \x20   local words=\"{words}\"\n\
         \x20   COMPREPLY=( $(compgen -W \"$words\" -- \"$cur\") )\n\
         }}\n\
         complete -F _calc_auy calc-auy\n"
    )
}

/// Script de completions para zsh.
fn zsh(subcommands: &[String], flags: &[String]) -> String {
    let commands = subcommands.join(" ");
    let arguments = flags.join(" ");
    format!(
        "#compdef calc-auy\n\
         _calc_auy() {{\n\
         \x20   local -a commands\n\
         \x20   commands=({commands})\n\
         \x20   _arguments '{arguments}' '*:command:->command'\n\
         \x20   _describe 'command' commands\n\
         }}\n\
         compdef _calc_auy calc-auy\n"
    )
}

/// Script de completions para fish.
fn fish(command: &clap::Command) -> String {
    let mut out = String::from("complete -c calc-auy -f\n");
    for sub in command.get_subcommands() {
        let name = sub.get_name();
        let about = sub
            .get_about()
            .map_or_else(String::new, ToString::to_string);
        let _ = writeln!(
            out,
            "complete -c calc-auy -n '__fish_use_subcommand' -a {name} -d '{about}'"
        );
    }
    for arg in command.get_arguments() {
        if let Some(long) = arg.get_long() {
            let help = arg.get_help().map_or_else(String::new, ToString::to_string);
            let _ = writeln!(out, "complete -c calc-auy -l {long} -d '{help}'");
        }
    }
    out
}

/// Gera uma página de manual (roff) para o binário.
#[must_use]
pub(crate) fn man() -> String {
    let command = Cli::command();
    let mut out = String::new();
    let _ = writeln!(out, ".TH CALC-AUY 1 \"\" \"calc-auy\"");
    let _ = writeln!(out, ".SH NAME");
    let about = command
        .get_about()
        .map_or_else(String::new, ToString::to_string);
    let _ = writeln!(out, "calc-auy \\- {about}");
    let _ = writeln!(out, ".SH SYNOPSIS");
    let _ = writeln!(out, ".B calc-auy");
    let _ = writeln!(out, "[\\fIOPTIONS\\fR] \\fICOMMAND\\fR [\\fIARGS\\fR]");
    let _ = writeln!(out, ".SH COMMANDS");
    for sub in command.get_subcommands() {
        let _ = writeln!(out, ".TP");
        let _ = writeln!(out, ".B {}", sub.get_name());
        let sub_about = sub
            .get_about()
            .map_or_else(String::new, ToString::to_string);
        let _ = writeln!(out, "{sub_about}");
    }
    let _ = writeln!(out, ".SH OPTIONS");
    for arg in command.get_arguments() {
        if let Some(long) = arg.get_long() {
            let _ = writeln!(out, ".TP");
            let _ = writeln!(out, ".B \\-\\-{long}");
            let help = arg.get_help().map_or_else(String::new, ToString::to_string);
            let _ = writeln!(out, "{help}");
        }
    }
    out
}
