#![no_main]

use calc_auy_core::{FlatAst, Limits};
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    let limits = Limits::default();
    let _ = FlatAst::from_json_slice(data, &limits);
});
