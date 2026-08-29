/**
 * `seedForAddress` exists to stop one account having several faces, so the
 * tests are mostly about which strings must collapse together and which must
 * emphatically not.
 *
 * The bech32 fixtures are the published BIP-173 / BIP-350 vectors rather than
 * hand-written strings. Bech32 excludes `1`, `b`, `i` and `o` from its data
 * charset, which is easy to violate by accident -- an invented taproot address
 * with a `b` in it is not a taproot address, and testing against one proves
 * nothing.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { seedFromString } from "../src/engine.ts";
import { seedForAddress } from "../src/crypto.ts";

const seedOf = (value: string) => seedFromString(seedForAddress(value));

/** Every casing of one EVM address, as it turns up across a real codebase. */
const EVM_VARIANTS = [
	"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // EIP-55, as a UI shows it
	"0xd8da6bf26964af9d7eed9e03e53415d37aa96045", // as an API returns it
	"0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045", // as some tooling emits it
	"0Xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // uppercase X prefix
	"  0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045  ", // pasted with whitespace
];

/** BIP-173 / BIP-350 vectors: [lowercase, uppercase, description]. */
const BECH32_VECTORS: Array<[string, string, string]> = [
	[
		"bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
		"BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4",
		"mainnet P2WPKH",
	],
	[
		"bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3",
		"BC1QRP33G0Q5C5TXSP9ARYSRX4K6ZDKFS4NCE4XJ0GDCCCEFVPYSXF3QCCFMV3",
		"mainnet P2WSH",
	],
	[
		"bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
		"BC1P0XLXVLHEMJA6C4DQV22UAPCTQUPFHLXM9H8Z3K2E72Q4K9HCZ7VQZK5JJ0",
		"mainnet P2TR (taproot)",
	],
	[
		"tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
		"TB1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KXPJZSX",
		"testnet P2WPKH",
	],
];

const SOLANA = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const BTC_LEGACY = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";

describe("case-insensitive formats collapse to one avatar", () => {
	it("every casing of an EVM address gives one seed", () => {
		const seeds = new Set(EVM_VARIANTS.map(seedOf));
		assert.equal(
			seeds.size,
			1,
			`one address must not render ${seeds.size} avatars`,
		);
	});

	it("normalises EVM to lowercase with the 0x prefix intact", () => {
		for (const variant of EVM_VARIANTS) {
			assert.equal(
				seedForAddress(variant),
				"0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
			);
		}
	});

	it("covers transaction hashes, not just addresses", () => {
		// EIP-55 is an address convention, but no 0x hex has semantic case, and
		// an explorer renders avatars for hashes too.
		const hash =
			"0x88fd8e5a9b1b0a1b0e6a0d3e5f9a1c2b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f80";
		assert.equal(seedOf(hash), seedOf(hash.toUpperCase().replace("0X", "0x")));
	});

	for (const [lower, upper, label] of BECH32_VECTORS) {
		it(`${label}: uppercase and lowercase are one address`, () => {
			assert.equal(seedForAddress(upper), lower);
			assert.equal(seedOf(upper), seedOf(lower));
		});
	}
});

describe("ENS names", () => {
	it("treats every casing of a name as one avatar", () => {
		// ENS resolves through UTS-46, which lowercases, so these are one name.
		const seeds = new Set(
			["vitalik.eth", "Vitalik.eth", "VITALIK.ETH"].map(seedForAddress),
		);
		assert.equal(seeds.size, 1, "one name must not render several avatars");
		assert.equal(seedForAddress("VITALIK.ETH"), "vitalik.eth");
	});

	it("handles subdomains", () => {
		assert.equal(seedForAddress("Pay.Vitalik.ETH"), "pay.vitalik.eth");
	});

	it("leaves a unicode name alone rather than half-normalising it", () => {
		// Full ENSIP-15 folds confusables and validates emoji, which needs a
		// table this package will not carry. Not merging is the safe direction:
		// two distinct names merging into one avatar would be worse.
		assert.equal(seedForAddress("Café.eth"), "Café.eth");
	});

	it("does not touch names outside .eth", () => {
		for (const value of ["Example.com", "Vitalik.sol", "Foo.crypto", "JaneDoe"]) {
			assert.equal(seedForAddress(value), value);
		}
	});
});

describe("case-sensitive formats are left exactly alone", () => {
	it("returns Solana addresses byte for byte", () => {
		assert.equal(seedForAddress(SOLANA), SOLANA);
	});

	it("returns legacy Bitcoin addresses byte for byte", () => {
		assert.equal(seedForAddress(BTC_LEGACY), BTC_LEGACY);
	});

	it("a lowercased base58 address is a different address, and stays one", () => {
		// Lowercasing base58 changes the decoded bytes. Collapsing these would
		// be worse than the bug this module fixes.
		for (const address of [SOLANA, BTC_LEGACY]) {
			assert.notEqual(
				seedOf(address),
				seedOf(address.toLowerCase()),
				`${address} must not share an avatar with its lowercased form`,
			);
		}
	});

	it("leaves a mixed-case bc1 string alone, since it cannot be bech32", () => {
		// BIP-173 makes mixed case invalid, so this is base58 that happens to
		// start with bc1 -- exactly the collision the uniform-case rule exists
		// to avoid.
		const looksLikeBech32 = "Bc1Qw508D6QejXtDG4y5R3zarVARY0C5Xw7Kv8f3T4";
		assert.equal(seedForAddress(looksLikeBech32), looksLikeBech32);
	});

	it("does not misread random base58 as bech32", () => {
		// One Solana address in ~195,000 starts with "bc1"; none should be
		// lowercased. Mulberry32 so the corpus is the same on every run.
		let state = 0x9e3779b9;
		const random = () => {
			state = (state + 0x6d2b79f5) | 0;
			let t = state;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		const BASE58 =
			"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

		let touched = 0;
		for (let i = 0; i < 1_000_000; i++) {
			let address = "";
			for (let c = 0; c < 44; c++) {
				address += BASE58[Math.floor(random() * BASE58.length)];
			}
			if (seedForAddress(address) !== address) touched++;
		}
		assert.equal(touched, 0, `${touched} base58 addresses were rewritten`);
	});
});

describe("anything else passes through", () => {
	it("returns unrecognised input unchanged apart from trimming", () => {
		// Not `vitalik.eth` — ENS is recognised now, and that example only
		// passed because it was already lowercase.
		for (const value of [
			"some-username",
			"",
			"🚀",
			"0xnothex",
			"0x",
			"Example.com",
		]) {
			assert.equal(seedForAddress(value), value.trim());
		}
	});

	it("never throws", () => {
		for (const value of ["", " ", "\n\t", "0x", "bc1", "z".repeat(500)]) {
			assert.doesNotThrow(() => seedForAddress(value));
		}
	});
});

describe("idempotence", () => {
	it("normalising twice is the same as normalising once", () => {
		const inputs = [
			...EVM_VARIANTS,
			...BECH32_VECTORS.flatMap(([lower, upper]) => [lower, upper]),
			SOLANA,
			BTC_LEGACY,
			"VITALIK.ETH",
			"Pay.Vitalik.eth",
			"",
		];
		for (const value of inputs) {
			const once = seedForAddress(value);
			assert.equal(seedForAddress(once), once, `not idempotent for ${value}`);
		}
	});
});
