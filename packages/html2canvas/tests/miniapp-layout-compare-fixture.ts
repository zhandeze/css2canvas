import type {LayoutMiniAppNode} from '../src/miniapp/layout-to-miniapp';

export interface MiniAppLayoutFixture {
  name: string;
  selector: string;
  html: string;
  css: string;
  scale: number;
  createLayoutRoot(): LayoutMiniAppNode;
}

const createNode = (
  style: Record<string, unknown>,
  children: LayoutMiniAppNode[] = [],
  extra: Partial<LayoutMiniAppNode> = {}
): LayoutMiniAppNode => ({
  style,
  children,
  layout: undefined,
  lastLayout: undefined,
  nextAbsoluteChild: null,
  nextFlexChild: null,
  ...extra
});

export const miniappLayoutCompareFixtures: MiniAppLayoutFixture[] = [
  {
    name: 'layout-text-card',
    selector: '#root',
    scale: 1,
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
      }

      .title {
        margin-bottom: 14px;
        color: #102030;
        font-family: Arial, sans-serif;
        font-size: 24px;
        font-weight: 700;
        line-height: 1.2;
        text-decoration: underline;
      }

      .body {
        width: 260px;
        color: #102030;
        font-family: Arial, sans-serif;
        font-size: 16px;
        line-height: 1.4;
        letter-spacing: 0.2px;
      }
    `,
    createLayoutRoot() {
      return createNode(
        {
          // computeLayout treats width as the node's outer box, so include
          // the 24px left/right padding to match the HTML fixture's 360px content box.
          width: 408,
          padding: 24,
          backgroundColor: '#f7f7f7'
        },
        [
          createNode(
            {
              paddingTop: 18,
              paddingRight: 20,
              paddingBottom: 18,
              paddingLeft: 20,
              borderWidth: 4,
              borderColor: '#223344',
              backgroundColor: '#ffffff'
            },
            [
              createNode({
                text: 'Hello world from layout',
                color: '#102030',
                fontFamily: 'Arial, sans-serif',
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.2,
                textDecoration: 'underline',
                marginBottom: 14
              }),
              createNode({
                width: 260,
                text: 'This block should wrap and align consistently.',
                color: '#102030',
                fontFamily: 'Arial, sans-serif',
                fontSize: 16,
                lineHeight: 1.4,
                letterSpacing: 0.2
              })
            ]
          )
        ]
      );
    }
  }
];
