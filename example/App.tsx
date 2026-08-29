/**
 * Visual check for react-native-gradient-avatars.
 *
 * Three things worth looking at, in order:
 *  - the size ramp, which is where the level-of-detail logic either works or
 *    turns small avatars into mud;
 *  - a dense grid, where you can see whether neighbouring seeds actually look
 *    different from each other;
 *  - a long list, which is the only honest test of scroll performance.
 */
import { useMemo, useState } from "react";
import {
	FlatList,
	Platform,
	SafeAreaView,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { GradientAvatar, generatePalette } from "react-native-gradient-avatars";

const SIZE_RAMP = [16, 24, 32, 40, 64, 96, 160];
const GRID_SEEDS = Array.from({ length: 60 }, (_, i) => `user-${i}`);
const LIST_SEEDS = Array.from({ length: 200 }, (_, i) => `member-${i}@acme.com`);

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
				{[undefined, 24, 12, 0].map((radius, i) => (
					<View key={String(radius)} style={styles.rampItem}>
						<GradientAvatar seed="outpace" size={72} radius={radius} />
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

function Roster() {
	return (
		<Section title="In a list" subtitle="200 rows — scroll it, watch for jank">
			<FlatList
				data={LIST_SEEDS}
				keyExtractor={(s) => s}
				style={styles.list}
				renderItem={({ item }) => (
					<View style={styles.row}>
						<GradientAvatar seed={item} size={40} />
						<Text style={styles.rowLabel}>{item}</Text>
					</View>
				)}
			/>
		</Section>
	);
}

export default function App() {
	return (
		<SafeAreaView style={styles.screen}>
			<StatusBar barStyle="dark-content" />
			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.heading}>react-native-gradient-avatars</Text>
				<Playground />
				<Shapes />
				<Grid />
				<Roster />
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#FFFFFF" },
	content: { padding: 20, paddingBottom: 64, gap: 32 },
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
	gridItem: {},
	list: { height: 320, borderWidth: 1, borderColor: "#E4E4E7", borderRadius: 12 },
	row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10 },
	rowLabel: { fontSize: 14, color: "#3F3F46" },
});
