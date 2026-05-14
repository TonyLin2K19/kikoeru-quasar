// scripts/convert-tw.js
const fs = require('fs')
const path = require('path')
const OpenCC = require('opencc')

const converter = new OpenCC('s2twp.json')

const exts = ['.vue', '.js', '.ts', '.json', '.html', '.css', '.scss', '.sass']

function walk(dir) {
    for (const file of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
            if (['node_modules', '.git', 'dist', '.quasar'].includes(file)) continue
            walk(fullPath)
            continue
        }

        if (!exts.includes(path.extname(file))) continue

        const original = fs.readFileSync(fullPath, 'utf8')
        const converted = converter.convertSync(original)

        if (original !== converted) {
            fs.writeFileSync(fullPath, converted, 'utf8')
            console.log('converted:', fullPath)
        }
    }
}

walk(path.resolve(__dirname, '../src'))