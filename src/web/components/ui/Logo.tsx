type LogoProps = {
	className?: string;
};

export function Logo({ className }: LogoProps) {
	return (
		<span
			className={`inline-flex items-center logo-gap${className ? ` ${className}` : ""}`}
		>
			<svg
				aria-hidden="true"
				viewBox="8 21 26 30"
				width="26"
				height="30"
				xmlns="http://www.w3.org/2000/svg"
			>
				<polygon points="8,29 21,21 34,29 21,36" fill="#f59e0b" opacity="0.20" />
				<polygon
					points="34,29 34,43 21,51 21,36"
					fill="#f59e0b"
					opacity="0.10"
				/>
				<polygon points="21,36 21,51 8,43 8,29" fill="#f59e0b" opacity="0.14" />
				<polygon
					points="21,21 34,29 34,43 21,51 8,43 8,29"
					fill="none"
					stroke="#f59e0b"
					strokeWidth="2"
				/>
				<line
					x1="21"
					y1="21"
					x2="21"
					y2="36"
					stroke="#f59e0b"
					strokeWidth="1"
					opacity="0.6"
				/>
				<line
					x1="34"
					y1="43"
					x2="21"
					y2="36"
					stroke="#f59e0b"
					strokeWidth="1"
					opacity="0.6"
				/>
				<line
					x1="8"
					y1="43"
					x2="21"
					y2="36"
					stroke="#f59e0b"
					strokeWidth="1"
					opacity="0.6"
				/>
			</svg>
			<span className="font-poppins text-4xl font-bold tracking-[2px] text-foreground">
				LUDIUM
			</span>
		</span>
	);
}
