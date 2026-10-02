#![no_main]

use calc_auy_core::canonical::Canonical;
use calc_auy_core::MetaValue;
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    if let Ok(value) = serde_json::from_slice::<MetaValue>(data) {
        let mut out = Vec::new();
        value.write_canonical(&mut out);
        let _ = serde_json::from_slice::<serde_json::Value>(&out);
    }
});
