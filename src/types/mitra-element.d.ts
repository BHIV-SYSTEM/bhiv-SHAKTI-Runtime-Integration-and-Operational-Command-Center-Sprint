import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mitra-companion': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'stylesheet-path'?: string;
          'api-base-url'?: string;
          'host-app'?: string;
        },
        HTMLElement
      >;
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mitra-companion': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'stylesheet-path'?: string;
          'api-base-url'?: string;
          'host-app'?: string;
        },
        HTMLElement
      >;
    }
  }
}
