/* eslint import/prefer-default-export: off, import/no-mutable-exports: off */
import url from 'url';
import path from 'path';

export let resolvePath: (hashPath: string) => string;

if (process.env.NODE_ENV === 'development') {
  const port = process.env.PORT || 1212;
  resolvePath = (hashPath: string) => {
    const url = new URL(`http://localhost:${port}`);
    url.pathname = 'index.html';
    url.hash = hashPath
    return url.href;
  };
} else {
  resolvePath = (hashPath: string) => {
    return url.format({
      pathname: `${path.resolve(__dirname, '../renderer/index.html')}`,
      protocol: 'file',
      slashes: true,
      hash: hashPath
    });
  };
}


