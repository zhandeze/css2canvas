export const miniappLayoutCompareFixture = {
  name: 'layout-text-block',
  html: `
		<div id="root">
			<div class="card">
				<div class="title">Hello world from layout</div>
				<div class="body">This block should wrap and align consistently.</div>
			</div>
		</div>
	`,
  css: `
		html, body {
			margin: 0;
			padding: 0;
			background: #ffffff;
		}
		#root {
			width: 360px;
			padding: 24px;
			background: #f7f7f7;
		}
		.card {
			padding: 18px 20px;
			border: 4px solid #223344;
			background: #ffffff;
			font-family: Arial, sans-serif;
			font-size: 18px;
			line-height: 1.4;
			color: #102030;
		}
		.title {
			font-weight: 700;
			text-decoration: underline;
			margin-bottom: 12px;
		}
		.body {
			font-size: 16px;
			letter-spacing: 0.2px;
		}
	`
};
