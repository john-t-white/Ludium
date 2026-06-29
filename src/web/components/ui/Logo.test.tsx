import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
	it("Logo_WhenRendered_ExpectWordmarkText", () => {
		render(<Logo />);

		expect(screen.getByText("LUDIUM")).toBeInTheDocument();
	});

	it("Logo_WhenRendered_ExpectAccessibleImageNamedLudium", () => {
		render(<Logo />);

		expect(screen.getByRole("img", { name: "Ludium" })).toBeInTheDocument();
	});

	it("Logo_GivenClassName_ExpectClassMergedOntoRoot", () => {
		const { container } = render(<Logo className="custom-class" />);
		const root = container.firstElementChild;

		expect(root).toHaveClass("custom-class");
		expect(root).toHaveClass("inline-flex");
	});

	it("Logo_WhenRenderedWithoutClassName_ExpectBaseClassesIntact", () => {
		const { container } = render(<Logo />);
		const root = container.firstElementChild;

		expect(root).toHaveClass("inline-flex");
		expect(root).toHaveClass("items-center");
	});
});
