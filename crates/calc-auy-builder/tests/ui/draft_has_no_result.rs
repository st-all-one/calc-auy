use calc_auy_builder::{Calculation, InstanceConfig};
use calc_auy_core::Salt;

fn main() {
    let config = InstanceConfig::new(Salt::new("s"));
    let calculation = Calculation::from(&config, 1_i64).expect("literal");
    let _ = calculation.result();
}
