/**
 * 路由跳转目标校验。
 *
 * 起因：把执行页的路径从 /run 改成 /train/run 之后，有三处 router.push 还在用旧路径，
 * 点进去直接白屏。这类问题 TypeScript 查不出来（字符串而已），所以单独跑一遍。
 *
 * 用法：node scripts/check-routes.cjs
 * 有对不上的跳转会打印出来并以退出码 1 结束，可以挂到 prebuild 上。
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', 'src')
const routerFile = path.join(root, 'router', 'index.ts')

const routerSrc = fs.readFileSync(routerFile, 'utf8')
const routes = [...routerSrc.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1])

/** '/exercises/:id' → 正则 */
function toRegex(p) {
  const body = p
    .split('/')
    .map((seg) => (seg.startsWith(':') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/')
  return new RegExp('^' + body + '$')
}

function resolve(target) {
  const clean = target.split('?')[0].split('#')[0]
  return routes.some((r) => toRegex(r).test(clean))
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else if (/\.(vue|ts)$/.test(name)) out.push(p)
  }
  return out
}

const bad = []

for (const f of walk(root)) {
  const src = fs.readFileSync(f, 'utf8')
  const patterns = [
    /router\.(?:push|replace)\(\s*'([^']+)'/g,
    /\$router\.(?:push|replace)\(\s*'([^']+)'/g,
    /router\.(?:push|replace)\(\s*`([^`]+)`/g,
    // 对象形式：router.push({ path: '/xxx', query: {...} })
    /router\.(?:push|replace)\(\s*\{\s*path:\s*'([^']+)'/g,
    /\$router\.(?:push|replace)\(\s*\{\s*path:\s*'([^']+)'/g,
    /router\.(?:push|replace)\(\s*\{\s*path:\s*`([^`]+)`/g,
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(src))) {
      let target = m[1].replace(/\$\{[^}]*\}/g, 'X')
      // 字符串拼接（'/plans/' + id）只截到前缀，补一个占位段再匹配
      if (/^\s*\+/.test(src.slice(re.lastIndex))) target += 'X'
      if (!target.startsWith('/')) continue
      if (!resolve(target)) bad.push({ file: path.relative(root, f), target })
    }
  }
}

console.log('已定义路由 ' + routes.length + ' 条')
if (!bad.length) {
  console.log('所有跳转目标都能匹配到路由 ✓')
  process.exit(0)
}
console.log('\n❌ 匹配不到路由的跳转：')
bad.forEach((b) => console.log('  ' + b.target + '   ← ' + b.file))
process.exit(1)
