// src/crypto.ts
var EVM_HEX = /^0[xX][0-9a-fA-F]+$/;
var BECH32_LOWER = /^(bc1|tb1|bcrt1)[02-9ac-hj-np-z]{6,71}$/;
var BECH32_UPPER = /^(BC1|TB1|BCRT1)[02-9AC-HJ-NP-Z]{6,71}$/;
function seedForAddress(value) {
  const trimmed = value.trim();
  if (EVM_HEX.test(trimmed)) return trimmed.toLowerCase();
  if (BECH32_LOWER.test(trimmed) || BECH32_UPPER.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

export { seedForAddress };
//# sourceMappingURL=crypto.js.map
//# sourceMappingURL=crypto.js.map