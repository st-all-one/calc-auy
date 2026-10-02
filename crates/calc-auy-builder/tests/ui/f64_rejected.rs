use calc_auy_builder::{Calculation, InstanceConfig};
use calc_auy_core::Salt;

fn main() {
    let config = InstanceConfig::new(Salt::new("s"));
    let _ = Calculation::from(&config, 1.5_f64);
}
