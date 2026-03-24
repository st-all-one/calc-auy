import { CurrencyNBR } from "./mod.ts";

const calc = CurrencyNBR.from("7500.45")
    // Nível 1: Adição com uma Raiz de fração prima
    .add(
        CurrencyNBR.from(10.5).pow("7/13"),
    )
    // Nível 2: Multiplicação por uma "Cascata de Divisões"
    .mult(
        CurrencyNBR.from(250).div(
            CurrencyNBR.from(5).div(
                CurrencyNBR.from(2).div(0.25),
            ),
        ),
    )
    .group() // Fecha o numerador complexo
    // Nível 3: Divisão por uma fração que gera dízima periódica
    .div(
        CurrencyNBR.from(500).div(7),
    )
    .group() // Consolida o valor antes da super-potência
    // Nível 4: Raiz fracional agressiva (1024/243)
    .pow(-1)
    // Nível 5: Subtração do resto de uma divisão inteira de larga escala
    .sub(
        CurrencyNBR.from(1000).mod(
            CurrencyNBR.from(1000).divInt(13),
        ),
    )
    .commit(2);

console.log(calc.toJson(["toMonetary", "toVerbalA11y", "toUnicode"]));
