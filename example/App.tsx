/**
 * Visual check for gulitars.
 *
 * Three things worth looking at, in order:
 *  - the size ramp, which is where the level-of-detail logic either works or
 *    turns small avatars into mud;
 *  - a dense grid, where you can see whether neighbouring seeds actually look
 *    different from each other;
 *  - a long list, which is the only honest test of scroll performance;
 *  - the address row, where each group must render as ONE avatar for the
 *    case-insensitive formats and as two distinct ones for base58.
 */
import { useMemo, useState } from "react";
import {
	FlatList,
	Platform,
	SafeAreaView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { GradientAvatar, generatePalette } from "gulitars";
import { seedForAddress } from "gulitars/crypto";

const SIZE_RAMP = [16, 24, 32, 40, 64, 96, 160];
const GRID_SEEDS = Array.from({ length: 60 }, (_, i) => `user-${i}`);
const LIST_SEEDS = Array.from({ length: 200 }, (_, i) => `member-${i}@acme.com`);

/**
 * One entry per address family, each holding the casings that entry turns up
 * in. `sameAccount` says what the row is asserting: for the case-insensitive
 * formats every avatar in the group must look identical, and for base58 they
 * must not, because lowercasing base58 yields a different address.
 */
const ADDRESS_GROUPS: Array<{
	label: string;
	sameAccount: boolean;
	variants: string[];
}> = [
	{
		label: "EVM — EIP-55 / lower / upper",
		sameAccount: true,
		variants: [
			"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
			"0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
			"0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045",
		],
	},
	{
		label: "BTC bech32 — lower / upper (QR)",
		sameAccount: true,
		variants: [
			"bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
			"BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4",
		],
	},
	{
		label: "BTC taproot — lower / upper",
		sameAccount: true,
		variants: [
			"bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
			"BC1P0XLXVLHEMJA6C4DQV22UAPCTQUPFHLXM9H8Z3K2E72Q4K9HCZ7VQZK5JJ0",
		],
	},
	{
		label: "Solana — case is part of the address",
		sameAccount: false,
		variants: [
			"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
			"7xkxtg2cw87d97txjsdpbd5jbkhetqa83tzrujosgasu",
		],
	},
	{
		label: "BTC legacy — case is part of the address",
		sameAccount: false,
		variants: [
			"1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
			"1a1zp1ep5qgefi2dmptftl5slmv7divfna",
		],
	},
];

function Section({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}) {
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>{title}</Text>
			{subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
			{children}
		</View>
	);
}

function Playground() {
	const [seed, setSeed] = useState("jane@example.com");
	const palette = useMemo(() => generatePalette(seed), [seed]);

	return (
		<Section
			title="Playground"
			subtitle="Type anything. The same seed always paints the same avatar."
		>
			<TextInput
				value={seed}
				onChangeText={setSeed}
				autoCapitalize="none"
				autoCorrect={false}
				placeholder="a user id, an email, anything"
				style={styles.input}
			/>
			<View style={styles.ramp}>
				{SIZE_RAMP.map((size) => (
					<View key={size} style={styles.rampItem}>
						<GradientAvatar seed={seed} size={size} />
						<Text style={styles.caption}>{size}</Text>
					</View>
				))}
			</View>
			<Text style={styles.mono}>
				{palette.harmony} · {palette.colors.join("  ")}
			</Text>
		</Section>
	);
}

function Shapes() {
	return (
		<Section title="Shapes" subtitle="radius defaults to a circle">
			<View style={styles.ramp}>
				{[undefined, 24, 12, 0].map((radius) => (
					<View key={String(radius)} style={styles.rampItem}>
						<GradientAvatar seed="studio" size={72} radius={radius} />
						<Text style={styles.caption}>
							{radius === undefined ? "default" : `radius ${radius}`}
						</Text>
					</View>
				))}
			</View>
		</Section>
	);
}

function Grid() {
	return (
		<Section
			title="Spread"
			subtitle="60 consecutive seeds — neighbours should not rhyme"
		>
			<View style={styles.grid}>
				{GRID_SEEDS.map((s) => (
					<GradientAvatar key={s} seed={s} size={44} style={styles.gridItem} />
				))}
			</View>
		</Section>
	);
}

/**
 * Everything above the roster, as the list's header.
 *
 * The roster has to be the screen's own FlatList rather than one section among
 * several inside a ScrollView: nesting a virtualized list in a scroll view of
 * the same orientation disables windowing, which would quietly turn the one
 * section meant to measure scroll performance into the one section that cannot.
 */
function Addresses() {
	return (
		<Section
			title="Addresses"
			subtitle="seedForAddress: same account → same avatar, whatever the casing"
		>
			{ADDRESS_GROUPS.map((group) => (
				<View key={group.label} style={styles.addressRow}>
					<View style={styles.ramp}>
						{group.variants.map((variant) => (
							<GradientAvatar
								key={variant}
								seed={seedForAddress(variant)}
								size={44}
							/>
						))}
					</View>
					<Text style={styles.caption}>
						{group.sameAccount ? "must match →  " : "must differ →  "}
						{group.label}
					</Text>
				</View>
			))}
		</Section>
	);
}

function Header() {
	return (
		<View style={styles.header}>
			<Text style={styles.heading}>gulitars</Text>
			<Playground />
			<Shapes />
			<Grid />
			<Addresses />
			<Text style={styles.sectionTitle}>In a list</Text>
			<Text style={styles.sectionSubtitle}>
				200 rows — scroll it, watch for jank
			</Text>
		</View>
	);
}

export default function App() {
	return (
		<SafeAreaView style={styles.screen}>
			<StatusBar barStyle="dark-content" />
			<FlatList
				data={LIST_SEEDS}
				keyExtractor={(s) => s}
				ListHeaderComponent={Header}
				contentContainerStyle={styles.content}
				renderItem={({ item }) => (
					<View style={styles.row}>
						<GradientAvatar seed={item} size={40} />
						<Text style={styles.rowLabel}>{item}</Text>
					</View>
				)}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#FFFFFF" },
	content: { padding: 20, paddingBottom: 64 },
	header: { gap: 32, marginBottom: 12 },
	heading: { fontSize: 22, fontWeight: "700", color: "#111111" },
	section: { gap: 12 },
	sectionTitle: { fontSize: 15, fontWeight: "600", color: "#111111" },
	sectionSubtitle: { fontSize: 13, color: "#71717A", marginTop: -8 },
	input: {
		borderWidth: 1,
		borderColor: "#E4E4E7",
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
	},
	ramp: { flexDirection: "row", alignItems: "flex-end", gap: 16, flexWrap: "wrap" },
	rampItem: { alignItems: "center", gap: 6 },
	caption: { fontSize: 11, color: "#A1A1AA" },
	mono: {
		fontSize: 12,
		color: "#71717A",
		fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
	},
	grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	addressRow: { gap: 6 },
	gridItem: {},
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
	rowLabel: { fontSize: 14, color: "#3F3F46" },
});
