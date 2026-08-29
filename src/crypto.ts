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
 * Any `0x`-prefixed hex string, whatever its length.
 *
 * Deliberately not `{40}`: no EVM hex has semantic case. Addresses, transaction
 * hashes, block hashes and calldata are all case-insensitive, EIP-55 being a
 * checksum encoded *into* an address's casing rather than part of its value.
 * Matching on the prefix rather than a length means transaction hashes are
 * handled too, which an explorer will want.
 */
const EVM_HEX = /^0[xX][0-9a-fA-F]+$/;

/*
 * Bech32, per BIP-173 and BIP-350 (segwit v0 through taproot), on mainnet,
 * testnet and regtest.
 *
 * Two constraints do real work here, and both exist to keep base58 out.
 * Base58 contains `b`, `c` and `1`, so roughly one Solana address in 195,000
 * begins with `bc1`; a loose pattern would lowercase it and quietly change the
 * avatar. So:
 *
 *  - the data part is restricted to the bech32 charset, which excludes
 *    `1`, `b`, `i` and `o`; and
 *  - case must be uniform, because BIP-173 makes a mixed-case bech32 string
 *    invalid -- which means a mixed-case `bc1…` cannot be an address at all.
 *
 * Together those give zero false positives over two million random Solana
 * addresses.
 */
const BECH32_LOWER = /^(bc1|tb1|bcrt1)[02-9ac-hj-np-z]{6,71}$/;
const BECH32_UPPER = /^(BC1|TB1|BCRT1)[02-9AC-HJ-NP-Z]{6,71}$/;

/**
 * ENS names, including subdomains: `vitalik.eth`, `pay.vitalik.eth`.
 *
 * ENS resolves names through UTS-46 (ENSIP-15), which lowercases, so
 * `Vitalik.eth` and `vitalik.eth` are the same name and must be the same
 * avatar. Only ASCII is matched here: full ENSIP-15 also folds unicode
 * confusables and validates emoji sequences, which needs a ~30 kB table this
 * package will not carry. A name with unicode in it falls through untouched,
 * which is the safe direction -- an avatar that does not merge is better than
 * two different names merging into one.
 */
const ENS_NAME = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i;

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
 * ENS names are accepted and lowercased, since ENS treats them
 * case-insensitively. Prefer the address they resolve to where you have it: a
 * name is a label on an account rather than the account, so it can change
 * hands, and an expired name re-registered by someone else would carry this
 * avatar to them. An address cannot drift.
 *
 * The result is the same on every chain -- an address is one identity whether
 * you are looking at it on Ethereum, Polygon or Arbitrum.
 */
export function seedForAddress(value: string): string {
	const trimmed = value.trim();

	if (EVM_HEX.test(trimmed)) return trimmed.toLowerCase();
	if (BECH32_LOWER.test(trimmed) || BECH32_UPPER.test(trimmed)) {
		return trimmed.toLowerCase();
	}
	if (ENS_NAME.test(trimmed)) return trimmed.toLowerCase();

	// Solana and legacy Bitcoin are base58 and case-sensitive; anything else is
	// not ours to reinterpret. Note that the two are never told apart, and do
	// not need to be -- a 34-character string starting `1` could be either, and
	// both leave here untouched.
	return trimmed;
}
