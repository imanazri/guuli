/** The slice of `react-native-svg` the component touches. See ./react-native. */
import { createElement } from "react";

function host(name: string) {
	const Component = ({ children, ...props }: Record<string, unknown>) =>
		createElement(name, props, children as never);
	Component.displayName = name;
	return Component;
}

export const Circle = host("Circle");
export const Defs = host("Defs");
export const RadialGradient = host("RadialGradient");
export const Rect = host("Rect");
export const Stop = host("Stop");

const Svg = host("Svg");
export default Svg;
