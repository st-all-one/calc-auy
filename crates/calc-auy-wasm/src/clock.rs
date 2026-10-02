//! Relógio do host para o alvo WASM (ADR-012, ADR-014).

use calc_auy_api::Clock;
#[cfg(not(target_arch = "wasm32"))]
use calc_auy_api::MockClock;
use uuid::Uuid;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::JsValue;

/// Relógio do host.
///
/// No alvo `wasm32`, lê o tempo de `js_sys::Date` e gera UUIDs v7 com a
/// entropia do host. Fora do WASM (testes no host), delega a um [`MockClock`]
/// determinístico, de modo que os testes sejam reprodutíveis.
#[derive(Debug)]
pub struct WasmClock {
    /// Relógio determinístico usado fora do WASM.
    #[cfg(not(target_arch = "wasm32"))]
    mock: MockClock,
}

impl WasmClock {
    /// Cria um relógio do host.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            #[cfg(not(target_arch = "wasm32"))]
            mock: MockClock::new(),
        }
    }

    /// Retorna o tempo do host em milissegundos desde a época.
    #[must_use]
    pub fn now_millis(&self) -> u64 {
        #[cfg(target_arch = "wasm32")]
        {
            num_traits::cast::<f64, u64>(js_sys::Date::now()).unwrap_or(0)
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            self.mock.now()
        }
    }
}

impl Default for WasmClock {
    fn default() -> Self {
        Self::new()
    }
}

impl Clock for WasmClock {
    fn now_rfc3339(&self) -> String {
        #[cfg(target_arch = "wasm32")]
        {
            let millis = self.now_millis();
            let as_float = num_traits::cast::<u64, f64>(millis).unwrap_or(0.0);
            let date = js_sys::Date::new(&JsValue::from_f64(as_float));
            String::from(date.to_iso_string())
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            self.mock.now_rfc3339()
        }
    }

    fn next_uuid_v7(&self) -> Uuid {
        #[cfg(target_arch = "wasm32")]
        {
            Uuid::now_v7()
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            self.mock.next_uuid_v7()
        }
    }
}
