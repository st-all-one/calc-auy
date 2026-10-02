//! Compila o schema Protobuf e emite o descritor para geração de CDDL/JSON.

#![allow(
    clippy::print_stdout,
    reason = "build script: `cargo:rerun-if-changed` exige stdout"
)]

use std::path::PathBuf;

/// Compila `schema/calc_auy.proto` com o `protoc` vendored.
fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("cargo:rerun-if-changed=../../schema/calc_auy.proto");
    let out_dir = PathBuf::from(std::env::var_os("OUT_DIR").ok_or("OUT_DIR ausente")?);
    let descriptor = out_dir.join("calc_auy.desc");
    let protoc = protoc_bin_vendored::protoc_bin_path()?;
    let mut config = prost_build::Config::new();
    config.protoc_executable(protoc);
    config.file_descriptor_set_path(&descriptor);
    config.compile_protos(&["../../schema/calc_auy.proto"], &["../../schema"])?;
    Ok(())
}
