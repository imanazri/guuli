/**
 * Canonical seeds for blockchain addresses.
 *
 * A seed *is* an avatar, so any string that varies for one account produces a
 * different face. Addresses vary constantly: an explorer renders EIP-55
 * checksummed hex while its API returns lowercase, and a Bitcoin QR code
 * encodes bech32 in uppercase. Seeding on those directly gives one account
 * several faces.
 *
 * Lowercasing everything is not the fix -- it corrupts the formats where case
 * carries information. Solana and legacy Bitcoin addresses are base58, where
 * `A` and `a` are different bytes and lowercasing produces a *different
 * address*. So this normalises only what is provably case-insensitive and
 * leaves everything else exactly as it arrived.
 *
 * Nothing here imports the renderer, so pulling this in does not drag
 * `react-native-svg` into a bundle that only wanted a seed.
 */
/**
 * The seed to render an address with, stable across the casings the same
 * address arrives in.
 *
 * ```ts
 * <GradientAvatar seed={seedForAddress(account.address)} size={40} />
 * ```
 *
 * Case-insensitive formats (EVM hex, Bitcoin bech32) are lowered to one
 * canonical form. Case-sensitive ones (Solana, legacy Bitcoin) and anything
 * unrecognised are returned unchanged, so this is always safe to call and never
 * throws.
 *
 * **Pass the address, not an ENS name.** A name is a label on an account, not
 * the account: it can be changed, and it can expire and be re-registered by
 * someone else, who would then inherit this avatar. Addresses cannot drift.
 *
 * The result is the same on every chain -- an address is one identity whether
 * you are looking at it on Ethereum, Polygon or Arbitrum.
 */
declare function seedForAddress(value: string): string;

export { seedForAddress };
