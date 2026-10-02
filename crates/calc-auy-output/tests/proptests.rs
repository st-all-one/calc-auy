//! Propriedades do rateio e da formatação decimal (T07.4).

mod common;

use calc_auy_core::{Limits, Rational};
use calc_auy_output::{Output, OutputOptions};
use proptest::prelude::*;

use common::commit_value;

/// Soma uma lista de strings decimais.
fn sum_slices(slices: &[String]) -> Rational {
    let limits = Limits::default();
    slices.iter().fold(Rational::ZERO, |acc, text| {
        let value = calc_auy_core::numeric::parse::parse_rational(text, &limits).expect("decimal");
        acc.add(&value)
    })
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(128))]

    #[test]
    fn equal_slices_sum_to_total(cents in 1_i64..1_000_000, parts in 1_usize..25) {
        let total = Rational::new_checked(cents, 100, &Limits::default()).expect("total");
        let committed = commit_value(total.clone(), 2);
        let output = Output::new(&committed, OutputOptions::new().with_decimals(2));
        let slices = output.to_slice(parts).expect("rateio");
        prop_assert_eq!(slices.len(), parts);
        prop_assert_eq!(sum_slices(&slices), total);
    }

    #[test]
    fn ratio_slices_sum_to_total(
        cents in 1_i64..1_000_000,
        weights in prop::collection::vec(1_i64..50, 1..12),
    ) {
        let total = Rational::new_checked(cents, 100, &Limits::default()).expect("total");
        let committed = commit_value(total.clone(), 2);
        let output = Output::new(&committed, OutputOptions::new().with_decimals(2));
        let limits = Limits::default();
        let ratios: Vec<Rational> = weights
            .iter()
            .map(|weight| Rational::new_checked(*weight, 1, &limits).expect("peso"))
            .collect();
        let slices = output.to_slice_by_ratio(&ratios).expect("rateio");
        prop_assert_eq!(slices.len(), ratios.len());
        prop_assert_eq!(sum_slices(&slices), total);
    }

    #[test]
    fn decimal_round_trips(cents in -1_000_000_i64..1_000_000) {
        let value = Rational::new_checked(cents, 100, &Limits::default()).expect("valor");
        let committed = commit_value(value.clone(), 2);
        let output = Output::new(&committed, OutputOptions::new().with_decimals(2));
        let text = output.to_string_decimal();
        let parsed =
            calc_auy_core::numeric::parse::parse_rational(&text, &Limits::default()).expect("parse");
        prop_assert_eq!(parsed, value);
    }
}
