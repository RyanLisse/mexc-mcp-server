export default {
  '*.{ts,js,json}': ['bunx @biomejs/biome check --apply'],
  '*.ts': ['bun run type-check'],
};
