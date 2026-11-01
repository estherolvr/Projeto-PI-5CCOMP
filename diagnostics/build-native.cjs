const esbuild = require('../src/Entrega 1/Backend/node_modules/esbuild')
const fs = require('node:fs')
const path = require('node:path')
esbuild.build({
  entryPoints: [path.join(__dirname,'native-tls-worker.ts')],
  outfile: path.join(__dirname,'native-worker.mjs'),
  bundle:true, format:'esm', platform:'neutral', conditions:['workerd','worker'],
  banner:{js: "import {createRequire} from 'node:module'; const require = createRequire('/worker.js');"}, mainFields:['main','module'], minify:true, external:['node:*','cloudflare:*'],
  plugins:[{name:'native-postgres-transport',setup(build){
    const builtins = new Set(require('node:module').builtinModules)
    build.onResolve({filter:/.*/}, args => builtins.has(args.path) ? {path:args.path.startsWith('node:') ? args.path : 'node:'+args.path,external:true} : undefined)
    build.onLoad({filter:/[/\\]pg[/\\]lib[/\\]connection\.js$/}, async args => ({
      contents: fs.readFileSync(args.path,'utf8').replace("const { getStream, getSecureStream } = require('./stream')", "const getStream = () => new (require('node:net').Socket)(); const getSecureStream = options => require('node:tls').connect(options)"),
      loader:'js', resolveDir:path.dirname(args.path)
    }))
  }}]
}).catch(error=>{console.error(error.message);process.exitCode=1})
