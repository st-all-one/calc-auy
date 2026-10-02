#![no_main]

use calc_auy_core::Limits;
use calc_auy_parser::parse;
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    if let Ok(input) = std::str::from_utf8(data) {
        let limits = Limits::default();
        let _ = parse(input, &limits);
    }
});
