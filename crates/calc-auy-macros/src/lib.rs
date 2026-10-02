//! Macros derive para o CalcAUY.

use proc_macro::TokenStream;
use quote::quote;
use syn::{Data, DeriveInput, Fields, Type, parse_macro_input};

/// Deriva a canonicalização determinística (v1) para uma `struct`.
///
/// Gera `impl calc_auy_core::canonical::Canonical`, escrevendo um objeto JSON
/// canônico com os campos na ordem de declaração. Campos do tipo `Option<T>`
/// são omitidos quando `None`. Campos `f64`/`f32` **não** implementam
/// `Canonical`, então a derivação falha a compilação se forem usados.
///
/// Aceita o atributo `#[canonical(rename_all = "snake_case" | "camelCase" | "PascalCase")]`.
#[proc_macro_derive(Canonical, attributes(canonical))]
pub fn derive_canonical(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    expand(&input)
        .unwrap_or_else(syn::Error::into_compile_error)
        .into()
}

/// Expande a derivação, retornando erro para entradas inválidas.
///
/// # Errors
///
/// Retorna erro se a entrada não for uma `struct` com campos nomeados ou se
/// o atributo `rename_all` for inválido.
fn expand(input: &DeriveInput) -> syn::Result<proc_macro2::TokenStream> {
    let name = &input.ident;
    let (impl_generics, ty_generics, where_clause) = input.generics.split_for_impl();
    let rename = parse_rename_all(input)?;
    let body = match &input.data {
        Data::Struct(data) => struct_body(&data.fields, rename)?,
        Data::Enum(_) => {
            return Err(syn::Error::new_spanned(
                name,
                "Canonical só é suportado para structs; implemente manualmente para enums",
            ));
        }
        Data::Union(_) => {
            return Err(syn::Error::new_spanned(
                name,
                "Canonical não é suportado para unions",
            ));
        }
    };

    Ok(quote! {
        impl #impl_generics ::calc_auy_core::canonical::Canonical for #name #ty_generics #where_clause {
            fn write_canonical(&self, out: &mut ::std::vec::Vec<u8>) {
                #body
            }
        }
    })
}

/// Convenção de nomes para as chaves.
#[derive(Clone, Copy)]
enum RenameAll {
    /// Mantém o nome do campo.
    None,
    /// Converte para `snake_case`.
    Snake,
    /// Converte para `camelCase`.
    Camel,
    /// Converte para `PascalCase`.
    Pascal,
}

/// Lê `#[canonical(rename_all = "...")]`.
///
/// # Errors
///
/// Retorna erro se o atributo `canonical` for malformado.
fn parse_rename_all(input: &DeriveInput) -> syn::Result<RenameAll> {
    let mut rename = RenameAll::None;
    for attr in &input.attrs {
        if !attr.path().is_ident("canonical") {
            continue;
        }
        attr.parse_nested_meta(|meta| handle_canonical_meta(&meta, &mut rename))?;
    }
    Ok(rename)
}

/// Trata um item de `#[canonical(...)]`.
///
/// # Errors
///
/// Retorna erro se o valor de `rename_all` for inválido.
fn handle_canonical_meta(
    meta: &syn::meta::ParseNestedMeta<'_>,
    rename: &mut RenameAll,
) -> syn::Result<()> {
    if !meta.path.is_ident("rename_all") {
        return Ok(());
    }
    let value: syn::LitStr = meta.value()?.parse()?;
    *rename = parse_rename_value(&value)?;
    Ok(())
}

/// Interpreta o valor de `rename_all`.
///
/// # Errors
///
/// Retorna erro se a convenção for desconhecida.
fn parse_rename_value(value: &syn::LitStr) -> syn::Result<RenameAll> {
    match value.value().as_str() {
        "snake_case" => Ok(RenameAll::Snake),
        "camelCase" => Ok(RenameAll::Camel),
        "PascalCase" => Ok(RenameAll::Pascal),
        other => Err(syn::Error::new(
            value.span(),
            format!("rename_all desconhecido: {other}"),
        )),
    }
}

/// Aplica a convenção de nomes.
#[must_use]
fn apply_rename(field: &str, rename: RenameAll) -> String {
    match rename {
        RenameAll::None | RenameAll::Snake => field.to_string(),
        RenameAll::Pascal => to_pascal_case(field),
        RenameAll::Camel => {
            let pascal = to_pascal_case(field);
            let mut chars = pascal.chars();
            chars.next().map_or_else(String::new, |first| {
                first.to_lowercase().collect::<String>() + chars.as_str()
            })
        }
    }
}

/// Converte `snake_case` para `PascalCase`.
#[must_use]
fn to_pascal_case(field: &str) -> String {
    field
        .split('_')
        .map(|segment| {
            let mut chars = segment.chars();
            chars.next().map_or_else(String::new, |first| {
                first.to_uppercase().collect::<String>() + chars.as_str()
            })
        })
        .collect()
}

/// Gera o corpo para uma `struct` com campos nomeados.
///
/// # Errors
///
/// Retorna erro se a `struct` não tiver campos nomeados.
fn struct_body(fields: &Fields, rename: RenameAll) -> syn::Result<proc_macro2::TokenStream> {
    let Fields::Named(named) = fields else {
        return Err(syn::Error::new_spanned(
            fields,
            "Canonical exige uma struct com campos nomeados",
        ));
    };

    let mut entries = Vec::new();
    for field in &named.named {
        let ident = field.ident.as_ref().ok_or_else(|| {
            syn::Error::new_spanned(field, "campo sem identificador não é suportado")
        })?;
        let key = apply_rename(&ident.to_string(), rename);
        if is_option_type(&field.ty) {
            entries.push(quote! {
                if let ::std::option::Option::Some(value) = &self.#ident {
                    ::calc_auy_core::canonical::write_key(out, #key);
                    ::calc_auy_core::canonical::Canonical::write_canonical(value, out);
                    out.push(b',');
                }
            });
        } else {
            entries.push(quote! {
                ::calc_auy_core::canonical::write_key(out, #key);
                ::calc_auy_core::canonical::Canonical::write_canonical(&self.#ident, out);
                out.push(b',');
            });
        }
    }

    Ok(quote! {
        out.push(b'{');
        #(#entries)*
        if out.last() == ::std::option::Option::Some(&b',') {
            out.pop();
        }
        out.push(b'}');
    })
}

/// Retorna `true` se o tipo é `Option<...>`.
#[must_use]
fn is_option_type(ty: &Type) -> bool {
    let Type::Path(path) = ty else {
        return false;
    };
    path.path
        .segments
        .last()
        .is_some_and(|segment| segment.ident == "Option")
}
