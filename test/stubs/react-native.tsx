/**
 * The slice of `react-native` the component touches. Each stub renders a host
 * element of the same name, so a rendered tree reads exactly like the JSX.
 */
import { createElement } from "react";

function host(name: string) {
	const Component = ({ children, ...props }: Record<string, unknown>) =>
		createElement(name, props, children as never);
	Component.displayName = name;
	return Component;
}

export const View = host("View");
