import { CurrencyNBR } from "./mod.ts";

const calc = CurrencyNBR.from(10).add(100).mult(20).commit(0);

console.log(calc.toJson(["toMonetary", "toVerbalA11y", "toUnicode"]));
