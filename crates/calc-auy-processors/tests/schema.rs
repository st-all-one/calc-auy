//! Verifica que os arquivos de schema estão em sincronia com a fonte.

#[test]
fn schema_files_match_source() {
    let json = include_str!("../../../schema/calc_auy.schema.json");
    let cddl = include_str!("../../../schema/calc_auy.cddl");
    assert_eq!(json, calc_auy_processors::schema::json_schema());
    assert_eq!(cddl, calc_auy_processors::schema::cddl());
}

#[test]
fn json_schema_is_valid() {
    let value: serde_json::Value =
        serde_json::from_str(calc_auy_processors::schema::json_schema()).expect("JSON válido");
    assert!(value.get("$defs").is_some());
    assert!(value.get("properties").is_some());
}
